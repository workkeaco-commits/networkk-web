import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export const runtime = "nodejs";

type ProposalMilestoneRow = {
  position: number | null;
  title: string | null;
  amount_gross: number | string | null;
  duration_days: number | string | null;
  start_offset_days: number | string | null;
  end_offset_days: number | string | null;
};

type MilestoneRow = {
  milestone_id: number;
  amount_gross: number | string | null;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await ctx.params;
    const id = Number(contractId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid contract id" }, { status: 400 });
    }

    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    const user = userRes?.user;
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: clientRow }, { data: freelancerRow }] = await Promise.all([
      supabaseAdmin.from("clients").select("client_id").eq("auth_user_id", user.id).maybeSingle(),
      supabaseAdmin.from("freelancers").select("freelancer_id").eq("auth_user_id", user.id).maybeSingle(),
    ]);

    const { data: contract, error: contractErr } = await supabaseAdmin
      .from("contracts")
      .select(
        "contract_id, client_id, freelancer_id, proposal_id, confirmed_at, created_at, currency, client_confirm_grace_days"
      )
      .eq("contract_id", id)
      .single();

    if (contractErr || !contract) {
      return NextResponse.json({ error: contractErr?.message || "Contract not found" }, { status: 404 });
    }

    const isClient = clientRow?.client_id && contract.client_id === clientRow.client_id;
    const isFreelancer = freelancerRow?.freelancer_id && contract.freelancer_id === freelancerRow.freelancer_id;

    if (!isClient && !isFreelancer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existingMilestone } = await supabaseAdmin
      .from("milestones")
      .select("milestone_id")
      .eq("contract_id", id)
      .limit(1)
      .maybeSingle();

    if (existingMilestone) {
      return NextResponse.json({ ok: true, status: "already_present" });
    }

    if (!contract.proposal_id) {
      return NextResponse.json({ error: "Contract has no proposal_id" }, { status: 400 });
    }

    const { data: proposalMilestones, error: proposalMilErr } = await supabaseAdmin
      .from("proposal_milestones")
      .select("position, title, amount_gross, duration_days, start_offset_days, end_offset_days")
      .eq("proposal_id", contract.proposal_id)
      .order("position", { ascending: true });

    if (proposalMilErr || !proposalMilestones?.length) {
      return NextResponse.json(
        { error: proposalMilErr?.message || "No milestones found for proposal" },
        { status: 400 }
      );
    }

    const confirmedAt = contract.confirmed_at
      ? new Date(contract.confirmed_at)
      : contract.created_at
        ? new Date(contract.created_at)
        : new Date();
    const confirmedAtIso = confirmedAt.toISOString();
    const baseStart = addHours(confirmedAt, 24);
    const graceDays = clampInt(toInt(contract.client_confirm_grace_days) ?? 3, 0, 30);
    let rollingEnd = 0;

    const milestoneRows = (proposalMilestones as ProposalMilestoneRow[]).map((m, idx) => {
      const durationDays = toInt(m.duration_days) ?? 0;
      const startOffset = toInt(m.start_offset_days) ?? rollingEnd;
      let endOffset = toInt(m.end_offset_days) ?? startOffset + durationDays;
      if (endOffset < startOffset) endOffset = startOffset;
      rollingEnd = endOffset;

      const dueAt = addDays(baseStart, endOffset);
      const dueDate = toDateOnly(dueAt);
      const confirmDeadlineAt = addDays(dueAt, graceDays);

      return {
        contract_id: id,
        title: String(m.title || `Milestone #${idx + 1}`),
        amount_gross: toMoney(m.amount_gross),
        position: toInt(m.position) ?? idx + 1,
        status: "pending",
        start_offset_days: startOffset,
        end_offset_days: endOffset,
        due_at: dueAt.toISOString(),
        due_date: dueDate,
        client_confirm_deadline_at: confirmDeadlineAt.toISOString(),
      };
    });

    const { data: insertedMilestones, error: insertMilErr } = await supabaseAdmin
      .from("milestones")
      .insert(milestoneRows)
      .select("milestone_id, amount_gross");

    if (insertMilErr || !insertedMilestones?.length) {
      return NextResponse.json(
        { error: insertMilErr?.message || "Milestone insert failed" },
        { status: 500 }
      );
    }

    const { data: hasPayments, error: hasPayErr } = await supabaseAdmin
      .from("payments")
      .select("payment_id")
      .eq("contract_id", id)
      .limit(1)
      .maybeSingle();

    if (hasPayErr) {
      return NextResponse.json({ error: hasPayErr.message }, { status: 500 });
    }

    if (!hasPayments) {
      const paymentRows = (insertedMilestones as MilestoneRow[]).map((m) => ({
        contract_id: id,
        milestone_id: m.milestone_id,
        provider: "escrow",
        amount: toMoney(m.amount_gross),
        currency: (contract.currency || "EGP").toUpperCase(),
        status: "held",
        captured_at: confirmedAtIso,
      }));

      const { error: payErr } = await supabaseAdmin.from("payments").insert(paymentRows);
      if (payErr) {
        return NextResponse.json({ error: payErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, inserted: insertedMilestones.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

function toInt(value: any) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toMoney(value: any) {
  const n = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function addHours(d: Date, hours: number) {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}
