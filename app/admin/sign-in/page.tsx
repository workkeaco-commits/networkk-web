"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";

export default function AdminSignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const email = (fd.get("email") || "").toString().trim().toLowerCase();
      const password = (fd.get("password") || "").toString();

      const res = await fetch("/api/admin/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Sign-in failed");
      }

      router.push(next);
    } catch (err: any) {
      setErrorMsg(err.message || "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#1c1f2a] antialiased flex flex-col justify-center">
      <main className="mx-auto w-full max-w-[480px] px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold tracking-[0.4em] uppercase text-slate-400 mb-3">
            Admin Access
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 mb-4">
            Control center
          </h1>
          <p className="text-base text-slate-500 font-medium leading-relaxed">
            Sign in with your admin credentials to view platform insights.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
            {errorMsg}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-[13px] font-medium text-slate-500 ml-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@networkk.com"
              className="w-full rounded-[18px] border border-slate-200 bg-white px-5 py-3.5 text-sm focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 outline-none transition-all placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-[13px] font-medium text-slate-500 ml-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-[18px] border border-slate-200 bg-white px-5 py-3.5 text-sm focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[20px] bg-slate-900 py-4 text-[17px] font-semibold text-white shadow-lg shadow-slate-900/25 transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {submitting ? "Signing in..." : "Enter admin panel"}
            {!submitting && (
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
