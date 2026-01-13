"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, CheckCircle, ArrowRight, User, Bot, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function AIJobPostAssistant({ clientName = "there" }) {
  const router = useRouter();

  // UI steps: intake -> review -> submitting -> success
  const [uiStep, setUiStep] = useState("intake");
  const [intakeState, setIntakeState] = useState(null);

  const [userInput, setUserInput] = useState("");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [categories, setCategories] = useState([]);
  const listRef = useRef(null);

  const fallbackCategories = useMemo(
    () => [
      { id: 1, name: "Tech" },
      { id: 2, name: "Frontend" },
      { id: 3, name: "Backend" },
      { id: 4, name: "AI" },
      { id: 5, name: "DevOps" },
      { id: 6, name: "Sales" },
      { id: 7, name: "Marketing" },
      { id: 8, name: "Design" },
    ],
    []
  );

  // Messages - Start with empty to show large greeting if no messages
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, uiStep, busy]);

  // Load categories
  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      const { data, error: e } = await supabase
        .from("categories")
        .select("category_id,name,parent_id,sort_order")
        .order("parent_id", { ascending: true, nullsFirst: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!mounted) return;
      if (e || !Array.isArray(data) || data.length === 0) {
        setCategories(fallbackCategories);
        return;
      }

      const rows = data.map((c) => ({
        id: Number(c.category_id),
        name: String(c.name),
        parentId: c.parent_id === null ? null : Number(c.parent_id),
      }));

      const parents = rows.filter((r) => r.parentId === null);
      const childMap = new Map(parents.map((p) => [p.id, []]));
      rows.forEach((r) => {
        if (r.parentId !== null && childMap.has(r.parentId)) {
          childMap.get(r.parentId).push(r);
        }
      });

      const flat = [];
      for (const p of parents) {
        const kids = childMap.get(p.id) || [];
        if (!kids.length) flat.push({ id: p.id, name: p.name });
        else for (const k of kids) flat.push({ id: k.id, name: `${p.name} — ${k.name}` });
      }
      setCategories(flat.length ? flat : fallbackCategories);
    }
    loadCategories();
    return () => { mounted = false; };
  }, [fallbackCategories]);

  const catsForAI = categories.length ? categories : fallbackCategories;

  const resetAll = () => {
    setUiStep("intake");
    setIntakeState(null);
    setUserInput("");
    setDraft(null);
    setError("");
    setBusy(false);
    setMessages([]);
  };

  async function callAutofill({ message, state }) {
    const res = await fetch("/api/job-posts/autofill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, state, currency: "EGP", categories: catsForAI }),
    });

    let json = null;
    try { json = await res.json(); } catch { }
    if (!res.ok) {
      const baseMsg =
        json?.error?.message ||
        (res.status === 429 ? "Rate limit reached. Please try again." : `Failed (HTTP ${res.status}).`);
      const details = json?.error?.details;
      const detailText =
        details && typeof details === "object" ? JSON.stringify(details) : details ? String(details) : "";
      const msg = detailText ? `${baseMsg} Details: ${detailText}` : baseMsg;
      throw new Error(msg);
    }
    return json;
  }

  const handleSend = async () => {
    if (busy) return;
    const text = userInput.trim();
    if (!text) return;
    setError("");
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setUserInput("");

    try {
      const result = await callAutofill({ message: text, state: intakeState });
      if (result?.assistant_message) setMessages((prev) => [...prev, { role: "assistant", content: String(result.assistant_message) }]);
      if (result?.state !== undefined) setIntakeState(result.state);
      if (result?.draft) { setDraft(result.draft); setUiStep("review"); return; }
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to process request.");
    } finally { setBusy(false); }
  };

  const handleSubmit = async () => {
    if (!draft) return;
    setUiStep("submitting");
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const client_email = user?.email ? String(user.email) : undefined;
      const payload = { ...draft, client_email };
      const res = await fetch("/api/job-posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to create job post");
      setUiStep("success");
    } catch (e) {
      setError(e?.message || "Failed to post job.");
      setUiStep("review");
    }
  };

  const handleEdit = (field, value) => setDraft((p) => ({ ...p, [field]: value }));

  // ---------- SUCCESS ----------
  if (uiStep === "success") {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 px-6 animate-fade-in text-center">
        <div className="w-20 h-20 bg-green-50 rounded-[40px] flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-10 h-10 text-green-600" strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-4">Job Posted Successfully</h2>
        <p className="text-lg text-gray-500 font-medium mb-12">Your project is now live and visible to freelancers.</p>
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <button onClick={resetAll} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-full shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group">
            Post Another Job <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
          </button>
          <button onClick={() => router.push("/client/dashboard")} className="w-full text-gray-500 hover:text-black font-semibold py-2 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---------- REVIEW ----------
  if (uiStep === "review" && draft) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 animate-fade-in pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Review your job</h2>
          <p className="text-gray-500 font-medium">Fine-tune the details before we go live.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <div className="space-y-8 bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/20">
          <div>
            <label className="text-[13px] font-bold tracking-widest uppercase text-gray-400 ml-1 mb-3 block">Title</label>
            <input type="text" value={draft.jobTitle || ""} onChange={(e) => handleEdit("jobTitle", e.target.value)}
              className="w-full text-2xl font-semibold bg-transparent border-none focus:ring-0 placeholder:text-gray-200 p-0" placeholder="Job Title" />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-[13px] font-bold tracking-widest uppercase text-gray-400 ml-1 mb-3 block">Category</label>
              <select value={Number(draft.category_id || "")} onChange={(e) => handleEdit("category_id", Number(e.target.value))}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-blue-600/10">
                {catsForAI.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-bold tracking-widest uppercase text-gray-400 ml-1 mb-3 block">Budget (EGP)</label>
              <input type="number" value={Number(draft.price || 0)} onChange={(e) => handleEdit("price", Number(e.target.value))}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-blue-600/10" />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold tracking-widest uppercase text-gray-400 ml-1 mb-3 block">Description</label>
            <textarea value={draft.description || ""} onChange={(e) => handleEdit("description", e.target.value)} rows={6}
              className="w-full bg-gray-50 border-none rounded-3xl px-6 py-5 text-[15px] leading-relaxed font-medium focus:ring-2 focus:ring-blue-600/10" />
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <button onClick={() => setUiStep("intake")} className="text-gray-400 hover:text-black font-semibold transition-colors">
              Back to chat
            </button>
            <button onClick={handleSubmit} disabled={uiStep === "submitting"}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-full shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 group disabled:opacity-50">
              {uiStep === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Post Job Now"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- INTAKE CHAT (GPT STYLE) ----------
  return (
    <div className="w-full flex-1 flex flex-col relative animate-fade-in pb-24">

      {/* Messages Area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide max-w-3xl mx-auto w-full"
      >
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-4 md:gap-6 ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-8`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-gray-100 ${m.role === 'user' ? 'bg-gray-900' : 'bg-white'}`}>
                {m.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-600" />}
              </div>
              <div className={`text-[17px] leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start gap-4 md:gap-6">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="flex items-center gap-1.5 pt-2">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area (Greeting + Input Box) */}
      <div className="sticky bottom-0 pb-12 pt-2 px-6 bg-gradient-to-t from-[#fbfbfd] via-[#fbfbfd] to-transparent">
        <div className="max-w-3xl mx-auto">

          {messages.length === 0 && (
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-[44px] font-bold tracking-tight text-gray-900 leading-tight">
                {clientName}, what do you want to build today?
              </h1>
            </div>
          )}

          <div className="flex justify-center gap-8 mb-4">
            {messages.length > 0 && (
              <button onClick={resetAll} className="text-xs font-bold tracking-widest uppercase text-gray-400 hover:text-red-500 transition-colors">
                Start Over
              </button>
            )}
          </div>

          <div className="relative group bg-[#f4f4f5] rounded-[32px] transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-200 focus-within:shadow-lg">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Message networkk"
              className="w-full bg-transparent border-none rounded-[32px] px-8 py-5 pr-16 text-[17px] font-medium resize-none outline-none min-h-[64px] max-h-48 scrollbar-hide"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />

            {/* Send Button (Right) */}
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              {(userInput.trim() || busy) && (
                <button
                  onClick={handleSend}
                  disabled={busy || !userInput.trim()}
                  className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90 disabled:opacity-20"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={20} strokeWidth={2.5} />}
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-center mt-3 font-medium">
            By messaging Networkk, you agree to our Terms and have read our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
