"use client";

import { useMemo, useState } from "react";
import type { FreelancerReviewRow } from "./types";

type StatusValue = "pending" | "approved" | "rejected";

type Props = {
  initialFreelancers: FreelancerReviewRow[];
};

function formatFreelancerName(freelancer?: FreelancerReviewRow | null) {
  if (!freelancer) return "Unknown freelancer";
  const full = [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ").trim();
  return full || `Freelancer #${freelancer.freelancer_id}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function statusBadgeClass(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default function FreelancerReviewList({ initialFreelancers }: Props) {
  const [rows, setRows] = useState<FreelancerReviewRow[]>(initialFreelancers);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasRows = rows.length > 0;
  const pendingCount = useMemo(
    () => rows.filter((row) => (row.approval_status || "pending") === "pending").length,
    [rows]
  );

  async function updateStatus(freelancerId: number, status: StatusValue) {
    setUpdatingId(freelancerId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/freelancers/${freelancerId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to update status");
      }

      setRows((prev) =>
        prev.map((row) =>
          row.freelancer_id === freelancerId
            ? { ...row, approval_status: status }
            : row
        )
      );
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
          {pendingCount} freelancer{pendingCount === 1 ? "" : "s"} awaiting review.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {hasRows ? (
        rows.map((freelancer) => {
          const status = String(freelancer.approval_status || "pending").toLowerCase();
          const isUpdating = updatingId === freelancer.freelancer_id;

          return (
            <div
              key={`freelancer-${freelancer.freelancer_id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatFreelancerName(freelancer)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Freelancer #{freelancer.freelancer_id}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {freelancer.job_title || "No job title yet"}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Joined {formatDate(freelancer.created_at)}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadgeClass(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => updateStatus(freelancer.freelancer_id, "approved")}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => updateStatus(freelancer.freelancer_id, "rejected")}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-500">
                <div>Email: {freelancer.email || "—"}</div>
                <div>Phone: {freelancer.phone_number || "—"}</div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-slate-500">No freelancers found.</p>
      )}
    </div>
  );
}
