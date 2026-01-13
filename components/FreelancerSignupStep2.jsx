"use client";

import { useState, useEffect } from "react";
import { GripVertical, Plus, Briefcase, ChevronRight, X } from "lucide-react";
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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm animate-fade-in group"
    >
      <div
        className="flex items-center gap-3 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
        <span className="text-gray-900 font-medium">{id}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
      >
        <X className="w-4 h-4" />
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
      "Python",
      "Machine Learning",
      "Deep Learning",
      "Computer Vision",
      "Data Engineering",
      "React",
      "Node.js",
      "SQL",
      "Pandas",
      "Docker",
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

    const proj = projects
      .map((pid, index) => ({
        name: (fd.get(`projectName-${index}`) || "").toString().trim(),
        start: (fd.get(`startDate-${index}`) || "").toString() || null,
        end: presentProjects[pid]
          ? null
          : (fd.get(`endDate-${index}`) || "").toString() || null,
        summary: (fd.get(`projectSummary-${index}`) || "").toString().trim(),
      }))
      .filter((p) => p.name || p.summary || p.start || p.end);

    onNext({ jobTitle, bio, skills, projects: proj });
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen py-12 md:py-20 pb-20">
      <main className="max-w-[720px] mx-auto px-6 animate-fade-in">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
            Step 2 of 3
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
            Tell us about your work
          </h1>
          <p className="text-lg text-gray-500 font-medium leading-relaxed">
            Highlight your expertise and showcase your best projects.
          </p>
        </div>

        <form className="space-y-12" onSubmit={handleSubmit}>
          {/* CORE INFO */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="jobTitle" className="text-[14px] font-semibold text-gray-900 ml-1">
                Job title
              </label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                placeholder="e.g. Machine Learning Engineer"
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-[14px] font-semibold text-gray-900 ml-1">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                placeholder="A short introduction about your professional journey…"
                className="w-full bg-white border border-gray-200 rounded-[22px] px-5 py-4 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300 shadow-sm resize-none"
              />
            </div>
          </div>

          {/* SKILLS */}
          <div className="space-y-6 pt-4 border-t border-gray-100">
            <div>
              <label className="text-[14px] font-semibold text-gray-900 ml-1 block mb-1">
                Skills
              </label>
              <p className="text-sm text-gray-500 ml-1">
                Start typing to see suggestions. Press Enter to add.
              </p>
            </div>

            <div className="relative space-y-4">
              <div className="flex gap-2">
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
                  placeholder="e.g. Python, React, UI Design"
                  className="flex-1 rounded-[18px] border border-gray-200 bg-white px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill(skillInput)}
                  className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-black/5"
                >
                  Add
                </button>
              </div>

              {(filteredSuggestions.length > 0 || skillInput.trim()) && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-xl shadow-2xl p-2 animate-fade-in overflow-hidden">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleAddSkill(s)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left rounded-xl hover:bg-white hover:text-blue-600 transition-colors text-sm font-medium"
                    >
                      <span>{s}</span>
                      <Plus className="w-4 h-4 opacity-30" />
                    </button>
                  ))}

                  {!allSkills.map((x) => x.toLowerCase()).includes(skillInput.trim().toLowerCase()) &&
                    skillInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddSkill(skillInput)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left rounded-xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <span>Add “{skillInput.trim()}”</span>
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                </div>
              )}

              {skills.length > 0 ? (
                <div className="space-y-4 mt-8">
                  <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-gray-400 px-1">
                    <span>Ranked Skills</span>
                    <span>Drag to reorder</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={skills} strategy={verticalListSortingStrategy}>
                      <div className="grid gap-3">
                        {skills.map((skill) => (
                          <SortableSkillItem key={skill} id={skill} onRemove={handleRemoveSkill} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-gray-100 rounded-[32px] text-center text-gray-400">
                  <p className="text-sm">No skills added yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* PROJECTS */}
          <div className="space-y-6 pt-4 border-t border-gray-100 text-left">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[14px] font-semibold text-gray-900 ml-1 block mb-1">
                  Projects
                </label>
                <p className="text-sm text-gray-500 ml-1">
                  Highlight 1–3 projects that represent your best work.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddProject}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Add another
              </button>
            </div>

            <div className="space-y-6">
              {projects.map((pid, index) => (
                <div
                  key={pid}
                  className="rounded-[32px] border border-gray-100 bg-white p-8 space-y-6 shadow-sm relative group animate-fade-in"
                >
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(pid)}
                      className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <div className="space-y-1">
                    <p className="text-[11px] font-bold tracking-widest uppercase text-blue-600">
                      Project {index + 1}
                    </p>
                    <input
                      id={`projectName-${index}`}
                      name={`projectName-${index}`}
                      type="text"
                      placeholder="Project name (e.g. E-commerce Mobile App)"
                      className="w-full text-2xl font-semibold bg-transparent placeholder:text-gray-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-gray-500 ml-1">
                        Start date
                      </label>
                      <input
                        id={`startDate-${index}`}
                        name={`startDate-${index}`}
                        type="month"
                        max={todayMonth}
                        className="w-full bg-gray-50 border-none rounded-[14px] px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600/10 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-gray-500 ml-1 flex items-center justify-between">
                        <span>End date</span>
                        <div className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-3 h-3 rounded bg-gray-50 border-gray-200 text-blue-600 focus:ring-0"
                            checked={!!presentProjects[pid]}
                            onChange={() => togglePresent(pid)}
                          />
                          <span className="text-[11px] text-gray-400">Present</span>
                        </div>
                      </label>
                      <input
                        id={`endDate-${index}`}
                        name={`endDate-${index}`}
                        type="month"
                        max={todayMonth}
                        disabled={!!presentProjects[pid]}
                        className={`w-full bg-gray-50 border-none rounded-[14px] px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600/10 outline-none transition-opacity ${
                          presentProjects[pid] ? "opacity-30" : "opacity-100"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-gray-500 ml-1">
                      Summary
                    </label>
                    <textarea
                      id={`projectSummary-${index}`}
                      name={`projectSummary-${index}`}
                      rows={3}
                      placeholder="What was your specific role and impact?"
                      className="w-full bg-gray-50 border-none rounded-[20px] px-5 py-4 text-sm focus:ring-2 focus:ring-blue-600/10 outline-none shadow-inner resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NAV BUTTONS */}
          <div className="pt-8 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={onBack}
              className="text-lg font-medium text-gray-400 hover:text-black transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-10 py-4 text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Processing..." : "Continue"}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
