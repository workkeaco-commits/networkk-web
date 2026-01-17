"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Briefcase, X } from "lucide-react";

const SKILL_SUGGESTIONS = [
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
];

const MONTHS = [
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 },
];

function formatMonthValue(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthValue(value) {
  if (!value || typeof value !== "string") return null;
  const [y, m] = value.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return null;
  return { year, month };
}

function MonthPicker({
  name,
  value,
  onChange,
  min,
  max,
  placeholder = "Select month",
  disabled = false,
}) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const parsedMin = parseMonthValue(min);
  const parsedMax = parseMonthValue(max);
  const currentYear = new Date().getFullYear();
  const minYear = parsedMin ? parsedMin.year : currentYear - 50;
  const maxYear = parsedMax ? parsedMax.year : currentYear + 10;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const parsedValue = parseMonthValue(value);
    if (parsedValue?.year) {
      setViewYear(parsedValue.year);
      return;
    }
    if (parsedMin?.year) {
      setViewYear(parsedMin.year);
      return;
    }
    if (parsedMax?.year) {
      setViewYear(parsedMax.year);
      return;
    }
    setViewYear(currentYear);
  }, [value, min, max, currentYear, parsedMin?.year, parsedMax?.year]);

  const canPrev = viewYear > minYear;
  const canNext = viewYear < maxYear;

  function isDisabled(year, month) {
    const candidate = formatMonthValue(year, month);
    if (min && candidate < min) return true;
    if (max && candidate > max) return true;
    return false;
  }

  function handleSelect(month) {
    if (disabled) return;
    const next = formatMonthValue(viewYear, month);
    if (isDisabled(viewYear, month)) return;
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value || ""} />
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full border border-gray-200 rounded-[14px] px-4 py-3 text-sm flex items-center gap-3 transition-colors ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:border-gray-300"
          }`}
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className={value ? "text-gray-700" : "text-gray-400"}>
          {value || placeholder}
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => canPrev && setViewYear((y) => y - 1)}
              disabled={!canPrev}
              className={`rounded-full p-2 transition-colors ${canPrev ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"
                }`}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-700">{viewYear}</span>
            <button
              type="button"
              onClick={() => canNext && setViewYear((y) => y + 1)}
              disabled={!canNext}
              className={`rounded-full p-2 transition-colors ${canNext ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"
                }`}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => {
              const monthValue = formatMonthValue(viewYear, month.value);
              const isSelected = value === monthValue;
              const disabledMonth = isDisabled(viewYear, month.value);
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => handleSelect(month.value)}
                  disabled={disabledMonth}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${disabledMonth
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                    : isSelected
                      ? "bg-[#10b8a6] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FreelancerSignupStep2({ onBack, onNext, submitting = false }) {
  const todayMonth = new Date().toISOString().slice(0, 7);

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [projects, setProjects] = useState([0]);
  const [presentProjects, setPresentProjects] = useState({});
  const [startDates, setStartDates] = useState({});
  const [endDates, setEndDates] = useState({});

  function handleAddSkill(name) {
    const parts = name
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setSkills((prev) => {
      const next = [...prev];
      parts.forEach((part) => {
        if (!next.includes(part)) next.push(part);
      });
      return next;
    });
    setSkillInput("");
  }

  function handleRemoveSkill(name) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  const filteredSuggestions = SKILL_SUGGESTIONS
    .filter(
      (s) =>
        skillInput &&
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skills.includes(s)
    )
    .slice(0, 6);

  function handleAddProject() {
    setProjects((prev) => {
      const newId = prev.length ? Math.max(...prev) + 1 : 0;
      return [...prev, newId];
    });
  }

  function handleDeleteProject(id) {
    setProjects((prev) => prev.filter((p) => p !== id));
    setPresentProjects((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStartDates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEndDates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function togglePresent(id) {
    setPresentProjects((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        setEndDates((endPrev) => ({ ...endPrev, [id]: "" }));
      }
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const jobTitle = (fd.get("jobTitle") || "").toString().trim();
    const bio = (fd.get("bio") || "").toString().trim();

    const projRows = projects.map((pid, index) => {
      const start = startDates[pid] || "";
      const end = presentProjects[pid] ? "" : (endDates[pid] || "");
      return {
        name: (fd.get(`projectName-${index}`) || "").toString().trim(),
        start: start || null,
        end: presentProjects[pid] ? null : end || null,
        summary: (fd.get(`projectSummary-${index}`) || "").toString().trim(),
      };
    });

    const missingDates = projects.some((pid) => {
      const start = startDates[pid] || "";
      const end = endDates[pid] || "";
      if (!start) return true;
      if (!presentProjects[pid] && !end) return true;
      return false;
    });
    if (missingDates) {
      alert("Please select start and end dates for each project.");
      return;
    }

    const invalidDates = projRows.some(
      (p) => p.start && p.end && p.end < p.start
    );
    if (invalidDates) {
      alert("End date must be the same as or after the start date.");
      return;
    }

    const proj = projRows.filter((p) => p.name || p.summary || p.start || p.end);

    onNext({ jobTitle, bio, skills, projects: proj });
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen pt-12 pb-12">
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-[720px] bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-white">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-teal-50 text-[#10b8a6] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
              Step 2 of 3
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
              Your professional profile
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Showcase your expertise and past work to attract high-quality clients.
            </p>
          </div>

          <div className="h-px bg-gray-100 w-full mb-12" />

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
                  required
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300 shadow-sm"
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
                  required
                  placeholder="A short introduction about your professional journey…"
                  className="w-full bg-white border border-gray-200 rounded-[22px] px-5 py-4 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300 shadow-sm resize-none"
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
                  Type skills and press Enter or comma to add.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    id="skillsInput"
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddSkill(skillInput);
                      }
                    }}
                    placeholder="e.g. Python, React, UI Design"
                    className="flex-1 rounded-[18px] border border-gray-200 bg-white px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(skillInput)}
                    className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-black/5"
                  >
                    Add
                  </button>
                </div>

                {filteredSuggestions.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-xl shadow-2xl p-2 animate-fade-in overflow-hidden">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left rounded-xl hover:bg-white hover:text-[#10b8a6] transition-colors text-sm font-medium"
                      >
                        <span>{s}</span>
                        <Plus className="w-4 h-4 opacity-30" />
                      </button>
                    ))}
                  </div>
                )}

                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 animate-fade-in"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 border-2 border-dashed border-gray-100 rounded-[32px] text-center text-gray-400 font-medium">
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
                    Highlight your best work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="text-[#10b8a6] hover:text-[#0e9f8e] font-semibold text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} /> Add another
                </button>
              </div>

              <div className="space-y-6">
                {projects.map((pid, index) => (
                  <div
                    key={pid}
                    className="rounded-2xl border border-gray-100 bg-white p-6 space-y-5 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                        Project {index + 1}
                      </p>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(pid)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove project ${index + 1}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`projectName-${index}`}
                        className="text-[13px] font-medium text-gray-500 ml-1"
                      >
                        Project name
                      </label>
                      <input
                        id={`projectName-${index}`}
                        name={`projectName-${index}`}
                        type="text"
                        required
                        placeholder="e.g. E-commerce Mobile App"
                        className="w-full bg-white border border-gray-200 rounded-[16px] px-4 py-3 text-sm focus:ring-2 focus:ring-[#10b8a6]/10 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-gray-500 ml-1">
                          Start date
                        </label>
                        <MonthPicker
                          name={`startDate-${index}`}
                          value={startDates[pid] || ""}
                          max={todayMonth}
                          placeholder="Select month"
                          onChange={(next) => {
                            setStartDates((prev) => ({ ...prev, [pid]: next }));
                            setEndDates((prev) => {
                              if (prev[pid] && prev[pid] < next) {
                                return { ...prev, [pid]: "" };
                              }
                              return prev;
                            });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-gray-500 ml-1 flex items-center justify-between">
                          <span>End date</span>
                          <div className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 rounded bg-gray-50 border-gray-200 text-[#10b8a6] focus:ring-0"
                              checked={!!presentProjects[pid]}
                              onChange={() => togglePresent(pid)}
                            />
                            <span className="text-[11px] text-gray-400">Present</span>
                          </div>
                        </label>
                        <MonthPicker
                          name={`endDate-${index}`}
                          value={endDates[pid] || ""}
                          min={startDates[pid] || ""}
                          max={todayMonth}
                          placeholder={startDates[pid] ? "Select month" : "Pick start date first"}
                          disabled={!!presentProjects[pid] || !startDates[pid]}
                          onChange={(next) => setEndDates((prev) => ({ ...prev, [pid]: next }))}
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
                        required
                        placeholder="What was your specific role and impact?"
                        className="w-full bg-white border border-gray-200 rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-[#10b8a6]/10 outline-none resize-none"
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
                className="bg-[#10b8a6] hover:bg-[#0e9f8e] text-white font-semibold rounded-full px-10 py-4 text-lg shadow-lg shadow-[#10b8a6]/20 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Processing..." : "Continue"}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
