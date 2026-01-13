import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "../../../../../lib/supabase/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // NEXT 15/16: cookies() is async
  const cookieStore = await cookies();

  // Supabase server client that reads/writes auth cookies
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

  // Auth user from Supabase cookie session
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find this client profile by auth_user_id
  const { data: cli, error: eCli } = await supabaseAdmin
    .from("clients")
    .select("client_id, first_name, last_name, company_name, email")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  // Fallback: match by email if older rows missed auth_user_id
  let client = cli;
  if (!client && auth.user.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("clients")
      .select("client_id, first_name, last_name, company_name, email")
      .eq("email", auth.user.email)
      .maybeSingle();
    client = byEmail || null;
  }

  if (!client) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 400 });
  }

  // Return this client's job posts
  const { data: jobs, error: jobsErr } = await supabaseAdmin
    .from("job_posts")
    .select("job_post_id, title, category, price, price_currency, created_at")
    .eq("client_id", client.client_id)
    .order("created_at", { ascending: false });

  if (jobsErr) {
    return NextResponse.json({ error: jobsErr.message }, { status: 400 });
  }

  return NextResponse.json({
    client: {
      client_id: client.client_id,
      first_name: client.first_name,
      last_name: client.last_name,
      company_name: client.company_name,
    },
    jobs: jobs ?? [],
  });
}
