"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  Calendar,
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
    freelancer_id: number;
    job_title: string | null;
    personal_img_url: string | null;
    bio?: string | null;
    skills?: string | null;
    created_at?: string | null;
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

type FreelancerProject = {
  project_id: number;
  project_name: string | null;
  project_description: string | null;
  start_date: string | null;
  end_date: string | null;
  project_url: string | null;
};

type FreelancerCertificate = {
  certificate_id: number;
  name: string | null;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
};

type FreelancerEducation = {
  education_id: number;
  school: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
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

function initials(name?: string | null) {
  if (!name) return "F";
  const parts = name.split(" ").filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "F";
}

function formatProjectMonth(value?: string | null) {
  if (!value) return "";
  const [year, month] = String(value).slice(0, 7).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = months[Number(month) - 1] || value;
  return `${label} ${year}`;
}

function formatProjectRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "";
  const startLabel = start ? formatProjectMonth(start) : "—";
  const endLabel = end ? formatProjectMonth(end) : "Present";
  return `${startLabel} - ${endLabel}`;
}

function formatCertificateDates(issue?: string | null, expiry?: string | null) {
  const parts = [];
  if (issue) parts.push(`Issued ${formatProjectMonth(issue)}`);
  if (expiry) parts.push(`Expires ${formatProjectMonth(expiry)}`);
  return parts.join(" | ");
}

function formatEducationEndYear(end?: string | null) {
  if (!end) return "Present";
  return String(end).slice(0, 4);
}

