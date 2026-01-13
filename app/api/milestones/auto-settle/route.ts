import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export const runtime = "nodejs";

type SubmissionRow = {
  submission_id: number;
  version: number | null;
  status: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
};

type MilestoneRow = {
  milestone_id: number;
  contract_id: number;
  due_at: string | null;
  due_date: string | null;
  client_confirm_deadline_at: string | null;
  status: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  milestone_submissions: SubmissionRow[] | null;
};

type PaymentRow = {
  payment_id: number;
  contract_id: number;
  milestone_id: number;
  amount: number | string;
  currency: string | null;
  status: string | null;
  milestones: MilestoneRow | null;
};

type ContractRow = {
  contract_id: number;
  client_id: number;
  freelancer_id: number;
  platform_fee_percent?: number | null;
  currency?: string | null;
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = clampInt(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), 1, MAX_LIMIT);
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: payments, error: paymentsErr } = await supabaseAdmin
      .from("payments")
      .select(
        "payment_id, contract_id, milestone_id, amount, currency, status, milestones(milestone_id, contract_id, due_at, due_date, client_confirm_deadline_at, status, submitted_at, approved_at, rejected_at, milestone_submissions(submission_id, version, status, submitted_at, decided_at, decided_by))"
      )
      .eq("status", "held")
      .not("milestone_id", "is", null)
      .limit(limit);

    if (paymentsErr) {
      return NextResponse.json({ error: paymentsErr.message }, { status: 500 });
    }

    const contractCache = new Map<number, ContractRow>();

    let released = 0;
    let refunded = 0;
    let skipped = 0;

    for (const payment of (payments ?? []) as PaymentRow[]) {
      const milestone = payment.milestones;
      if (!milestone) {
        skipped += 1;
        continue;
      }

      const amountGross = toMoney(payment.amount);
      if (amountGross <= 0) {
        skipped += 1;
        continue;
      }

      const dueAt = getDueAt(milestone);
      const latestSubmission = getLatestSubmission(milestone.milestone_submissions);
      const submittedAt = getSubmittedAt(milestone, latestSubmission);
      const approved = isApproved(milestone, latestSubmission);

      const submittedOnTime = submittedAt && dueAt ? submittedAt <= dueAt : !!submittedAt;
      const confirmDeadlineAt = getConfirmDeadline(milestone, dueAt);

      const canRelease =
        approved &&
        submittedOnTime &&
        (dueAt ? now >= dueAt : true);

      const overdueNoSubmission =
        !!dueAt && now >= dueAt && (!submittedAt || (submittedAt && submittedAt > dueAt));

      const confirmExpired =
        !!confirmDeadlineAt && !!submittedAt && now >= confirmDeadlineAt && !approved;

      if (canRelease) {
        const contract = await getContract(contractCache, payment.contract_id);
        if (!contract) {
          skipped += 1;
          continue;
        }

        const feePercent = toPercent(contract.platform_fee_percent ?? 10);
        const amountNet = roundMoney(amountGross * (1 - feePercent / 100));

        const payoutOk = await ensurePayout(payment, amountNet, contract.freelancer_id, contract.currency);
        if (!payoutOk) {
          skipped += 1;
          continue;
        }

        const walletOk = await creditWallet(
          "freelancer_wallets",
          "freelancer_id",
          contract.freelancer_id,
          amountNet,
          contract.currency || payment.currency || "EGP",
          nowIso
        );
        if (!walletOk) {
          skipped += 1;
          continue;
        }

        await supabaseAdmin
          .from("payments")
          .update({ status: "released" })
          .eq("payment_id", payment.payment_id);

        await supabaseAdmin
          .from("milestones")
          .update({
            status: "released",
            approved_at: milestone.approved_at ?? nowIso,
          })
          .eq("milestone_id", milestone.milestone_id);

        released += 1;
        continue;
      }

      if (overdueNoSubmission || confirmExpired) {
        const contract = await getContract(contractCache, payment.contract_id);
        if (!contract) {
          skipped += 1;
          continue;
        }

        const walletOk = await creditWallet(
          "client_wallets",
          "client_id",
          contract.client_id,
          amountGross,
          contract.currency || payment.currency || "EGP",
          nowIso
        );
        if (!walletOk) {
          skipped += 1;
          continue;
        }

        await supabaseAdmin
          .from("payments")
          .update({ status: "refunded" })
          .eq("payment_id", payment.payment_id);

        await supabaseAdmin
          .from("milestones")
          .update({
            status: "refunded",
            rejected_at: milestone.rejected_at ?? nowIso,
          })
          .eq("milestone_id", milestone.milestone_id);

        refunded += 1;
        continue;
      }

      skipped += 1;
    }

    return NextResponse.json({ ok: true, released, refunded, skipped });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const provided = req.headers.get("x-cron-secret");
  return Boolean(provided && provided === secret);
}

