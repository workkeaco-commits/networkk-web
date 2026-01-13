import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";
import { sendEmail, getAppBaseUrl } from "@/lib/email/smtp";
import { buildPasswordResetEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: { message: "Email is required" } }, { status: 400 });
    }

    const redirectTo = `${getAppBaseUrl()}/reset-password`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error) {
      console.error("[forgot-password] generateLink error:", error);
      return NextResponse.json({ ok: true });
    }

    const actionLink =
      (data as any)?.properties?.action_link ||
      (data as any)?.action_link ||
      (data as any)?.url ||
      "";

    if (actionLink) {
      const emailPayload = buildPasswordResetEmail({ resetLink: actionLink });
      try {
        await sendEmail({ to: email, ...emailPayload });
      } catch (err) {
        console.error("[forgot-password] email failed:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[forgot-password] fatal:", err);
    return NextResponse.json({ ok: true });
  }
}
