// app/api/jobs/[jobId]/invite/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

type Params = { jobId: string };

export async function GET(
  req: Request,
  ctx: { params: Promise<Params> } // Next 16: params is a Promise
) {
  try {
    const { jobId } = await ctx.params;
    const jobIdNum = Number(jobId);
    if (!Number.isFinite(jobIdNum)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const showAll = url.searchParams.get("all") === "1";

    // 1) Load the job to get its category_id
    const { data: job, error: eJob } = await supabaseAdmin
      .from("job_posts")
      .select("job_post_id, title, category_id")
      .eq("job_post_id", jobIdNum)
      .single();

    if (eJob || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // 2) Fetch freelancers without assuming specific name columns.
    //    We select '*' so missing columns (first_name/last_name) won't crash.
    let q = supabaseAdmin
      .from("freelancers")
      .select("*")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!showAll && job.category_id) {
      q = q.eq("category_id", job.category_id);
    }

    const { data: freelancers, error: eFr } = await q;
    if (eFr) {
      return NextResponse.json({ error: eFr.message }, { status: 400 });
    }

    return NextResponse.json({
      job: {
        job_post_id: job.job_post_id,
        title: job.title,
        category_id: job.category_id,
      },
      freelancers: freelancers ?? [],
      count: freelancers?.length ?? 0,
      matchedOnCategory: !showAll && !!job.category_id,
    });
  } catch (e: any) {
    console.error("[invite/list] fatal:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
