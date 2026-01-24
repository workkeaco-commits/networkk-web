// app/api/proposals/[id]/ensure-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

type Params = { id: string };

export async function POST(
  _req: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params;
    const proposalId = Number(id);
    if (!Number.isFinite(proposalId)) {
      return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
    }

    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from("proposals")
      .select("proposal_id, job_post_id, client_id, freelancer_id, conversation_id, offered_by")
      .eq("proposal_id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: proposalError?.message || "Proposal not found" }, { status: 404 });
    }

    let conversationId = (proposal.conversation_id as string | null) || null;

    if (!conversationId) {
      const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("job_post_id", proposal.job_post_id)
        .eq("client_id", proposal.client_id)
        .eq("freelancer_id", proposal.freelancer_id)
        .maybeSingle();

      if (existingConv?.id) {
        conversationId = existingConv.id as string;
      } else {
        const { data: newConv, error: convErr } = await supabaseAdmin
          .from("conversations")
          .insert({
            job_post_id: proposal.job_post_id,
            client_id: proposal.client_id,
            freelancer_id: proposal.freelancer_id,
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (convErr) {
          return NextResponse.json({ error: convErr.message }, { status: 400 });
        }
        conversationId = newConv?.id ?? null;
      }

      if (conversationId) {
        await supabaseAdmin
          .from("proposals")
          .update({ conversation_id: conversationId })
          .eq("proposal_id", proposalId);
      }
    }

    if (conversationId) {
      const { data: existingMsg } = await supabaseAdmin
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("body", `[[proposal]]:${proposalId}`)
        .maybeSingle();

      if (!existingMsg) {
        const senderRole = String(proposal.offered_by || "").toLowerCase();
        const senderQuery =
          senderRole === "client"
            ? supabaseAdmin.from("clients").select("auth_user_id").eq("client_id", proposal.client_id).maybeSingle()
            : supabaseAdmin.from("freelancers").select("auth_user_id").eq("freelancer_id", proposal.freelancer_id).maybeSingle();

        const { data: senderRow, error: senderErr } = await senderQuery;
        if (senderErr || !senderRow?.auth_user_id) {
          return NextResponse.json({ error: "Missing sender auth id" }, { status: 400 });
        }

        await supabaseAdmin.from("messages").insert({
          conversation_id: conversationId,
          sender_auth_id: senderRow.auth_user_id,
          sender_role: senderRole,
          body: `[[proposal]]:${proposalId}`,
        });
      }

      await supabaseAdmin
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return NextResponse.json({ ok: true, conversation_id: conversationId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
