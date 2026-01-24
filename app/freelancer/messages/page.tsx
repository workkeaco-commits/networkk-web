"use client";

import { Suspense, useEffect, useState, FormEvent, KeyboardEvent, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { Send, FileText, Loader2 } from "lucide-react";
import FreelancerSidebar from "@/components/FreelancerSidebar";
import ChatLayout, { ChatSidebar, ChatWindow } from "@/components/chat/ChatLayout";
import ConversationList from "@/components/chat/ConversationList";
import MessageBubble from "@/components/chat/MessageBubble";
import ProposalBubble from "@/components/chat/ProposalBubble";
import { motion, AnimatePresence } from "framer-motion";

/* ---------------- Helpers ---------------- */
function initials(name?: string | null) {
  if (!name) return "C";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "C";
}

function displayClientName(
  c?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    client_id?: number | null;
  } | null
) {
  if (!c) return "Client";
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return fullName || `Client #${c.client_id || "?"}`;
}

function parseProposalId(body: string): number | null {
  const m =
    body.match(/\[\[proposal\]\]\s*:\s*(\d+)/i) ||
    body.match(/Proposal\s*#\s*(\d+)/i);
  const id = m ? Number(m[1]) : NaN;
  return Number.isFinite(id) ? id : null;
}

function formatPreview(body?: string | null) {
  if (!body) return "";
  if (body.match(/\[\[proposal\]\]\s*:\s*\d+/i)) return "Proposal";
  return body;
}

const EPOCH_ISO = "1970-01-01T00:00:00Z";

/* ---------------- Types ---------------- */
type Conversation = {
  id: string;
  job_post_id: number;
  client_id: number;
  freelancer_id: number;
  created_at: string;
  last_message_at: string | null;
  client_last_seen_at?: string | null;
  freelancer_last_seen_at?: string | null;
  job_posts?: { title: string | null } | null;
  client?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    client_id?: number | null;
  } | null;
  last_message_body?: string | null;
  unread_count?: number;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_auth_id: string;
  sender_role: "freelancer" | "client" | "admin";
  body: string;
  created_at: string;
  is_read?: boolean | null;
};

type ContractLite = { contract_id: number; status: string; proposal_id?: number | null };

/* ---------------- Offer Modal (Create) ---------------- */
type Milestone = { title: string; amount: string; days: string };

