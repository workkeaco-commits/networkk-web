import { NextResponse } from 'next/server';
import { supabaseAdmin } from "../../../../lib/supabase/supabase/server"; // if alias not set, use ../../../../lib/supabase/server

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

    // 1) Create Auth user (confirmed for MVP)
    const { data: created, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (eAuth) return NextResponse.json({ error: { message: eAuth.message } }, { status: 400 });

    const authUserId = created!.user!.id;

    // 2) Role row
    const { error: eRole } = await supabaseAdmin.from('app_users').insert({ user_id: authUserId, role: 'client' });
    if (eRole) return NextResponse.json({ error: { message: eRole.message } }, { status: 400 });

    // 3) Insert client profile
    // Your clients table (from our schema) has: name, email, phone_number, field, auth_user_id
    const name = accountType === 'company'
      ? (companyName || `${firstName} ${lastName}`.trim())
      : `${firstName} ${lastName}`.trim();

    const field = accountType === 'company' ? companyField : ''; // optional
    const { data: crow, error: eClient } = await supabaseAdmin
      .from('clients')
      .insert({
        auth_user_id: authUserId,
        name, email, phone_number: phone, field,
      })
      .select('client_id')
      .single();

    if (eClient) return NextResponse.json({ error: { message: eClient.message } }, { status: 400 });

    return NextResponse.json({ ok: true, client_id: crow.client_id });
  } catch (err: any) {
    console.error('[client-signup] fatal:', err);
    return NextResponse.json({ error: { message: err.message || 'Server error' } }, { status: 500 });
  }
}
