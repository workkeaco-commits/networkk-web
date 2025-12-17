// components/chat/ChatActionBar.tsx
"use client";
import { useState } from "react";
import OfferModal from "./OfferModal";

export default function ChatActionBar({
  clientId, freelancerId, jobPostId
}: { clientId: number; freelancerId: number; jobPostId?: number | null; }) {
  const [open, setOpen] = useState(false);
  const [negotiationId, setNegotiationId] = useState<number | null>(null);

  async function ensureNegotiation() {
    const res = await fetch("/api/negotiations/upsert", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ client_id: clientId, freelancer_id: freelancerId, job_post_id: jobPostId ?? null })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to start negotiation");
    setNegotiationId(json.negotiation_id);
    return json.negotiation_id as number;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async () => { await ensureNegotiation(); setOpen(true); }}
        className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm text-white"
      >
        Send offer / Create contract
      </button>

      {open && negotiationId && (
        <OfferModal
          onClose={() => setOpen(false)}
          onSubmit={async (payload, note) => {
            // client proposes
            await fetch(`/api/negotiations/${negotiationId}/propose`, {
              method: "POST",
              headers: { "Content-Type":"application/json" },
              body: JSON.stringify({ proposed_by:"client", payload, note })
            });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
