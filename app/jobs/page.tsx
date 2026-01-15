"use client";

import { Suspense, useEffect, useMemo, useRef, useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { AnimatePresence, motion } from "framer-motion";
import FreelancerSidebar from "@/components/FreelancerSidebar";
import { Search, Loader2, MapPin, DollarSign, Clock, CalendarDays, CheckCircle2 } from "lucide-react";

/* ---------------- Fixed policy ---------------- */

const PLATFORM_FEE_PERCENT = 10; // FIXED — not editable by user

/* ---------------- Helpers ---------------- */

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

const UNIT_TO_DAYS: Record<"days" | "weeks" | "months", number> = {
  days: 1,
  weeks: 7,
  months: 30,
};

function formatDaysAsLabel(totalDays: number): string {
  if (!Number.isFinite(totalDays) || totalDays <= 0) return "—";
  if (totalDays % UNIT_TO_DAYS.weeks === 0) {
    const weeks = totalDays / UNIT_TO_DAYS.weeks;
    return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  }
  return `${totalDays} day${totalDays !== 1 ? "s" : ""}`;
}

function containsContactInfo(text: string): boolean {
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phonePattern = /(\+?\d[\d\s\-()]{7,}\d)/; // loose phone detection
  return emailPattern.test(text) || phonePattern.test(text);
}

function parseMoneyNumber(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/* ---------------- Types ---------------- */

type Freelancer = {
  freelancer_id: number;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone_number: string | null;
  skills: string | string[] | null;
  category_id?: number | null;
};

type JobDbRow = {
  job_post_id: number;
  client_id: number;
  title: string | null;
  engagement_type: string | null;
  description: string | null;
  skills: string | null;
  price: number | null;
  price_currency: string | null;
  created_at: string | null;
};

type JobCard = {
  id: number; // job_post_id
  clientId: number;
  title: string;
  location: string;
  typeLabel: string;
  budgetLabel: string;
  postedAtLabel: string;
  description: string;
  tags: string[];
  currency: "EGP" | "USD";
};

type Milestone = {
  title: string;
  durationAmount: string; // number as text
  durationUnit: "days" | "weeks" | "months";
  priceAmount: string; // numeric text (gross)
};

type ProposalFormState = {
  message: string;
  currency: "EGP" | "USD";
  milestones: Milestone[];
};

/* ---------------- Page ---------------- */

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpenedJobRef = useRef<number | null>(null);

  // 🔒 Auth guard & freelancer info
  const [authChecking, setAuthChecking] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);

  // Jobs
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Already applied jobs (initial freelancer proposals)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());

  // Proposal modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const [form, setForm] = useState<ProposalFormState>({
    message: "",
    currency: "EGP",
    milestones: [{ title: "", durationAmount: "", durationUnit: "days", priceAmount: "" }],
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1) Auth guard: must be logged in AND be a freelancer
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/freelancer/sign-in?next=/jobs");
        return;
      }

      setAuthUserId(user.id);

      const { data, error } = await supabase
        .from("freelancers")
        .select("freelancer_id, first_name, last_name, job_title, email, phone_number, skills, category_id")
        .eq("auth_user_id", user.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        console.error("Freelancer profile not found", error);
        router.replace("/freelancer/sign-in?next=/jobs");
        return;
      }

      setFreelancer(data as Freelancer);
      setAuthChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 2) Load job posts (after auth)
  useEffect(() => {
    if (authChecking || !freelancer) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingJobs(true);

        let query = supabase
          .from("job_posts")
          .select("job_post_id, client_id, title, engagement_type, description, skills, price, price_currency, created_at")
          .order("created_at", { ascending: false });

        if (freelancer.category_id) {
          query = query.eq("category_id", freelancer.category_id);
        }

        const { data, error } = await query;

        if (cancelled) return;

        if (error || !data) {
          console.error("Error loading job_posts", error);
          setJobs([]);
          return;
        }

        const mapped: JobCard[] = (data as JobDbRow[]).map((row) => {
          const budgetLabel =
            row.price != null
              ? `${row.price} ${row.price_currency || "EGP"}`
              : "Budget not set";

          const tags =
            typeof row.skills === "string" && row.skills.trim().length > 0
              ? row.skills.split(",").map((s) => s.trim()).filter(Boolean)
              : [];

          const currency = (row.price_currency || "EGP").toUpperCase() === "USD" ? "USD" : "EGP";

          return {
            id: row.job_post_id,
            clientId: row.client_id,
            title: row.title || "Untitled job",
            location: "Remote",
            typeLabel: row.engagement_type === "long_term" ? "Long term" : "Short term",
            budgetLabel,
            postedAtLabel: timeAgo(row.created_at),
            description: row.description || "",
            tags,
            currency,
          };
        });

        setJobs(mapped);

        // Load jobs already applied to (initial freelancer proposals only)
        const jobIds = mapped.map((j) => j.id);
        if (jobIds.length) {
          const { data: appliedRows, error: appliedErr } = await supabase
            .from("proposals")
            .select("job_post_id")
            .in("job_post_id", jobIds)
            .eq("freelancer_id", freelancer.freelancer_id)
            .eq("offered_by", "freelancer")
            .is("supersedes_proposal_id", null);

          if (!cancelled && !appliedErr && appliedRows) {
            const s = new Set<number>();
            for (const r of appliedRows as any[]) {
              const jid = Number(r.job_post_id);
              if (Number.isFinite(jid)) s.add(jid);
            }
            setAppliedJobIds(s);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecking, freelancer]);

  useEffect(() => {
    if (loadingJobs || !freelancer || !authUserId) return;
    const rawJobId = searchParams.get("job_id");
    if (!rawJobId) return;
    const jobId = Number(rawJobId);
    if (!Number.isFinite(jobId)) return;
    if (autoOpenedJobRef.current === jobId) return;
    const match = jobs.find((job) => job.id === jobId);
    if (!match) return;

    openModal(match);
    autoOpenedJobRef.current = jobId;
  }, [searchParams, jobs, loadingJobs, freelancer, authUserId]);

  /* ---------------- Proposal modal logic ---------------- */

  const totalDays = useMemo(() => {
    return form.milestones.reduce((sum, m) => {
      const amt = Number(m.durationAmount || 0);
      if (!Number.isFinite(amt) || amt <= 0) return sum;
      return sum + amt * UNIT_TO_DAYS[m.durationUnit];
    }, 0);
  }, [form.milestones]);

  const totalGross = useMemo(() => {
    return form.milestones.reduce((sum, m) => {
      const n = parseMoneyNumber(m.priceAmount);
      if (!n || n <= 0) return sum;
      return sum + n;
    }, 0);
  }, [form.milestones]);

  const proposalHasContactInfo = useMemo(() => {
    return containsContactInfo(form.message || "");
  }, [form.message]);

  const openModal = (job: JobCard) => {
    if (!freelancer || !authUserId) {
      router.replace("/freelancer/sign-in?next=/jobs");
      return;
    }

    setSelectedJob(job);
    setSubmitError(null);
    setForm({
      message: "",
      currency: job.currency,
      milestones: [{ title: "", durationAmount: "", durationUnit: "days", priceAmount: "" }],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
    setSubmitLoading(false);
    setSubmitError(null);
    setForm({
      message: "",
      currency: "EGP",
      milestones: [{ title: "", durationAmount: "", durationUnit: "days", priceAmount: "" }],
    });
  };

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, message: value }));
  };

  const handleCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === "USD" ? "USD" : "EGP";
    setForm((prev) => ({ ...prev, currency: value }));
  };

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: string) => {
    setForm((prev) => {
      const updated = [...prev.milestones];
      updated[index] = { ...updated[index], [field]: value as any };
      return { ...prev, milestones: updated };
    });
  };

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { title: "", durationAmount: "", durationUnit: "days", priceAmount: "" }],
    }));
  };

  const removeMilestone = (index: number) => {
    setForm((prev) => {
      const updated = prev.milestones.filter((_, i) => i !== index);
      return {
        ...prev,
        milestones: updated.length ? updated : [{ title: "", durationAmount: "", durationUnit: "days", priceAmount: "" }],
      };
    });
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedJob) {
      setSubmitError("No job selected.");
      return;
    }
    if (!freelancer || !authUserId) {
      router.replace("/freelancer/sign-in?next=/jobs");
      return;
    }
    if (proposalHasContactInfo) {
      setSubmitError("Please remove contact information (email/phone) from your proposal message.");
      return;
    }

    const cleanedMilestones = form.milestones
      .map((m, idx) => {
        const title = (m.title || "").trim() || `Milestone #${idx + 1}`;
        const durAmt = Number(m.durationAmount);
        const duration_days = Number.isFinite(durAmt) && durAmt > 0
          ? Math.round(durAmt * UNIT_TO_DAYS[m.durationUnit])
          : 0;
        const price = parseMoneyNumber(m.priceAmount) ?? 0;
        const amount_gross = Math.round(price * 100) / 100;

        return {
          position: idx + 1,
          title,
          duration_days,
          amount_gross,
        };
      })
      .filter((m) => m.duration_days > 0 && m.amount_gross > 0);

    if (cleanedMilestones.length === 0) {
      setSubmitError("Add at least one valid milestone (duration > 0 and price > 0).");
      return;
    }

    const total_price = cleanedMilestones.reduce((s, m) => s + m.amount_gross, 0);
    if (!(total_price > 0)) {
      setSubmitError("Total price must be > 0.");
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await fetch("/api/proposals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_post_id: selectedJob.id,
          client_id: selectedJob.clientId,
          freelancer_id: freelancer.freelancer_id,
          conversation_id: null,
          actor_auth_id: authUserId,
          origin: "dashboard",
          offered_by: "freelancer",
          currency: form.currency,
          platform_fee_percent: PLATFORM_FEE_PERCENT,
          message: form.message,
          total_price,
          milestones: cleanedMilestones,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json?.error || "Failed to submit proposal.");
        setSubmitLoading(false);
        return;
      }

      setAppliedJobIds((prev) => new Set(prev).add(selectedJob.id));
      closeModal();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message || "Server error while submitting proposal.");
      setSubmitLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/freelancer/sign-in");
  };

  /* ---------------- Auth loading screen ---------------- */

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fbfbfd]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-white rounded-full opacity-50" />
          </div>
          <p className="text-gray-400 font-medium animate-pulse">Loading jobs...</p>
        </div>
      </div>
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] antialiased flex">
      {/* Sidebar */}
      <FreelancerSidebar onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 lg:p-12 relative z-0">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-3">
              Explore Jobs
            </h1>
            <p className="text-lg text-gray-500 font-medium">
              Discover new opportunities tailored for your skills.
            </p>
          </div>

          {/* Jobs Stack */}
          <div className="space-y-6 pb-20">
            {loadingJobs ? (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="text-gray-300 animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No jobs found</h3>
                <p className="text-gray-500">Check back later for new postings.</p>
              </div>
            ) : (
              jobs.map((job, i) => {
                const alreadyApplied = appliedJobIds.has(job.id);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={job.id}
                    className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </h2>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm font-medium text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={16} /> {job.location}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={16} /> {job.typeLabel}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={16} /> {job.postedAtLabel}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 font-bold text-gray-900 flex items-center gap-2">
                          <DollarSign size={16} className="text-green-600" />
                          {job.budgetLabel}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed text-lg mb-8 font-medium">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {job.tags.map(tag => (
                        <span key={tag} className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wide border border-gray-200/50">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-400">
                        Job #{job.id}
                      </span>
                      <button
                        onClick={() => openModal(job)}
                        disabled={alreadyApplied}
                        className={`px-8 py-4 rounded-[20px] font-bold text-sm transition-all flex items-center gap-2 ${alreadyApplied
                          ? "bg-green-50 text-green-600 cursor-default"
                          : "bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/10"
                          }`}
                      >
                        {alreadyApplied ? (
                          <>
                            <CheckCircle2 size={18} /> Applied
                          </>
                        ) : (
                          "Apply Now"
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Proposal Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && selectedJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Send Proposal</h2>
                  <p className="text-gray-500 font-medium">for <span className="text-black">{selectedJob.title}</span></p>
                </div>
                <button onClick={closeModal} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all">
                  <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>

              {/* Proposal Form */}
              {/* Summary */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Total Amount</div>
                  <div className="text-xl font-bold text-gray-900">
                    {totalGross.toLocaleString(undefined, { maximumFractionDigits: 2 })} {form.currency}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Est. Duration</div>
                  <div className="text-xl font-bold text-gray-900">{formatDaysAsLabel(totalDays)}</div>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="w-1/2">
                  <label className="text-xs font-bold text-gray-500 ml-1 mb-1.5 block">Currency</label>
                  <select
                    value={form.currency}
                    onChange={handleCurrencyChange}
                    className="w-full h-12 rounded-xl bg-gray-50 border-transparent font-medium px-4 focus:ring-2 focus:ring-black focus:bg-white transition-all"
                  >
                    <option value="EGP">EGP (Egyptian Pound)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="text-xs font-bold text-gray-500 ml-1 mb-1.5 block">Platform Fee</label>
                  <div className="h-12 flex items-center px-4 rounded-xl bg-gray-50 border-transparent text-gray-500 font-medium">
                    {PLATFORM_FEE_PERCENT}% <span className="ml-2 text-xs opacity-60">(Fixed)</span>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 text-sm font-semibold">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1 mb-1.5 block">Cover Letter</label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={handleMessageChange}
                    className="w-full rounded-2xl bg-gray-50 border-transparent p-4 font-medium text-gray-900 focus:ring-2 focus:ring-black focus:bg-white resize-none transition-all placeholder:text-gray-400"
                    placeholder="Why are you the best fit for this job? (No contact info allowed)"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 ml-1">Milestones</label>
                    <button type="button" onClick={addMilestone} className="text-xs font-bold text-blue-600 hover:underline">
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.milestones.map((m, index) => (
                      <div key={index} className="p-3 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors bg-white">
                        <input
                          placeholder="Milestone / Task Name"
                          value={m.title}
                          onChange={(e) => handleMilestoneChange(index, "title", e.target.value)}
                          className="w-full text-sm font-bold text-gray-900 placeholder:text-gray-300 border-none p-0 focus:ring-0 mb-2"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Duration"
                            value={m.durationAmount}
                            onChange={(e) => handleMilestoneChange(index, "durationAmount", e.target.value)}
                            className="w-20 bg-gray-50 rounded-lg border-none text-xs font-medium py-1.5 px-2"
                          />
                          <select
                            value={m.durationUnit}
                            onChange={(e) => handleMilestoneChange(index, "durationUnit", e.target.value)}
                            className="bg-gray-50 rounded-lg border-none text-xs font-medium py-1.5 px-2"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                          <div className="flex-1 flex bg-gray-50 rounded-lg items-center px-2">
                            <span className="text-xs text-gray-400 mr-1">$</span>
                            <input
                              placeholder="Price"
                              value={m.priceAmount}
                              onChange={(e) => handleMilestoneChange(index, "priceAmount", e.target.value)}
                              className="flex-1 bg-transparent border-none text-xs font-medium py-1.5 p-0 focus:ring-0 text-right"
                            />
                            <span className="text-[10px] text-gray-400 font-bold ml-1">{form.currency}</span>
                          </div>
                          {form.milestones.length > 1 && (
                            <button type="button" onClick={() => removeMilestone(index)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                              &times;
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading || proposalHasContactInfo}
                  className="w-full py-4 rounded-[20px] bg-black text-white font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10"
                >
                  {submitLoading ? "Submitting..." : "Send Proposal"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfd]" />}>
      <JobsPageContent />
    </Suspense>
  );
}
