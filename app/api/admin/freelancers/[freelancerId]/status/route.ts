import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ freelancerId: string }> }
) {
  try {
    const { freelancerId } = await ctx.params;
    const id = Number(freelancerId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid freelancer id" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // ignore set errors in route handlers
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, "", { ...options, maxAge: 0 });
            } catch {
              // ignore remove errors in route handlers
            }
          },
        },
      }
    );

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: adminRow } = await supabaseAdmin
      .from("app_users")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRow?.user_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { status?: string };
    const status = String(body.status || "").toLowerCase();

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("freelancers")
      .update({ approval_status: status })
      .eq("freelancer_id", id)
      .select("freelancer_id, approval_status")
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, freelancer: updated });
  } catch (err: any) {
    console.error("[admin/freelancers/status] fatal:", err?.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
