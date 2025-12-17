"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";

const UNIT_TO_DAYS: Record<"days" | "weeks" | "months", number> = {
  days: 1,
  weeks: 7,
  months: 30, // you can change this if you want another convention
};

function parsePeriodLabelToDays(label: string): number | null {
  const match = label
    .toLowerCase()
    .match(/(\d+)\s*(day|days|week|weeks|month|months)/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unitWord = match[2];

  let unit: "days" | "weeks" | "months";
  if (unitWord.startsWith("day")) unit = "days";
  else if (unitWord.startsWith("week")) unit = "weeks";
  else unit = "months";

  return amount * UNIT_TO_DAYS[unit];
}

function getMilestonesTotalDays(
  milestones: { amount: string | number; unit: "days" | "weeks" | "months" }[]
): number {
  return milestones.reduce((sum, m) => {
    const amt = typeof m.amount === "string" ? Number(m.amount) || 0 : m.amount;
    return sum + amt * UNIT_TO_DAYS[m.unit];
  }, 0);
}

function formatDaysAsLabel(totalDays: number): string {
  if (totalDays % UNIT_TO_DAYS.weeks === 0) {
    const weeks = totalDays / UNIT_TO_DAYS.weeks;
    return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  }
  return `${totalDays} day${totalDays !== 1 ? "s" : ""}`;
}

function containsContactInfo(text: string): boolean {
  const emailPattern =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phonePattern =
    /(\+?\d[\d\s\-()]{7,}\d)/; // loose phone detection
  return emailPattern.test(text) || phonePattern.test(text);
}

function extractAmountFromText(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, " ");
  const match = cleaned.match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

type Milestone = {
  task: string;
  amount: number; // duration number
  unit: "days" | "weeks" | "months"; // duration unit
  price: string; // e.g. "4,000 EGP"
};

type Freelancer = {
  id: number;
  name: string;
  username: string; // used in profile URL
  avatarUrl: string;
  title: string;
  location: string;
};

type Proposal = {
  id: number;
  jobTitle: string;
  proposalText: string;
  price: string; // total price as label, e.g. "18,000 EGP (fixed)"
  period: string;
  milestones: Milestone[];
  submittedAt: string;
  freelancer: Freelancer;
};

type CounterMilestone = {
  task: string;
  amount: string; // keep as string in the form
  unit: "days" | "weeks" | "months";
  price: string; // e.g. "4,000 EGP"
};

type CounterForm = {
  note: string;
  newPrice: string;
  newPeriod: string;
  milestones: CounterMilestone[];
};

const proposals: Proposal[] = [
  {
    id: 1,
    jobTitle: "Senior Product Designer",
    proposalText:
      "I will start with a discovery workshop, then wireframes, then high-fidelity designs in Figma with responsive variants. I’ll also provide a clickable prototype and a design handoff file for developers.",
    price: "18,000 EGP (fixed)",
    period: "4 weeks",
    submittedAt: "2 hours ago",
    milestones: [
      {
        task: "Discovery & requirements",
        amount: 5,
        unit: "days",
        price: "4,000 EGP",
      },
      {
        task: "Wireframes & UX flows",
        amount: 1,
        unit: "weeks",
        price: "6,000 EGP",
      },
      {
        task: "UI design & prototype",
        amount: 2,
        unit: "weeks",
        price: "8,000 EGP",
      },
    ],
    freelancer: {
      id: 101,
      name: "Sara Ahmed",
      username: "sara-ahmed",
      avatarUrl: "/avatars/sara.png", // change to your real path
      title: "Senior Product Designer",
      location: "Cairo, Egypt",
    },
  },
  {
    id: 2,
    jobTitle: "Junior AI Engineer",
    proposalText:
      "I will clean and label your data, train a first baseline model, then iterate with better architectures and hyperparameters. I’ll document everything clearly and prepare a simple API for integration.",
    price: "900 USD (fixed)",
    period: "6 weeks",
    submittedAt: "1 day ago",
    milestones: [
      {
        task: "Data cleaning & labeling",
        amount: 2,
        unit: "weeks",
        price: "300 USD",
      },
      {
        task: "Baseline model & evaluation",
        amount: 2,
        unit: "weeks",
        price: "300 USD",
      },
      {
        task: "Improvements & deployment support",
        amount: 2,
        unit: "weeks",
        price: "300 USD",
      },
    ],
    freelancer: {
      id: 102,
      name: "Omar Khaled",
      username: "omar-khaled",
      avatarUrl: "/avatars/omar.png",
      title: "Computer Vision Engineer",
      location: "Alexandria, Egypt",
    },
  },
];

export default function ClientProposalsPage() {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    null
  );
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);

  const [counterForm, setCounterForm] = useState<CounterForm>({
    note: "",
    newPrice: "",
    newPeriod: "",
    milestones: [
      {
        task: "",
        amount: "",
        unit: "days",
        price: "",
      },
    ],
  });

  const resetCounterForm = () => {
    setCounterForm({
      note: "",
      newPrice: "",
      newPeriod: "",
      milestones: [
        {
          task: "",
          amount: "",
          unit: "days",
          price: "",
        },
      ],
    });
  };

  const handleAccept = (proposal: Proposal) => {
    // TODO: call your backend to accept the proposal
    console.log("Accept proposal:", proposal.id);
  };

  const openCounterOfferModal = (proposal: Proposal) => {
    setSelectedProposal(proposal);

    // Pre-fill with existing data if you want
    setCounterForm({
      note: "",
      newPrice: proposal.price,
      newPeriod: proposal.period,
      milestones:
        proposal.milestones.length > 0
          ? proposal.milestones.map((m) => ({
              task: m.task,
              amount: String(m.amount),
              unit: m.unit,
              price: m.price,
            }))
          : [
              {
                task: "",
                amount: "",
                unit: "days",
                price: "",
              },
            ],
    });

    setIsCounterModalOpen(true);
  };

  const closeCounterOfferModal = () => {
    setIsCounterModalOpen(false);
    setSelectedProposal(null);
    resetCounterForm();
  };

  const handleCounterFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCounterForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCounterMilestoneChange = (
    index: number,
    field: keyof CounterMilestone,
    value: string
  ) => {
    setCounterForm((prev) => {
      const updated = [...prev.milestones];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, milestones: updated };
    });
  };

  const addCounterMilestone = () => {
    setCounterForm((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { task: "", amount: "", unit: "days", price: "" },
      ],
    }));
  };

  const removeCounterMilestone = (index: number) => {
    setCounterForm((prev) => {
      const updated = prev.milestones.filter((_, i) => i !== index);
      return {
        ...prev,
        milestones:
          updated.length > 0
            ? updated
            : [{ task: "", amount: "", unit: "days", price: "" }],
      };
    });
  };

  const handleSubmitCounterOffer = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;

    const cleanMilestones = counterForm.milestones.map((m) => ({
      task: m.task,
      amount: Number(m.amount) || 0,
      unit: m.unit,
      price: m.price,
    }));

    const payload = {
      proposalId: selectedProposal.id,
      jobTitle: selectedProposal.jobTitle,
      freelancerId: selectedProposal.freelancer.id,
      note: counterForm.note,
      newPrice: counterForm.newPrice,
      newPeriod: counterForm.newPeriod,
      milestones: cleanMilestones,
    };

    // TODO: send this to backend instead of console.log
    console.log("Counter-offer submitted:", payload);

    // Backend should also validate:
    // - sum(milestone.price) == newPrice
    // - sum(milestone.periods) == newPeriod
    closeCounterOfferModal();
  };

  // === Derived validations ===

  const noteHasContactInfo = containsContactInfo(counterForm.note);

  const milestonesTotalDays = getMilestonesTotalDays(counterForm.milestones);
  const milestonesTotalLabel =
    milestonesTotalDays > 0 ? formatDaysAsLabel(milestonesTotalDays) : "0 days";

  const newPeriodDays = parsePeriodLabelToDays(counterForm.newPeriod);
  const periodMatches =
    newPeriodDays !== null && milestonesTotalDays === newPeriodDays;

  const newPriceAmount = extractAmountFromText(counterForm.newPrice) ?? 0;
  const milestonesTotalPrice = counterForm.milestones.reduce((sum, m) => {
    const v = extractAmountFromText(m.price);
    return sum + (v ?? 0);
  }, 0);

  const milestonesTotalPriceLabel =
    milestonesTotalPrice > 0
      ? milestonesTotalPrice.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : "0";

  const priceMatches =
    newPriceAmount > 0 &&
    Math.abs(milestonesTotalPrice - newPriceAmount) < 0.01;

  const canSubmit =
    !!counterForm.newPrice.trim() &&
    !!counterForm.newPeriod.trim() &&
    counterForm.milestones.length > 0 &&
    milestonesTotalDays > 0 &&
    periodMatches &&
    priceMatches &&
    !noteHasContactInfo;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with logo */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo - use the SAME logo image as the freelancer signup */}
          <div className="flex items-center gap-3">
            <Image
              src="/chatgpt-instructions3.jpeg" // ⬅️ change to your logo path
              alt="Networkk logo"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </div>

          {/* Simple nav */}
          <nav className="hidden gap-6 text-sm text-slate-600 sm:flex">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/jobs" className="hover:text-slate-900">
              Jobs
            </Link>
            <Link
              href="/client/proposals"
              className="font-medium text-slate-900"
            >
              Proposals
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Proposals
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review proposals from freelancers and accept or send a counter-offer.
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500 sm:mt-0">
            {proposals.length} proposals received
          </p>
        </div>

        {/* Proposal cards */}
        <div className="mt-6 grid gap-4">
          {proposals.map((proposal) => (
            <article
              key={proposal.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Top row: freelancer + meta */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Freelancer info */}
                <div className="flex items-start gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full bg-slate-200">
                    <Image
                      src={proposal.freelancer.avatarUrl}
                      alt={proposal.freelancer.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <Link
                      href={`/freelancers/${proposal.freelancer.username}`}
                      className="text-sm font-semibold text-slate-900 hover:underline"
                    >
                      {proposal.freelancer.name}
                    </Link>
                    <p className="text-xs text-slate-600">
                      {proposal.freelancer.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {proposal.freelancer.location}
                    </p>
                  </div>
                </div>

                {/* Job + meta */}
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    For job
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {proposal.jobTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted {proposal.submittedAt}
                  </p>
                </div>
              </div>

              {/* Proposal main info */}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {/* Proposal text */}
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Proposal
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {proposal.proposalText}
                  </p>
                </div>

                {/* Price / period */}
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-800">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total price
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {proposal.price}
                    </p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Period
                    </p>
                    <p className="mt-0.5 text-slate-900">{proposal.period}</p>
                  </div>
                </div>
              </div>

              {/* Milestones with duration + price */}
              {proposal.milestones.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Timeline for the project(Milestones)
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {proposal.milestones.map((m, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                      >
                        <p className="font-medium text-slate-900">
                          {m.task || "Milestone"}
                        </p>
                        <p className="mt-0.5 text-slate-600">
                          {m.amount} {m.unit} · {m.price}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {/* Accept proposal */}
                  <button
                    type="button"
                    onClick={() => handleAccept(proposal)}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    Accept proposal
                  </button>

                  {/* Send counter-offer */}
                  <button
                    type="button"
                    onClick={() => openCounterOfferModal(proposal)}
                    className="inline-flex items-center justify-center rounded-full border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                  >
                    Negotiate
                  </button>
                </div>


              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Counter-offer Modal */}
      {isCounterModalOpen && selectedProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeCounterOfferModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Send counter-offer
              </h2>
              <button
                type="button"
                onClick={closeCounterOfferModal}
                className="text-xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-500">
              To{" "}
              <span className="font-medium text-slate-800">
                {selectedProposal.freelancer.name}
              </span>{" "}
              for{" "}
              <span className="font-medium text-slate-800">
                {selectedProposal.jobTitle}
              </span>
            </p>

            <form onSubmit={handleSubmitCounterOffer} className="space-y-4">
              {/* Note */}
              <div>
                <label
                  htmlFor="note"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Note to freelancer
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={4}
                  value={counterForm.note}
                  onChange={handleCounterFieldChange}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 ${
                    noteHasContactInfo
                      ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-200 bg-slate-50 focus:border-emerald-500 focus:bg-white focus:ring-emerald-500"
                  }`}
                  placeholder="Explain your counter-offer, what you want to adjust, or any conditions."
                />
                {noteHasContactInfo && (
                  <p className="mt-1 text-[11px] text-red-500">
                    Please do not include phone numbers or email addresses in
                    this note.
                  </p>
                )}
              </div>

              {/* New price */}
              <div>
                <label
                  htmlFor="newPrice"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  New total price
                </label>
                <input
                  id="newPrice"
                  name="newPrice"
                  type="text"
                  value={counterForm.newPrice}
                  onChange={handleCounterFieldChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 15,000 EGP, 800 USD..."
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Sum of all milestone prices should match this total.
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  <span className="font-medium">Milestones total price:</span>{" "}
                  {milestonesTotalPriceLabel}{" "}
                  {newPriceAmount > 0 && (
                    <span
                      className={
                        priceMatches ? "text-emerald-600" : "text-red-500"
                      }
                    >
                      ({priceMatches ? "matches" : "does NOT match"} the new
                      total price)
                    </span>
                  )}
                </p>
              </div>

              {/* Project period */}
              <div>
                <label
                  htmlFor="newPeriod"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Project period
                </label>
                <input
                  id="newPeriod"
                  name="newPeriod"
                  type="text"
                  value={counterForm.newPeriod}
                  onChange={handleCounterFieldChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 4 weeks, 30 days"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Use one value like "4 weeks" or "30 days". Milestones' total
                  period must match this.
                </p>
              </div>

              {/* New milestones (with duration + price) */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    New milestones
                  </label>
                  <button
                    type="button"
                    onClick={addCounterMilestone}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    + Add milestone
                  </button>
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Define the tasks, their durations, and the price for each.
                </p>

                <div className="space-y-3">
                  {counterForm.milestones.map((m, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        {/* Task name */}
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={m.task}
                            onChange={(e) =>
                              handleCounterMilestoneChange(
                                index,
                                "task",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Task name"
                          />
                        </div>

                        {/* Duration: amount + unit */}
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={m.amount}
                            onChange={(e) =>
                              handleCounterMilestoneChange(
                                index,
                                "amount",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Number"
                          />
                          <select
                            value={m.unit}
                            onChange={(e) =>
                              handleCounterMilestoneChange(
                                index,
                                "unit",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                          </select>
                        </div>

                        {/* Price per milestone */}
                        <div>
                          <input
                            type="text"
                            value={m.price}
                            onChange={(e) =>
                              handleCounterMilestoneChange(
                                index,
                                "price",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Price (e.g. 4,000 EGP)"
                          />
                        </div>
                      </div>

                      {counterForm.milestones.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeCounterMilestone(index)}
                            className="text-xs text-slate-400 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary of milestones period vs project period */}
                <p className="mt-3 text-[11px] text-slate-600">
                  <span className="font-medium">Milestones total period:</span>{" "}
                  {milestonesTotalLabel}
                  {counterForm.newPeriod.trim() && (
                    <>
                      {" "}
                      <span
                        className={
                          periodMatches ? "text-emerald-600" : "text-red-500"
                        }
                      >
                        ({periodMatches
                          ? "matches"
                          : "does NOT match"}{" "}
                        project period {counterForm.newPeriod || "—"})
                      </span>
                    </>
                  )}
                </p>
                {selectedProposal && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Original proposal period: {selectedProposal.period}
                  </p>
                )}
              </div>

              {/* Submit counter-offer */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={
                  "mt-2 w-full rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 " +
                  (canSubmit
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-emerald-300 cursor-not-allowed opacity-70")
                }
              >
                Send counter-offer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
