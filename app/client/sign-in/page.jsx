"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
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

      if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
        await supabase.auth.signOut();
        throw new Error("Please verify your email before signing in.");
      }

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
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen pt-20">
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-[540px] mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        <div className="w-full max-w-[540px] bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-white">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
              Client Portal
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
              Welcome back
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Sign in to manage your jobs and hire freelancers.
            </p>
          </div>

          <div className="h-px bg-gray-100 w-full mb-12" />

          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600 animate-fade-in text-left">
              {errorMsg}
            </div>
          )}

          <form className="space-y-6 text-left" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-[13px] font-medium text-gray-500 ml-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[13px] font-medium text-gray-500 ml-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#10b8a6] hover:bg-[#0e9f8e] text-white font-semibold rounded-[20px] py-4 text-[17px] shadow-lg shadow-[#10b8a6]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && (
                <ChevronRight
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  strokeWidth={2.5}
                />
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            Don’t have a client account?{" "}
            <Link href="/client/signup" className="text-[#10b8a6] hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