async function getContract(cache: Map<number, ContractRow>, contractId: number) {
  if (cache.has(contractId)) return cache.get(contractId) ?? null;

  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select("contract_id, client_id, freelancer_id, platform_fee_percent, currency")
    .eq("contract_id", contractId)
    .single();

  if (error || !data) return null;
  cache.set(contractId, data as ContractRow);
  return data as ContractRow;
}

async function ensurePayout(
  payment: PaymentRow,
  amount: number,
  freelancerId: number,
  currency?: string | null
) {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("payouts")
    .select("payout_id")
    .eq("milestone_id", payment.milestone_id)
    .limit(1)
    .maybeSingle();

  if (existingErr) return false;
  if (existing) return true;

  const { error: payoutErr } = await supabaseAdmin.from("payouts").insert({
    contract_id: payment.contract_id,
    milestone_id: payment.milestone_id,
    provider: "manual",
    amount,
    currency: currency || payment.currency || "EGP",
    status: "settled",
    sent_at: new Date().toISOString(),
    settled_at: new Date().toISOString(),
  });

  if (payoutErr) return false;
  return true;
}

async function creditWallet(
  table: "client_wallets" | "freelancer_wallets",
  ownerField: "client_id" | "freelancer_id",
  ownerId: number,
  amount: number,
  currency: string,
  nowIso: string
) {
  const { data: wallet, error: walletErr } = await supabaseAdmin
    .from(table)
    .select("wallet_id, balance, currency")
    .eq(ownerField, ownerId)
    .maybeSingle();

  if (walletErr) return false;

  if (!wallet) {
    const { error: insertErr } = await supabaseAdmin.from(table).insert({
      [ownerField]: ownerId,
      balance: amount,
      currency,
      updated_at: nowIso,
    });
    return !insertErr;
  }

  if (wallet.currency && wallet.currency !== currency) {
    return false;
  }

  const newBalance = toMoney(Number(wallet.balance ?? 0) + amount);
  const { error: updateErr } = await supabaseAdmin
    .from(table)
    .update({ balance: newBalance, updated_at: nowIso })
    .eq("wallet_id", wallet.wallet_id);

  return !updateErr;
}

function getLatestSubmission(submissions: SubmissionRow[] | null) {
  if (!submissions || submissions.length === 0) return null;
  return submissions
    .slice()
    .sort((a, b) => {
      const aTime = toTime(a.submitted_at) ?? 0;
      const bTime = toTime(b.submitted_at) ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      const aVer = a.version ?? 0;
      const bVer = b.version ?? 0;
      return bVer - aVer;
    })[0];
}

function getSubmittedAt(milestone: MilestoneRow, submission: SubmissionRow | null) {
  const subTime = parseDate(submission?.submitted_at);
  if (subTime) return subTime;
  return parseDate(milestone.submitted_at);
}

function isApproved(milestone: MilestoneRow, submission: SubmissionRow | null) {
  if (milestone.approved_at) return true;
  const status = String(submission?.status || "").toLowerCase();
  return status === "approved" || status === "accepted";
}

function getDueAt(milestone: MilestoneRow) {
  const dueAt = parseDate(milestone.due_at);
  if (dueAt) return dueAt;
  if (milestone.due_date) {
    const endOfDay = new Date(`${milestone.due_date}T23:59:59.999Z`);
    if (!Number.isNaN(endOfDay.getTime())) return endOfDay;
  }
  return null;
}

function getConfirmDeadline(milestone: MilestoneRow, dueAt: Date | null) {
  const deadline = parseDate(milestone.client_confirm_deadline_at);
  if (deadline) return deadline;
  if (dueAt) return addDays(dueAt, 3);
  return null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function toTime(value?: string | null) {
  const d = parseDate(value);
  return d ? d.getTime() : null;
}

function toMoney(value: number | string) {
  const n = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function toPercent(value: any) {
  const n = Number(String(value ?? 10));
  if (!Number.isFinite(n)) return 10;
  return Math.min(100, Math.max(0, n));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
