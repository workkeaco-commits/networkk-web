import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../.././../lib/supabase/supabase/server';


export async function POST() {
  // upsert a client + freelancer + a job post
  await supabaseAdmin.from('clients')
    .upsert({ client_id: 1, name: 'ACME', email: 'ops@acme.com' });

  await supabaseAdmin.from('freelancers')
    .upsert({ freelancer_id: 1, full_name: 'Sara Nabil', email: 'sara@example.com', job_title: 'Frontend Dev' });

  await supabaseAdmin.from('job_posts').insert({
    client_id: 1,
    engagement_type: 'short_term',
    title: 'Marketing site',
    category: 'Web',
    description: 'Landing + CMS',
    skills: 'react,nextjs,ui',
    price: 50000,
    total_duration_days: 60
  });

  return NextResponse.json({ ok: true });
}
