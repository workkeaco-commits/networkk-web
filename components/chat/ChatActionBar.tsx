// components/chat/ChatActionBar.tsx
"use client";

import { useState } from "react";
import OfferModal from "./OfferModal";

// Wrap OfferModal in an `any`-typed component so we can safely
// pass an `onSubmit` callback even if it's not declared in its props type.
const OfferModalWithSubmit: any = OfferModal;

type ChatActionBarProps = {
  clientId: number;
  freelancerId: number;
  jobPostId?: number | null;
  // allow caller to specify role; default to "client" for this bar
  role?: "client" | "freelancer";
};

export default function ChatActionBar({
  clientId,
  freelancerId,
  jobPostId,
  role = "client",
}: ChatActionBarProps) {
  const [open, setOpen] = useState(false);
  const [negotiationId, setNegotiationId] = useState<number | null>(null);

  async function ensureNegotiation() {
    const res = await fetch("/api/negotiations/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        freelancer_id: freelancerId,
        job_post_id: jobPostId ?? null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      // surface a clear error for debugging
      console.error("Failed to start negotiation", json);
      throw new Error(json.error || "Failed to start negotiation");
    }

    const id = json.negotiation_id as number;
    setNegotiationId(id);
    return id;
  }

  const handleOpenOffer = async () => {
    try {
      await ensureNegotiation();
      setOpen(true);
    } catch (e) {
      // optional: you could show a toast / alert here instead
      console.error(e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleOpenOffer}
        className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Send offer / Create contract
      </button>

      {open && negotiationId && (
        <OfferModalWithSubmit
          onClose={() => setOpen(false)}
          role={role}
          clientId={clientId}
          freelancerId={freelancerId}
          jobPostId={jobPostId ?? null}
          onSubmit={async (payload: any, note: any) => {
            // Client proposes via negotiations API
            const res = await fetch(
              `/api/negotiations/${negotiationId}/propose`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  proposed_by: role, // usually "client" here
                  payload,
                  note,
                }),
              }
            );

            const json = await res.json();
            if (!res.ok) {
              console.error("Failed to submit proposal", json);
              throw new Error(json.error || "Failed to submit proposal");
            }

            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
