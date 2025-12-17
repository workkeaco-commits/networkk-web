"use client";

import { useState } from "react";

type Milestone = { title: string; amount: string; days: string };

export default function OfferModal({
  onClose,
  role,
  clientId,
  freelancerId,
  jobPostId,
}: {
  onClose: () => void;
  role: "client" | "freelancer";
  clientId: number;
  freelancerId: number;
  jobPostId: number;
}) {
  const [totalPrice, setTotalPrice] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: "", amount: "", days: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addMilestone = () =>
    setMilestones((m) => [...m, { title: "", amount: "", days: "" }]);

  const removeMilestone = (idx: number) =>
    setMilestones((m) => (m.length > 1 ? m.filter((_, i) => i !== idx) : m));

  const updateMilestone = (
    idx: number,
    key: keyof Milestone,
    val: string
  ) =>
    setMilestones((m) => {
      const copy = [...m];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const payload = {
        client_id: clientId,
        freelancer_id: freelancerId,
        job_post_id: jobPostId,
        total_price: Number(totalPrice),
        currency,
        milestones: milestones.map((m, i) => ({
          order: i + 1,
          title: m.title.trim(),
          amount: Number(m.amount || 0),
          days: Number(m.days || 0),
        })),
        initiator_role: role,
      };

      // TODO: replace with your actual API path when ready
      // const res = await fetch("/api/offers/create", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // const json = await res.json();
      // if (!res.ok) throw new Error(json?.error || "Failed to send offer");

      console.log("[OfferModal] would submit:", payload);
      alert("Offer form submitted (console has payload). Wire your API next.");
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to send offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Create offer / contract
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">
                Total price
              </label>
              <input
                value={totalPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setTotalPrice(v);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Milestones
              </label>
              <button
                type="button"
                onClick={addMilestone}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                + Add milestone
              </button>
            </div>

            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={m.title}
                      onChange={(e) => updateMilestone(i, "title", e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      placeholder={`Milestone #${i + 1} title`}
                    />
                    <input
                      value={m.amount}
                      onChange={(e) =>
                        updateMilestone(
                          i,
                          "amount",
                          e.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      placeholder="Amount"
                    />
                    <input
                      value={m.days}
                      onChange={(e) =>
                        updateMilestone(
                          i,
                          "days",
                          e.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      placeholder="Days"
                    />
                  </div>

                  {milestones.length > 1 && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
