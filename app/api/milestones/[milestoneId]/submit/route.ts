import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";
import { sendEmail } from "@/lib/email/smtp";
import { buildMilestoneSubmittedEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

type SubmitBody = {
  submission_url?: string | null;
  notes?: string | null;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ milestoneId: string }> }) {
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

    const { data: freelancerRow } = await supabaseAdmin
      .from("freelancers")
      .select("freelancer_id, first_name, last_name, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!freelancerRow?.freelancer_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: milestone, error: milestoneErr } = await supabaseAdmin
      .from("milestones")
      .select("milestone_id, title, contract_id, contracts(contract_id, client_id, freelancer_id)")
      .eq("milestone_id", id)
      .single();

    if (milestoneErr || !milestone) {
      return NextResponse.json({ error: milestoneErr?.message || "Milestone not found" }, { status: 404 });
    }

    const contract = (milestone as any).contracts as {
      contract_id: number;
      client_id: number;
      freelancer_id: number;
    } | null;

    if (!contract || contract.freelancer_id !== freelancerRow.freelancer_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as SubmitBody;
    const submissionUrl = String(body?.submission_url || "").trim();
    const notes = String(body?.notes || "").trim();

    if (!submissionUrl && !notes) {
      return NextResponse.json({ error: "Submission content is required" }, { status: 400 });
    }

    const { data: latestSubmission } = await supabaseAdmin
      .from("milestone_submissions")
      .select("version")
      .eq("milestone_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxVersion = Number(latestSubmission?.version || 0);
    const nextVersion = Number.isFinite(maxVersion) ? maxVersion + 1 : 1;
    const nowIso = new Date().toISOString();

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("milestone_submissions")
      .insert({
        milestone_id: id,
        version: nextVersion,
        submitted_by: "freelancer",
        submission_url: submissionUrl || null,
        notes: notes || null,
        status: "submitted",
        submitted_at: nowIso,
      })
      .select("submission_id, version, status, submission_url, notes, submitted_at, decided_at, decided_by, decision_reason")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message || "Submission insert failed" }, { status: 500 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("milestones")
      .update({ status: "submitted", submitted_at: nowIso })
      .eq("milestone_id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("first_name, last_name, company_name, email")
      .eq("client_id", contract.client_id)
      .maybeSingle();

    if (clientRow?.email) {
      const submitterName = [freelancerRow.first_name, freelancerRow.last_name].filter(Boolean).join(" ").trim() || "Your freelancer";
      const emailPayload = buildMilestoneSubmittedEmail({
        person: {
          firstName: clientRow.first_name,
          lastName: clientRow.last_name,
          companyName: clientRow.company_name,
        },
        milestoneTitle: String((milestone as any).title || "a milestone"),
        contractId: contract.contract_id,
        submitterName,
      });

      try {
        await sendEmail({ to: clientRow.email, ...emailPayload });
      } catch (err) {
        console.error("[milestones/submit] email failed:", err);
      }
    }

    return NextResponse.json({ ok: true, submission: inserted, submitted_at: nowIso });
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
