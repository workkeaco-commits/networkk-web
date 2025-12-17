"use client";

import {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

// Helper: "2 days ago"
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

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  level: string;
  budget: string;
  postedAt: string;
  description: string;
  tags: string[];
};

type Milestone = {
  task: string;
  amount: string;
  unit: "days" | "weeks" | "months";
};

type ProposalFormState = {
  jobTitle: string;
  proposal: string;
  price: string;
  period: string;
  milestones: Milestone[];
};

type Freelancer = {
  freelancer_id: number;
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  phone_number: string | null;
  skills: string | string[] | null;
};

export default function JobsPage() {
  const router = useRouter();

  // 🔒 Auth guard & freelancer info
  const [authChecking, setAuthChecking] = useState(true);
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);

  // Jobs
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // UI state
  const [profileOpen, setProfileOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [form, setForm] = useState<ProposalFormState>({
    jobTitle: "",
    proposal: "",
    price: "",
    period: "",
    milestones: [{ task: "", amount: "", unit: "days" }],
  });

  // 1) Auth guard: must be logged in AND be a freelancer
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/freelancer/sign-in?next=/jobs");
        return;
      }

      const { data, error } = await supabase
        .from("freelancers")
        .select(
          "freelancer_id, full_name, job_title, email, phone_number, skills"
        )
        .eq("auth_user_id", user.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        console.error("Freelancer profile not found", error);
        // Treat as "not a freelancer" → send back to login-as-freelancer
        router.replace("/freelancer/sign-in?next=/jobs");
        return;
      }

      setFreelancer(data as Freelancer);
      setAuthChecking(false);
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 2) Load job posts (after auth check)
  useEffect(() => {
    if (authChecking) return; // wait until we know user is allowed

    let cancelled = false;

    const loadJobs = async () => {
      try {
        const { data, error } = await supabase
          .from("job_posts")
          .select(
            "job_post_id, title, engagement_type, description, skills, price, price_currency, created_at"
          )
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (error || !data) {
          console.error("Error loading job_posts", error);
          setJobs([]);
          return;
        }

        const mapped: Job[] = data.map((row: any) => {
          const budget =
            row.price != null
              ? `${row.price} ${row.price_currency || "EGP"}`
              : "Budget not set";

          const tags =
            typeof row.skills === "string" && row.skills.trim().length > 0
              ? row.skills.split(",").map((s: string) => s.trim())
              : [];

          return {
            id: row.job_post_id,
            title: row.title || "Untitled job",
            company: "Client",
            location: "Remote",
            type:
              row.engagement_type === "long_term" ? "Long term" : "Short term",
            level: "Not specified",
            budget,
            postedAt: timeAgo(row.created_at),
            description: row.description || "",
            tags,
          };
        });

        setJobs(mapped);
      } catch (err) {
        console.error(err);
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [authChecking]);

  // ===== Proposal modal logic =====

  const openModal = (job: Job) => {
    // Safety: if somehow freelancer is missing, re-send to login
    if (!freelancer) {
      router.push("/freelancer/sign-in?next=/jobs");
      return;
    }

    setSelectedJob(job);
    setForm({
      jobTitle: job.title,
      proposal: "",
      price: "",
      period: "",
      milestones: [{ task: "", amount: "", unit: "days" }],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
    setForm({
      jobTitle: "",
      proposal: "",
      price: "",
      period: "",
      milestones: [{ task: "", amount: "", unit: "days" }],
    });
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMilestoneChange = (
    index: number,
    field: keyof Milestone,
    value: string
  ) => {
    setForm((prev) => {
      const updated = [...prev.milestones];
      updated[index] = {
        ...updated[index],
        [field]: value as Milestone[typeof field],
      };
      return { ...prev, milestones: updated };
    });
  };

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { task: "", amount: "", unit: "days" }],
    }));
  };

  const removeMilestone = (index: number) => {
    setForm((prev) => {
      const updated = prev.milestones.filter((_, i) => i !== index);
      return {
        ...prev,
        milestones: updated.length
          ? updated
          : [{ task: "", amount: "", unit: "days" }],
      };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Submitted proposal:", { jobId: selectedJob?.id, ...form });
    // TODO: send to proposals API
    closeModal();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/freelancer/sign-in");
  };

  // ===== Auth loading screen =====

  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-4">
          <p className="text-sm text-slate-600">Checking your session…</p>
        </div>
      </main>
    );
  }

  // From here: user is logged in AND has a freelancer profile.

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with ONLY logo + profile button (no Home / Jobs) */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/chatgpt-instructions3.jpeg"
              alt="Networkk logo"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </div>

          <div className="flex items-center gap-4">
            {freelancer && (
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                  {freelancer.full_name
                    ? freelancer.full_name.charAt(0).toUpperCase()
                    : "F"}
                </span>
                <span className="max-w-[120px] truncate">
                  {freelancer.full_name || "Freelancer"}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Open jobs
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Browse jobs and send a proposal directly.
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500 sm:mt-0">
            {loadingJobs ? "Loading…" : `${jobs.length} jobs found`}
          </p>
        </div>

        {/* Job cards */}
        <div className="mt-6 grid gap-4">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Top row: title + basic info */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {job.title}
                  </h2>
                  {/* only location now */}
                  <p className="mt-1 text-sm text-slate-600">
                    {job.location}
                  </p>
                  {/* type + budget (no level, no client name) */}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {job.type}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {job.budget}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  {job.postedAt ? `Posted ${job.postedAt}` : null}
                </div>
              </div>

              {/* Description */}
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {job.description}
              </p>

              {/* Tags */}
              {job.tags && job.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Button */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openModal(job)}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    Propose to this job
                  </button>
                </div>

                <span className="text-xs text-slate-500">
                  You are logged in as a freelancer.
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Proposal Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Propose to this job
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Job title */}
              <div>
                <label
                  htmlFor="jobTitle"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Job title
                </label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  value={form.jobTitle}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Proposal text */}
              <div>
                <label
                  htmlFor="proposal"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Proposal
                </label>
                <textarea
                  id="proposal"
                  name="proposal"
                  rows={4}
                  value={form.proposal}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Explain your approach and why you're a good fit."
                />
              </div>

              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Price for the task
                </label>
                <input
                  id="price"
                  name="price"
                  type="text"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 4000 EGP, 300 USD..."
                />
              </div>

              {/* Period */}
              <div>
                <label
                  htmlFor="period"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Period
                </label>
                <input
                  id="period"
                  name="period"
                  type="text"
                  value={form.period}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 2 weeks, 10 days..."
                />
              </div>

              {/* Milestones */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Milestones
                  </label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    + Add milestone
                  </button>
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Break the project into tasks and set how long each one will
                  take.
                </p>

                <div className="space-y-3">
                  {form.milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                          <input
                            type="text"
                            value={milestone.task}
                            onChange={(e) =>
                              handleMilestoneChange(
                                index,
                                "task",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Task name (e.g. Design)"
                          />
                        </div>

                        <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="number"
                            min="0"
                            value={milestone.amount}
                            onChange={(e) =>
                              handleMilestoneChange(
                                index,
                                "amount",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:max-w-[120px]"
                            placeholder="Number"
                          />
                          <select
                            value={milestone.unit}
                            onChange={(e) =>
                              handleMilestoneChange(
                                index,
                                "unit",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:max-w-[140px]"
                          >
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                          </select>
                        </div>
                      </div>

                      {form.milestones.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeMilestone(index)}
                            className="text-xs text-slate-400 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Submit proposal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Side popup navigation bar */}
      {profileOpen && freelancer && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setProfileOpen(false)}
          />
          <aside className="w-full max-w-sm bg-white border-l border-slate-200 shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Freelancer navigation
                </h2>
                <p className="text-xs text-slate-500">
                  Go to your main pages or sign out.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="text-xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/freelancer/profile");
                }}
                className="inline-flex items-center justify-between rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
              >
                <span>Profile</span>
                <span className="text-[10px] text-slate-400">
                  View & edit profile
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/freelancer/messages");
                }}
                className="inline-flex items-center justify-between rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
              >
                <span>Messages</span>
                <span className="text-[10px] text-slate-400">
                  Chat with clients
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/freelancer/wallet");
                }}
                className="inline-flex items-center justify-between rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
              >
                <span>Wallet</span>
                <span className="text-[10px] text-slate-400">
                  Balance & payouts
                </span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
