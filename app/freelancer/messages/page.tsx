"use client";

import {
  useEffect,
  useState,
  FormEvent,
  KeyboardEvent,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

/* ----------------- helpers ----------------- */
function sumMilestones(ms: Array<{ amount_gross?: number | null }>) {
  return (ms || []).reduce(
    (a, m) => a + (Number(m?.amount_gross ?? 0) || 0),
    0
  );
}

const toNum = (s: string) => {
  const n = Number((s || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number, maxFrac = 2) =>
  (Math.round(n * 100) / 100).toLocaleString("en-US", {
    maximumFractionDigits: maxFrac,
  });

/** Detect proposal marker from a chat message. Accepts:
 *  [[proposal]]:123   OR   "Proposal #123" in free text  */
function parseProposalId(body: string): number | null {
  const m =
    body.match(/\[\[proposal\]\]\s*:\s*(\d+)/i) ||
    body.match(/Proposal\s*#\s*(\d+)/i);
  const id = m ? Number(m[1]) : NaN;
  return Number.isFinite(id) ? id : null;
}

/* ----------------- types ----------------- */
type Conversation = {
  id: string;
  job_post_id: number;
  created_at: string;
  last_message_at: string | null;
  job_posts?: { title: string | null } | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_auth_id: string;
  sender_role: "freelancer" | "client" | "admin";
  body: string;
  created_at: string;
};

type Freelancer = {
  freelancer_id: number;
  full_name: string | null;
};

type ProposalLite = {
  proposal_id: number;
  offered_by: "client" | "freelancer";
  status:
    | "sent"
    | "countered"
    | "pending"
    | "accepted"
    | "rejected"
    | "superseded"
    | "cancelled";
  currency: string | null;
  platform_fee_percent: number | null;
  message: string | null;
  created_at: string;
  conversation_id: string | null;
  proposal_milestones: Array<{
    position: number;
    title: string | null;
    amount_gross: number | null;
    duration_days: number | null;
  }>;
};

/* ----------------- Offer viewer modal (fetch by id; re-openable) ----------------- */
function OfferViewerModal({
  open,
  onClose,
  proposalId,
  conversationId,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: number | null;
  conversationId: string | null;
  currentUserId: string | null;
}) {
  const [proposal, setProposal] = useState<ProposalLite | null>(null);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<
    Array<{ title: string; amount: string; days: string }>
  >([]);
  const [totalPrice, setTotalPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const currency = proposal?.currency || "EGP";
  const platformFeePercent =
    proposal?.platform_fee_percent != null
      ? Math.max(0, Math.min(100, proposal.platform_fee_percent))
      : 10;
  const feeRate = platformFeePercent / 100;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) {
        setProposal(null);
        setRows([]);
        setSubmitting(false);
        setServerError(null);
        setTotalPrice("");
        setEditing(false);
        return;
      }
      if (!proposalId) {
        setProposal(null);
        return;
      }

      const { data, error } = await supabase
        .from("proposals")
        .select(
          `
          proposal_id, offered_by, status, currency, platform_fee_percent, message, created_at, conversation_id,
          proposal_milestones:proposal_milestones ( position, title, amount_gross, duration_days )
        `
        )
        .eq("proposal_id", proposalId)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setProposal(null);
        return;
      }

      const p = data as unknown as ProposalLite;
      setProposal(p);

      const base = (p.proposal_milestones || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((m) => ({
          title: m.title || "",
          amount: String(m.amount_gross ?? ""),
          days: String(m.duration_days ?? ""),
        }));
      setRows(base.length ? base : [{ title: "", amount: "", days: "" }]);

      const origTotal = sumMilestones(p.proposal_milestones || []);
      setTotalPrice(origTotal ? String(origTotal) : "");
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, proposalId]);

  if (!open) return null;

  // totals (view mode)
  const viewTotal = sumMilestones(proposal?.proposal_milestones || []);

  // totals (edit mode)
  const totalPriceNum = toNum(totalPrice);
  const editSumMilestones = rows.reduce((acc, r) => acc + toNum(r.amount), 0);
  const editSumFee = rows.reduce(
    (acc, r) => acc + toNum(r.amount) * feeRate,
    0
  );
  const editSumNet = editSumMilestones - editSumFee;

  // validations
  const amountsValid =
    rows.length > 0 &&
    rows.every((r) => toNum(r.amount) > 0 && (r.title || "").trim().length > 0);
  const durationValid = rows.every(
    (r) => Number.isFinite(Number(r.days)) && toNum(r.days) >= 0
  );
  const sumMatchesTotal =
    totalPriceNum > 0 && Math.abs(editSumMilestones - totalPriceNum) < 0.0001;
  const canCounter =
    editing && amountsValid && durationValid && sumMatchesTotal && !submitting;

  const addRow = () =>
    setRows((r) => [...r, { title: "", amount: "", days: "" }]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  const updateRow = (i: number, k: "title" | "amount" | "days", v: string) =>
    setRows((r) => {
      const c = [...r];
      c[i] = { ...c[i], [k]: k === "title" ? v : v.replace(/[^\d.]/g, "") };
      return c;
    });

  const acceptOffer = async () => {
    if (!proposal) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/proposals/${proposal.proposal_id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", actor: "freelancer" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to accept");

      if (conversationId && currentUserId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_auth_id: currentUserId,
          sender_role: "freelancer",
          body: `Offer accepted (Proposal #${proposal.proposal_id}).`,
        });
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      onClose();
    } catch (e: any) {
      setServerError(e?.message || "Failed to accept");
    } finally {
      setSubmitting(false);
    }
  };

  const sendCounter = async () => {
    if (!proposal || !canCounter) return;

    // two milestone shapes (cover both API variants)
    const milestonesStd = rows
      .map((r, i) => ({
        order: i + 1,
        title: r.title.trim(),
        amount: toNum(r.amount),
        days: toNum(r.days),
      }))
      .filter((m) => m.title && m.amount > 0);

    const milestonesDb = rows
      .map((r, i) => ({
        position: i + 1,
        title: r.title.trim(),
        amount_gross: toNum(r.amount),
        duration_days: toNum(r.days),
      }))
      .filter((m) => m.title && m.amount_gross > 0);

    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        actor: "freelancer",
        offered_by: "freelancer",
        origin: "chat",
        conversation_id: conversationId,
        currency,
        platform_fee_percent: platformFeePercent,
        message: "Counter offer from freelancer via chat",
        total_price: totalPriceNum,
        milestones: milestonesStd,
        proposal_milestones: milestonesDb,
      };

      let res = await fetch(`/api/proposals/${proposal.proposal_id}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let json = await res.json();

      if (!res.ok) {
        const slim = {
          actor: "freelancer",
          offered_by: "freelancer",
          origin: "chat",
          conversation_id: conversationId,
          currency,
          platform_fee_percent: platformFeePercent,
          message: "Counter offer from freelancer via chat",
          milestones: milestonesStd,
          proposal_milestones: milestonesDb,
        };
        const res2 = await fetch(
          `/api/proposals/${proposal.proposal_id}/counter`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slim),
          }
        );
        json = await res2.json();
        if (!res2.ok) throw new Error(json?.error || "Failed to send counter");
      }

      // ensure we reference the NEW proposal id in chat
      let latestId = json?.proposal_id as number | undefined;
      if (!latestId || latestId === proposal.proposal_id) {
        const { data, error } = await supabase
          .from("proposals")
          .select(`proposal_id, status, created_at`)
          .eq("conversation_id", conversationId)
          .in("status", ["sent", "countered", "pending"])
          .order("created_at", { ascending: false })
          .limit(1);
        if (!error && data && data[0]) latestId = data[0].proposal_id;
      }

      if (conversationId && currentUserId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_auth_id: currentUserId,
          sender_role: "freelancer",
          body: `[[proposal]]:${latestId ?? proposal.proposal_id}`,
        });
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      onClose();
    } catch (e: any) {
      setServerError(e?.message || "Failed to send counter");
    } finally {
      setSubmitting(false);
    }
  };

  const headerLabel =
    proposal?.offered_by === "client"
      ? "Offer from client"
      : proposal?.offered_by === "freelancer"
      ? "Your sent offer"
      : "Offer";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {editing ? "Edit & send counter" : headerLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {!proposal ? (
          <p className="text-sm text-slate-600">Offer not found.</p>
        ) : !editing ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-sm text-slate-800">
                {proposal.message || "Offer"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Currency: {currency} • Platform fee: {platformFeePercent}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Status: {proposal.status}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-900">Milestones</h4>
              <div className="space-y-2">
                {proposal.proposal_milestones
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((m) => (
                    <div
                      key={m.position}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <div className="text-slate-800">
                        {m.title || `Milestone #${m.position}`}
                        <span className="ml-2 text-xs text-slate-500">
                          {m.duration_days ? `• ${m.duration_days} days` : ""}
                        </span>
                      </div>
                      <div className="text-slate-900 font-medium">
                        {currency} {(m.amount_gross ?? 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px]">
                <div className="flex justify-between">
                  <span>Milestones total</span>
                  <span>
                    {currency} {money(viewTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee {platformFeePercent}%</span>
                  <span>
                    − {currency} {money(viewTotal * feeRate)}
                  </span>
                </div>
                <div className="mt-1 border-t border-slate-200 pt-1 flex justify-between font-medium text-slate-900">
                  <span>Freelancer receives</span>
                  <span>
                    {currency} {money(viewTotal * (1 - feeRate))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- editing view --- */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">
                  Total price (project)
                </label>
                <input
                  value={totalPrice}
                  onChange={(e) =>
                    setTotalPrice(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  placeholder="5000"
                />
                {!sumMatchesTotal && totalPrice && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Milestones sum ({money(editSumMilestones)} {currency}) must
                    equal total ({money(totalPriceNum)} {currency}).
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Currency
                </label>
                <input
                  value={currency}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-900">
                  Milestones
                </label>
                <button
                  type="button"
                  onClick={addRow}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  + Add milestone
                </button>
              </div>

              <div className="space-y-2">
                {rows.map((r, i) => {
                  const amt = toNum(r.amount);
                  const fee = amt * feeRate;
                  const net = amt - fee;

                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          value={r.title}
                          onChange={(e) => updateRow(i, "title", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          placeholder={`Milestone #${i + 1} title`}
                        />
                        <input
                          value={r.amount}
                          onChange={(e) => updateRow(i, "amount", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          placeholder="Amount"
                        />
                        <input
                          value={r.days}
                          onChange={(e) => updateRow(i, "days", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          placeholder="Days"
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Platform fee {platformFeePercent}%: {currency}{" "}
                          {money(fee)}
                        </span>
                        <span>
                          Freelancer receives:{" "}
                          <strong className="text-slate-700">
                            {currency} {money(net)}
                          </strong>
                        </span>
                      </div>

                      {rows.length > 1 && (
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="text-xs text-slate-400 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px]">
                <div className="flex justify-between">
                  <span>Milestones total</span>
                  <span>
                    {currency} {money(editSumMilestones)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee {platformFeePercent}%</span>
                  <span>
                    − {currency} {money(editSumFee)}
                  </span>
                </div>
                <div className="mt-1 border-t border-slate-200 pt-1 flex justify-between font-medium text-slate-900">
                  <span>Freelancer receives</span>
                  <span>
                    {currency} {money(editSumNet)}
                  </span>
                </div>
              </div>
            </div>

            {serverError && (
              <p className="text-xs text-red-600">{serverError}</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          {!proposal ? null : !editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs"
              >
                Edit & Counter
              </button>
              {proposal?.offered_by === "client" && (
                <button
                  type="button"
                  onClick={acceptOffer}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Processing…" : "Accept offer"}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs"
                disabled={submitting}
              >
                Cancel edit
              </button>
              <button
                type="button"
                onClick={sendCounter}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                disabled={!canCounter}
                title={
                  !sumMatchesTotal
                    ? "Milestones total must equal project total"
                    : !amountsValid
                    ? "Add titles and positive amounts"
                    : !durationValid
                    ? "Days must be numbers ≥ 0"
                    : undefined
                }
              >
                {submitting ? "Sending…" : "Send counter"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Page ----------------- */
export default function FreelancerMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authChecking, setAuthChecking] = useState(true);
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const [newConversationIds, setNewConversationIds] = useState<
    Record<string, boolean>
  >({});

  // latest open proposal (for header button + fallback bubble)
  const [activeProposal, setActiveProposal] = useState<ProposalLite | null>(
    null
  );

  // viewer state (re-openable)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerProposalId, setViewerProposalId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auth
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/freelancer/sign-in?next=/freelancer/messages");
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("freelancers")
        .select("freelancer_id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        router.replace("/freelancer/sign-in?next=/freelancer/messages");
        return;
      }

      setFreelancer(data as unknown as Freelancer);
      setAuthChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Load conversations
  useEffect(() => {
    if (authChecking || !freelancer) return;

    let cancelled = false;

    (async () => {
      setLoadingConversations(true);

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          job_post_id,
          created_at,
          last_message_at,
          job_posts:job_post_id ( title )
        `
        )
        .eq("freelancer_id", freelancer.freelancer_id)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (cancelled) return;

      if (error) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      const convs = (data || []) as unknown as Conversation[];
      setConversations(convs);
      setLoadingConversations(false);

      const qsId = searchParams.get("conversation");
      setSelectedConversation(
        (qsId && convs.find((c) => c.id === qsId)) || convs[0] || null
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecking, freelancer, searchParams]);

  // Realtime: conversation insert/delete
  useEffect(() => {
    if (!freelancer) return;

    const channel = supabase
      .channel(`freelancer-conversations-${freelancer.freelancer_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `freelancer_id=eq.${freelancer.freelancer_id}`,
        },
        async (payload) => {
          const newId = (payload.new as any).id as string;

          const { data, error } = await supabase
            .from("conversations")
            .select(
              `
              id,
              job_post_id,
              created_at,
              last_message_at,
              job_posts:job_post_id ( title )
            `
            )
            .eq("id", newId)
            .single();

          if (error || !data) return;

          const conv = data as unknown as Conversation;

          setConversations((prev) =>
            prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
          );
          setNewConversationIds((prev) => ({ ...prev, [conv.id]: true }));
          setSelectedConversation((current) => current ?? conv);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "conversations",
          filter: `freelancer_id=eq.${freelancer.freelancer_id}`,
        },
        (payload) => {
          const deletedId = (payload.old as any).id as string;
          setConversations((prev) => prev.filter((c) => c.id !== deletedId));
          setNewConversationIds((prev) => {
            const copy = { ...prev };
            delete copy[deletedId];
            return copy;
          });
          setMessages((prev) =>
            selectedConversation && selectedConversation.id === deletedId
              ? []
              : prev
          );
          setSelectedConversation((current) =>
            !current || current.id !== deletedId ? current : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [freelancer, selectedConversation]);

  // Load messages + latest open proposal + realtime
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setActiveProposal(null);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) {
          setMessages([]);
        } else {
          const msgs = (data || []) as unknown as MessageRow[];
          setMessages(msgs);
        }
        setLoadingMessages(false);
        setNewConversationIds((prev) => {
          const copy = { ...prev };
          delete copy[selectedConversation.id];
          return copy;
        });
      }
    };

    const loadProposal = async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select(
          `
            proposal_id,
            offered_by,
            status,
            currency,
            platform_fee_percent,
            message,
            created_at,
            conversation_id,
            proposal_milestones:proposal_milestones ( position, title, amount_gross, duration_days )
          `
        )
        .eq("conversation_id", selectedConversation.id)
        .in("status", ["sent", "countered", "pending"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cancelled) {
        if (error || !data || !data[0]) {
          setActiveProposal(null);
        } else {
          const proposals = data as unknown as ProposalLite[];
          setActiveProposal(proposals[0] ?? null);
        }
      }
    };

    loadMessages();
    loadProposal();

    const msgChan = supabase
      .channel(`conversation-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageRow]);
        }
      )
      .subscribe();

    const propChan = supabase
      .channel(`proposals-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "proposals",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("proposals")
            .select(
              `
                proposal_id,
                offered_by,
                status,
                currency,
                platform_fee_percent,
                message,
                created_at,
                conversation_id,
                proposal_milestones:proposal_milestones ( position, title, amount_gross, duration_days )
              `
            )
            .eq("conversation_id", selectedConversation.id)
            .in("status", ["sent", "countered", "pending"])
            .order("created_at", { ascending: false })
            .limit(1);

          if (data && data[0]) {
            const proposals = data as unknown as ProposalLite[];
            setActiveProposal(proposals[0] ?? null);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(msgChan);
      supabase.removeChannel(propChan);
    };
  }, [selectedConversation]);

  // Auto-scroll
  useEffect(() => {
    if (!selectedConversation) return;
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [selectedConversation, messages.length]);

  // Mark seen
  useEffect(() => {
    if (!freelancer || !selectedConversation || messages.length === 0) return;
    (async () => {
      try {
        const { error } = await supabase.rpc(
          "mark_messages_seen_as_freelancer"
        );
        if (error) {
          console.error("mark_messages_seen_as_freelancer error", error);
        }
      } catch (err) {
        console.error("mark_messages_seen_as_freelancer threw", err);
      }
    })();
  }, [freelancer, selectedConversation, messages.length]);

  // Send message
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const body = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_auth_id: currentUserId,
      sender_role: "freelancer",
      body,
    });

    if (error) {
      setNewMessage(body);
    } else {
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as FormEvent);
    }
  };

  const showHeaderViewButton =
    !!activeProposal &&
    activeProposal.offered_by === "client" &&
    ["sent", "countered", "pending"].includes(activeProposal.status);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
            <p className="text-sm text-slate-500">
              Chat with clients about your job posts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to jobs
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          {/* Left: conversation list */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Conversations
              </h2>
              <span className="text-[11px] text-slate-400">
                {loadingConversations
                  ? "Loading…"
                  : `${conversations.length} chats`}
              </span>
            </div>

            {conversations.length === 0 && !loadingConversations ? (
              <p className="mt-4 text-xs text-slate-500">
                You don&apos;t have any conversations yet.
              </p>
            ) : (
              <ul className="flex-1 space-y-1 overflow-y-auto">
                {conversations.map((c) => {
                  const isActive = selectedConversation?.id === c.id;
                  const title = c.job_posts?.title || `Job #${c.job_post_id}`;
                  const lastTime = c.last_message_at || c.created_at;
                  const isNew = newConversationIds[c.id];

                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedConversation(c)}
                        className={`w-full rounded-xl px-3 py-2 text-left text-xs ${
                          isActive
                            ? "bg-emerald-50 border border-emerald-200"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-slate-900 line-clamp-2">
                            {title}
                          </div>
                          {isNew && (
                            <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {new Date(lastTime).toLocaleString()}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Right: messages */}
          <section className="rounded-2xl border border-slate-200 bg-white flex flex-col h-[520px]">
            {selectedConversation ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedConversation.job_posts?.title ||
                        `Job #${selectedConversation.job_post_id}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Chat with the client
                    </p>
                  </div>

                  {showHeaderViewButton ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeProposal) {
                          setViewerProposalId(activeProposal.proposal_id);
                          setViewerOpen(true);
                        }
                      }}
                      className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600"
                      title="View current offer"
                    >
                      View offer
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400"></span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {loadingMessages ? (
                    <p className="text-xs text-slate-500">
                      Loading messages…
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No messages yet. Say hi to the client 👋
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isOwn = m.sender_auth_id === currentUserId;
                      const pid = parseProposalId(m.body);
                      const bubbleBase =
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm";

                      if (pid) {
                        // clickable proposal row
                        return (
                          <div
                            key={m.id}
                            className={`flex ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setViewerProposalId(pid);
                                setViewerOpen(true);
                              }}
                              className={`${
                                isOwn
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white text-emerald-700 border border-emerald-200"
                              } ${bubbleBase} shadow-sm hover:shadow`}
                              title="Open offer"
                            >
                              <span className="font-medium">
                                Offer • Proposal #{pid}
                              </span>
                              <span className="block text-[10px] opacity-80">
                                {new Date(m.created_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </button>
                          </div>
                        );
                      }

                      // normal text message
                      return (
                        <div
                          key={m.id}
                          className={`flex ${
                            isOwn ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                              isOwn
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <span className="mt-1 block text-[10px] text-slate-400 text-right">
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Fallback synthetic bubble if there is an active offer but no marker yet */}
                  {!loadingMessages &&
                    messages.length > 0 &&
                    activeProposal &&
                    ["sent", "countered", "pending"].includes(
                      activeProposal.status
                    ) &&
                    !messages.some((m) => parseProposalId(m.body)) && (
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            setViewerProposalId(activeProposal.proposal_id);
                            setViewerOpen(true);
                          }}
                          className="max-w-[75%] cursor-pointer rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-left text-sm text-amber-900 hover:bg-amber-100"
                          title="Open offer"
                        >
                          <p className="font-medium">
                            💼 Offer from client — click to open
                          </p>
                          {activeProposal.message && (
                            <p className="mt-0.5 text-[12px] text-amber-800">
                              {activeProposal.message}
                            </p>
                          )}
                          <div className="mt-1 text-[12px] text-amber-800">
                            Total:{" "}
                            <strong>
                              {(activeProposal.currency || "EGP")}{" "}
                              {sumMilestones(
                                activeProposal.proposal_milestones || []
                              ).toLocaleString()}
                            </strong>
                          </div>
                        </button>
                      </div>
                    )}

                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSend}
                  className="border-t border-slate-200 px-4 py-3 flex items-end gap-2"
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type your message…"
                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                    disabled={!newMessage.trim()}
                  >
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

      {/* Offer viewer (accept / counter; always loads by proposalId) */}
      <OfferViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        proposalId={viewerProposalId}
        conversationId={selectedConversation?.id ?? null}
        currentUserId={currentUserId}
      />
    </main>
  );
}