function OfferInlineModal({
  open,
  onClose,
  clientId,
  freelancerId,
  jobPostId,
  conversationId,
  currentUserId,
  platformFeePercent = 10,
  locked,
}: {
  open: boolean;
  onClose: () => void;
  clientId: number | null;
  freelancerId: number | null;
  jobPostId: number | null;
  conversationId: string | null;
  currentUserId: string | null;
  platformFeePercent?: number;
  locked: boolean;
}) {
  const [totalPrice, setTotalPrice] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [milestones, setMilestones] = useState<Milestone[]>([{ title: "", amount: "", days: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTotalPrice("");
      setCurrency("EGP");
      setMilestones([{ title: "", amount: "", days: "" }]);
      setSubmitting(false);
      setServerError(null);
    }
  }, [open]);

  if (!open) return null;

  const toNum = (s: string) => {
    const n = Number((s || "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const totalPriceNum = toNum(totalPrice);
  const sumMilestones = milestones.reduce((acc, m) => acc + toNum(m.amount), 0);

  const missing: string[] = [];
  if (!clientId) missing.push("client");
  if (!freelancerId) missing.push("freelancer");
  if (!jobPostId) missing.push("job post");

  const amountsValid =
    milestones.length > 0 &&
    milestones.every((m) => toNum(m.amount) > 0 && (m.title || "").trim().length > 0);

  const durationValid = milestones.every((m) => Number.isFinite(Number(m.days)) && toNum(m.days) >= 0);

  const sumMatchesTotal = totalPriceNum > 0 && Math.abs(sumMilestones - totalPriceNum) < 0.0001;

  const canSubmit = !locked && !missing.length && amountsValid && durationValid && sumMatchesTotal && !submitting;

  const addMilestone = () => setMilestones((m) => [...m, { title: "", amount: "", days: "" }]);
  const removeMilestone = (idx: number) => setMilestones((m) => (m.length > 1 ? m.filter((_, i) => i !== idx) : m));
  const updateMilestone = (idx: number, key: keyof Milestone, val: string) =>
    setMilestones((m) => {
      const c = [...m];
      c[idx] = { ...c[idx], [key]: val };
      return c;
    });

  const handleSubmit = async () => {
    try {
      if (!canSubmit) return;
      setServerError(null);
      setSubmitting(true);

      const payload = {
        job_post_id: jobPostId!,
        client_id: clientId!,
        freelancer_id: freelancerId!,
        conversation_id: conversationId ?? null,
        origin: "chat" as const,
        offered_by: "freelancer" as const,
        currency,
        platform_fee_percent: platformFeePercent,
        message: "Offer from freelancer via chat",
        total_price: totalPriceNum,
        milestones: milestones.map((m, i) => ({
          order: i + 1,
          title: (m.title || "").trim(),
          amount: toNum(m.amount),
          days: toNum(m.days),
        })),
      };

      const res = await fetch("/api/proposals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setServerError(json?.error || "Failed to send offer");
        return;
      }

      onClose();
    } catch (e: unknown) {
      setServerError((e as Error)?.message || "Failed to send offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md transition-all"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
            className="relative z-10 w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-white/60 flex flex-col max-h-[85vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Create Offer</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {locked && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-medium">
                  Contract is active for this job. Proposals are locked.
                </div>
              )}
              {!!missing.length && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-medium">
                  Missing: {missing.join(", ")} — cannot submit.
                </div>
              )}

              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 pt-2">
                      Total Price
                    </label>
                    <input
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value.replace(/[^\d.]/g, ""))}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                      placeholder="e.g. 5000"
                      disabled={locked}
                    />
                    {!sumMatchesTotal && totalPrice && (
                      <p className="text-[11px] text-amber-500 pl-2 font-medium">Milestones sum must equal total.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 pt-2">Currency</label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all outline-none"
                        disabled={locked}
                      >
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Milestones</label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                      disabled={locked}
                    >
                      <span>+</span> Add Phase
                    </button>
                  </div>

                  <div className="space-y-3">
                    {milestones.map((m, i) => (
                      <div
                        key={i}
                        className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm hover:border-gray-200 transition-colors"
                      >
                        <div className="space-y-3">
                          <input
                            value={m.title}
                            onChange={(e) => updateMilestone(i, "title", e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/30 px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-gray-400"
                            placeholder={`Phase ${i + 1} Title`}
                            disabled={locked}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input
                                value={m.amount}
                                onChange={(e) => updateMilestone(i, "amount", e.target.value.replace(/[^\d.]/g, ""))}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/30 pl-3 pr-8 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-gray-400"
                                placeholder="0.00"
                                disabled={locked}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                                $
                              </div>
                            </div>
                            <div className="relative">
                              <input
                                value={m.days}
                                onChange={(e) => updateMilestone(i, "days", e.target.value.replace(/[^\d]/g, ""))}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/30 pl-3 pr-10 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-gray-400"
                                placeholder="0"
                                disabled={locked}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                                Days
                              </div>
                            </div>
                          </div>
                          {milestones.length > 1 && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeMilestone(i)}
                                className="text-[11px] font-bold text-red-400 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                                disabled={locked}
                              >
                                Remove Phase
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {serverError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 flex gap-2">
                    <p className="text-xs text-red-600 font-medium">{serverError}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-[32px] shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-8 py-2.5 rounded-[18px] bg-[#007AFF] text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
              >
                {submitting ? "Sending..." : "Send Offer"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function FreelancerMessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfd]" />}>
      <FreelancerMessagesContent />
    </Suspense>
  );
}

/* ---------------- Offer Viewer (Freelancer) ---------------- */
type ProposalLite = {
  proposal_id: number;
  offered_by: "client" | "freelancer";
  status: "sent" | "countered" | "pending" | "accepted" | "rejected" | "superseded" | "withdrawn";
  currency: string | null;
  platform_fee_percent: number | null;
  message: string | null;
  created_at: string;
  conversation_id: string | null;
  accepted_by_client: boolean;
  accepted_by_freelancer: boolean;
  proposal_milestones: Array<{
    position: number;
    title: string | null;
    amount_gross: number | null;
    duration_days: number | null;
  }>;
};

function FreelancerOfferViewerModal({
  open,
  onClose,
  proposalId,
  conversationId,
  currentUserId,
  locked,
  onAfterAction,
  clickPosition,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: number | null;
  conversationId: string | null;
  currentUserId: string | null;
  locked: boolean;
  onAfterAction: () => void;
  clickPosition: { x: number; y: number } | null;
}) {
  const actorRole = "freelancer" as const;
  const [proposal, setProposal] = useState<ProposalLite | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) {
        setProposal(null);
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
          accepted_by_client, accepted_by_freelancer,
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

      setProposal(data as unknown as ProposalLite);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, proposalId]);

  if (!open) return null;

  const toInt = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
  const currency = proposal?.currency || "EGP";
  const total = (proposal?.proposal_milestones || []).reduce((a, m) => a + (Number(m.amount_gross ?? 0) || 0), 0);
  const isAccepted = proposal?.status === "accepted";

  const actorAccepted = !!proposal?.accepted_by_freelancer;
  const otherAccepted = !!proposal?.accepted_by_client;
  const isOfferor = proposal?.offered_by === actorRole;

  const canAccept =
    !!proposal && !locked && !isOfferor && ["sent", "countered", "pending"].includes(proposal.status) && !actorAccepted;

  const canConfirmContract =
    !!proposal &&
    !locked &&
    isOfferor &&
    otherAccepted &&
    !actorAccepted &&
    ["pending", "sent", "countered"].includes(proposal.status);

  const acceptOffer = async () => {
    if (!proposal) return;

    const res = await fetch(`/api/proposals/${proposal.proposal_id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", actor: "freelancer" }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || "Failed to accept");
      return;
    }

    if (conversationId && currentUserId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_auth_id: currentUserId,
        sender_role: "freelancer",
        body: `Freelancer accepted the offer (Proposal #${proposal.proposal_id}). Waiting for client confirmation.`,
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    }

    onAfterAction();
    onClose();
  };

  const confirmContract = async () => {
    if (!proposal) return;

    const res = await fetch(`/api/proposals/${proposal.proposal_id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", actor: "freelancer" }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || "Failed to confirm");
      return;
    }

    if (conversationId && currentUserId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_auth_id: currentUserId,
        sender_role: "freelancer",
        body: `Freelancer confirmed the contract (Proposal #${proposal.proposal_id}).`,
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    }

    onAfterAction();
    onClose();
  };

  const safeW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const safeH = typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-md"
          />

          <motion.div
            initial={
              clickPosition
                ? {
                    opacity: 0,
                    scale: 0.1,
                    x: clickPosition.x - safeW / 2,
                    y: clickPosition.y - safeH / 2,
                  }
                : { opacity: 0, scale: 0.3, y: 100 }
            }
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={
              clickPosition
                ? {
                    opacity: 0,
                    scale: 0.1,
                    x: clickPosition.x - safeW / 2,
                    y: clickPosition.y - safeH / 2,
                  }
                : { opacity: 0, scale: 0.3, y: 100 }
            }
            transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.5 }}
            className="relative z-10 w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Proposal</h3>
                {isAccepted && (
                  <p className="text-xs text-gray-500 mt-0.5">#{proposal?.proposal_id}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <div className="px-6 py-6 overflow-y-auto flex-1">
              {!proposal ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  <p className="text-sm text-gray-500">Loading proposal...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {isAccepted && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-gray-700 capitalize">{proposal.status}</span>
                      {locked && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-orange-600 font-medium">Contract Active</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-2xl p-5">
                    <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                    <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                      {currency} {total.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {proposal.proposal_milestones.length} milestone{proposal.proposal_milestones.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Milestones</h4>
                    <div className="space-y-2">
                      {proposal.proposal_milestones
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((m, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                              {m.position}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{m.title || "Milestone"}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{m.duration_days} days</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {toInt(String(m.amount_gross || 0)).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-gray-500">{currency}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-4 rounded-xl border ${
                        proposal.accepted_by_client ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Client</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${proposal.accepted_by_client ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className={`text-xs font-semibold ${proposal.accepted_by_client ? "text-green-700" : "text-gray-500"}`}>
                          {proposal.accepted_by_client ? "Approved" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        proposal.accepted_by_freelancer ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Freelancer</p>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${proposal.accepted_by_freelancer ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            proposal.accepted_by_freelancer ? "text-green-700" : "text-gray-500"
                          }`}
                        >
                          {proposal.accepted_by_freelancer ? "Approved" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {proposal && (canAccept || canConfirmContract) && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2 shrink-0">
                {canAccept && (
                  <button
                    onClick={acceptOffer}
                    className="w-full py-3 rounded-xl bg-[#10b8a6] text-white text-sm font-semibold hover:bg-[#0e9f8e] active:scale-[0.98] transition-all"
                  >
                    Accept Proposal
                  </button>
                )}
                {canConfirmContract && (
                  <button
                    onClick={confirmContract}
                    className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all"
                  >
                    Confirm Contract
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Main Page ---------------- */
function FreelancerMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("conversation_id");

  const [currentUser, setCurrentUser] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [myFreelancerId, setMyFreelancerId] = useState<number | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  const [contract, setContract] = useState<ContractLite | null>(null);

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // throttle per conversation
  const lastSeenTouchRef = useRef<Record<string, number>>({});

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const sortedConversations = useMemo(() => {
    const copy = [...conversations];
    copy.sort((a, b) => {
      const aTime = Date.parse(a.last_message_at || a.created_at || "");
      const bTime = Date.parse(b.last_message_at || b.created_at || "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
    return copy;
  }, [conversations]);

  const computeUnreadForFreelancer = useCallback(async (c: Conversation) => {
    const lastSeen = c.freelancer_last_seen_at || EPOCH_ISO;

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", c.id)
      .in("sender_role", ["client", "admin"])
      .gt("created_at", lastSeen);

    if (error) return 0;
    return count ?? 0;
  }, []);

  const markConversationSeen = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    const nowIso = new Date().toISOString();
    const nowMs = Date.parse(nowIso);

    const lastMs = lastSeenTouchRef.current[conversationId] ?? 0;
    if (nowMs - lastMs < 900) return;
    lastSeenTouchRef.current[conversationId] = nowMs;

    const { error } = await supabase.rpc("mark_conversation_seen_as_freelancer", {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error("[chat] mark_conversation_seen_as_freelancer failed:", error);
      return;
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, freelancer_last_seen_at: nowIso, unread_count: 0 } : c
      )
    );
  }, []);

  // 1) Auth + Load Conversations
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.push("/freelancer/sign-in");
        return;
      }
      if (!mounted) return;
      setCurrentUser(user);

      // fetch freelancer id
      const { data: dbFreelancer, error: freelancerErr } = await supabase
        .from("freelancers")
        .select("freelancer_id")
        .eq("auth_user_id", user.id)
        .single();

      if (freelancerErr || !dbFreelancer?.freelancer_id) {
        console.error("Freelancer fetch error:", freelancerErr);
        return;
      }

      const freelancerId = dbFreelancer.freelancer_id as number;
      setMyFreelancerId(freelancerId);

      // load conversations
      const { data: rawConvs, error: convError } = await supabase
        .from("conversations")
        .select("id, job_post_id, client_id, freelancer_id, created_at, last_message_at, client_last_seen_at, freelancer_last_seen_at")
        .eq("freelancer_id", freelancerId)
        .order("last_message_at", { ascending: false });

      if (convError) console.error("Conversation fetch error", convError);
      if (!mounted) return;

      if (!rawConvs?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const jobIds = Array.from(new Set(rawConvs.map((c) => c.job_post_id).filter(Boolean)));
      const { data: jobs } = await supabase.from("job_posts").select("job_post_id, title").in("job_post_id", jobIds);

      const clientIds = Array.from(new Set(rawConvs.map((c) => c.client_id).filter(Boolean)));

      let clients: Array<{
        client_id: number;
        first_name?: string | null;
        last_name?: string | null;
        company_name?: string | null;
      }> = [];
      if (clientIds.length > 0) {
        try {
          const response = await fetch("/api/conversations/client-names", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_ids: clientIds }),
          });
          const json = await response.json();
          clients = json.clients || [];
        } catch (e) {
          console.error("Error fetching client names:", e);
        }
      }

      const enriched = await Promise.all(
        rawConvs.map(async (c) => {
          const job = jobs?.find((j) => String(j.job_post_id) === String(c.job_post_id));
          const client = clients?.find((cl) => String(cl.client_id) === String(c.client_id));

          const { data: lastMsgs } = await supabase
            .from("messages")
            .select("body, created_at")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const unread_count = await computeUnreadForFreelancer(c as Conversation);

          return {
            ...(c as Conversation),
            job_posts: job ? { title: job.title } : undefined,
            client: client || { client_id: c.client_id },
            last_message_body: lastMsgs?.[0]?.body || null,
            unread_count,
          } as Conversation;
        })
      );

      if (!mounted) return;
      setConversations(enriched);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, computeUnreadForFreelancer]);

  // 2) Select Initial
  useEffect(() => {
    if (!loading && initialConvId && conversations.length > 0) {
      const exists = conversations.find((c) => c.id === initialConvId);
      if (exists) setSelectedId(exists.id);
    }
  }, [loading, initialConvId, conversations]);

  // 2.5) Mark seen on open
  useEffect(() => {
    if (!selectedId) return;
    void markConversationSeen(selectedId);
  }, [selectedId, markConversationSeen]);

  // 3) Load Messages + subscribe
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setContract(null);
      return;
    }

    let sub: ReturnType<typeof supabase.channel> | undefined;

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data as MessageRow[]);

      // always mark seen "now" after loading history
      await markConversationSeen(selectedId);

      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);

      // contract status
      const conv = conversations.find((c) => c.id === selectedId);
      if (conv?.job_post_id) {
        const { data: cData } = await supabase
          .from("contracts")
          .select("contract_id, status, proposal_id")
          .eq("job_post_id", conv.job_post_id)
          .in("status", ["active", "completed", "disputed"])
          .maybeSingle();
        setContract(cData || null);
      } else {
        setContract(null);
      }

      sub = supabase
        .channel(`chat:${selectedId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedId}` },
          (payload) => {
            const newMsg = payload.new as MessageRow;

            setMessages((prev) => [...prev, newMsg]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== selectedId) return c;

                const fromOtherSide = newMsg.sender_role !== "freelancer";
                const isActive = document.visibilityState === "visible";

                return {
                  ...c,
                  last_message_at: newMsg.created_at,
                  last_message_body: newMsg.body,
                  unread_count: fromOtherSide && !isActive ? (c.unread_count || 0) + 1 : 0,
                };
              })
            );

            if (newMsg.sender_role !== "freelancer" && document.visibilityState === "visible") {
              void markConversationSeen(selectedId);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [selectedId, conversations, markConversationSeen]);

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedId || !currentUser || !input.trim()) return;

    const txt = input.trim();
    setInput("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      sender_auth_id: currentUser.id,
      sender_role: "freelancer",
      body: txt,
    });

    if (error) {
      console.error("Send error:", error);
      setInput(txt);
      return;
    }

    const nowIso = new Date().toISOString();
    await supabase.from("conversations").update({ last_message_at: nowIso }).eq("id", selectedId);

    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, last_message_at: nowIso, last_message_body: txt, unread_count: 0 } : c))
    );

    void markConversationSeen(selectedId);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/freelancer/sign-in");
  };

  const locked = !!contract;

  return (
    <div className="flex h-screen bg-[#fbfbfd]">
      <FreelancerSidebar onSignOut={handleSignOut} />

      <div className="flex-1 ml-64 h-screen max-h-screen overflow-hidden">
        <ChatLayout>
          <ChatSidebar title="Messages">
            <ConversationList
              conversations={sortedConversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              getAvatar={(c: Conversation) => initials(displayClientName(c.client))}
              getName={(c: Conversation) => displayClientName(c.client)}
              getPreview={(c: Conversation) =>
                formatPreview(c.last_message_body) || c.job_posts?.title || "Project Inquiry"
              }
              getTime={(c: Conversation) =>
                c.last_message_at
                  ? new Date(c.last_message_at as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                  : ""
              }
              getUnreadCount={(c: Conversation) => c.unread_count || 0}
            />
          </ChatSidebar>

          <ChatWindow selectedId={selectedId}>
            <div className="h-[70px] border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-100 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-500">
                  {initials(displayClientName(selectedConv?.client))}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-[15px] leading-tight">{displayClientName(selectedConv?.client)}</h2>
                  <p className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{selectedConv?.job_posts?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOfferModalOpen(true)}
                  className="flex items-center gap-2 bg-[#10b8a6] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#0e9f8e] transition-all shadow-md active:scale-95"
                >
                  <FileText size={14} />
                  <span>Create Offer</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-white scroll-smooth pb-0">
              {messages.map((m) => {
                const isMe = m.sender_role === "freelancer";
                const pid = parseProposalId(m.body);

                if (pid) {
                  return (
                    <ProposalBubble
                      key={m.id}
                      proposalId={pid}
                      isMe={isMe}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setClickPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                        setSelectedProposalId(pid);
                      }}
                    />
                  );
                }

                return (
                  <MessageBubble
                    key={m.id}
                    isMe={isMe}
                    body={m.body}
                    time={new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  />
                );
              })}
              <div ref={bottomRef} className="h-4" />
            </div>

            <div className="p-4 bg-white shrink-0 mb-4 px-6 pt-0">
              <div className="flex items-end gap-3 bg-[#f2f2f5] p-2 rounded-[26px]">
                <div className="flex-1 py-2 pl-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-[15px] placeholder:text-gray-400 resize-none max-h-[100px] overflow-y-auto leading-relaxed"
                    style={{ lineHeight: "1.5" }}
                  />
                </div>

                {input.trim().length > 0 ? (
                  <button
                    onClick={() => void handleSend()}
                    className="w-9 h-9 bg-[#007AFF] rounded-full flex items-center justify-center text-white mb-0.5 shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                ) : (
                  <div className="w-9 h-9" />
                )}
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] text-gray-300 font-medium">Start a new contract or manage existing ones securely.</span>
              </div>
            </div>
          </ChatWindow>
        </ChatLayout>
      </div>

      <OfferInlineModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        clientId={selectedConv?.client_id || null}
        freelancerId={myFreelancerId}
        jobPostId={selectedConv?.job_post_id || null}
        conversationId={selectedId}
        currentUserId={currentUser?.id || null}
        locked={locked}
      />

      <FreelancerOfferViewerModal
        open={!!selectedProposalId}
        onClose={() => setSelectedProposalId(null)}
        proposalId={selectedProposalId}
        conversationId={selectedId}
        currentUserId={currentUser?.id || null}
        locked={locked}
        clickPosition={clickPosition}
        onAfterAction={() => {}}
      />
    </div>
  );
}
