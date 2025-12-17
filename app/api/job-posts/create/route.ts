// app/api/job-posts/create/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- Extract & normalize (keep previous behavior) ---
    const title = String(body.jobTitle || '').trim();
    const duration = String(body.duration || 'short'); // 'short' | 'long'
    const description = String(body.description || '').trim();

    // NEW: numeric FK (required)
    const category_id =
      body.category_id !== undefined && body.category_id !== null
        ? Number(body.category_id)
        : null;

    // Keep skills as comma-separated string
    const skillsArr = Array.isArray(body.skills) ? body.skills : [];
    const skills = skillsArr.join(',');

    const priceNum = Number(String(body.price || '').replace(/,/g, ''));
    const price_currency = String(body.currency || 'EGP');

    if (!title || !Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { error: { message: 'Title and valid price are required' } },
        { status: 400 }
      );
    }
    if (!category_id) {
      return NextResponse.json(
        { error: { message: 'category_id is required' } },
        { status: 400 }
      );
    }

    // --- Determine client_id (same fallback-by-email logic) ---
    let clientId: number | null = null;

    if (body.client_id) {
      clientId = Number(body.client_id);
      if (!Number.isFinite(clientId)) {
        return NextResponse.json(
          { error: { message: 'Invalid client_id' } },
          { status: 400 }
        );
      }
    } else {
      const clientEmail =
        (body.client_email && String(body.client_email)) ||
        process.env.DEV_CLIENT_EMAIL ||
        '';
      if (!clientEmail) {
        return NextResponse.json(
          { error: { message: 'Missing client_email / DEV_CLIENT_EMAIL' } },
          { status: 400 }
        );
      }
      const { data: c, error: eClient } = await supabaseAdmin
        .from('clients')
        .select('client_id')
        .eq('email', clientEmail.toLowerCase())
        .single();

      if (eClient || !c) {
        return NextResponse.json(
          { error: { message: `Client not found for email ${clientEmail}` } },
          { status: 400 }
        );
      }
      clientId = c.client_id;
    }

    // --- Map duration to DB value (unchanged) ---
    const engagement_type = duration === 'long' ? 'long_term' : 'short_term';

    // --- Build row & insert (ONLY schema change is category_id) ---
    const row = {
      client_id: clientId,
      engagement_type,
      title,
      category_id,          // <-- write numeric FK
      description,
      skills,               // comma-separated
      price: priceNum,
      price_currency,
      total_duration_days: null, // keep optional for now
    };

    // Debug (optional): console.log('[jobs/create] inserting row', row);

    const { data: inserted, error: eIns } = await supabaseAdmin
      .from('job_posts')
      .insert(row)
      .select('job_post_id, category_id')
      .single();

    if (eIns) {
      return NextResponse.json(
        { error: { message: eIns.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: true, job_post_id: inserted.job_post_id, category_id: inserted.category_id },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[job-posts/create] fatal:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Server error' } },
      { status: 500 }
    );
  }
}
