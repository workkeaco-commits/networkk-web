"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import { Plus, Briefcase, Loader2, ExternalLink, Users, Star } from "lucide-react";
import { motion } from "framer-motion";

import DashboardSidebar from "@/components/DashboardSidebar";
import AIJobPostAssistant from "@/components/AIJobPostAssistant";
import JobPostModal from "@/components/JobPostModal";

type ClientRow = {
  client_id: number;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
};

type JobRow = {
  job_post_id: number;
  title: string | null;
  engagement_type: "long_term" | "short_term" | string | null;
  price: number | null;
  price_currency: string | null;
  description: string | null;
  created_at: string;
};

async function fetchInitialFreelancerProposalCounts(jobIds: number[]) {
  // Count ONLY initial freelancer proposals:
  // offered_by='freelancer' AND supersedes_proposal_id IS NULL
  if (!jobIds.length) return {} as Record<number, number>;

  const { data, error } = await supabase
    .from("proposals")
    .select("job_post_id")
    .in("job_post_id", jobIds)
    .eq("offered_by", "freelancer")
    .is("supersedes_proposal_id", null);

  if (error) {
    console.error("Error fetching proposal counts:", error);
    return {};
  }

  const counts: Record<number, number> = {};
  for (const row of data || []) {
    const jid = (row as any).job_post_id as number | null;
    if (jid == null) continue;
    counts[jid] = (counts[jid] || 0) + 1;
  }
  return counts;
}

function ClientDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [clientData, setClientData] = useState<ClientRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [proposalCounts, setProposalCounts] = useState<Record<number, number>>(
    {}
  );

  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setFatalError(null);

      // 1) Auth guard: if not signed in => redirect
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        router.replace("/client/sign-in?next=/client/dashboard");
        return;
      }

      // 2) Load client row
      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("client_id, first_name, last_name, company_name")
        .eq("auth_user_id", user.id)
        .single();

      if (!mounted) return;

      if (clientErr || !clientRow) {
        console.error("Could not find client profile:", clientErr);
        setClientData(null);
        setJobs([]);
        setProposalCounts({});
        setFatalError("Could not find your client profile.");
        setLoading(false);
        return;
      }

      setClientData(clientRow as ClientRow);

      // 3) Load jobs for this client
      const { data: jobRows, error: jobsErr } = await supabase
        .from("job_posts")
        .select(
          "job_post_id, title, engagement_type, price, price_currency, description, created_at"
        )
        .eq("client_id", (clientRow as any).client_id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (jobsErr || !jobRows) {
        console.error("Error loading job posts:", jobsErr);
        setJobs([]);
        setProposalCounts({});
        setLoading(false);
        return;
      }

      setJobs(jobRows as JobRow[]);

      // 4) Load proposal counts per job (initial freelancer proposals only)
      const ids = (jobRows as any[])
        .map((j) => j.job_post_id)
        .filter((v) => typeof v === "number") as number[];

      const counts = await fetchInitialFreelancerProposalCounts(ids);
      if (mounted) setProposalCounts(counts);

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (loading || fatalError) return;
    const rawJobId = searchParams.get("job_id");
    if (!rawJobId) return;
    const jobId = Number(rawJobId);
    if (!Number.isFinite(jobId)) return;
    const match = jobs.find((job) => job.job_post_id === jobId);
    if (!match) return;

    setSelectedJob(match);
    setIsModalOpen(true);
  }, [searchParams, jobs, loading, fatalError]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/client/sign-in");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10b8a6] animate-spin" />
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center px-6">
        <div className="w-full max-w-xl bg-white border border-gray-100 rounded-[32px] p-8 shadow-xl shadow-gray-100/60">
          <div className="text-xl font-bold text-gray-900">Dashboard error</div>
          <div className="mt-2 text-sm text-gray-500">{fatalError}</div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.refresh()}
              className="px-5 py-3 rounded-2xl bg-black text-white text-sm font-bold hover:opacity-90"
            >
              Retry
            </button>
            <button
              onClick={handleSignOut}
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-900 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    clientData?.company_name?.trim() ||
    [clientData?.first_name, clientData?.last_name].filter(Boolean).join(" ").trim() ||
    "there";
  const assistantName = clientData?.first_name?.trim() || displayName;

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen">
      <DashboardSidebar onSignOut={handleSignOut} />

      <main className="pl-20 md:pl-64 transition-all duration-300 overflow-x-hidden">
        {/* Top bar (Mockup Style) */}
        <div className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 md:px-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
              <img src="/logo-icon-only.png" alt="Logo" className="w-[18px] h-[18px] object-contain" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-gray-900">{displayName} space</span>
          </div>

          <Link
            href="/post-job/manual"
            className="bg-black text-white text-[13px] font-bold px-6 py-3 rounded-full hover:opacity-80 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-black/10"
          >
            <Plus size={16} strokeWidth={3} /> New Job Post
          </Link>
        </div>

        <div className="max-w-[1240px] mx-auto px-8 md:px-12 py-12">
          {/* AI INTERACTIVE SECTION */}
          <section className="mb-24 pt-16 animate-fade-in-up flex justify-center">
            <div className="w-full max-w-3xl">
              <AIJobPostAssistant clientName={assistantName} />
            </div>
          </section>

          {/* YOUR PROJECTS SECTION */}
          <section className="pb-32">
            <div className="flex items-center justify-between mb-16">
              <div className="space-y-1.5 text-center md:text-left">
                <h2 className="text-[34px] font-bold tracking-tight text-gray-900 mb-1">
                  Your Projects
                </h2>
                <p className="text-[16px] text-gray-400 font-medium">
                  Manage and track your active listings
                </p>
              </div>

              <div className="hidden md:flex items-center gap-4 text-gray-300">
                <div className="h-6 w-[1px] bg-gray-200" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {jobs.length} ACTIVE
                </span>
              </div>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-[64px] p-24 text-center animate-fade-in shadow-2xl shadow-gray-200/20">
                <div className="w-32 h-32 bg-[#fbfbfd] rounded-full flex items-center justify-center mx-auto mb-10 border border-gray-50">
                  <Briefcase className="w-12 h-12 text-gray-200" strokeWidth={1} />
                </div>
                <h3 className="text-3xl font-semibold text-gray-900 mb-4">
                  Start your next big thing
                </h3>
                <p className="text-lg text-gray-400 font-medium mb-12 max-w-sm mx-auto leading-relaxed">
                  Use the assistant above to describe your vision and we'll help you
                  find the perfect match.
                </p>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="bg-black text-white px-10 py-4 rounded-full font-bold text-[15px] tracking-tight hover:opacity-80 transition-all active:scale-95 shadow-xl shadow-black/10"
                >
                  Start creating
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                {jobs.map((job) => {
                  const count = proposalCounts[job.job_post_id] ?? 0;

                  return (
                    <motion.div
                      key={job.job_post_id}
                      layoutId={`job-${job.job_post_id}`}
                      onClick={() => {
                        setSelectedJob(job);
                        setIsModalOpen(true);
                      }}
                      className="group bg-white rounded-[36px] border border-gray-100/60 p-8 shadow-sm hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-500 cursor-pointer relative flex flex-col justify-between min-h-[420px]"
                    >
                      <div>
                        <div className="mb-8 flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 pr-3 pl-1.5 py-0.5 rounded-full border border-teal-50 bg-teal-50/50 text-[10px] font-bold tracking-widest uppercase text-[#10b8a6]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b8a6]" />
                            Active Listing
                          </div>

                          <div className="flex items-center gap-3">
                            {count > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-2 py-0.5 shadow-sm">
                                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-[10px] font-bold text-gray-700">{count} Proposals</span>
                              </div>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-gray-300">
                              <ExternalLink size={14} />
                            </div>
                          </div>
                        </div>

                        <h3 className="text-[21px] font-extrabold tracking-tight text-gray-900 mb-4 leading-[1.3] group-hover:text-[#10b8a6] transition-colors">
                          {job.title || "Untitled Project"}
                        </h3>

                        <p className="text-[14px] text-gray-400 font-medium leading-[1.6] mb-8 line-clamp-3">
                          {job.description || "No description provided."}
                        </p>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center justify-between px-1 pt-6 border-t border-gray-50">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-gray-300">
                              Budget
                            </span>
                            <div className="flex items-center gap-1.5 text-gray-900">
                              <span className="text-[15px] font-bold">
                                {job.price != null ? `${job.price.toLocaleString()}` : "—"}
                              </span>
                              <span className="text-[10px] font-bold tracking-wider text-gray-400">
                                {job.price_currency || "EGP"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-gray-300">
                              Posted
                            </span>
                            <div className="flex items-center text-gray-400">
                              <span className="text-[13px] font-bold tracking-tight">
                                {typeof window !== "undefined"
                                  ? new Date(job.created_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })
                                  : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setIsModalOpen(true);
                          }}
                          className="w-full bg-[#f4f4f5] hover:bg-black hover:text-white text-black font-bold text-[13px] tracking-tight py-4 rounded-[22px] transition-all flex items-center justify-center gap-3 group/btn active:scale-[0.98]"
                        >
                          View proposals
                          <Users
                            size={14}
                            className="group-hover/btn:translate-x-0.5 transition-transform opacity-40 group-hover:opacity-100"
                          />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <JobPostModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={() => router.refresh()}
      />
    </div>
  );
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfd]" />}>
      <ClientDashboardContent />
    </Suspense>
  );
}
