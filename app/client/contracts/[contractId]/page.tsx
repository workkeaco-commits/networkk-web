"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Loader2, ChevronLeft, CheckCircle2, XCircle, FileText } from "lucide-react";

type SubmissionRow = {
  submission_id: number;
  version: number | null;
  status: string | null;
  submission_url: string | null;
  notes: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  decision_reason: string | null;
};

type MilestoneRow = {
  milestone_id: number;
  position: number | null;
  title: string;
  amount_gross: number | null;
  status: string | null;
  due_at: string | null;
  due_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  client_confirm_deadline_at: string | null;
  milestone_submissions?: SubmissionRow[] | null;
};

type ContractRow = {
  contract_id: number;
  status: string | null;
  created_at: string;
  fees_total: number | null;
  currency: string | null;
  job_posts?: { title: string | null } | null;
  freelancers?: { first_name?: string | null; last_name?: string | null; freelancer_id?: number | null } | null;
};

function formatMoney(amount: number | null, currency: string | null) {
  const value = Number(amount || 0);
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || "EGP"}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function latestSubmission(submissions?: SubmissionRow[] | null) {
  if (!submissions || !submissions.length) return null;
  return submissions
    .slice()
    .sort((a, b) => {
      const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return (b.version || 0) - (a.version || 0);
    })[0];
}

