import { NextResponse } from 'next/server';
import { supabaseAdmin } from "../../../../lib/supabase/supabase/server"; // if alias not set, use ../../../../lib/supabase/server
import { sendEmail, getAppBaseUrl } from "@/lib/email/smtp";
import { buildClientActivationEmail } from "@/lib/email/templates";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const accountType = String(form.get('accountType') || 'company'); // 'company' | 'personal'

    const firstName = (form.get('firstName') || '').toString().trim();
    const lastName  = (form.get('lastName')  || '').toString().trim();
    const companyName = (form.get('companyName') || '').toString().trim();
    const companyField = (form.get('companyField') || '').toString().trim();
    const phone = (form.get('phone') || '').toString().trim();
    const email = (form.get('email') || '').toString().toLowerCase().trim();
    const password = (form.get('password') || '').toString();

    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required' } }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: { message: 'First and last name are required' } }, { status: 400 });
    }
    if (accountType === 'company' && !companyName) {
      return NextResponse.json({ error: { message: 'Company name is required' } }, { status: 400 });
    }

    // 1) Create Auth user (confirmed for MVP)
    const { data: created, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: false,
    });
    if (eAuth) return NextResponse.json({ error: { message: eAuth.message } }, { status: 400 });

    const authUserId = created!.user!.id;

    // 2) Role row
    const { error: eRole } = await supabaseAdmin.from('app_users').insert({ user_id: authUserId, role: 'client' });
    if (eRole) return NextResponse.json({ error: { message: eRole.message } }, { status: 400 });

    // 3) Insert client profile
    const field = accountType === 'company' ? companyField : ''; // optional
    const { data: crow, error: eClient } = await supabaseAdmin
      .from('clients')
      .insert({
        auth_user_id: authUserId,
        first_name: firstName,
        last_name: lastName,
        company_name: accountType === 'company' ? companyName : null,
        email,
        phone_number: phone,
        field,
      })
      .select('client_id')
      .single();

    if (eClient) return NextResponse.json({ error: { message: eClient.message } }, { status: 400 });

    try {
      const redirectTo = `${getAppBaseUrl()}/client/sign-in?verified=1`;
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        options: { redirectTo },
      });

      if (linkErr) {
        console.error("[client-signup] activation link error:", linkErr);
      } else {
        const activationLink =
          (linkData as any)?.properties?.action_link ||
          (linkData as any)?.action_link ||
          (linkData as any)?.url ||
          "";
        if (activationLink) {
          const activationEmail = buildClientActivationEmail({
            person: { firstName, lastName, companyName },
            activationLink,
          });
          await sendEmail({ to: email, ...activationEmail });
        }
      }
    } catch (err) {
      console.error("[client-signup] activation email failed:", err);
    }

    return NextResponse.json({ ok: true, client_id: crow.client_id });
  } catch (err: any) {
    console.error('[client-signup] fatal:', err);
    return NextResponse.json({ error: { message: err.message || 'Server error' } }, { status: 500 });
  }
}
