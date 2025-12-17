// app/api/proposals/[id]/respond/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

type RespondBody = {
  action?: string;                // e.g. "respond" | "accept" | "reject" | "confirm"
  actor?: string;                 // e.g. "client" | "freelancer" or a user label
  actor_auth_id?: string | null;  // Supabase auth user id of the actor (if you use it)
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Next 16 types wrap params in a Promise, so we await it
    const { id } = await context.params;
    const proposalId = Number(id);

    if (!Number.isFinite(proposalId)) {
      return NextResponse.json(
        { error: "Invalid proposal ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RespondBody;
    const { action, actor, actor_auth_id } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action' in request body" },
        { status: 400 }
      );
    }

    // Fetch proposal – adjust selected columns to match your schema
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from("proposals")
      .select("proposal_id, conversation_id")
      .eq("proposal_id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: proposalError?.message || "Proposal not found" },
        { status: 404 }
      );
    }

    // Prepare update payload based on action
    const update: Record<string, any> = {
      status: action, // you can map action -> status if you use different field names
    };

    if (actor) update.last_action_by = actor;
    if (actor_auth_id) update.last_actor_auth_id = actor_auth_id;

    const { error: updateError } = await supabaseAdmin
      .from("proposals")
      .update(update)
      .eq("proposal_id", proposalId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // (Optional) touch conversation's last_message_at if your schema has it
    if (proposal.conversation_id) {
      await supabaseAdmin
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", proposal.conversation_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
