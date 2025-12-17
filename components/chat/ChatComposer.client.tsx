"use client";

import OfferButton from "@/components/chat/OfferButton";

export default function ChatComposer({
  clientId,
  freelancerId,
  jobPostId,
  role = "client",
}: {
  clientId: number | null;
  freelancerId: number | null;
  jobPostId?: number | null;
  role?: "client" | "freelancer";
}) {
  return (
    <div className="border-t bg-white p-3 flex items-center gap-2">
      <input
        className="flex-1 rounded-full border px-3 py-2 text-sm"
        placeholder="Type a message…"
      />
      <button className="rounded-full border px-3 py-1.5 text-sm">Send</button>

      {/* Offer button is ALWAYS rendered (disabled if IDs missing) */}
      <OfferButton
        clientId={clientId}
        freelancerId={freelancerId}
        jobPostId={jobPostId ?? null}
        role={role}
      />
    </div>
  );
}
