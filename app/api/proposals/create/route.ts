// app/api/proposals/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";
import { sendEmail } from "@/lib/email/smtp";
import { buildProposalReceivedEmail } from "@/lib/email/templates";

const OPEN_STATUSES = ["sent", "countered", "pending"] as const;

type MilestoneIn = {
  order?: number;
  position?: number;
  title?: string;
  amount?: number | string;
  amount_gross?: number | string;
  days?: number | string;
  duration_days?: number | string;
};

type CreateBody = {
  job_post_id?: number;
  client_id?: number;
  freelancer_id?: number;
  conversation_id?: string | null;

  origin?: string; // "chat" etc
  offered_by?: "client" | "freelancer";

  currency?: string;
  platform_fee_percent?: number;

  message?: string;
  total_price?: number; // optional; we compute from milestones anyway

  milestones?: MilestoneIn[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateBody;

    const job_post_id = Number(body.job_post_id);
    const client_id = Number(body.client_id);
    const freelancer_id = Number(body.freelancer_id);
    const conversation_id = (body.conversation_id ?? null) as string | null;

    const offered_by = (body.offered_by || "").toLowerCase() as "client" | "freelancer";
    if (!["client", "freelancer"].includes(offered_by)) {
      return NextResponse.json({ error: "offered_by must be 'client' or 'freelancer'" }, { status: 400 });
    }

    if (!Number.isFinite(job_post_id) || !Number.isFinite(client_id) || !Number.isFinite(freelancer_id)) {
      return NextResponse.json({ error: "Missing/invalid job_post_id, client_id, freelancer_id" }, { status: 400 });
    }

    // Lock if contract exists for this job
    const { data: lockContract, error: lockErr } = await supabaseAdmin
      .from("contracts")
      .select("contract_id,status")
      .eq("job_post_id", job_post_id)
      .in("status", ["active", "completed"])
      .limit(1)
      .maybeSingle();

    if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 400 });
    if (lockContract) {
      return NextResponse.json({ error: "Contract is active for this job. Proposals are locked." }, { status: 409 });
    }

    const currency = (body.currency || "EGP").toUpperCase();
    const platform_fee_percent = clampInt(Number(body.platform_fee_percent ?? 10), 0, 100);
    const message = safeStr(body.message) || null;

    const milestonesIn = Array.isArray(body.milestones) ? body.milestones : [];
    const milestones = milestonesIn.map((m, idx) => {
      const position = toInt(m.order) ?? toInt(m.position) ?? idx + 1;
      const title = safeStr(m.title) || `Milestone #${position}`;
      const amount = toNumber(m.amount) ?? toNumber(m.amount_gross) ?? 0;
      const days = toInt(m.days) ?? toInt(m.duration_days) ?? 0;

      return {
        position,
        title,
        amount_gross: roundMoney(amount),
        duration_days: Math.max(0, days),
      };
    }).filter(m => m.title && (m.amount_gross ?? 0) > 0);

    if (!milestones.length) {
      return NextResponse.json({ error: "At least one milestone with title+amount is required" }, { status: 400 });
    }

    const total_gross = milestones.reduce((s, m) => s + (m.amount_gross || 0), 0);

    // Supersede any open proposals in this conversation/job (keeps one “current” chain)
    if (conversation_id) {
      await supabaseAdmin
        .from("proposals")
        .update({ status: "superseded" })
        .eq("conversation_id", conversation_id)
        .eq("job_post_id", job_post_id)
        .in("status", [...OPEN_STATUSES]);
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("proposals")
      .insert({
        job_post_id,
        client_id,
        freelancer_id,
        conversation_id,
        origin: body.origin || "chat",
        offered_by,
        currency,
        platform_fee_percent,
        message,
        status: "sent",
        total_gross,
        accepted_by_client: false,
        accepted_by_freelancer: false,
        decided_at: null,
      })
      .select("proposal_id, conversation_id, status")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message || "Insert proposal failed" }, { status: 400 });
    }

    const rows = milestones.map((m) => ({
      proposal_id: inserted.proposal_id,
      position: m.position,
      title: m.title,
      amount_gross: m.amount_gross,
      duration_days: m.duration_days,
    }));

    const { error: milErr } = await supabaseAdmin.from("proposal_milestones").insert(rows);
    if (milErr) {
      return NextResponse.json({ error: `Milestones insert failed: ${milErr.message}` }, { status: 400 });
    }

    const [jobRes, clientRes, freelancerRes] = await Promise.all([
      supabaseAdmin.from("job_posts").select("title").eq("job_post_id", job_post_id).maybeSingle(),
      supabaseAdmin
        .from("clients")
        .select("first_name, last_name, company_name, email")
        .eq("client_id", client_id)
        .maybeSingle(),
      supabaseAdmin
        .from("freelancers")
        .select("first_name, last_name, email")
        .eq("freelancer_id", freelancer_id)
        .maybeSingle(),
    ]);

    const jobTitle = jobRes.data?.title || "a job";
    const clientRow = clientRes.data;
    const freelancerRow = freelancerRes.data;

    if (offered_by === "freelancer" && clientRow?.email) {
      const senderName = [freelancerRow?.first_name, freelancerRow?.last_name].filter(Boolean).join(" ").trim();
      const emailPayload = buildProposalReceivedEmail({
        person: {
          firstName: clientRow.first_name,
          lastName: clientRow.last_name,
          companyName: clientRow.company_name,
        },
        senderName: senderName || "A freelancer",
        jobTitle,
        conversationId: conversation_id,
        role: "client",
      });
      try {
        await sendEmail({ to: clientRow.email, ...emailPayload });
      } catch (err) {
        console.error("[proposals/create] client email failed:", err);
      }
    }

    if (offered_by === "client" && freelancerRow?.email) {
      const senderName =
        [clientRow?.first_name, clientRow?.last_name].filter(Boolean).join(" ").trim() ||
        clientRow?.company_name ||
        "A client";
      const emailPayload = buildProposalReceivedEmail({
        person: { firstName: freelancerRow.first_name, lastName: freelancerRow.last_name },
        senderName,
        jobTitle,
        conversationId: conversation_id,
        role: "freelancer",
      });
      try {
        await sendEmail({ to: freelancerRow.email, ...emailPayload });
      } catch (err) {
        console.error("[proposals/create] freelancer email failed:", err);
      }
    }

    return NextResponse.json({ ok: true, proposal_id: inserted.proposal_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/* helpers */
function safeStr(v: any) { return v == null ? "" : String(v).trim(); }
function toInt(v: any) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}
function toNumber(v: any) {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function roundMoney(n: number) {
  return Math.round((Number(n || 0)) * 100) / 100;
}
