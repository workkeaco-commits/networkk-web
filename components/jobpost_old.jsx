"use client";

import { useState, useEffect } from "react";
import { GripVertical, Plus } from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable skill item
function SortableSkillItem({ id, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
    >
      <div
        className="flex items-center gap-3 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-slate-300" />
        <span className="text-slate-800">{id}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="text-xs text-slate-500 hover:text-red-500"
      >
        Remove
      </button>
    </div>
  );
}

export default function JobPostPage() {
  const [step, setStep] = useState(1);

  // === FORM STATE ===
  const [jobTitle, setJobTitle] = useState("");
  const [duration, setDuration] = useState("short"); // "short" | "long"
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [allSkills, setAllSkills] = useState([]);

    const [price, setPrice] = useState("");          // raw digits only, like "5000"
    const [priceDisplay, setPriceDisplay] = useState(""); // formatted with commas
    const [currency, setCurrency] = useState("EGP");


  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setAllSkills([
      "Python",
      "Machine Learning",
      "Deep Learning",
      "Computer Vision",
      "React",
      "Node.js",
      "Data Analysis",
      "SQL",
      "Docker",
      "Project Management",
    ]);
  }, []);

  const filteredSuggestions = allSkills
    .filter(
      (s) =>
        skillInput &&
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skills.includes(s)
    )
    .slice(0, 6);

  function handleAddSkill(name) {
    const clean = name.trim();
    if (!clean) return;
    if (skills.includes(clean)) {
      setSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, clean]);
    setSkillInput("");
  }

  function handleRemoveSkill(name) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSkills((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function goNext() {
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function goBack() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function handleSubmit() {
    const payload = {
      jobTitle,
      duration,
      category,
      description,
      skills,
      price,
      currency,
    };
    console.log("Job post:", payload);
    alert("Job created (check console). Hook this to your backend next.");
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);


  const stepTitle = {
  1: "Give your project a clear title",
  2: "How long will your project take?",
  3: "Tell freelancers more about this project",
  4: "What’s your estimated budget?",
};


  const stepLabels = ["Job title", "Duration", "Details", "Budget"];
function handlePriceChange(e) {
  const value = e.target.value;

  // Remove existing commas
  const digitsOnly = value.replace(/,/g, "");

  // Allow only digits
  if (!/^\d*$/.test(digitsOnly)) return;

  // Store raw numeric string (no commas) for backend
  setPrice(digitsOnly);

  // Format with commas for display
  const formatted = digitsOnly ? Number(digitsOnly).toLocaleString("en-US") : "";
  setPriceDisplay(formatted);
}

  return (
    <main className="min-h-screen bg-white px-4 py-6 md:py-10 flex justify-center">
      <div className="w-full max-w-3xl">
        {/* PROGRESS TRACK BAR */}
        <div className="mb-6 space-y-3">
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#079c02] transition-all"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-400">
            {stepLabels.map((label, index) => {
              const stepIndex = index + 1;
              const isActive = stepIndex === step;
              return (
                <span
                  key={label}
                  className={
                    "truncate " +
                    (isActive ? "text-slate-900 font-medium" : "")
                  }
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* HEADER (NO 'Step x of 4' TEXT ANYMORE) */}
        <div className="mb-6 space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            {stepTitle[step]}
        </h1>
        </div>

        {/* STEP CONTENT */}
        <div className="space-y-6">
          {/* STEP 1 – Job title */}
          {step === 1 && (
            <div className="space-y-2">
              <label
                htmlFor="jobTitle"
                className="block text-sm font-medium text-slate-700"
              >
                Job title
              </label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Machine Learning Engineer for door detection project"
                className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400">
                Make it specific: role + main task + context.
              </p>
            </div>
          )}

          {/* STEP 2 – Long vs short term */}
          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Is this a short-term or long-term job?
              </label>
              <p className="text-xs text-slate-400">
                Short-term: one-off tasks or projects. Long-term: ongoing work
                or multiple phases.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setDuration("short")}
                  className={
                    "rounded-2xl border px-4 py-3 text-left text-sm transition " +
                    (duration === "short"
                      ? "border-[#079c02] bg-[#079c02]/5"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100")
                  }
                >
                  <p className="font-medium text-slate-800">Short term</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Days to a few weeks. One clear deliverable.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDuration("long")}
                  className={
                    "rounded-2xl border px-4 py-3 text-left text-sm transition " +
                    (duration === "long"
                      ? "border-[#079c02] bg-[#079c02]/5"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100")
                  }
                >
                  <p className="font-medium text-slate-800">Long term</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Months or ongoing collaboration.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 – Category + Description + Skills */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Category */}
              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-slate-700"
                >
                  Field / category
                </label>
                <select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Select a category</option>
                  <option value="ml-ai">Machine Learning / AI</option>
                  <option value="data">Data Engineering / Analytics</option>
                  <option value="web-dev">Web development</option>
                  <option value="mobile-dev">Mobile app development</option>
                  <option value="design">UI / UX & Design</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need, the scope, milestones, and any constraints."
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400">
                  Include tech stack, example deliverables, and any integrations if possible.
                </p>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <label
                  htmlFor="skillsInput"
                  className="block text-sm font-medium text-slate-700"
                >
                  Skills needed
                </label>
                <p className="text-xs text-slate-400">
                  Start typing to search skills. You can also add your own, then
                  drag to reorder.
                </p>

                <div className="relative space-y-2 mt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="skillsInput"
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill(skillInput);
                        }
                      }}
                      placeholder="Add a skill (e.g. PyTorch, React, SQL)"
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill(skillInput)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#079c02] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#056b01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079c02]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  {(filteredSuggestions.length > 0 || skillInput.trim()) && (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg text-sm max-h-48 overflow-y-auto">
                      {filteredSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleAddSkill(s)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <span className="text-slate-800">{s}</span>
                          <span className="text-[11px] text-slate-400">
                            from suggestions
                          </span>
                        </button>
                      ))}

                      {!allSkills
                        .map((x) => x.toLowerCase())
                        .includes(skillInput.trim().toLowerCase()) &&
                        skillInput.trim() && (
                          <button
                            type="button"
                            onClick={() => handleAddSkill(skillInput)}
                            className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="text-slate-800">
                              Add “{skillInput.trim()}”
                            </span>
                            <span className="text-[11px] text-slate-400">
                              custom skill
                            </span>
                          </button>
                        )}
                    </div>
                  )}
                </div>

                {skills.length > 0 ? (
                  <>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={skills}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 mt-2">
                          {skills.map((skill) => (
                            <SortableSkillItem
                              key={skill}
                              id={skill}
                              onRemove={handleRemoveSkill}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <p className="text-xs text-slate-400">
                      Drag the handle to reorder the most important skills to the top.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">
                    No skills added yet. Start typing to add your first skill.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 – Price + currency */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Budget
                  </label>
                    <input
                    id="price"
                    name="price"
                    type="text"
                    inputMode="numeric"
                    value={priceDisplay}
                    onChange={handlePriceChange}
                    placeholder="e.g. 5,000"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />

                  <p className="text-[11px] text-slate-400">
                    You can adjust this later after discussing with freelancers.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="currency"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Currency
                  </label>
            <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
            <option value="EGP">🇪🇬 EGP – Egyptian Pound</option>
            <option value="USD">🇺🇸 USD – US Dollar</option>
            <option value="EUR">🇪🇺 EUR – Euro</option>
            <option value="GBP">🇬🇧 GBP – British Pound</option>
            <option value="SAR">🇸🇦 SAR – Saudi Riyal</option>
            <option value="AED">🇦🇪 AED – UAE Dirham</option>
            <option value="KWD">🇰🇼 KWD – Kuwaiti Dinar</option>
            </select>

                </div>
              </div>
            </div>
          )}

          {/* NAV BUTTONS */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={step < 4 ? goNext : handleSubmit}
              className="inline-flex items-center justify-center rounded-xl 
                         bg-[#079c02] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                         transition hover:bg-[#056b01] 
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079c02]/70 
                         focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {step < 4 ? "Next" : "Post job"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
