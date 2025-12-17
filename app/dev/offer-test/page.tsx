"use client";

import OfferButton from "@/components/chat/OfferButton";

export default function OfferTestPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <h1 className="text-xl font-semibold mb-4">Offer Button Smoke Test</h1>

      {/* Hardcoded IDs just to prove the button renders and opens */}
      <OfferButton
        clientId={1}
        freelancerId={2}
        jobPostId={9}
        role="client"
        label="Send offer / Create contract"
      />

      <p className="mt-3 text-sm text-slate-500">
        If you see a green button above and a modal opens, the UI is fine. Next we’ll
        mount the same button in your chat composer.
      </p>
    </main>
  );
}
