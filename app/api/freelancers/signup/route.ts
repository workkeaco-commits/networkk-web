import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/supabase/server'; // use alias, not relative

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    // 0) Read multipart
    const form = await req.formData();
    const payloadRaw = String(form.get('payload') || '{}');
    const payload = JSON.parse(payloadRaw);
    const profileFile = form.get('profileImage') as File | null;
    const nationalIdFile = form.get('nationalIdImage') as File | null;

    console.log('[signup] received payload keys:', Object.keys(payload));
    console.log('[signup] files:', {
      profile: !!profileFile && `${profileFile.name} (${profileFile.size}B)`,
      nationalId: !!nationalIdFile && `${nationalIdFile.name} (${nationalIdFile.size}B)`,
    });

    // 1) Auth user
    const full_name = [payload.firstName || '', payload.lastName || ''].filter(Boolean).join(' ');
    const email = String(payload.email || '').toLowerCase();
    const password = String(payload.password || '');
    const phone = String(payload.phone || '');

    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required' } }, { status: 400 });
    }

    const { data: created, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (eAuth) {
      console.error('[signup] createUser error:', eAuth);
      return NextResponse.json({ error: { message: eAuth.message } }, { status: 400 });
    }
    const authUserId = created!.user!.id;
    console.log('[signup] created auth user:', authUserId);

    // 2) Upload files
    let personalImgUrl: string | null = null;
    let nationalIdPath: string | null = null;

    if (profileFile) {
      const avatarPath = `avatars/${authUserId}-${Date.now()}`;
      const { error: eUp1 } = await supabaseAdmin
        .storage.from('public-avatars')
        .upload(avatarPath, profileFile, { upsert: true, contentType: profileFile.type || 'image/jpeg' });
      if (eUp1) {
        console.error('[signup] avatar upload error:', eUp1);
        return NextResponse.json({ error: { message: `Avatar upload: ${eUp1.message}` } }, { status: 400 });
      }
      const { data: pub } = supabaseAdmin.storage.from('public-avatars').getPublicUrl(avatarPath);
      personalImgUrl = pub.publicUrl;
    }

    if (nationalIdFile) {
      const idPath = `ids/${authUserId}-${Date.now()}`;
      const { error: eUp2 } = await supabaseAdmin
        .storage.from('kyc-private')
        .upload(idPath, nationalIdFile, { upsert: true, contentType: nationalIdFile.type || 'image/jpeg' });
      if (eUp2) {
        console.error('[signup] id upload error:', eUp2);
        return NextResponse.json({ error: { message: `ID upload: ${eUp2.message}` } }, { status: 400 });
      }
      nationalIdPath = idPath; // keep path (private)
    }

    // 3) Role row (optional)
    const { error: eRole } = await supabaseAdmin.from('app_users').insert({ user_id: authUserId, role: 'freelancer' });
    if (eRole) {
      console.error('[signup] role insert error:', eRole);
      return NextResponse.json({ error: { message: eRole.message } }, { status: 400 });
    }

    // 4) Profile data
    const jobTitle = String(payload.jobTitle || '');
    const bio = String(payload.bio || '');
    const skills = Array.isArray(payload.skills) ? payload.skills.join(',') : '';

    const { data: frow, error: eProf } = await supabaseAdmin
      .from('freelancers')
      .insert({
        auth_user_id: authUserId,
        full_name, job_title: jobTitle, bio,
        skills, phone_number: phone, email,
        personal_img_url: personalImgUrl,
        national_id_img_url: nationalIdPath,
      })
      .select('freelancer_id')
      .single();

    if (eProf) {
      console.error('[signup] freelancer insert error:', eProf);
      return NextResponse.json({ error: { message: eProf.message } }, { status: 400 });
    }
    const freelancerId = frow.freelancer_id as number;
    console.log('[signup] freelancer_id:', freelancerId);

    // 5) Projects (optional)
    const projects = Array.isArray(payload.projects) ? payload.projects : [];
    if (projects.length) {
      const rows = projects.map((p: any) => ({
        freelancer_id: freelancerId,
        project_name: p.name || '',
        project_description: p.summary || '',
        start_date: p.start ? (p.start + '-01') : null,
        end_date: p.end ? (p.end + '-01') : null,
      }));
      const { error: eProj } = await supabaseAdmin.from('freelancer_projects').insert(rows);
      if (eProj) {
        console.error('[signup] projects insert error:', eProj);
        return NextResponse.json({ error: { message: eProj.message } }, { status: 400 });
      }
    }

    // 6) Education (optional)
    if (payload.education) {
      const ed = payload.education;
      const { error: eEdu } = await supabaseAdmin.from('freelancer_education').insert({
        freelancer_id: freelancerId,
        degree: ed.status === 'degree' ? (ed.degreeType || null) : null,
        field_of_study: ed.status === 'student' ? (ed.studyProgram || null) : null,
        end_date: ed.degreeDate ? ed.degreeDate + '-01' : (ed.expectedGradDate ? ed.expectedGradDate + '-01' : null),
      });
      if (eEdu) {
        console.error('[signup] education insert error:', eEdu);
        return NextResponse.json({ error: { message: eEdu.message } }, { status: 400 });
      }
    }

    // 7) Certificates (optional)
    const certs = Array.isArray(payload.certificates) ? payload.certificates : [];
    if (certs.length) {
      const rows = certs.map((c: any) => ({
        freelancer_id: freelancerId,
        name: c.name || '',
      }));
      const { error: eCert } = await supabaseAdmin.from('freelancer_certificates').insert(rows);
      if (eCert) {
        console.error('[signup] certificates insert error:', eCert);
        return NextResponse.json({ error: { message: eCert.message } }, { status: 400 });
      }
    }

    console.log('[signup] done in', Date.now() - t0, 'ms');
    return NextResponse.json({ ok: true, freelancer_id: freelancerId });
  } catch (err: any) {
    console.error('[signup] fatal:', err);
    return NextResponse.json({ error: { message: err.message || 'Server error' } }, { status: 500 });
  }
}
