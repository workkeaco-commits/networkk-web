"use client";

import { useState } from "react";
import OfferModal from "./OfferModal";

type Props = {
  clientId: number | null;
  freelancerId: number | null;
  jobPostId: number | null;
  role?: "client" | "freelancer";
  label?: string;
  className?: string;
};

export default function OfferButton({
  clientId,
  freelancerId,
  jobPostId,
  role = "client",
  label = "Send offer / Create contract",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const missing: string[] = [];
  if (!clientId) missing.push("client");
  if (!freelancerId) missing.push("freelancer");
  if (!jobPostId) missing.push("job post");
  const hasAll = missing.length === 0;

  const handleClick = () => {
    if (!hasAll) {
      alert(
        `Can't open the offer form yet.\nMissing: ${missing.join(
          ", "
        )}.\n\nMake sure your conversation rows include freelancer_id and job_post_id, and that your client profile exists.`
      );
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        // never disabled; we gate inside onClick so it's always clickable
        className={
          "inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 " +
          (className || "")
        }
        title={
          hasAll
            ? "Create or send an offer"
            : `Missing ${missing.join(", ")}`
        }
      >
        {label}
      </button>

      {open && hasAll && (
        <OfferModal
          onClose={() => setOpen(false)}
          role={role}
          clientId={clientId!}
          freelancerId={freelancerId!}
          jobPostId={jobPostId!}
        />
      )}
    </>
  );
}
