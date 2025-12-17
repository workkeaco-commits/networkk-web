"use client";

import { useEffect, useState, FormEvent, KeyboardEvent, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

/* ---------------- Helpers ---------------- */
function initials(name?: string | null) {
  if (!name) return "F";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "F";
}
function displayFreelancerName(f?: { first_name?: string | null; last_name?: string | null; full_name?: string | null; }) {
  return f?.full_name || [f?.first_name, f?.last_name].filter(Boolean).join(" ") || "Freelancer";
}
/** Detect proposal marker from a chat message. Accepts:
 *  [[proposal]]:123   OR   "Proposal #123" in free text  */
function parseProposalId(body: string): number | null {
  const m = body.match(/\[\[proposal\]\]\s*:\s*(\d+)/i) || body.match(/Proposal\s*#\s*(\d+)/i);
  const id = m ? Number(m[1]) : NaN;
  return Number.isFinite(id) ? id : null;
}

/* ---------------- Types ---------------- */
type Conversation = {
  id: string;
  job_post_id: number;
  freelancer_id?: number | null;
  created_at: string;
  last_message_at: string | null;
  job_posts?: { title: string | null } | null;
  freelancer?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    personal_img_url: string | null;
  } | null;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  sender_auth_id: string;
  sender_role: "freelancer" | "client" | "admin";
  body: string;
  created_at: string;
};
type Client = { client_id: number; full_name?: string | null };

/* ---------------- Create Offer modal (client) ---------------- */
type Milestone = { title: string; amount: string; days: string };
function OfferInlineModal({
  open, onClose, clientId, freelancerId, jobPostId, conversationId, currentUserId, platformFeePercent = 10,
}: {
  open: boolean;
  onClose: () => void;
  clientId: number | null;
  freelancerId: number | null;
  jobPostId: number | null;
  conversationId: string | null;
  currentUserId: string | null;
  platformFeePercent?: number;
}) {
  const [totalPrice, setTotalPrice] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [milestones, setMilestones] = useState<Milestone[]>([{ title: "", amount: "", days: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTotalPrice(""); setCurrency("EGP");
      setMilestones([{ title: "", amount: "", days: "" }]);
      setSubmitting(false); setServerError(null);
    }
  }, [open]);

  if (!open) return null;

  const toNum = (s: string) => {
    const n = Number((s || "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const money = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

  const totalPriceNum = toNum(totalPrice);
  const sumMilestones = milestones.reduce((acc, m) => acc + toNum(m.amount), 0);
  const feeRate = Math.max(0, Math.min(100, platformFeePercent)) / 100;
  const sumFee = milestones.reduce((acc, m) => acc + toNum(m.amount) * feeRate, 0);
  const sumNet = sumMilestones - sumFee;

  const missing: string[] = [];
  if (!clientId) missing.push("client");
  if (!freelancerId) missing.push("freelancer");
  if (!jobPostId) missing.push("job post");

  const amountsValid = milestones.length > 0 && milestones.every((m) => toNum(m.amount) > 0 && (m.title || "").trim().length > 0);
  const durationValid = milestones.every((m) => Number.isFinite(Number(m.days)) && toNum(m.days) >= 0);
  const sumMatchesTotal = totalPriceNum > 0 && Math.abs(sumMilestones - totalPriceNum) < 0.0001;

  const canSubmit = !missing.length && amountsValid && durationValid && sumMatchesTotal && !submitting;

  const addMilestone = () => setMilestones((m) => [...m, { title: "", amount: "", days: "" }]);
  const removeMilestone = (idx: number) => setMilestones((m) => (m.length > 1 ? m.filter((_, i) => i !== idx) : m));
  const updateMilestone = (idx: number, key: keyof Milestone, val: string) =>
    setMilestones((m) => { const c = [...m]; c[idx] = { ...c[idx], [key]: val }; return c; });

  const handleSubmit = async () => {
    try {
      if (!canSubmit) return;
      setServerError(null); setSubmitting(true);

      const payload = {
        job_post_id: jobPostId!, client_id: clientId!, freelancer_id: freelancerId!,
        conversation_id: conversationId ?? null, origin: "chat" as const, offered_by: "client" as const,
        currency, platform_fee_percent: platformFeePercent,
        message: "Initial offer from client via chat",
        total_price: totalPriceNum,
        milestones: milestones.map((m, i) => ({ order: i + 1, title: (m.title || "").trim(), amount: toNum(m.amount), days: toNum(m.days) })),
      };

      const res = await fetch("/api/proposals/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setServerError(json?.error || "Failed to send offer"); setSubmitting(false); return; }

      // ✉️ drop a system message so both see a clickable chat row
      if (conversationId && currentUserId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_auth_id: currentUserId,
          sender_role: "client",
          body: `[[proposal]]:${json.proposal_id}`,
        });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      }

      onClose();
    } catch (e: any) {
      setServerError(e?.message || "Failed to send offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Create offer / contract</h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>

        {!!missing.length && <p className="mb-3 text-xs text-red-600">Missing: {missing.join(", ")} — cannot submit yet.</p>}

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Total price (project)</label>
              <input value={totalPrice} onChange={(e) => setTotalPrice(e.target.value.replace(/[^\d.]/g, ""))}
                     className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" placeholder="5000" />
              {!sumMatchesTotal && totalPrice && (
                <p className="mt-1 text-[11px] text-amber-600">Milestones sum ({money(sumMilestones)} {currency}) must equal total ({money(totalPriceNum)} {currency}).</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="EGP">EGP</option><option value="USD">USD</option>
                <option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Milestones</label>
              <button type="button" onClick={addMilestone} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">+ Add milestone</button>
            </div>

            <div className="space-y-2">
              {milestones.map((m, i) => {
                const amt = toNum(m.amount), fee = amt * feeRate, net = amt - fee;
                return (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)}
                             className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder={`Milestone #${i + 1} title`} />
                      <input value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value.replace(/[^\d.]/g, ""))}
                             className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Amount" />
                      <input value={m.days} onChange={(e) => updateMilestone(i, "days", e.target.value.replace(/[^\d]/g, ""))}
                             className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Days" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Platform fee {platformFeePercent}%: {money(fee)} {currency}</span>
                      <span>Freelancer receives: <strong className="text-slate-700">{money(net)} {currency}</strong></span>
                    </div>
                    {milestones.length > 1 && (
                      <div className="mt-2 text-right">
                        <button type="button" onClick={() => removeMilestone(i)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px]">
              <div className="flex justify-between"><span>Milestones total</span><span>{money(sumMilestones)} {currency}</span></div>
              <div className="flex justify-between"><span>Platform fee {platformFeePercent}%</span><span>− {money(sumFee)} {currency}</span></div>
              <div className="mt-1 border-t border-slate-200 pt-1 flex justify-between font-medium text-slate-900">
                <span>Freelancer receives</span><span>{money(sumNet)} {currency}</span>
              </div>
            </div>
          </div>

          {serverError && <p className="text-xs text-red-600">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={!canSubmit}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                    title={!sumMatchesTotal ? "Milestones total must equal project total" : !amountsValid ? "Add titles and positive amounts" : undefined}>
              {submitting ? "Sending…" : "Send offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------- Client Offer Viewer (click chat row) --------------- */
type ProposalLite = {
  proposal_id: number;
  offered_by: "client" | "freelancer";
  status: "sent" | "countered" | "pending" | "accepted" | "rejected" | "superseded" | "cancelled";
  currency: string | null;
  platform_fee_percent: number | null;
  message: string | null;
  created_at: string;
  conversation_id: string | null;
  proposal_milestones: Array<{ position: number; title: string | null; amount_gross: number | null; duration_days: number | null; }>;
};
function ClientOfferViewerModal({
  open, onClose, proposalId, conversationId, currentUserId,
}: {
  open: boolean; onClose: () => void;
  proposalId: number | null;
  conversationId: string | null;
  currentUserId: string | null;
}) {
  const [proposal, setProposal] = useState<ProposalLite | null>(null);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Array<{ title: string; amount: string; days: string }>>([]);
  const currency = proposal?.currency || "EGP";
  const total = (proposal?.proposal_milestones || []).reduce((a, m) => a + (Number(m.amount_gross ?? 0) || 0), 0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!open) { setProposal(null); setRows([]); setEditing(false); return; }
      if (!proposalId) { setProposal(null); return; }

      const { data, error } = await supabase
        .from("proposals")
        .select(`
          proposal_id, offered_by, status, currency, platform_fee_percent, message, created_at, conversation_id,
          proposal_milestones:proposal_milestones ( position, title, amount_gross, duration_days )
        `)
        .eq("proposal_id", proposalId)
        .single();

      if (cancelled) return;
      if (error) { setProposal(null); return; }

      const p = data as unknown as ProposalLite;
      setProposal(p);

      const base = (p.proposal_milestones || []).slice().sort((a,b)=>a.position-b.position).map(m => ({
        title: m.title || "", amount: String(m.amount_gross ?? ""), days: String(m.duration_days ?? ""),
      }));
      setRows(base.length ? base : [{ title: "", amount: "", days: "" }]);
    };
    load();
    return () => { cancelled = true; };
  }, [open, proposalId]);

  if (!open) return null;

  const toInt = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

  const acceptOffer = async () => {
    if (!proposal) return;
    const res = await fetch(`/api/proposals/${proposal.proposal_id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", actor: "client" }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json?.error || "Failed to accept"); return; }

    if (conversationId && currentUserId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_auth_id: currentUserId,
        sender_role: "client",
        body: `Offer accepted (Proposal #${proposal.proposal_id}).`,
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    }
    onClose();
  };

  const sendCounter = async () => {
    if (!proposal) return;
    const ms = rows
      .map((r, i) => ({ order: i + 1, title: r.title.trim(), amount: Number(r.amount || 0), days: toInt(r.days) }))
      .filter((m) => m.title && m.amount > 0);
    if (!ms.length) { alert("Add at least one milestone with a title and amount."); return; }

    const res = await fetch(`/api/proposals/${proposal.proposal_id}/counter`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "client", milestones: ms, message: "Counter offer from client via chat" }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json?.error || "Failed to send counter"); return; }

    // chat system message
    if (conversationId && currentUserId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_auth_id: currentUserId,
        sender_role: "client",
        body: `[[proposal]]:${json.proposal_id || proposal.proposal_id}`,
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    }
    onClose();
  };

  const headerLabel =
    proposal?.offered_by === "freelancer" ? "Offer from freelancer" :
    proposal?.offered_by === "client" ? "Your sent offer" : "Offer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {editing ? "Edit & send counter" : headerLabel}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>

        {!proposal ? (
          <p className="text-sm text-slate-600">Offer not found.</p>
        ) : !editing ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-sm text-slate-800">{proposal.message || "Offer"}</p>
              <p className="mt-1 text-xs text-slate-500">Currency: {currency} • Platform fee: {proposal.platform_fee_percent ?? 10}%</p>
              <p className="mt-1 text-xs text-slate-500">Status: {proposal.status}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-900">Milestones</h4>
              <div className="space-y-2">
                {proposal.proposal_milestones
                  .slice().sort((a,b)=>a.position-b.position)
                  .map((m) => (
                    <div key={m.position} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div className="text-slate-800">
                        {m.title || `Milestone #${m.position}`}
                        <span className="ml-2 text-xs text-slate-500">{m.duration_days ? `• ${m.duration_days} days` : ""}</span>
                      </div>
                      <div className="text-slate-900 font-medium">
                        {currency} {(m.amount_gross ?? 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex items-center justify-end pt-1">
                <span className="text-sm text-slate-600 mr-2">Total:</span>
                <span className="text-sm font-semibold text-slate-900">{currency} {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-900">Edit milestones</h4>
              <button type="button" onClick={() => setRows((r) => [...r, { title: "", amount: "", days: "" }])}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700">+ Add</button>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input value={r.title} onChange={(e)=>setRows(s=>{const c=[...s];c[i]={...c[i],title:e.target.value};return c;})}
                         className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder={`Milestone #${i+1} title`} />
                  <input value={r.amount} onChange={(e)=>setRows(s=>{const c=[...s];c[i]={...c[i],amount:e.target.value.replace(/[^\d.]/g,"")};return c;})}
                         className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Amount" />
                  <div className="flex gap-2">
                    <input value={r.days} onChange={(e)=>setRows(s=>{const c=[...s];c[i]={...c[i],days:e.target.value.replace(/[^\d]/g,"")};return c;})}
                           className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Days" />
                    {rows.length > 1 && (
                      <button type="button" onClick={()=>setRows(s=>s.filter((_,idx)=>idx!==i))}
                              className="text-xs text-slate-400 hover:text-red-500" title="Remove">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          {!editing ? (
            <>
              <button type="button" onClick={()=>setEditing(true)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs">Edit & Counter</button>
              {proposal?.offered_by === "freelancer" && (
                <button type="button" onClick={acceptOffer}
                        className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600">Accept offer</button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={()=>setEditing(false)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs">Cancel edit</button>
              <button type="button" onClick={sendCounter}
                      className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600">Send counter</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function ClientMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authChecking, setAuthChecking] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  // offer modals
  const [offerOpen, setOfferOpen] = useState(false);                  // create
  const [viewerOpen, setViewerOpen] = useState(false);                // view/counter
  const [viewerProposalId, setViewerProposalId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auth + client profile
  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.replace("/client/sign-in?next=/client/messages"); return; }
      setCurrentUserId(user.id);

      const { data, error } = await supabase.from("clients").select("client_id").eq("auth_user_id", user.id).single();
      if (cancelled) return;
      if (error || !data) { router.replace("/client/sign-in?next=/client/messages"); return; }

      setClient(data as Client); setAuthChecking(false);
    };
    checkAuth();
    return () => { cancelled = true; };
  }, [router]);

  // Load conversations
  useEffect(() => {
    if (authChecking || !client) return;
    let cancelled = false;

    const fetchWith = async (fields: string) => {
      return supabase.from("conversations").select(`
        id, job_post_id, freelancer_id, created_at, last_message_at,
        job_posts:job_post_id ( title ),
        freelancer:freelancer_id ( ${fields} )
      `).eq("client_id", client.client_id).order("last_message_at", { ascending: false, nullsFirst: false });

    };

    const loadConversations = async () => {
      setLoadingConversations(true);
      let { data, error } = await fetchWith("first_name,last_name,personal_img_url");
      if (error && /column .* does not exist/i.test(error.message || "")) {
        ({ data, error } = await fetchWith("full_name,personal_img_url"));
      }
      if (cancelled) return;
      if (error) { setConversations([]); setLoadingConversations(false); return; }

      const convs = (data || []) as Conversation[];
      setConversations(convs); setLoadingConversations(false);

      const qsId = searchParams.get("conversation");
      if (qsId) {
        const found = convs.find((c) => c.id === qsId);
        setSelectedConversation(found || convs[0] || null);
      } else {
        setSelectedConversation(convs[0] || null);
      }
    };

    loadConversations();
    return () => { cancelled = true; };
  }, [authChecking, client, searchParams]);

  // Load messages + realtime
  useEffect(() => {
    if (!selectedConversation) { setMessages([]); return; }
    let cancelled = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase.from("messages").select("*")
        .eq("conversation_id", selectedConversation.id).order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) setMessages([]); else setMessages((data || []) as MessageRow);
      setLoadingMessages(false);
    };
    loadMessages();

    const channel = supabase.channel(`conversation-${selectedConversation.id}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` },
      (payload) => setMessages((prev) => [...prev, payload.new as MessageRow])
    ).subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selectedConversation]);

  // Realtime conversation list changes for this client
  useEffect(() => {
    if (!client) return;
    const channel = supabase.channel(`client-conversations-${client.client_id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `client_id=eq.${client.client_id}` },
        async (payload) => {
          const newId = (payload.new as any).id as string;
          const { data, error } = await supabase.from("conversations").select(`
            id, job_post_id, freelancer_id, created_at, last_message_at,
            job_posts:job_post_id ( title ),
            freelancer:freelancer_id ( full_name, first_name, last_name, personal_img_url )
          `).eq("id", newId).single();
          if (error || !data) return;
          const conv = data as Conversation;
          setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
          setSelectedConversation((current) => current ?? conv);
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "conversations", filter: `client_id=eq.${client.client_id}` },
        (payload) => {
          const deletedId = (payload.old as any).id as string;
          setConversations((prev) => prev.filter((c) => c.id !== deletedId));
          setMessages((prev) => (selectedConversation && selectedConversation.id === deletedId ? [] : prev));
          setSelectedConversation((current) => (!current || current.id !== deletedId ? current : null));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [client, selectedConversation]);

  // Auto-scroll & mark seen
  useEffect(() => {
    if (!selectedConversation) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedConversation, messages.length]);

useEffect(() => {
  if (!client || !selectedConversation || messages.length === 0) return;

  (async () => {
    try {
      const { error } = await supabase.rpc("mark_messages_seen_as_client");
      if (error) console.error("mark_messages_seen_as_client error", error);
    } catch (err) {
      console.error("mark_messages_seen_as_client threw", err);
    }
  })();
}, [client, selectedConversation, messages.length]);

  /* ---------------- Send message ---------------- */
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;
    const body = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id, sender_auth_id: currentUserId, sender_role: "client", body,
    });
    if (error) setNewMessage(body);
    else await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selectedConversation.id);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as FormEvent); }
  };

  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-4">
          <p className="text-sm text-slate-600">Checking your session…</p>
        </div>
      </main>
    );
  }

  const selectedFreelancerName = displayFreelancerName(selectedConversation?.freelancer);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header stays clean */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
            <p className="text-sm text-slate-500">Chat with freelancers about your jobs.</p>
          </div>
          <button type="button" onClick={() => router.push("/client/dashboard")}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Back to dashboard
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Conversations</h2>
              <span className="text-[11px] text-slate-400">{loadingConversations ? "Loading…" : `${conversations.length} chats`}</span>
            </div>

            {conversations.length === 0 && !loadingConversations ? (
              <p className="mt-4 text-xs text-slate-500">You don&apos;t have any conversations yet.</p>
            ) : (
              <ul className="flex-1 space-y-1 overflow-y-auto">
                {conversations.map((c) => {
                  const isActive = selectedConversation?.id === c.id;
                  const lastTime = c.last_message_at || c.created_at;
                  const name = displayFreelancerName(c.freelancer);
                  const jobTitle = c.job_posts?.title || `Job #${c.job_post_id}`;

                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => setSelectedConversation(c)}
                              className={`w-full rounded-xl px-3 py-2 text-left text-xs ${isActive ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50 border border-transparent"}`}>
                        <div className="flex items-center gap-2">
                          {c.freelancer?.personal_img_url ? (
                            <img src={c.freelancer.personal_img_url} alt={name}
                                 className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-semibold">
                              {initials(name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 leading-tight truncate">{name}</div>
                            <div className="text-[11px] text-slate-500 leading-tight truncate">{jobTitle}</div>
                            <div className="mt-0.5 text-[10px] text-slate-400">{new Date(lastTime).toLocaleString()}</div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Messages pane */}
          <section className="rounded-2xl border border-slate-200 bg-white flex flex-col h-[520px]">
            {selectedConversation ? (
              <>
                {/* ⬇️ This is the header BESIDE chat title */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedConversation.job_posts?.title || `Job #${selectedConversation.job_post_id}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Chat with {selectedFreelancerName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOfferOpen(true)}
                    className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600"
                    title="Create offer / contract"
                  >
                    Create offer / contract
                  </button>
                </div>

                {/* Messages list (with proposal bubbles) */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {loadingMessages ? (
                    <p className="text-xs text-slate-500">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-slate-500">No messages yet. Start a conversation 👋</p>
                  ) : (
                    messages.map((m) => {
                      const isOwn = m.sender_auth_id === currentUserId;
                      const pid = parseProposalId(m.body);
                      const bubbleBase = "max-w-[75%] rounded-2xl px-3 py-2 text-sm";
                      if (pid) {
                        // clickable proposal row
                        return (
                          <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                            <button
                              onClick={() => { setViewerProposalId(pid); setViewerOpen(true); }}
                              className={`${isOwn ? "bg-emerald-500 text-white" : "bg-white text-emerald-700 border border-emerald-200"} ${bubbleBase} shadow-sm hover:shadow`}
                              title="Open offer"
                            >
                              <span className="font-medium">Offer • Proposal #{pid}</span>
                              <span className="block text-[10px] opacity-80">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </button>
                          </div>
                        );
                      }
                      // normal text bubble
                      return (
                        <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`${isOwn ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-900"} ${bubbleBase}`}>
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <span className="mt-1 block text-[10px] text-slate-400 text-right">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="border-t border-slate-200 px-4 py-3 flex items-end gap-2">
                  <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} rows={1}
                            placeholder="Type your message…" className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  <button type="submit" className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                          disabled={!newMessage.trim()}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                Select a conversation from the left to start chatting.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      <OfferInlineModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        clientId={client?.client_id ?? null}
        freelancerId={selectedConversation?.freelancer_id ?? null}
        jobPostId={selectedConversation?.job_post_id ?? null}
        conversationId={selectedConversation?.id ?? null}
        currentUserId={currentUserId}
      />
      <ClientOfferViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        proposalId={viewerProposalId}
        conversationId={selectedConversation?.id ?? null}
        currentUserId={currentUserId}
      />
    </main>
  );
}
