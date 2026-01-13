"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  Calendar,
  DollarSign,
  MessageCircle,
  User,
  ExternalLink,
  Users,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import JobInviteModal from "@/components/JobInviteModal";

interface JobPostModalProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type Applicant = {
  // initial proposal
  initialProposalId: number;
  rootProposalId: number | null;
  freelancer_id: number;
  created_at: string | null;

  // joined freelancer
  freelancer: {
    first_name: string | null;
    last_name: string | null;
    freelancer_id?: number | null;
    job_title: string | null;
    personal_img_url: string | null;
  };
};

type ProposalDetails = {
  proposal_id: number;
  root_proposal_id: number | null;
  supersedes_proposal_id: number | null;

  job_post_id: number | null;
  client_id: number;
  freelancer_id: number;

  origin: string;
  offered_by: "client" | "freelancer";
  currency: string | null;

  total_gross: number;
  platform_fee_percent: number;

  message: string | null;
  status: string;

  accepted_by_client: boolean;
  accepted_by_freelancer: boolean;

  created_at: string | null;
  decided_at: string | null;
  valid_until: string | null;

  conversation_id: string | null;
};

type ProposalMilestone = {
  position: number | null;
  title: string | null;
  amount_gross: number | null;
  duration_days: number | null;
};

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms)) return "—";

  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function money(n: number, currency?: string | null) {
  const cur = currency || "EGP";
  const val = Number(n || 0);
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`;
}

function computeNet(totalGross: number, feePct: number) {
  const tg = Number(totalGross || 0);
  const fp = Number(feePct || 0);
  return Math.max(0, tg - (tg * fp) / 100);
}

function displayFreelancerName(f?: { first_name?: string | null; last_name?: string | null; freelancer_id?: number | null } | null) {
  if (!f) return "Freelancer";
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ").trim();
  return name || `Freelancer #${f.freelancer_id || "?"}`;
}

