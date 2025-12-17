// app/api/proposals/[id]/respond/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { action, actor, actor_auth_id } = await req.json(); // <-- actor_auth_id NEW
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const { data: prop, error: eProp } = await supabaseAdmin
      .from("proposals")
      .select("proposal_id, conversation_id")
      .eq("proposal_id", id)
      .single();
    if (eProp || !prop) return NextResponse.json({ error: eProp?.message || "Proposal not found" }, { status: 404 });

    if (action === "reject") {
      const { error } = await supabaseAdmin
        .from("proposals")
        .update({ status: "rejected", rejected_by: actor, decided_at: new Date().toISOString() })
        .eq("proposal_id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (prop.conversation_id && actor_auth_id) {
        await supabaseAdmin.from("messages").insert({
          conversation_id: prop.conversation_id,
          sender_auth_id: actor_auth_id,
          sender_role: actor,
          body: `Offer rejected by ${actor} (Proposal #${prop.proposal_id}).`,
        });
        await supabaseAdmin.from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", prop.conversation_id);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "accept") {
      const patch = actor === "client" ? { accepted_by_client: true } : { accepted_by_freelancer: true };
      const { error } = await supabaseAdmin.from("proposals").update(patch).eq("proposal_id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (prop.conversation_id && actor_auth_id) {
        await supabaseAdmin.from("messages").insert({
          conversation_id: prop.conversation_id,
          sender_auth_id: actor_auth_id,
          sender_role: actor,
          body: `Offer accepted by ${actor} (Proposal #${prop.proposal_id}).`,
        });
        await supabaseAdmin.from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", prop.conversation_id);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
