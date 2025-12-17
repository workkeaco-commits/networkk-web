"use client";

import OfferButton from "./OfferButton";

export default function ComposerOfferButton({
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
    <div className="flex items-center gap-2">
      <OfferButton
        clientId={clientId}
        freelancerId={freelancerId}
        jobPostId={jobPostId ?? null}
        role={role}
        label="Send offer / Create contract"
      />
      {!clientId && <span className="text-[11px] text-slate-400">missing clientId</span>}
      {!freelancerId && <span className="text-[11px] text-slate-400">missing freelancerId</span>}
    </div>
  );
}
