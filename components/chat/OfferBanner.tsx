// components/chat/OfferBanner.tsx
"use client";

import { useEffect, useState } from "react";
import OfferModal from "./OfferModal";

// Relax typing for OfferModal so we can pass `initial` and `onSubmit`
// without conflicting with its stricter declared props type.
const OfferModalAny: any = OfferModal;

type OfferBannerProps = {
  negotiationId: number;
  role: "client" | "freelancer";
};

export default function OfferBanner({ negotiationId, role }: OfferBannerProps) {
  const [head, setHead] = useState<any>(null);
  const [current, setCurrent] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      const res = await fetch(`/api/negotiations/${negotiationId}`);
      const json = await res.json();
      if (!res.ok) {
        console.error("Failed to load negotiation", json);
        throw new Error(json?.error || "Failed to load negotiation");
      }
      setHead(json.negotiation);
      setCurrent(json.current);
    } catch (e: any) {
      setError(e?.message || "Failed to load negotiation");
      setHead(null);
      setCurrent(null);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negotiationId]);

  async function accept() {
    if (!head) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/negotiations/${negotiationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who: role }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Accept negotiation error", json);
        throw new Error(json?.error || "Failed to accept offer");
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to accept offer");
    } finally {
      setSubmitting(false);
    }
  }

  async function reject() {
    if (!head) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/negotiations/${negotiationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who: role }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Reject negotiation error", json);
        throw new Error(json?.error || "Failed to reject offer");
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to reject offer");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit(payload: any, note?: string) {
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/negotiations/${negotiationId}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposed_by: role, payload, note }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Edit / counter negotiation error", json);
        throw new Error(json?.error || "Failed to update offer");
      }
      setEditing(false);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update offer");
    } finally {
      setSubmitting(false);
    }
  }

  if (!head) return null;

  const p = current?.payload || {};
  const total = p.total_price;
  const ms = Array.isArray(p.milestones) ? p.milestones : [];

  const statusLabel = (() => {
    const status = current?.status as
      | "sent"
      | "countered"
      | "pending"
      | "accepted"
      | "rejected"
      | "superseded"
      | "cancelled"
      | undefined;

    switch (status) {
      case "sent":
      case "pending":
        return "Offer pending";
      case "countered":
        return "Counter-offer in review";
      case "accepted":
        return "Offer accepted";
      case "rejected":
        return "Offer rejected";
      case "superseded":
        return "Offer superseded";
      case "cancelled":
        return "Offer cancelled";
      default:
        return "Offer";
    }
  })();

  const canEdit =
    current &&
    ["sent", "countered", "pending"].includes(
      (current.status as string) || ""
    );

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {statusLabel} (rev #{head.current_rev_no})
          </p>
          <p className="text-base font-semibold text-slate-900">
            {typeof total === "number"
              ? `${total.toLocaleString()} ${p.currency || ""}`
              : "No price"}
          </p>
          <p className="text-xs text-slate-500">
            {ms.length ? `${ms.length} milestone(s)` : "No milestones"}
          </p>
          {error && (
            <p className="mt-1 text-[11px] text-red-600">{error}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={accept}
            disabled={submitting}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Processing…" : "Accept"}
          </button>
          <button
            onClick={reject}
            disabled={submitting}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Reject
          </button>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              disabled={submitting}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing && (
        <OfferModalAny
          // extra props we actually use in this banner
          initial={p}
          onClose={() => setEditing(false)}
          onSubmit={submitEdit}
          // core props that OfferModal's TS type expects
          role={role}
          clientId={head?.client_id ?? 0}
          freelancerId={head?.freelancer_id ?? 0}
          jobPostId={head?.job_post_id ?? 0}
        />
      )}
    </div>
  );
}
