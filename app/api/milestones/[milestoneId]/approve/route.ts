import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export const runtime = "nodejs";

type ApproveBody = {
  submission_id?: number;
};

type ContractRow = {
  contract_id: number;
  client_id: number;
  freelancer_id: number;
  platform_fee_percent: number | null;
  currency: string | null;
};

type MilestoneRow = {
  milestone_id: number;
  amount_gross: number | string | null;
  contract_id: number;
  contracts?: ContractRow | ContractRow[] | null;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await ctx.params;
    const id = Number(milestoneId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid milestone id" }, { status: 400 });
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

    const body = (await req.json().catch(() => ({}))) as ApproveBody;
    const submissionId = Number(body.submission_id);
    if (!Number.isFinite(submissionId)) {
      return NextResponse.json({ error: "submission_id is required" }, { status: 400 });
    }

    const { data: milestone, error: milestoneErr } = await supabaseAdmin
      .from("milestones")
      .select("milestone_id, amount_gross, contract_id, contracts(contract_id, client_id, freelancer_id, platform_fee_percent, currency)")
      .eq("milestone_id", id)
      .single();

    if (milestoneErr || !milestone) {
      return NextResponse.json({ error: milestoneErr?.message || "Milestone not found" }, { status: 404 });
    }

    const milestoneRow = milestone as MilestoneRow;
    const contract = Array.isArray(milestoneRow.contracts)
      ? milestoneRow.contracts[0] ?? null
      : milestoneRow.contracts ?? null;
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("client_id, auth_user_id")
      .eq("client_id", contract.client_id)
      .maybeSingle();

    const { data: adminRow } = await supabaseAdmin
      .from("app_users")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isClient = clientRow?.auth_user_id === user.id;
    const isAdmin = !!adminRow?.user_id;

    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: submission, error: submissionErr } = await supabaseAdmin
      .from("milestone_submissions")
      .select("submission_id, milestone_id, status")
      .eq("submission_id", submissionId)
      .single();

    if (submissionErr || !submission) {
      return NextResponse.json({ error: submissionErr?.message || "Submission not found" }, { status: 404 });
    }

    if (submission.milestone_id !== id) {
      return NextResponse.json({ error: "Submission does not belong to milestone" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const gross = toMoney(milestoneRow.amount_gross);
    const feePercent = toPercent(contract.platform_fee_percent ?? 10);
    const net = roundMoney(gross * (1 - feePercent / 100));

    const { error: subErr } = await supabaseAdmin
      .from("milestone_submissions")
      .update({ status: "approved", decided_at: nowIso, decided_by: "client", decision_reason: null })
      .eq("submission_id", submissionId);

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    const { error: milestoneUpdateErr } = await supabaseAdmin
      .from("milestones")
      .update({ status: "released", approved_at: nowIso, rejected_at: null })
      .eq("milestone_id", id);

    if (milestoneUpdateErr) {
      return NextResponse.json({ error: milestoneUpdateErr.message }, { status: 500 });
    }

    const { data: paymentRow } = await supabaseAdmin
      .from("payments")
      .select("payment_id, status")
      .eq("milestone_id", id)
      .maybeSingle();

    if (paymentRow?.payment_id && paymentRow.status !== "released") {
      await supabaseAdmin.from("payments").update({ status: "released" }).eq("payment_id", paymentRow.payment_id);
    }

    if (net > 0) {
      const { data: payoutRow } = await supabaseAdmin
        .from("payouts")
        .select("payout_id")
        .eq("milestone_id", id)
        .maybeSingle();

      if (!payoutRow) {
        await supabaseAdmin.from("payouts").insert({
          contract_id: contract.contract_id,
          milestone_id: id,
          provider: "manual",
          amount: net,
          currency: (contract.currency || "EGP").toUpperCase(),
          status: "settled",
          sent_at: nowIso,
          settled_at: nowIso,
        });
      }

      const { data: walletRow } = await supabaseAdmin
        .from("freelancer_wallets")
        .select("wallet_id, balance, currency")
        .eq("freelancer_id", contract.freelancer_id)
        .maybeSingle();

      if (!walletRow) {
        await supabaseAdmin.from("freelancer_wallets").insert({
          freelancer_id: contract.freelancer_id,
          balance: net,
          currency: (contract.currency || "EGP").toUpperCase(),
          updated_at: nowIso,
        });
      } else if (!walletRow.currency || walletRow.currency === (contract.currency || "EGP").toUpperCase()) {
        const newBalance = roundMoney(Number(walletRow.balance || 0) + net);
        await supabaseAdmin
          .from("freelancer_wallets")
          .update({ balance: newBalance, updated_at: nowIso })
          .eq("wallet_id", walletRow.wallet_id);
      }
    }

    return NextResponse.json({ ok: true, net_amount: net, fee_percent: feePercent });
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

function toMoney(value: any) {
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
