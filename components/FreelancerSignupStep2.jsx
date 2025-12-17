"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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

function SortableSkillItem({ id, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
    >
      <div className="flex items-center gap-3 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-slate-300" />
        <span className="text-slate-800">{id}</span>
      </div>
      <button type="button" onClick={() => onRemove(id)} className="text-xs text-slate-500 hover:text-red-500">
        Remove
      </button>
    </div>
  );
}

export default function FreelancerSignupStep2({ onBack, onNext, submitting = false }) {
  const todayMonth = new Date().toISOString().slice(0, 7);

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [allSkills, setAllSkills] = useState([]);
  const [projects, setProjects] = useState([0]);
  const [presentProjects, setPresentProjects] = useState({});

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setAllSkills([
      "Python","Machine Learning","Deep Learning","Computer Vision",
      "Data Engineering","React","Node.js","SQL","Pandas","Docker",
    ]);
  }, []);

  const filteredSuggestions = allSkills
    .filter((s) => skillInput && s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s))
    .slice(0, 6);

  function handleAddSkill(name) {
    const clean = name.trim();
    if (!clean) return;
    if (skills.includes(clean)) return setSkillInput("");
    setSkills((prev) => [...prev, clean]);
    setSkillInput("");
  }
  function handleRemoveSkill(name) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSkills((prev) => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)));
  }

  function handleAddProject() {
    setProjects((prev) => {
      const newId = prev.length ? Math.max(...prev) + 1 : 0;
      return [...prev, newId];
    });
  }
  function handleDeleteProject(id) {
    setProjects((prev) => prev.filter((p) => p !== id));
  }
  function togglePresent(id) {
    setPresentProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const jobTitle = (fd.get("jobTitle") || "").toString().trim();
    const bio = (fd.get("bio") || "").toString().trim();

    // Build projects array from rendered indices
    const proj = projects.map((pid, index) => ({
      name: (fd.get(`projectName-${index}`) || "").toString().trim(),
      start: (fd.get(`startDate-${index}`) || "").toString() || null, // YYYY-MM
      end: presentProjects[pid] ? null : ((fd.get(`endDate-${index}`) || "").toString() || null),
      summary: (fd.get(`projectSummary-${index}`) || "").toString().trim(),
    })).filter(p => p.name || p.summary || p.start || p.end);

    onNext({ jobTitle, bio, skills, projects: proj });
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-200 px-6 py-6 md:px-10 md:py-8">
        <div className="mb-10">
          <Image src="/chatgpt-instructions3.jpeg" alt="Networkk" width={128} height={50} className="h-8 w-auto" />
        </div>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">Step 2 of 3</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Your role, skills & projects</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Tell us your job title, highlight your top skills, and add a few projects.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* JOB TITLE */}
          <div className="space-y-2">
            <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700">Job title</label>
            <input
              id="jobTitle" name="jobTitle" type="text" placeholder="e.g. Machine Learning Engineer"
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* BIO */}
          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium text-slate-700">Bio</label>
            <textarea
              id="bio" name="bio" rows={4}
              placeholder="A short introduction about you…"
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* SKILLS */}
          <div className="space-y-2">
            <label htmlFor="skillsInput" className="block text-sm font-medium text-slate-700">Skills</label>
            <div className="relative space-y-2 mt-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="skillsInput" type="text" value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(skillInput); } }}
                  placeholder="Add a skill (e.g. Python)"
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button type="button" onClick={() => handleAddSkill(skillInput)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-950">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {(filteredSuggestions.length > 0 || skillInput.trim()) && (
                <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg text-sm max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((s) => (
                    <button key={s} type="button" onClick={() => handleAddSkill(s)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                      <span className="text-slate-800">{s}</span>
                      <span className="text-[11px] text-slate-400">suggested</span>
                    </button>
                  ))}
                  {!allSkills.map((x) => x.toLowerCase()).includes(skillInput.trim().toLowerCase()) &&
                    skillInput.trim() && (
                      <button type="button" onClick={() => handleAddSkill(skillInput)}
                        className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-2 text-left hover:bg-slate-50">
                        <span className="text-slate-800">Add “{skillInput.trim()}”</span>
                        <span className="text-[11px] text-slate-400">custom</span>
                      </button>
                    )}
                </div>
              )}
            </div>

            {skills.length > 0 ? (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={skills} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 mt-2">
                      {skills.map((skill) => (
                        <SortableSkillItem key={skill} id={skill} onRemove={handleRemoveSkill} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <p className="text-xs text-slate-400">Drag to reorder.</p>
              </>
            ) : (
              <p className="text-xs text-slate-400">No skills added yet.</p>
            )}
          </div>

          {/* PROJECTS */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Projects</label>
            <p className="text-xs text-slate-400">Highlight 1–3 projects that show your best work.</p>

            <div className="space-y-3 mt-1">
              {projects.map((pid, index) => (
                <div key={pid} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-slate-500">Project {index + 1}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleAddProject}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <Plus className="h-4 w-4" /> Add another project
                      </button>
                      {projects.length > 1 && (
                        <button type="button" onClick={() => handleDeleteProject(pid)}
                          className="text-xs font-medium text-red-500 hover:text-red-600">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`projectName-${index}`} className="block text-xs font-medium text-slate-700 mb-1">
                      Project name
                    </label>
                    <input
                      id={`projectName-${index}`} name={`projectName-${index}`} type="text"
                      placeholder="e.g. Automated door measurement system"
                      className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`startDate-${index}`} className="block text-xs font-medium text-slate-700 mb-1">
                        Start date
                      </label>
                      <input
                        id={`startDate-${index}`} name={`startDate-${index}`} type="month" max={todayMonth}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label htmlFor={`endDate-${index}`} className="block text-xs font-medium text-slate-700 mb-1">
                        End date
                      </label>
                      <input
                        id={`endDate-${index}`} name={`endDate-${index}`} type="month" max={todayMonth}
                        disabled={!!presentProjects[pid]}
                        className={
                          "block w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 " +
                          (presentProjects[pid] ? "opacity-60 cursor-not-allowed" : "border-slate-300")
                        }
                      />
                      <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-slate-500">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-slate-300 text-[#079c02] focus:ring-[#079c02]"
                          checked={!!presentProjects[pid]}
                          onChange={() => togglePresent(pid)}
                        />
                        <span>Present (I currently work here)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`projectSummary-${index}`} className="block text-xs font-medium text-slate-700 mb-1">
                      Summary
                    </label>
                    <textarea
                      id={`projectSummary-${index}`} name={`projectSummary-${index}`} rows={3}
                      placeholder="Describe what you built, your role, and the impact."
                      className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NAV BUTTONS */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl 
                bg-[#079c02] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                transition hover:bg-[#056b01] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
