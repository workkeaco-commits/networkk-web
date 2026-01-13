import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export async function GET() {
  try {
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
      return NextResponse.json({ ok: false, isAdmin: false }, { status: 401 });
    }

    const { data: adminRow } = await supabaseAdmin
      .from("app_users")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .eq("role", "admin")
      .maybeSingle();

    return NextResponse.json({ ok: true, isAdmin: !!adminRow?.user_id });
  } catch (err: any) {
    console.error("[admin/session] fatal:", err?.message || err);
    return NextResponse.json({ ok: false, isAdmin: false }, { status: 500 });
  }
}
