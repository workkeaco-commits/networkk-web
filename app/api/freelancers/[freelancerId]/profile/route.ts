// app/api/freelancers/[freelancerId]/profile/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

type Params = { freelancerId: string };

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { freelancerId } = await ctx.params;
    const id = Number(freelancerId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid freelancer id" }, { status: 400 });
    }

    const [projectsRes, certsRes, eduRes] = await Promise.all([
      supabaseAdmin
        .from("freelancer_projects")
        .select("project_id, project_name, project_description, start_date, end_date, project_url")
        .eq("freelancer_id", id)
        .order("start_date", { ascending: false }),
      supabaseAdmin
        .from("freelancer_certificates")
        .select("certificate_id, name, issuer, issue_date, expiry_date, credential_id, credential_url")
        .eq("freelancer_id", id)
        .order("issue_date", { ascending: false }),
      supabaseAdmin
        .from("freelancer_education")
        .select("education_id, school, degree, field_of_study, start_date, end_date")
        .eq("freelancer_id", id)
        .order("end_date", { ascending: false }),
    ]);

    if (projectsRes.error || certsRes.error || eduRes.error) {
      const msg =
        projectsRes.error?.message ||
        certsRes.error?.message ||
        eduRes.error?.message ||
        "Failed to load freelancer profile details";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      projects: projectsRes.data ?? [],
      certificates: certsRes.data ?? [],
      education: eduRes.data ?? [],
    });
  } catch (e: any) {
    console.error("[freelancers/profile] fatal:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
