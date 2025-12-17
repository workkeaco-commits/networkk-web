// app/api/proposals/[id]/counter/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase/supabase/server';

const OPEN_STATUSES = ['sent', 'countered', 'pending'] as const;
const ALLOWED_ORIGINS = new Set(['chat', 'dashboard', 'invite', 'system']);

type MilestoneIn = {
  order?: number; position?: number;
  title?: string;
  amount?: number | string; amount_gross?: number | string;
  days?: number | string; duration_days?: number | string;
};

export async function POST(req: Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  try {
    const prm: any = (ctx as any).params;
    const unwrapped = typeof prm?.then === 'function' ? await prm : prm;
    const oldId = Number(unwrapped?.id);
    if (!Number.isFinite(oldId)) return NextResponse.json({ error: 'Invalid proposal id' }, { status: 400 });

    const body = await req.json();
    const actor_raw = String(body.actor ?? '').trim().toLowerCase();
    const actor: 'client'|'freelancer' = actor_raw === 'freelancer' ? 'freelancer' : 'client';
    const actor_auth_id = safeStr(body.actor_auth_id) || null;           // <-- NEW
    const conversation_override = safeStr(body.conversation_id) || null;  // <-- NEW
    const currencyOverride = safeStr(body.currency);
    const feeOverride = toInt(body.platform_fee_percent);
    const message = safeStr(body.message);
    const milestonesIn: MilestoneIn[] = Array.isArray(body.milestones) ? body.milestones : [];

    const { data: old, error: eOld } = await supabaseAdmin
      .from('proposals')
      .select('proposal_id,status,client_id,freelancer_id,job_post_id,conversation_id,origin,currency,platform_fee_percent')
      .eq('proposal_id', oldId)
      .single();
    if (eOld || !old) return NextResponse.json({ error: eOld?.message || 'Proposal not found' }, { status: 404 });
    if (!OPEN_STATUSES.includes(old.status as any))
      return NextResponse.json({ error: `Proposal is ${old.status} and cannot be countered` }, { status: 400 });

    const milestones = milestonesIn.map((m, idx) => {
      const position = toInt(m.order) ?? toInt(m.position) ?? (idx + 1);
      const title = safeStr(m.title) || `Milestone #${position}`;
      const amt = toNumber(m.amount) ?? toNumber(m.amount_gross) ?? 0;
      const days = toInt(m.days) ?? toInt(m.duration_days) ?? 0;
      return { position, title, amount_gross: safeMoney(amt), duration_days: Math.max(0, days) };
    });
    const total_gross = milestones.reduce((s, m) => s + (m.amount_gross || 0), 0);

    await supabaseAdmin.from('proposals').update({ status: 'superseded' }).eq('proposal_id', oldId);

    const origin = ALLOWED_ORIGINS.has(String(old.origin)) ? old.origin : 'dashboard';
    const currency = currencyOverride || old.currency || 'EGP';
    const platform_fee_percent = clampInt(feeOverride ?? old.platform_fee_percent ?? 10, 0, 100);
    const convId = old.conversation_id ?? conversation_override; // <-- NEW fallback

    const { data: inserted, error: eIns } = await supabaseAdmin
      .from('proposals')
      .insert({
        job_post_id: old.job_post_id,
        client_id: old.client_id,
        freelancer_id: old.freelancer_id,
        conversation_id: convId ?? null,
        origin,
        offered_by: actor,
        currency,
        platform_fee_percent,
        message,
        status: 'countered',
        total_gross,
      })
      .select('proposal_id,conversation_id,total_gross,currency,platform_fee_percent,status')
      .single();
    if (eIns || !inserted) return NextResponse.json({ error: eIns?.message || 'Insert failed' }, { status: 400 });

    if (milestones.length) {
      const rows = milestones.map((m) => ({
        proposal_id: inserted.proposal_id, position: m.position, title: m.title,
        amount_gross: m.amount_gross, duration_days: m.duration_days,
      }));
      const { error: eMil } = await supabaseAdmin.from('proposal_milestones').insert(rows);
      if (eMil) return NextResponse.json({ error: `Milestones insert failed: ${eMil.message}` }, { status: 400 });
    }

    // NEW: chat message as the actor
    if (inserted.conversation_id && actor_auth_id) {
      const bodyText = `Counter offer from ${actor} • Total ${inserted.currency} ${Number(inserted.total_gross || 0)} • Platform fee ${inserted.platform_fee_percent}% (Proposal #${inserted.proposal_id}).`;
      const { error: msgErr } = await supabaseAdmin.from('messages').insert({
        conversation_id: inserted.conversation_id,
        sender_auth_id: actor_auth_id,
        sender_role: actor,
        body: bodyText,
      });
      if (!msgErr) {
        await supabaseAdmin.from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', inserted.conversation_id);
      }
    }

    return NextResponse.json({
      ok: true,
      proposal_id: inserted.proposal_id,
      total_gross: inserted.total_gross,
      status: inserted.status,
    });
  } catch (err:any) {
    console.error("[proposals/:id/counter] fatal:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

/* helpers */
function toInt(v:any){const n=Number.parseInt(String(v??''),10);return Number.isFinite(n)?n:null}
function toNumber(v:any){if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null}
function safeStr(v:any){return v==null?'':String(v).trim()}
function safeMoney(n:number){return Math.round((n??0)*100)/100}
function clampInt(n:number,min:number,max:number){if(!Number.isFinite(n))return min;return Math.max(min,Math.min(max,n))}
