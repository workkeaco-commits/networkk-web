import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const conversation_id = url.searchParams.get("conversation_id");
    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
    }

    // Get latest open proposal for this conversation
    const { data, error } = await supabaseAdmin
      .from("proposals")
      .select(
        // ⬅️ IMPORTANT: only real columns here
        "proposal_id,total_gross,platform_fee_percent,currency,status,offered_by,created_at"
      )
      .eq("conversation_id", conversation_id)
      .in("status", ["sent", "countered", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ proposal: null });
    }

    const total_gross = Number(data.total_gross || 0);
    const feePct = Number(data.platform_fee_percent || 0);
    const total_net = Math.max(0, total_gross - (total_gross * feePct) / 100);

    return NextResponse.json({
      proposal: {
        ...data,
        // we compute it here; no DB column required
        total_net,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
