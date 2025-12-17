"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/browser";

export default function ClientSignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/client/dashboard";


  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const email = (fd.get("email") || "").toString().trim().toLowerCase();
      const password = (fd.get("password") || "").toString();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Optional: ensure this user is actually a "client"
      const { data: roleRow, error: roleErr } = await supabase
        .from("app_users")
        .select("role")
        .eq("user_id", data.user.id)
        .single();
      if (roleErr) throw roleErr;
      if (!roleRow || roleRow.role !== "client") {
        throw new Error("This account is not a client account.");
      }

      router.push(next);
    } catch (err) {
      setErrorMsg(err.message || "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="space-y-4">
              <Image src="/chatgpt-instructions3.jpeg" alt="Networkk" width={128} height={50} className="h-10 w-auto" />
              <p className="text-sm text-slate-500">Sign in to post a job and hire freelancers.</p>
            </div>
          </div>

          <div className="hidden md:block w-px bg-slate-200" />

          <div className="flex-1 p-8 md:p-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase mb-2">Client sign in</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-sm text-slate-500 mb-6">Use your client email and password.</p>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com"
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password"
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl 
                  bg-[#079c02] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                  transition hover:bg-[#056b01] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              Don’t have a client account?{" "}
              <a href="/client/signup" className="text-[#079c02] hover:underline">Create one</a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
