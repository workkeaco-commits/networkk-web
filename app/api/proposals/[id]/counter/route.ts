// app/api/proposals/[id]/counter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

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

type CounterBody = {
  actor?: "client" | "freelancer";
  message?: string;
  milestones?: MilestoneIn[];
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const oldId = Number(id);
    if (!Number.isFinite(oldId)) {
      return NextResponse.json({ error: "Invalid proposal id" }, { status: 400 });
    }

    const body = (await req.json()) as CounterBody;
    const actor = (body.actor || "").toLowerCase() as "client" | "freelancer";
    if (!["client", "freelancer"].includes(actor)) {
      return NextResponse.json({ error: "actor must be 'client' or 'freelancer'" }, { status: 400 });
    }

    // Load old proposal
    const { data: old, error: oldErr } = await supabaseAdmin
      .from("proposals")
      .select("proposal_id,status,job_post_id,client_id,freelancer_id,conversation_id,origin,currency,platform_fee_percent,accepted_by_client,accepted_by_freelancer")
      .eq("proposal_id", oldId)
      .single();

    if (oldErr || !old) {
      return NextResponse.json({ error: oldErr?.message || "Proposal not found" }, { status: 404 });
    }

    if (!OPEN_STATUSES.includes(old.status as any)) {
      return NextResponse.json({ error: `Proposal is ${old.status} and cannot be countered` }, { status: 400 });
    }

    // If someone already accepted, lock counters (handshake must finish or be rejected)
    if (old.accepted_by_client || old.accepted_by_freelancer) {
      return NextResponse.json({ error: "Acceptance already started. Counter is locked." }, { status: 409 });
    }

    // Contract lock by job
    const { data: lockContract, error: lockErr } = await supabaseAdmin
      .from("contracts")
      .select("contract_id,status")
      .eq("job_post_id", old.job_post_id)
      .in("status", ["active", "completed"])
      .limit(1)
      .maybeSingle();

    if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 400 });
    if (lockContract) {
      return NextResponse.json({ error: "Contract is active for this job. Proposals are locked." }, { status: 409 });
    }

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

    // Supersede the old proposal (and any other open ones for this conversation/job)
    if (old.conversation_id) {
      await supabaseAdmin
        .from("proposals")
        .update({ status: "superseded" })
        .eq("conversation_id", old.conversation_id)
        .eq("job_post_id", old.job_post_id)
        .in("status", ["sent", "countered", "pending"]);
    } else {
      await supabaseAdmin.from("proposals").update({ status: "superseded" }).eq("proposal_id", oldId);
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("proposals")
      .insert({
        job_post_id: old.job_post_id,
        client_id: old.client_id,
        freelancer_id: old.freelancer_id,
        conversation_id: old.conversation_id ?? null,
        origin: old.origin || "chat",
        offered_by: actor,
        currency: (old.currency || "EGP").toUpperCase(),
        platform_fee_percent: clampInt(Number(old.platform_fee_percent ?? 10), 0, 100),
        message: safeStr(body.message) || "Counter offer",
        status: "countered",
        total_gross,
        accepted_by_client: false,
        accepted_by_freelancer: false,
        decided_at: null,
        supersedes_proposal_id: oldId,
      })
      .select("proposal_id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message || "Insert counter proposal failed" }, { status: 400 });
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
