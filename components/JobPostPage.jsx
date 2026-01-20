"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Loader2 } from "lucide-react";
import { SKILL_SUGGESTIONS } from "@/components/FreelancerSignupStep2";

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

/* ---------- Sortable skill pill ---------- */
function SortableSkillItem({ id, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
    >
      <div
        className="flex items-center gap-3 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-gray-300" />
        <span className="text-gray-800">{id}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="text-xs text-gray-500 hover:text-red-500"
      >
        Remove
      </button>
    </div>
  );
}

/* ---------- Step 3 (Details) ---------- */
function StepThreeDetails({
  categoryId,
  setCategoryId,
  catOptions,
  description,
  setDescription,
  skills,
  skillInput,
  setSkillInput,
  filteredSuggestions,
  handleAddSkill,
  handleRemoveSkill,
  sensors,
  handleDragEnd,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 space-y-5">
        {/* Category (flat select) */}
        <div className="space-y-1.5">
          <label
            htmlFor="category"
            className="block text-xs font-medium uppercase tracking-[0.16em] text-gray-500"
          >
            Field / category
          </label>
          <select
            id="category"
            name="category"
            value={categoryId === "" ? "" : String(categoryId)}
            onChange={(e) => {
              const v = e.target.value;
              setCategoryId(v ? Number(v) : "");
            }}
            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#10b8a6] focus:outline-none focus:ring-4 focus:ring-[#10b8a6]/5"
          >
            <option value="">Select a category</option>
            {catOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="description"
            className="block text-xs font-medium uppercase tracking-[0.16em] text-gray-500"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the scope, main tasks, tools or tech stack, and any deadlines."
            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#10b8a6] focus:outline-none focus:ring-4 focus:ring-[#10b8a6]/5"
          />
          <p className="text-[11px] text-gray-400">
            Write as if you&apos;re explaining it to a new team member on their
            first day.
          </p>
        </div>

        {/* Skills */}
        <div className="space-y-1.5">
          <label
            htmlFor="skillsInput"
            className="block text-xs font-medium uppercase tracking-[0.16em] text-gray-500"
          >
            Skills needed
          </label>
          <p className="text-[11px] text-gray-400 mb-1">
            Start typing to search. You can also add your own, then drag to
            reorder importance.
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
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#10b8a6] focus:outline-none focus:ring-4 focus:ring-[#10b8a6]/5"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#10b8a6] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0e9f8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b8a6]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {(filteredSuggestions.length > 0 || skillInput.trim()) && (
              <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-lg text-sm max-h-48 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="text-gray-800">{s}</span>
                    <span className="text-[11px] text-gray-400">from suggestions</span>
                  </button>
                ))}

                {!filteredSuggestions.length &&
                  skillInput.trim() &&
                  skills.indexOf(skillInput.trim()) === -1 && (
                    <button
                      type="button"
                      onClick={() => handleAddSkill(skillInput)}
                      className="flex w-full items-center justify-between border-t border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="text-gray-800">
                        Add &quot;{skillInput.trim()}&quot;
                      </span>
                      <span className="text-[11px] text-gray-400">custom skill</span>
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
                <SortableContext items={skills} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 mt-2">
                    {skills.map((skill) => (
                      <SortableSkillItem key={skill} id={skill} onRemove={handleRemoveSkill} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <p className="text-[11px] text-gray-400">
                Drag the handle to bubble the most important skills to the top.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-gray-400">
              No skills added yet. Start with the must-have skills first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function JobPostPage() {
  const router = useRouter();

  // auth + client
  const [clientId, setClientId] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);

  // steps
  const [step, setStep] = useState(1);

  // form state
  const [jobTitle, setJobTitle] = useState("");
  const [duration, setDuration] = useState("short");
  const [description, setDescription] = useState("");

  // categories (flat options)
  const [catOptions, setCatOptions] = useState([]); // [{id:number,label:string}]
  const [categoryId, setCategoryId] = useState("");  // selected child/parent id

  // skills
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [allSkills, setAllSkills] = useState([]);

  // budget
  const [price, setPrice] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const currency = "EGP";
  const [isSubmitting, setIsSubmitting] = useState(false);

  // dnd sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // preload suggestions
  useEffect(() => {
    setAllSkills(SKILL_SUGGESTIONS);
  }, []);

  // auth check + client_id load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/client/sign-in?next=/post-job");
        return;
      }
      // requires a select policy on clients OR do this on server
      const { data, error } = await supabase
        .from("clients")
        .select("client_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!error && data && mounted) setClientId(data.client_id);
      setLoadingClient(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  // load categories → build flat options: parent-only or "Parent — Child"
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("category_id, name, slug, parent_id, sort_order")
        .order("parent_id", { ascending: true, nullsFirst: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data) {
        console.error("categories load error:", error?.message);
        if (mounted) setCatOptions([]);
        return;
      }

      // normalize ids to numbers (Supabase can send bigints as strings)
      const rows = data.map((c) => ({
        id: Number(c.category_id),
        name: c.name,
        slug: c.slug,
        parentId: c.parent_id === null ? null : Number(c.parent_id),
      }));

      const blocked = new Set(["tech"]);
      const filteredRows = rows.filter((c) => {
        const name = String(c.name || "").toLowerCase();
        const slug = String(c.slug || "").toLowerCase();
        return !(blocked.has(name) || blocked.has(slug));
      });
      const parents = filteredRows.filter((c) => c.parentId === null);
      const childMap = new Map(parents.map((p) => [p.id, []]));
      filteredRows.forEach((c) => {
        if (c.parentId !== null && childMap.has(c.parentId)) {
          childMap.get(c.parentId).push(c);
        }
      });

      const options = [];
      for (const p of parents) {
        const kids = childMap.get(p.id) || [];
        if (kids.length === 0) {
          options.push({ id: p.id, label: p.name });
        } else {
          kids.forEach((k) => options.push({ id: k.id, label: `${p.name} — ${k.name}` }));
        }
      }

      if (mounted) setCatOptions(options);
    })();
    return () => { mounted = false; };
  }, []);

  /* ---------- helpers ---------- */
  const filteredSuggestions = allSkills
    .filter(
      (s) =>
        skillInput &&
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skills.includes(s)
    )
    .slice(0, 6);

  function handleAddSkill(name) {
    const clean = (name || "").trim();
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

  function handlePriceChange(e) {
    const value = e.target.value;
    const digitsOnly = value.replace(/,/g, "");
    if (!/^\d*$/.test(digitsOnly)) return;
    setPrice(digitsOnly);
    setPriceDisplay(digitsOnly ? Number(digitsOnly).toLocaleString("en-US") : "");
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    try {
      if (!clientId) throw new Error("Client profile not found. Please sign in as a client.");
      if (!jobTitle.trim()) throw new Error("Title is required.");
      if (!price) throw new Error("Price is required.");
      if (!categoryId) throw new Error("Please select a category.");

      setIsSubmitting(true);
      const payload = {
        jobTitle,
        duration,
        category_id: Number(categoryId),
        description,
        skills,
        price,
        currency,
        client_id: clientId,
      };

      const res = await fetch("/api/job-posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to post job");

      // 👇 Redirect to client's dashboard
      router.push("/client/dashboard");
      // Optional: ensure data revalidates on the dashboard
      // router.refresh();
    } catch (e) {
      alert(e.message || "Error creating job");
    } finally {
      setIsSubmitting(false);
    }
  }


  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const stepTitle = {
    1: "Describe what you need in one line",
    2: "How long do you imagine this taking?",
    3: "Give freelancers enough context to say yes",
    4: "Roughly how much are you planning to spend?",
  };

  const stepSubtitle = {
    1: "This is the headline freelancers see in their feed.",
    2: "Does this feel like a sprint or a longer partnership?",
    3: "Think of this as your project brief, not a legal contract.",
    4: "You can always refine this after a few conversations.",
  };

  const stepLabels = ["Title", "Duration", "Details", "Budget"];

  if (loadingClient) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-[#fbfbfd] px-4 py-8 md:py-12 flex justify-center">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        {/* Stepper */}
        <div className="flex items-center justify-between gap-2">
          {stepLabels.map((label, index) => {
            const n = index + 1;
            const isActive = n === step;
            return (
              <div
                key={label}
                className={
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] " +
                  (isActive
                    ? "border-[#10b8a6] bg-white text-gray-900 shadow-sm"
                    : "border-transparent text-gray-400")
                }
              >
                <span
                  className={
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] " +
                    (isActive
                      ? "bg-[#10b8a6] text-white"
                      : "bg-gray-100 text-gray-600")
                  }
                >
                  {n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Header */}
        <header className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase">
            Step {step} of 4
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            {stepTitle[step]}
          </h1>
          <p className="text-sm text-gray-500">{stepSubtitle[step]}</p>
        </header>

        {/* Step content */}
        <section className="flex-1 space-y-8">
          {step === 1 && (
            <div className="space-y-3">
              <label
                htmlFor="jobTitle"
                className="block text-xs font-medium uppercase tracking-[0.16em] text-gray-500"
              >
                Job title
              </label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job title"
                className="w-full border-0 border-b border-gray-300 bg-transparent px-0 pb-2 pt-1 text-base md:text-lg text-gray-900 placeholder:text-gray-400 focus:border-[#10b8a6] focus:outline-none focus:ring-0"
              />
              <p className="text-[11px] text-gray-400">
                Aim for 6–10 words. Mention the role + main task + domain.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose what feels closer. You can clarify in the description.
              </p>
              <div className="inline-flex rounded-full bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setDuration("short")}
                  className={
                    "px-4 py-2 text-xs sm:text-sm rounded-full transition " +
                    (duration === "short"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-900")
                  }
                >
                  Short term
                </button>
                <button
                  type="button"
                  onClick={() => setDuration("long")}
                  className={
                    "px-4 py-2 text-xs sm:text-sm rounded-full transition " +
                    (duration === "long"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-900")
                  }
                >
                  Long term
                </button>
              </div>
              <div className="grid gap-2 text-[11px] text-gray-400">
                <p>Short term → one clearly defined project, usually days to a few weeks.</p>
                <p>Long term → ongoing work, multiple phases, or an evolving roadmap.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <StepThreeDetails
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              catOptions={catOptions}
              description={description}
              setDescription={setDescription}
              skills={skills}
              skillInput={skillInput}
              setSkillInput={setSkillInput}
              filteredSuggestions={filteredSuggestions}
              handleAddSkill={handleAddSkill}
              handleRemoveSkill={handleRemoveSkill}
              sensors={sensors}
              handleDragEnd={handleDragEnd}
            />
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label
                  htmlFor="price"
                  className="block text-xs font-medium uppercase tracking-[0.16em] text-gray-500"
                >
                  Budget
                </label>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm text-gray-500">
                    {currency === "EGP" && "≈"}
                  </span>
                  <input
                    id="price"
                    name="price"
                    type="text"
                    inputMode="numeric"
                    value={priceDisplay}
                    onChange={handlePriceChange}
                    placeholder="5,000"
                    className="flex-1 border-0 border-b border-gray-300 bg-transparent px-0 pb-2 pt-1 text-lg text-gray-900 placeholder:text-gray-400 focus:border-[#10b8a6] focus:outline-none focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  This can be a project total or a starting point. You can refine it later.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="currency"
                  className="block text-xs font-medium uppercase tracking-[0.16em] text-gray-500"
                >
                  Currency
                </label>
                <div
                  id="currency"
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm"
                >
                  🇪🇬 EGP – Egyptian Pound
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer nav */}
        <footer className="pt-2 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={step < 4 ? goNext : handleSubmit}
            disabled={(step === 4 && !clientId) || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl 
                       bg-[#10b8a6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                       transition hover:bg-[#0e9f8e] 
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b8a6]/25 
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfbfd] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {step < 4 ? (
              "Next"
            ) : isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post job"
            )}
          </button>
        </footer>

        {step === 4 && !clientId && (
          <p className="text-xs text-red-600">
            No client profile found for this account. Please sign in as a client.
          </p>
        )}
      </div>
    </main>
  );
}
