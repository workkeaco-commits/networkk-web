// app/api/proposals/create/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

const ALLOWED_ORIGINS = new Set(["chat", "dashboard", "invite", "system"]);

type MilestoneIn = {
  order?: number; position?: number;
  title?: string;
  amount?: number | string; amount_gross?: number | string;
  days?: number | string; duration_days?: number | string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const job_post_id = toInt(body.job_post_id);
    const client_id = toInt(body.client_id);
    const freelancer_id = toInt(body.freelancer_id);
    const conversation_id = safeStr(body.conversation_id) || null;
    const actor_auth_id = safeStr(body.actor_auth_id) || null; // <-- NEW
    const origin = ALLOWED_ORIGINS.has(String(body.origin)) ? String(body.origin) : "dashboard";
    const offered_by = String(body.offered_by) === "freelancer" ? "freelancer" : "client";
    const currency = safeStr(body.currency) || "EGP";
    const platform_fee_percent = clampInt(toInt(body.platform_fee_percent) ?? 10, 0, 100);
    const message = safeStr(body.message);
    const total_price = toNumber(body.total_price) ?? 0;
    const milestonesIn: MilestoneIn[] = Array.isArray(body.milestones) ? body.milestones : [];

    if (!job_post_id || !client_id || !freelancer_id)
      return NextResponse.json({ error: "Missing job_post_id / client_id / freelancer_id" }, { status: 400 });
    if (!milestonesIn.length)
      return NextResponse.json({ error: "Add at least one milestone" }, { status: 400 });

    const milestones = milestonesIn.map((m: MilestoneIn, idx: number) => {
      const position = toInt(m.order) ?? toInt(m.position) ?? (idx + 1);
      const title = safeStr(m.title) || `Milestone #${position}`;
      const amt = toNumber(m.amount) ?? toNumber(m.amount_gross) ?? 0;
      const days = toInt(m.days) ?? toInt(m.duration_days) ?? 0;
      return { position, title, amount_gross: safeMoney(amt), duration_days: Math.max(0, days) };
    });
    const total_gross = milestones.reduce((s, m) => s + (m.amount_gross || 0), 0);

    if (total_price <= 0)
      return NextResponse.json({ error: "Total price must be > 0" }, { status: 400 });
    if (Math.abs(total_gross - total_price) > 0.0001)
      return NextResponse.json({ error: `Milestones total (${total_gross}) must equal project total (${total_price})` }, { status: 400 });

    const { data: p, error: e1 } = await supabaseAdmin
      .from("proposals")
      .insert([{
        job_post_id, client_id, freelancer_id, conversation_id,
        origin, offered_by, currency, platform_fee_percent, message,
        status: "sent",
        total_gross,
      }])
      .select("proposal_id,conversation_id,total_gross,currency,platform_fee_percent,status")
      .single();
    if (e1 || !p) return NextResponse.json({ error: e1?.message || "Insert failed" }, { status: 400 });

    const rows = milestones.map((m) => ({
      proposal_id: p.proposal_id, position: m.position, title: m.title,
      amount_gross: m.amount_gross, duration_days: m.duration_days,
    }));
    const { error: e2 } = await supabaseAdmin.from("proposal_milestones").insert(rows);
    if (e2) return NextResponse.json({ error: `Milestones insert failed: ${e2.message}` }, { status: 400 });

    // NEW: chat message as the actor (not 'system'), to avoid RLS/foreign key surprises
    if (p.conversation_id && actor_auth_id) {
      const bodyText = `New offer from ${offered_by} • Total ${p.currency} ${Number(p.total_gross || 0)} • Platform fee ${p.platform_fee_percent}% (Proposal #${p.proposal_id}).`;
      const { error: msgErr } = await supabaseAdmin.from("messages").insert({
        conversation_id: p.conversation_id,
        sender_auth_id: actor_auth_id,        // real user id
        sender_role: offered_by,              // 'client' | 'freelancer'
        body: bodyText,
      });
      if (!msgErr) {
        await supabaseAdmin.from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", p.conversation_id);
      }
    }

    return NextResponse.json({
      ok: true,
      proposal_id: p.proposal_id,
      total_gross: p.total_gross,
      platform_fee_percent: p.platform_fee_percent,
      status: p.status,
    });
  } catch (err: any) {
    console.error("[proposals/create] fatal:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

/* helpers unchanged ... */
function toInt(v:any){const n=Number.parseInt(String(v??""),10);return Number.isFinite(n)?n:null}
function toNumber(v:any){if(v==null)return null;const n=Number(String(v).replace(/,/g,""));return Number.isFinite(n)?n:null}
function safeStr(v:any){return v==null?"":String(v).trim()}
function safeMoney(n:number){return Math.round((n??0)*100)/100}
function clampInt(n:number,min:number,max:number){if(!Number.isFinite(n))return min;return Math.max(min,Math.min(max,n))}
