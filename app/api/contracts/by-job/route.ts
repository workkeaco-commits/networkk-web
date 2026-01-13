// app/api/contracts/by-job/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const job_post_id_raw = url.searchParams.get("job_post_id");
    const job_post_id = Number(job_post_id_raw);

    if (!Number.isFinite(job_post_id)) {
      return NextResponse.json({ error: "job_post_id is required" }, { status: 400 });
    }

    // Consider active + completed as "locked"
    const { data, error } = await supabaseAdmin
      .from("contracts")
      .select("contract_id, job_post_id, status, proposal_id, created_at")
      .eq("job_post_id", job_post_id)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ contract: data ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
