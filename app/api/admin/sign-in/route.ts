import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401 });
    }

    const { data: adminRow } = await supabaseAdmin
      .from("app_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRow?.user_id) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This account is not an admin account." }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/sign-in] fatal:", err?.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