export default function JobPostModal({ job, isOpen, onClose }: JobPostModalProps) {
  // ====== Applicants (from initial freelancer proposals) ======
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantsError, setApplicantsError] = useState<string | null>(null);

  // ====== Proposal details popup ======
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [milestones, setMilestones] = useState<ProposalMilestone[]>([]);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);

  const router = useRouter();

  const jobPostId: number | null = useMemo(() => {
    const v = job?.job_post_id;
    return typeof v === "number" ? v : v ? Number(v) : null;
  }, [job?.job_post_id]);

  // Load applicants from DB when modal opens
  useEffect(() => {
    if (!isOpen || !jobPostId) return;

    let cancelled = false;

    (async () => {
      setLoadingApplicants(true);
      setApplicantsError(null);

      try {
        /**
         * Initial freelancer proposals only:
         * - offered_by = 'freelancer'
         * - supersedes_proposal_id IS NULL
         * - origin = 'dashboard'   ✅ EXCLUDE CHAT
         */
        const { data, error } = await supabase
          .from("proposals")
          .select(
            `
              proposal_id,
              root_proposal_id,
              freelancer_id,
              created_at,
              freelancers!proposals_freelancer_id_fkey (
                first_name,
                last_name,
                job_title,
                personal_img_url
              )
            `
          )
          .eq("job_post_id", jobPostId)
          .eq("origin", "dashboard") // ✅ only dashboard, not chat
          .eq("offered_by", "freelancer")
          .is("supersedes_proposal_id", null)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped: Applicant[] = (data || [])
          .map((r: any) => ({
            initialProposalId: Number(r.proposal_id),
            rootProposalId: r.root_proposal_id ? Number(r.root_proposal_id) : null,
            freelancer_id: Number(r.freelancer_id),
            created_at: r.created_at ?? null,
            freelancer: {
              first_name: r.freelancers?.first_name ?? null,
              last_name: r.freelancers?.last_name ?? null,
              freelancer_id: r.freelancer_id,
              job_title: r.freelancers?.job_title ?? null,
              personal_img_url: r.freelancers?.personal_img_url ?? null,
            },
          }))
          .filter((x) => Number.isFinite(x.initialProposalId) && Number.isFinite(x.freelancer_id));

        // Dedupe by freelancer_id (keep latest initial proposal)
        const seen = new Set<number>();
        const deduped: Applicant[] = [];
        for (const a of mapped) {
          if (seen.has(a.freelancer_id)) continue;
          seen.add(a.freelancer_id);
          deduped.push(a);
        }

        if (!cancelled) setApplicants(deduped);
      } catch (e: any) {
        console.error("Applicants load failed:", e);
        if (!cancelled) {
          setApplicants([]);
          setApplicantsError(e?.message || "Failed to load proposals.");
        }
      } finally {
        if (!cancelled) setLoadingApplicants(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, jobPostId]);

  useEffect(() => {
    if (!isOpen) setIsInviteOpen(false);
  }, [isOpen]);

  useEffect(() => {
    setIsInviteOpen(false);
  }, [jobPostId]);

  // Open proposal details popup and load latest proposal in the chain
  async function openProposalForApplicant(a: Applicant) {
    setSelectedApplicant(a);
    setIsProposalOpen(true);

    setProposalLoading(true);
    setProposalError(null);
    setProposal(null);
    setMilestones([]);

    try {
      const rootId = a.rootProposalId ?? a.initialProposalId;

      // Prefer latest in chain, but ONLY if origin is dashboard (exclude chat)
      const { data: latest, error: latestErr } = await supabase
        .from("proposals")
        .select(
          `
          proposal_id,
          root_proposal_id,
          supersedes_proposal_id,
          job_post_id,
          client_id,
          freelancer_id,
          origin,
          offered_by,
          currency,
          total_gross,
          platform_fee_percent,
          message,
          status,
          accepted_by_client,
          accepted_by_freelancer,
          created_at,
          decided_at,
          valid_until,
          conversation_id
        `
        )
        .eq("job_post_id", jobPostId)
        .eq("root_proposal_id", rootId)
        .eq("origin", "dashboard") // ✅ only dashboard, not chat
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let p = latest;

      if (latestErr) throw latestErr;

      // fallback to initial proposal (already dashboard due to applicants query)
      if (!p) {
        const { data: fallback, error: fbErr } = await supabase
          .from("proposals")
          .select(
            `
            proposal_id,
            root_proposal_id,
            supersedes_proposal_id,
            job_post_id,
            client_id,
            freelancer_id,
            origin,
            offered_by,
            currency,
            total_gross,
            platform_fee_percent,
            message,
            status,
            accepted_by_client,
            accepted_by_freelancer,
            created_at,
            decided_at,
            valid_until,
            conversation_id
          `
          )
          .eq("proposal_id", a.initialProposalId)
          .single();

        if (fbErr) throw fbErr;
        p = fallback;
      }

      const normalized: ProposalDetails = {
        proposal_id: Number((p as any).proposal_id),
        root_proposal_id: (p as any).root_proposal_id ? Number((p as any).root_proposal_id) : null,
        supersedes_proposal_id: (p as any).supersedes_proposal_id
          ? Number((p as any).supersedes_proposal_id)
          : null,
        job_post_id: (p as any).job_post_id ?? null,
        client_id: Number((p as any).client_id),
        freelancer_id: Number((p as any).freelancer_id),
        origin: String((p as any).origin || ""),
        offered_by: ((p as any).offered_by === "freelancer" ? "freelancer" : "client") as any,
        currency: (p as any).currency ?? "EGP",
        total_gross: Number((p as any).total_gross || 0),
        platform_fee_percent: Number((p as any).platform_fee_percent || 0),
        message: (p as any).message ?? null,
        status: String((p as any).status || ""),
        accepted_by_client: Boolean((p as any).accepted_by_client),
        accepted_by_freelancer: Boolean((p as any).accepted_by_freelancer),
        created_at: (p as any).created_at ?? null,
        decided_at: (p as any).decided_at ?? null,
        valid_until: (p as any).valid_until ?? null,
        conversation_id: (p as any).conversation_id ?? null,
      };

      setProposal(normalized);

      // Load milestones for that proposal
      const { data: ms, error: msErr } = await supabase
        .from("proposal_milestones")
        .select("position,title,amount_gross,duration_days")
        .eq("proposal_id", normalized.proposal_id)
        .order("position", { ascending: true });

      if (msErr) throw msErr;

      setMilestones(
        (ms || []).map((m: any) => ({
          position: m.position ?? null,
          title: m.title ?? null,
          amount_gross: m.amount_gross != null ? Number(m.amount_gross) : null,
          duration_days: m.duration_days != null ? Number(m.duration_days) : null,
        }))
      );
    } catch (e: any) {
      console.error("Proposal load failed:", e);
      setProposalError(e?.message || "Failed to load proposal details.");
    } finally {
      setProposalLoading(false);
    }
  }

  function closeProposalPopup() {
    setIsProposalOpen(false);
    setSelectedApplicant(null);
    setProposal(null);
    setMilestones([]);
    setProposalError(null);
    setProposalLoading(false);
  }

  async function openConversationForApplicant(a: Applicant) {
    if (!jobPostId) return;

    setChatLoadingId(a.freelancer_id);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        router.push("/client/sign-in?next=/client/dashboard");
        return;
      }

      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("client_id")
        .eq("auth_user_id", user.id)
        .single();

      if (clientErr || !clientRow) {
        throw new Error("Could not find your client profile.");
      }

      const clientId = clientRow.client_id as number;

      const { data: jobRow, error: jobErr } = await supabase
        .from("job_posts")
        .select("client_id")
        .eq("job_post_id", jobPostId)
        .single();

      if (jobErr || !jobRow) {
        throw new Error("Job post not found.");
      }

      if (jobRow.client_id !== clientId) {
        throw new Error("You are not allowed to message freelancers for this job.");
      }

      const { data: existingConv, error: convErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("job_post_id", jobPostId)
        .eq("client_id", clientId)
        .eq("freelancer_id", a.freelancer_id)
        .maybeSingle();

      if (convErr) {
        console.error("Error checking existing conversation", convErr);
      }

      let conversationId: string;

      if (existingConv && existingConv.id) {
        conversationId = existingConv.id as string;
      } else {
        const { data: newConv, error: newConvErr } = await supabase
          .from("conversations")
          .insert({
            job_post_id: jobPostId,
            client_id: clientId,
            freelancer_id: a.freelancer_id,
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (newConvErr || !newConv) {
          console.error("Error creating conversation", newConvErr);
          throw new Error("Could not create conversation.");
        }

        conversationId = newConv.id as string;
      }

      router.push(`/client/messages?conversation_id=${conversationId}`);
    } catch (e: any) {
      console.error("Open conversation failed:", e?.message || e);
    } finally {
      setChatLoadingId(null);
    }
  }

  if (!job) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-2xl"
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* Content Wrapper */}
          <div className="relative z-10 w-full max-w-6xl space-y-8 my-auto">
            {/* WINDOW 1: PROJECT DETAILS */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
              className="bg-white border border-white/50 rounded-[48px] shadow-2xl p-10 flex flex-col md:flex-row gap-10 items-start overflow-hidden"
            >
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        job.engagement_type === "long_term" ? "bg-indigo-600" : "bg-green-600"
                      }`}
                    />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                      {job.engagement_type === "long_term" ? "Retainer" : "Milestone"}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="md:hidden w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h2 className="text-4xl font-bold tracking-tight text-gray-900 leading-tight pr-10">
                  {job.title}
                </h2>

                <p className="text-[17px] text-gray-400 font-medium leading-[1.7] max-w-2xl">
                  {job.description}
                </p>
              </div>

              <div className="w-full md:w-72 space-y-4">
                <div className="bg-[#fbfbfd] p-6 rounded-[32px] border border-gray-50 flex flex-col justify-between h-32">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-gray-300" />
                    <span className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                      Total Budget
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {job.price}{" "}
                    <span className="text-sm font-bold text-gray-300 uppercase">
                      {job.price_currency || "EGP"}
                    </span>
                  </div>
                </div>

                <div className="bg-[#fbfbfd] p-6 rounded-[32px] border border-gray-50 flex flex-col justify-between h-32">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-300" />
                    <span className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                      Posting Date
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {typeof window !== "undefined"
                      ? new Date(job.created_at).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : ""}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="hidden md:flex w-full bg-black text-white py-5 rounded-[28px] font-bold text-[15px] tracking-tight hover:opacity-90 active:scale-[0.98] transition-all items-center justify-center gap-2 shadow-xl shadow-black/10"
                >
                  Close Case
                </button>
              </div>
            </motion.div>

            {/* WINDOW 2: APPLICANTS (DB) */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8, delay: 0.05 }}
              className="bg-white/90 backdrop-blur-md border border-white/50 rounded-[48px] shadow-xl p-10 space-y-8"
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Top Applicants</h3>
                  <div className="h-6 w-[1px] bg-gray-200" />
                  <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">
                    {loadingApplicants ? "Loading…" : `${applicants.length} Matches`}
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 cursor-not-allowed">
                    <User size={14} />
                  </div>
                </div>
              </div>

              {applicantsError && (
                <div className="mx-2 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
                  <AlertCircle size={18} />
                  <span>{applicantsError}</span>
                </div>
              )}

              {loadingApplicants ? (
                <div className="mx-2 rounded-3xl border border-gray-100 bg-white px-5 py-8 flex items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="animate-spin" size={18} />
                  Loading proposals…
                </div>
              ) : applicants.length === 0 ? (
                <div className="mx-2 rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-gray-500">
                  <div className="text-sm font-medium">No dashboard proposals yet for this job.</div>
                  <div className="mt-4 flex items-center justify-center">
                    <button
                      onClick={() => {
                        if (!jobPostId) return;
                        setIsInviteOpen(true);
                      }}
                      className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition-all"
                    >
                      Find matched freelancers
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
                  {applicants.map((a, idx) => (
                    <motion.div
                      key={`${a.freelancer_id}-${a.initialProposalId}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + idx * 0.05 }}
                      className="snap-start min-w-[280px] group bg-white border border-gray-100 p-6 rounded-[36px] hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col justify-between h-[260px]"
                    >
                      <div>
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-3xl bg-[#fbfbfd] flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all duration-500 overflow-hidden">
                            {a.freelancer.personal_img_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.freelancer.personal_img_url}
                                alt={displayFreelancerName(a.freelancer)}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={28} />
                            )}
                          </div>
                          <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                            <ExternalLink size={16} />
                          </div>
                        </div>

                        <h4 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {displayFreelancerName(a.freelancer)}
                        </h4>
                        <p className="text-sm font-medium text-gray-400">
                          {a.freelancer.job_title || "Freelancer"}
                        </p>

                        <p className="mt-3 text-xs font-bold text-gray-300 uppercase tracking-widest">
                          Applied {timeAgo(a.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <button
                          className="flex-1 bg-[#f4f4f5] text-gray-900 py-3 rounded-2xl text-[13px] font-bold hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                          onClick={() => openProposalForApplicant(a)}
                        >
                          <FileText size={16} />
                          View proposal
                        </button>

                        <button
                          className={`w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 ${
                            chatLoadingId === a.freelancer_id ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          onClick={() => openConversationForApplicant(a)}
                          disabled={chatLoadingId === a.freelancer_id}
                          title="Chat"
                        >
                          {chatLoadingId === a.freelancer_id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <MessageCircle size={20} />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + applicants.length * 0.05 }}
                    className="snap-start min-w-[280px] bg-gray-50/50 border border-dashed border-gray-200 rounded-[36px] flex flex-col items-center justify-center p-8 text-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300">
                      <Users size={20} />
                    </div>
                    <p className="text-sm font-bold text-gray-400 tracking-tight">
                      Looking for more?
                      <br />
                      Invite some people.
                    </p>
                    <button
                      onClick={() => {
                        if (!jobPostId) return;
                        setIsInviteOpen(true);
                      }}
                      className="bg-white border border-gray-100 px-6 py-2 rounded-xl text-xs font-bold text-gray-900 hover:bg-black hover:text-white transition-all"
                    >
                      Find More Talents
                    </button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ===== NESTED POPUP: Proposal Details ===== */}
          <AnimatePresence>
            {isProposalOpen && selectedApplicant && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center px-6 py-10">
                {/* overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeProposalPopup}
                  className="fixed inset-0 bg-black/35 backdrop-blur-xl"
                />

                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ type: "spring", damping: 24, stiffness: 220 }}
                  className="relative z-[111] w-full max-w-3xl bg-white rounded-[40px] border border-white/60 shadow-2xl p-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-3xl bg-[#fbfbfd] border border-gray-100 overflow-hidden flex items-center justify-center text-gray-300">
                        {selectedApplicant.freelancer.personal_img_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedApplicant.freelancer.personal_img_url}
                            alt={displayFreelancerName(selectedApplicant.freelancer)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={28} />
                        )}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">
                          {displayFreelancerName(selectedApplicant.freelancer)}
                        </div>
                        <div className="text-sm font-medium text-gray-400">
                          {selectedApplicant.freelancer.job_title || "Freelancer"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={closeProposalPopup}
                      className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-all"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {proposalError && (
                    <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
                      <AlertCircle size={18} />
                      <span>{proposalError}</span>
                    </div>
                  )}

                  {proposalLoading ? (
                    <div className="mt-8 rounded-3xl border border-gray-100 bg-white px-5 py-8 flex items-center justify-center gap-3 text-gray-500">
                      <Loader2 className="animate-spin" size={18} />
                      Loading proposal details…
                    </div>
                  ) : proposal ? (
                    <>
                      {/* meta */}
                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-3xl bg-[#fbfbfd] border border-gray-50 p-5">
                          <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                            Status
                          </div>
                          <div className="mt-1 text-lg font-bold text-gray-900">{proposal.status}</div>
                          <div className="mt-1 text-xs font-bold text-gray-300 uppercase tracking-widest">
                            {timeAgo(proposal.created_at)}
                          </div>
                        </div>

                        <div className="rounded-3xl bg-[#fbfbfd] border border-gray-50 p-5">
                          <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                            Total (gross)
                          </div>
                          <div className="mt-1 text-lg font-bold text-gray-900">
                            {money(proposal.total_gross, proposal.currency)}
                          </div>
                          <div className="mt-1 text-xs text-gray-400 font-medium">
                            Fee: {proposal.platform_fee_percent}%
                          </div>
                        </div>

                        <div className="rounded-3xl bg-[#fbfbfd] border border-gray-50 p-5">
                          <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                            Total (net)
                          </div>
                          <div className="mt-1 text-lg font-bold text-gray-900">
                            {money(computeNet(proposal.total_gross, proposal.platform_fee_percent), proposal.currency)}
                          </div>
                          <div className="mt-1 text-xs text-gray-400 font-medium">
                            Offered by: {proposal.offered_by}
                          </div>
                        </div>
                      </div>

                      {/* message */}
                      <div className="mt-6">
                        <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                          Proposal message
                        </div>
                        <div className="mt-2 rounded-3xl border border-gray-100 bg-white p-5 text-sm text-gray-600 leading-relaxed">
                          {proposal.message?.trim() ? proposal.message : "No message provided."}
                        </div>
                      </div>

                      {/* milestones */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                            Milestones
                          </div>
                        </div>

                        {milestones.length === 0 ? (
                          <div className="mt-2 rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-gray-500">
                            No milestones found for this proposal.
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {milestones.map((m, i) => (
                              <div
                                key={`${m.position ?? i}-${i}`}
                                className="rounded-3xl border border-gray-100 bg-white p-5 flex items-center justify-between gap-4"
                              >
                                <div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {m.title || `Milestone ${m.position ?? i + 1}`}
                                  </div>
                                  <div className="text-xs text-gray-400 font-medium mt-1">
                                    Duration: {m.duration_days ?? 0} day(s)
                                  </div>
                                </div>

                                <div className="text-sm font-bold text-gray-900">
                                  {money(Number(m.amount_gross || 0), proposal.currency)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-gray-500">
                      Proposal not found.
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {jobPostId && (
            <JobInviteModal
              jobId={jobPostId}
              isOpen={isInviteOpen}
              onClose={() => setIsInviteOpen(false)}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