export default function ClientContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = Number(params.contractId);

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!Number.isFinite(contractId)) {
        setErrorMsg("Invalid contract id.");
        setLoading(false);
        return;
      }

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (userErr || !user) {
        router.replace(`/client/sign-in?next=/client/contracts/${contractId}`);
        return;
      }

      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("client_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!mounted) return;

      if (clientErr || !clientRow) {
        setErrorMsg("Could not load your client profile.");
        setLoading(false);
        return;
      }

      const { data: contractRow, error: contractErr } = await supabase
        .from("contracts")
        .select(
          "contract_id, status, created_at, fees_total, currency, job_posts(title), freelancers(first_name, last_name, freelancer_id)"
        )
        .eq("contract_id", contractId)
        .eq("client_id", clientRow.client_id)
        .single();

      if (!mounted) return;

      if (contractErr || !contractRow) {
        setErrorMsg("Contract not found.");
        setLoading(false);
        return;
      }

      setContract(contractRow as ContractRow);

      const milestoneRows = await loadMilestones(contractId);
      if (!mounted) return;
      setMilestones(milestoneRows);

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, contractId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/client/sign-in");
  }

  async function handleApprove(milestone: MilestoneRow) {
    const submission = latestSubmission(milestone.milestone_submissions);
    if (!submission) return;

    setActionLoading((prev) => ({ ...prev, [milestone.milestone_id]: true }));

    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes?.session?.access_token;

    if (token) {
      const res = await fetch(`/api/milestones/${milestone.milestone_id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submission_id: submission.submission_id }),
      });

      if (res.ok) {
        const nowIso = new Date().toISOString();
        setMilestones((prev) =>
          prev.map((m) =>
            m.milestone_id === milestone.milestone_id
              ? {
                  ...m,
                  status: "released",
                  approved_at: nowIso,
                  rejected_at: null,
                  milestone_submissions: m.milestone_submissions?.map((s) =>
                    s.submission_id === submission.submission_id
                      ? { ...s, status: "approved", decided_at: nowIso, decided_by: "client", decision_reason: null }
                      : s
                  ),
                }
              : m
          )
        );
      }
    }

    setActionLoading((prev) => ({ ...prev, [milestone.milestone_id]: false }));
  }

  async function handleReject(milestone: MilestoneRow) {
    const submission = latestSubmission(milestone.milestone_submissions);
    if (!submission) return;

    setActionLoading((prev) => ({ ...prev, [milestone.milestone_id]: true }));

    const nowIso = new Date().toISOString();
    const reason = (rejectReasons[milestone.milestone_id] || "").trim() || null;

    const { error: subErr } = await supabase
      .from("milestone_submissions")
      .update({ status: "rejected", decided_at: nowIso, decided_by: "client", decision_reason: reason })
      .eq("submission_id", submission.submission_id);

    if (!subErr) {
      await supabase
        .from("milestones")
        .update({ status: "rejected", rejected_at: nowIso, approved_at: null })
        .eq("milestone_id", milestone.milestone_id);

      setMilestones((prev) =>
        prev.map((m) =>
          m.milestone_id === milestone.milestone_id
            ? {
                ...m,
                status: "rejected",
                rejected_at: nowIso,
                approved_at: null,
                milestone_submissions: m.milestone_submissions?.map((s) =>
                  s.submission_id === submission.submission_id
                    ? { ...s, status: "rejected", decided_at: nowIso, decided_by: "client", decision_reason: reason }
                    : s
                ),
              }
            : m
        )
      );
    }

    setActionLoading((prev) => ({ ...prev, [milestone.milestone_id]: false }));
  }

  async function handleSyncMilestones() {
    if (syncing) return;
    setSyncing(true);

    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes?.session?.access_token;

    if (!token) {
      setSyncing(false);
      return;
    }

    const res = await fetch(`/api/contracts/${contractId}/sync-milestones`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const milestoneRows = await loadMilestones(contractId);
      setMilestones(milestoneRows);
    }

    setSyncing(false);
  }

  const freelancerName = useMemo(() => {
    const full = [contract?.freelancers?.first_name, contract?.freelancers?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || `Freelancer #${contract?.freelancers?.freelancer_id ?? "?"}`;
  }, [contract]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10b8a6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <DashboardSidebar onSignOut={handleSignOut} />

      <main className="pl-20 md:pl-64 transition-all duration-300">
        <div className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 md:px-12">
          <div className="flex items-center gap-3">
            <Link
              href="/client/contracts"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-lg font-semibold">Contract details</div>
              <div className="text-xs text-gray-500">{contract?.job_posts?.title || "Untitled contract"}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500">Contract total</div>
            <div className="text-sm font-semibold">{formatMoney(contract?.fees_total || 0, contract?.currency || "EGP")}</div>
          </div>
        </div>

        <div className="px-8 md:px-12 py-8">
          {errorMsg ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Something went wrong</div>
              <div className="text-sm text-gray-500 mt-2">{errorMsg}</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-[#10b8a6] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{contract?.job_posts?.title}</div>
                    <div className="text-sm text-gray-500">With {freelancerName}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm text-gray-600">
                  <div>
                    <div className="text-xs uppercase text-gray-400">Status</div>
                    <div className="mt-1 capitalize">{contract?.status || "active"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">Started</div>
                    <div className="mt-1">{formatDateTime(contract?.created_at || null)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">Total</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {formatMoney(contract?.fees_total || 0, contract?.currency || "EGP")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {milestones.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500">No milestones found for this contract yet.</div>
                    <button
                      onClick={handleSyncMilestones}
                      disabled={syncing}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {syncing ? "Syncing..." : "Sync milestones"}
                    </button>
                  </div>
                ) : (
                  milestones.map((milestone) => {
                  const submission = latestSubmission(milestone.milestone_submissions);
                  const canDecide =
                    submission &&
                    (submission.status || "").toLowerCase() === "submitted" &&
                    !actionLoading[milestone.milestone_id];

                  return (
                    <div key={milestone.milestone_id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-base font-semibold text-gray-900">
                            {milestone.title || `Milestone #${milestone.position ?? ""}`}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Status: {milestone.status || "pending"}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            Due {formatDateTime(milestone.due_at || milestone.due_date || null)} · Confirm by {formatDateTime(
                              milestone.client_confirm_deadline_at
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Amount</div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatMoney(milestone.amount_gross || 0, contract?.currency || "EGP")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-4">
                        {submission ? (
                          <div className="text-sm text-gray-600 space-y-2">
                            <div>
                              <span className="font-semibold text-gray-900">Latest submission:</span> {formatDateTime(
                                submission.submitted_at
                              )}
                            </div>
                            {submission.submission_url ? (
                              <div>
                                <a
                                  href={submission.submission_url}
                                  className="text-[#10b8a6] hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View submission
                                </a>
                              </div>
                            ) : null}
                            {submission.notes ? <div className="text-gray-500">{submission.notes}</div> : null}
                            {submission.status ? (
                              <div className="text-xs uppercase text-gray-400">Submission status: {submission.status}</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No submissions yet.</div>
                        )}

                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Rejection reason (optional)</label>
                            <input
                              value={rejectReasons[milestone.milestone_id] || ""}
                              onChange={(e) =>
                                setRejectReasons((prev) => ({
                                  ...prev,
                                  [milestone.milestone_id]: e.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm"
                              placeholder="Add a short reason for rejection"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReject(milestone)}
                              disabled={!canDecide}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                            <button
                              onClick={() => handleApprove(milestone)}
                              disabled={!canDecide}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

async function loadMilestones(contractId: number) {
  const { data: milestoneRows, error: milestoneErr } = await supabase
    .from("milestones")
    .select(
      "milestone_id, position, title, amount_gross, status, due_at, due_date, submitted_at, approved_at, rejected_at, client_confirm_deadline_at, milestone_submissions(submission_id, version, status, submission_url, notes, submitted_at, decided_at, decided_by, decision_reason)"
    )
    .eq("contract_id", contractId)
    .order("position", { ascending: true });

  if (milestoneErr) {
    console.error("Milestone load error:", milestoneErr);
    return [];
  }

  return (milestoneRows as MilestoneRow[]) || [];
}
