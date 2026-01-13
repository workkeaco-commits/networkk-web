// app/api/proposals/[id]/respond/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";
import { sendEmail } from "@/lib/email/smtp";
import { buildContractConfirmedEmail } from "@/lib/email/templates";

const OPEN_STATUSES = ["sent", "countered", "pending"] as const;

type RespondBody = {
  action?: "accept" | "confirm" | "reject";
  actor?: "client" | "freelancer";
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const proposalId = Number(id);

    if (!Number.isFinite(proposalId)) {
      return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
    }

    const body = (await request.json()) as RespondBody;
    const action = (body.action || "").toLowerCase() as RespondBody["action"];
    const actor = (body.actor || "").toLowerCase() as RespondBody["actor"];

    if (!action || !["accept", "confirm", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid/missing action" }, { status: 400 });
    }
    if (!actor || !["client", "freelancer"].includes(actor)) {
      return NextResponse.json({ error: "Invalid/missing actor" }, { status: 400 });
    }

    // Fetch proposal
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from("proposals")
      .select(
        "proposal_id, job_post_id, conversation_id, offered_by, status, accepted_by_client, accepted_by_freelancer, client_id, freelancer_id, currency, total_gross, platform_fee_percent"
      )
      .eq("proposal_id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: proposalError?.message || "Proposal not found" },
        { status: 404 }
      );
    }

    // Contract lock by job
    const { data: lockContract, error: lockErr } = await supabaseAdmin
      .from("contracts")
      .select("contract_id,status")
      .eq("job_post_id", proposal.job_post_id)
      .in("status", ["active", "completed"])
      .limit(1)
      .maybeSingle();

    if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 400 });
    if (lockContract) {
      return NextResponse.json({ error: "Contract is active for this job. Proposals are locked." }, { status: 409 });
    }

    if (action !== "reject" && !OPEN_STATUSES.includes(proposal.status as any)) {
      return NextResponse.json({ error: `Proposal is ${proposal.status} and cannot be updated` }, { status: 400 });
    }

    const offered_by = String(proposal.offered_by || "").toLowerCase() as "client" | "freelancer";
    const clientAccepted = !!proposal.accepted_by_client;
    const freelancerAccepted = !!proposal.accepted_by_freelancer;

    const update: Record<string, any> = {};

    if (action === "reject") {
      update.status = "rejected";
      update.decided_at = new Date().toISOString();
      // optionally reset flags:
      // update.accepted_by_client = false;
      // update.accepted_by_freelancer = false;
    }

    if (action === "accept") {
      // ACCEPT must be done by the RECEIVER (not offered_by)
      if (actor === offered_by) {
        return NextResponse.json({ error: "Offeror cannot accept their own offer. They must confirm after the other side accepts." }, { status: 409 });
      }

      // mark receiver accepted, move to pending
      if (actor === "client") {
        if (clientAccepted) return NextResponse.json({ error: "Client already accepted." }, { status: 409 });
        update.accepted_by_client = true;
      } else {
        if (freelancerAccepted) return NextResponse.json({ error: "Freelancer already accepted." }, { status: 409 });
        update.accepted_by_freelancer = true;
      }

      update.status = "pending";
      update.decided_at = null;
    }

    if (action === "confirm") {
      // CONFIRM must be done by the OFFEROR, after receiver accepted
      if (actor !== offered_by) {
        return NextResponse.json({ error: "Only the offeror can confirm this contract." }, { status: 409 });
      }

      // must have receiver accepted already
      const receiverAccepted = offered_by === "client" ? freelancerAccepted : clientAccepted;
      if (!receiverAccepted) {
        return NextResponse.json({ error: "Cannot confirm yet. The other side must accept first." }, { status: 409 });
      }

      // mark offeror accepted and finalize
      if (actor === "client") {
        if (clientAccepted) return NextResponse.json({ error: "Client already confirmed." }, { status: 409 });
        update.accepted_by_client = true;
      } else {
        if (freelancerAccepted) return NextResponse.json({ error: "Freelancer already confirmed." }, { status: 409 });
        update.accepted_by_freelancer = true;
      }

      update.status = "accepted";
      update.decided_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("proposals")
      .update(update)
      .eq("proposal_id", proposalId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (action === "confirm") {
      const { data: existingContract, error: existingContractErr } = await supabaseAdmin
        .from("contracts")
        .select("contract_id, confirmed_at, created_at, client_confirm_grace_days")
        .eq("proposal_id", proposalId)
        .maybeSingle();

      if (existingContractErr) {
        return NextResponse.json({ error: existingContractErr.message }, { status: 500 });
      }

      const clientConfirmGraceDays = toInt(existingContract?.client_confirm_grace_days) ?? 3;
      let contractId = existingContract?.contract_id ?? null;
      let confirmedAt = existingContract?.confirmed_at
        ? new Date(existingContract.confirmed_at)
        : existingContract?.created_at
          ? new Date(existingContract.created_at)
          : new Date();
      let confirmedAtIso = confirmedAt.toISOString();

      if (!contractId) {
        const { data: newContract, error: contractErr } = await supabaseAdmin
          .from("contracts")
          .insert({
            client_id: proposal.client_id,
            freelancer_id: proposal.freelancer_id,
            job_post_id: proposal.job_post_id,
            proposal_id: proposal.proposal_id,
            contract_type: "fixed",
            fees_total: toMoney(proposal.total_gross),
            platform_fee_percent: toPercent(proposal.platform_fee_percent),
            currency: (proposal.currency || "EGP").toUpperCase(),
            status: "active",
            confirmed_at: confirmedAtIso,
            client_confirm_grace_days: clientConfirmGraceDays,
          })
          .select("contract_id")
          .single();

        if (contractErr || !newContract) {
          return NextResponse.json(
            { error: contractErr?.message || "Contract insert failed" },
            { status: 500 }
          );
        }

        contractId = newContract.contract_id;
      } else if (!existingContract?.confirmed_at) {
        await supabaseAdmin
          .from("contracts")
          .update({ confirmed_at: confirmedAtIso })
          .eq("contract_id", contractId);
      }

      if (contractId) {
        const { data: hasMilestones, error: hasMilErr } = await supabaseAdmin
          .from("milestones")
          .select("milestone_id")
          .eq("contract_id", contractId)
          .limit(1)
          .maybeSingle();

        if (hasMilErr) {
          return NextResponse.json({ error: hasMilErr.message }, { status: 500 });
        }

        let milestonesForPayments: Array<{ milestone_id: number; amount_gross: any }> = [];

        if (!hasMilestones) {
          const { data: proposalMilestones, error: proposalMilErr } = await supabaseAdmin
            .from("proposal_milestones")
            .select("position, title, amount_gross, duration_days, start_offset_days, end_offset_days")
            .eq("proposal_id", proposalId)
            .order("position", { ascending: true });

          if (proposalMilErr || !proposalMilestones?.length) {
            return NextResponse.json(
              { error: proposalMilErr?.message || "No milestones found for proposal" },
              { status: 500 }
            );
          }

          const baseStart = addHours(confirmedAt, 24);
          let rollingEnd = 0;

          const milestoneRows = proposalMilestones.map((m, idx) => {
            const durationDays = toInt(m.duration_days) ?? 0;
            const startOffset = toInt(m.start_offset_days) ?? rollingEnd;
            let endOffset = toInt(m.end_offset_days) ?? startOffset + durationDays;
            if (endOffset < startOffset) endOffset = startOffset;
            rollingEnd = endOffset;

            const dueAt = addDays(baseStart, endOffset);
            const dueDate = toDateOnly(dueAt);
            const clientConfirmDeadlineAt = addDays(dueAt, clientConfirmGraceDays);

            return {
              contract_id: contractId,
              title: String(m.title || `Milestone #${idx + 1}`),
              amount_gross: toMoney(m.amount_gross),
              position: toInt(m.position) ?? idx + 1,
              status: "pending",
              start_offset_days: startOffset,
              end_offset_days: endOffset,
              due_at: dueAt.toISOString(),
              due_date: dueDate,
              client_confirm_deadline_at: clientConfirmDeadlineAt.toISOString(),
            };
          });

          const { data: insertedMilestones, error: insertMilErr } = await supabaseAdmin
            .from("milestones")
            .insert(milestoneRows)
            .select("milestone_id, amount_gross, position");

          if (insertMilErr || !insertedMilestones?.length) {
            return NextResponse.json(
              { error: insertMilErr?.message || "Milestone insert failed" },
              { status: 500 }
            );
          }
          milestonesForPayments = insertedMilestones;
        } else {
          const { data: existingMilestones, error: existingMilErr } = await supabaseAdmin
            .from("milestones")
            .select("milestone_id, amount_gross")
            .eq("contract_id", contractId);

          if (existingMilErr) {
            return NextResponse.json({ error: existingMilErr.message }, { status: 500 });
          }

          milestonesForPayments = existingMilestones ?? [];
        }

        if (milestonesForPayments.length) {
          const { data: hasPayments, error: hasPayErr } = await supabaseAdmin
            .from("payments")
            .select("payment_id")
            .eq("contract_id", contractId)
            .limit(1)
            .maybeSingle();

          if (hasPayErr) {
            return NextResponse.json({ error: hasPayErr.message }, { status: 500 });
          }

          if (!hasPayments) {
            const paymentRows = milestonesForPayments.map((m) => ({
              contract_id: contractId,
              milestone_id: m.milestone_id,
              provider: "escrow",
              amount: toMoney(m.amount_gross),
              currency: (proposal.currency || "EGP").toUpperCase(),
              status: "held",
              captured_at: confirmedAtIso,
            }));

            const { error: payErr } = await supabaseAdmin.from("payments").insert(paymentRows);
            if (payErr) {
              return NextResponse.json({ error: payErr.message }, { status: 500 });
            }
          }
        }
      }

      if (contractId) {
        const [jobRes, clientRes, freelancerRes] = await Promise.all([
          supabaseAdmin.from("job_posts").select("title").eq("job_post_id", proposal.job_post_id).maybeSingle(),
          supabaseAdmin
            .from("clients")
            .select("first_name, last_name, company_name, email")
            .eq("client_id", proposal.client_id)
            .maybeSingle(),
          supabaseAdmin
            .from("freelancers")
            .select("first_name, last_name, email")
            .eq("freelancer_id", proposal.freelancer_id)
            .maybeSingle(),
        ]);

        const jobTitle = jobRes.data?.title || "your contract";
        const clientRow = clientRes.data;
        const freelancerRow = freelancerRes.data;
        const total = { amount: proposal.total_gross, currency: proposal.currency };

        if (clientRow?.email) {
          const emailPayload = buildContractConfirmedEmail({
            person: {
              firstName: clientRow.first_name,
              lastName: clientRow.last_name,
              companyName: clientRow.company_name,
            },
            jobTitle,
            contractId,
            total,
            role: "client",
          });
          try {
            await sendEmail({ to: clientRow.email, ...emailPayload });
          } catch (err) {
            console.error("[proposals/respond] client contract email failed:", err);
          }
        }

        if (freelancerRow?.email) {
          const emailPayload = buildContractConfirmedEmail({
            person: { firstName: freelancerRow.first_name, lastName: freelancerRow.last_name },
            jobTitle,
            contractId,
            total,
            role: "freelancer",
          });
          try {
            await sendEmail({ to: freelancerRow.email, ...emailPayload });
          } catch (err) {
            console.error("[proposals/respond] freelancer contract email failed:", err);
          }
        }
      }
    }

    // touch conversation last_message_at (optional)
    if (proposal.conversation_id) {
      await supabaseAdmin
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", proposal.conversation_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

function toInt(v: any) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toMoney(v: any) {
  const n = Number(String(v ?? 0).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function toPercent(v: any) {
  const n = Number(String(v ?? ""));
  if (!Number.isFinite(n)) return 10;
  return Math.min(100, Math.max(0, n));
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
