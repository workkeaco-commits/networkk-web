"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/client/sign-in?next=/client/dashboard");
        return;
      }

      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("client_id")
        .eq("auth_user_id", user.id)
        .single();

      if (clientErr || !clientRow) {
        console.error("Could not find client profile", clientErr);
        if (mounted) {
          setJobs([]);
          setLoading(false);
        }
        return;
      }

      const clientId = clientRow.client_id;

      const { data: jobRows, error: jobsErr } = await supabase
        .from("job_posts")
        .select(
          "job_post_id, title, engagement_type, price, price_currency, description, created_at"
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (jobsErr || !jobRows) {
        console.error("Error loading job posts", jobsErr);
        setJobs([]);
      } else {
        setJobs(jobRows);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/client/sign-in");
  }

  function handleViewProposals(jobId: number) {
    router.push(`/client/proposals?jobId=${jobId}`);
  }

  function handleEditJob(jobId: number) {
    router.push(`/post-job?edit=${jobId}`);
  }

  function handleInvite(jobId: number) {
    router.push(`/jobs/${jobId}/invite`);
  }

  async function handleDelete(jobId: number) {
    if (!confirm("Delete this job post? This cannot be undone.")) return;
    const { error } = await supabase.from("job_posts").delete().eq("job_post_id", jobId);
    if (error) {
      console.error("delete error:", error);
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.job_post_id !== jobId));
  }


  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Top section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Your jobs</h1>
            <p className="text-sm text-slate-500">
              Review proposals, edit posts, and invite freelancers.
            </p>
          </div>

          {/* Popup menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                CL
              </span>
              <span className="hidden sm:inline">Client menu</span>
              <span className="text-xs text-slate-400">▾</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg text-sm overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/client/profile");
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/client/messages");
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  Messages
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/client/financials");
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  Financials
                </button>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await handleSignOut();
                  }}
                  className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Job cards */}
        {loading ? (
          <p className="text-sm text-slate-500">Loading your jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600 mb-4">
              You haven&apos;t posted any jobs yet.
            </p>
            <Link
              href="/post-job"
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-950"
            >
              Post your first job
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <div
                  key={job.job_post_id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {job.title || "Untitled job"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {job.engagement_type === "long_term"
                        ? "Long-term project"
                        : "Short-term project"}
                    </p>
                    {job.description && (
                      <p className="mt-2 text-sm text-slate-600">
                        {job.description.length > 140
                          ? job.description.slice(0, 140) + "..."
                          : job.description}
                      </p>
                    )}
                    <p className="mt-3 text-sm font-medium text-slate-900">
                      {job.price
                        ? `${job.price} ${job.price_currency || "EGP"}`
                        : "Budget not set"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewProposals(job.job_post_id)}
                      className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View proposals
                    </button>
                    <button
                      onClick={() => handleEditJob(job.job_post_id)}
                      className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit post
                    </button>
                    <button
                      onClick={() => handleInvite(job.job_post_id)}
                      className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950"
                    >
                      Invite freelancer
                    </button>
                    {/* NEW: Delete button */}
                    <button
                      onClick={() => handleDelete(job.job_post_id)}
                      className="inline-flex items-center rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/post-job"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-950"
              >
                Post a new job
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
