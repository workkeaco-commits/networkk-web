// components/chat/OfferBanner.tsx
"use client";
import { useEffect, useState } from "react";
import OfferModal from "./OfferModal";

export default function OfferBanner({
  negotiationId, role // "client" | "freelancer"
}: { negotiationId: number; role: "client" | "freelancer"; }) {
  const [head, setHead] = useState<any>(null);
  const [current, setCurrent] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/negotiations/${negotiationId}`);
    const json = await res.json();
    if (res.ok) { setHead(json.negotiation); setCurrent(json.current); }
  }
  useEffect(()=>{ refresh(); }, [negotiationId]);

  async function accept() {
    await fetch(`/api/negotiations/${negotiationId}/accept`, {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ who: role })
    });
    await refresh();
  }
  async function reject() {
    await fetch(`/api/negotiations/${negotiationId}/reject`, {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ who: role })
    });
    await refresh();
  }
  async function submitEdit(payload:any, note?:string) {
    await fetch(`/api/negotiations/${negotiationId}/propose`, {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ proposed_by: role, payload, note })
    });
    setEditing(false);
    await refresh();
  }

  if (!head) return null;

  const p = current?.payload || {};
  const total = p.total_price;
  const ms = Array.isArray(p.milestones) ? p.milestones : [];

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Offer (rev #{head.current_rev_no})</p>
          <p className="text-base font-semibold text-slate-900">
            {total ? `${total} ${p.currency || ""}` : "No price"}
          </p>
          <p className="text-xs text-slate-500">
            {ms.length ? `${ms.length} milestone(s)` : "No milestones"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={accept} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white">Accept</button>
          <button onClick={reject} className="rounded-full border px-3 py-1.5 text-xs">Reject</button>
          <button onClick={()=>setEditing(true)} className="rounded-full border px-3 py-1.5 text-xs">Edit</button>
        </div>
      </div>

      {editing && (
        <OfferModal
          initial={p}
          onClose={()=>setEditing(false)}
          onSubmit={submitEdit}
        />
      )}
    </div>
  );
}