function money(n: number, currency?: string | null) {
  const cur = currency || "EGP";
  const val = Number(n || 0);
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`;
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
  const [proposalActionLoading, setProposalActionLoading] = useState(false);
  const [proposalActionError, setProposalActionError] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileFreelancer, setProfileFreelancer] = useState<Applicant["freelancer"] | null>(null);
  const [profileProjects, setProfileProjects] = useState<FreelancerProject[]>([]);
  const [profileCertificates, setProfileCertificates] = useState<FreelancerCertificate[]>([]);
  const [profileEducation, setProfileEducation] = useState<FreelancerEducation[]>([]);
  const [profileDetailsLoading, setProfileDetailsLoading] = useState(false);

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
                personal_img_url,
                bio,
                skills,
                created_at
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
              freelancer_id: Number(r.freelancer_id),
              job_title: r.freelancers?.job_title ?? null,
              personal_img_url: r.freelancers?.personal_img_url ?? null,
              bio: r.freelancers?.bio ?? null,
              skills: r.freelancers?.skills ?? null,
              created_at: r.freelancers?.created_at ?? null,
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
    if (!isOpen) {
      setIsInviteOpen(false);
      setProfileModalOpen(false);
      setProfileFreelancer(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsInviteOpen(false);
    setProfileModalOpen(false);
    setProfileFreelancer(null);
  }, [jobPostId]);

  // Open proposal details popup and load latest proposal in the chain
  async function openProposalForApplicant(a: Applicant) {
    setSelectedApplicant(a);
    setIsProposalOpen(true);

    setProposalLoading(true);
    setProposalError(null);
    setProposalActionError(null);
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
    setProposalActionError(null);
    setProposalLoading(false);
  }

  async function ensureChatForProposal(proposalId: number) {
    const res = await fetch(`/api/proposals/${proposalId}/ensure-chat`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || "Failed to open chat");
    }
    return json?.conversation_id as string | null;
  }

  async function handleAcceptProposal() {
    if (!proposal) return;
    setProposalActionLoading(true);
    setProposalActionError(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.proposal_id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", actor: "client" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to accept offer");
      }

      setProposal((prev) =>
        prev ? { ...prev, status: "pending", accepted_by_client: true } : prev
      );

      const conversationId = await ensureChatForProposal(proposal.proposal_id);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && conversationId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_auth_id: user.id,
          sender_role: "client",
          body: `Client accepted the offer (Proposal #${proposal.proposal_id}). Waiting for freelancer to confirm.`,
        });
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    } catch (err: any) {
      setProposalActionError(err?.message || "Failed to accept offer.");
    } finally {
      setProposalActionLoading(false);
    }
  }

  async function handleReplyInChat() {
    if (!proposal) return;
    setReplyLoading(true);
    setProposalActionError(null);
    try {
      const conversationId = await ensureChatForProposal(proposal.proposal_id);
      if (conversationId) {
        router.push(`/client/messages?conversation_id=${conversationId}`);
      }
    } catch (err: any) {
      setProposalActionError(err?.message || "Failed to open chat.");
    } finally {
      setReplyLoading(false);
    }
  }

  function openProfileModal(f: Applicant["freelancer"]) {
    if (!f?.freelancer_id) return;
    setProfileFreelancer(f);
    setProfileModalOpen(true);
    void loadProfileDetails(f.freelancer_id);
  }

  function closeProfileModal() {
    setProfileModalOpen(false);
    setProfileFreelancer(null);
    setProfileProjects([]);
    setProfileCertificates([]);
    setProfileEducation([]);
  }

  async function loadProfileDetails(freelancerId: number) {
    setProfileDetailsLoading(true);
    setProfileProjects([]);
    setProfileCertificates([]);
    setProfileEducation([]);
    try {
      const res = await fetch(`/api/freelancers/${freelancerId}/profile`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load freelancer profile details");
      }
      setProfileProjects(json.projects || []);
      setProfileCertificates(json.certificates || []);
      setProfileEducation(json.education || []);
    } catch (err) {
      console.error("Failed to load freelancer profile details", err);
      setProfileProjects([]);
      setProfileCertificates([]);
      setProfileEducation([]);
    } finally {
      setProfileDetailsLoading(false);
    }
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
              className="relative bg-white border border-white/50 rounded-[48px] shadow-2xl p-10 flex flex-col md:flex-row gap-10 items-start overflow-hidden"
            >
              <button
                onClick={onClose}
                className="absolute right-6 top-6 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-all"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <div className="flex-1 space-y-6">
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
                  <span className="text-[#10b8a6] text-xs font-bold uppercase tracking-widest">
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
                      className="snap-start min-w-[280px] group bg-white border border-gray-100 p-6 rounded-[36px] hover:border-[#10b8a6]/30 hover:shadow-xl hover:shadow-[#10b8a6]/10 transition-all flex flex-col justify-between h-[260px] cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openProfileModal(a.freelancer)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openProfileModal(a.freelancer);
                        }
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-3xl bg-[#fbfbfd] flex items-center justify-center text-gray-300 group-hover:bg-[#e6f8f5] group-hover:text-[#10b8a6] transition-all duration-500 overflow-hidden">
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
                          <div className="text-[#10b8a6] group-hover:text-[#0e9f8e] transition-colors">
                            <ExternalLink size={16} />
                          </div>
                        </div>

                        <h4 className="font-bold text-xl text-[#10b8a6] mb-1 group-hover:text-[#0e9f8e] transition-colors">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openProposalForApplicant(a);
                          }}
                        >
                          <FileText size={16} />
                          View proposal
                        </button>

                        <button
                          className={`w-12 h-12 rounded-2xl bg-[#10b8a6] flex items-center justify-center text-white hover:bg-[#0e9f8e] transition-all active:scale-95 shadow-lg shadow-[#10b8a6]/25 ${
                            chatLoadingId === a.freelancer_id ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openConversationForApplicant(a);
                          }}
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

          {/* ===== NESTED POPUP: Freelancer Profile ===== */}
          <AnimatePresence>
            {profileModalOpen && profileFreelancer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-start justify-center bg-black/35 backdrop-blur-xl p-6 overflow-y-auto"
                onClick={closeProfileModal}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Freelancer profile"
                  className="w-full max-w-lg rounded-[32px] border border-white/40 bg-white/70 shadow-[0_30px_80px_rgba(15,15,15,0.25)] backdrop-blur-2xl p-6 max-h-[85vh] overflow-y-auto"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/70 flex-shrink-0 overflow-hidden flex items-center justify-center text-gray-600 font-bold border border-white/60">
                        {profileFreelancer.personal_img_url ? (
                          <img
                            src={profileFreelancer.personal_img_url}
                            alt={displayFreelancerName(profileFreelancer)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials(displayFreelancerName(profileFreelancer))
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {displayFreelancerName(profileFreelancer)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {profileFreelancer.job_title || "Freelancer"}
                        </p>
                        {profileFreelancer.created_at && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            Member since{" "}
                            {new Date(profileFreelancer.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                        About
                      </p>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {profileFreelancer.bio?.trim() || "No bio provided yet."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                        Skills
                      </p>
                      {profileFreelancer.skills ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {profileFreelancer.skills
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((s, i) => (
                              <span
                                key={`${s}-${i}`}
                                className="rounded-full bg-white/80 border border-white/70 px-3 py-1 text-[11px] font-semibold text-gray-600"
                              >
                                {s}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">No skills listed.</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                        Projects
                      </p>
                      {profileDetailsLoading ? (
                        <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
                      ) : profileProjects.length ? (
                        <div className="mt-3 space-y-3">
                          {profileProjects.map((project, index) => {
                            const range = formatProjectRange(project.start_date, project.end_date);
                            return (
                              <div
                                key={`${project.project_name || "project"}-${index}`}
                                className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3"
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  {project.project_name || "Untitled project"}
                                </p>
                                {range && (
                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {range}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                                  {project.project_description || "No description provided."}
                                </p>
                                {project.project_url && (
                                  <a
                                    href={project.project_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex text-[11px] font-semibold text-[#10b8a6] hover:underline"
                                  >
                                    View project
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">No projects listed.</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                        Certificates
                      </p>
                      {profileDetailsLoading ? (
                        <p className="mt-2 text-sm text-gray-500">Loading certificates...</p>
                      ) : profileCertificates.length ? (
                        <div className="mt-3 space-y-3">
                          {profileCertificates.map((cert) => {
                            const meta = formatCertificateDates(cert.issue_date, cert.expiry_date);
                            return (
                              <div
                                key={cert.certificate_id}
                                className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3"
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  {cert.name || "Certificate"}
                                </p>
                                {(cert.issuer || meta) && (
                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {[cert.issuer, meta].filter(Boolean).join(" | ")}
                                  </p>
                                )}
                                {(cert.credential_id || cert.credential_url) && (
                                  <div className="mt-2 text-[11px] text-gray-500 space-y-1">
                                    {cert.credential_id && (
                                      <p>Credential ID: {cert.credential_id}</p>
                                    )}
                                    {cert.credential_url && (
                                      <a
                                        href={cert.credential_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex text-[#10b8a6] hover:underline"
                                      >
                                        View credential
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">No certificates listed.</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                        Education
                      </p>
                      {profileDetailsLoading ? (
                        <p className="mt-2 text-sm text-gray-500">Loading education...</p>
                      ) : profileEducation.length ? (
                        <div className="mt-3 space-y-3">
                          {profileEducation.map((edu) => {
                            const endYear = formatEducationEndYear(edu.end_date);
                            const detail = [edu.degree, edu.field_of_study]
                              .filter(Boolean)
                              .join(" | ");
                            return (
                              <div
                                key={edu.education_id}
                                className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3"
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  {edu.school || "Education"}
                                </p>
                                {detail && (
                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {detail}
                                  </p>
                                )}
                                {endYear && (
                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {endYear}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">No education listed.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {proposal.status === "accepted" && (
                          <div className="rounded-3xl bg-[#fbfbfd] border border-gray-50 p-5">
                            <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                              Status
                            </div>
                            <div className="mt-1 text-lg font-bold text-gray-900">{proposal.status}</div>
                            <div className="mt-1 text-xs font-bold text-gray-300 uppercase tracking-widest">
                              {timeAgo(proposal.created_at)}
                            </div>
                          </div>
                        )}

                        <div className="rounded-3xl bg-[#fbfbfd] border border-gray-50 p-5">
                          <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                            Budget
                          </div>
                          <div className="mt-1 text-lg font-bold text-gray-900">
                            {money(proposal.total_gross, proposal.currency)}
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

                      {(proposalActionError || proposal) && (
                        <div className="mt-6 space-y-3">
                          {proposalActionError && (
                            <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                              {proposalActionError}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-3">
                            {proposal.offered_by === "freelancer" &&
                              ["sent", "countered", "pending"].includes(proposal.status) &&
                              !proposal.accepted_by_client && (
                                <button
                                  type="button"
                                  onClick={handleAcceptProposal}
                                  disabled={proposalActionLoading}
                                  className="flex-1 rounded-2xl bg-black text-white py-3 text-[13px] font-semibold hover:bg-[#1d1d1f] transition-all disabled:opacity-50"
                                >
                                  {proposalActionLoading ? "Accepting..." : "Accept Offer"}
                                </button>
                              )}
                            <button
                              type="button"
                              onClick={handleReplyInChat}
                              disabled={replyLoading}
                              className="flex-1 rounded-2xl border border-[#d2d2d7] bg-white text-black py-3 text-[13px] font-semibold hover:bg-[#fafafa] transition-all disabled:opacity-50"
                            >
                              {replyLoading ? "Opening chat..." : "Reply in chat"}
                            </button>
                          </div>
                        </div>
                      )}
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
