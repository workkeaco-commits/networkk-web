"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [tokenReady, setTokenReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) {
      setTokenReady(true);
      return;
    }

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setTokenReady(true);
      return;
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setErrorMsg(error.message || "Invalid reset link.");
        }
      })
      .finally(() => {
        setTokenReady(true);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!password || password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg("Password updated. You can sign in now.");
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen flex flex-col justify-center">
      <main className="max-w-[480px] w-full mx-auto px-6 py-12 animate-fade-in">
        <div className="text-center mb-10">
          <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
            Set new password
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
            Choose a new password
          </h1>
          <p className="text-lg text-gray-500 font-medium leading-relaxed">
            Enter a new password for your account.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600 animate-fade-in">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3 text-sm text-green-700 animate-fade-in">
            {successMsg}
          </div>
        )}

        {!tokenReady ? (
          <div className="text-center text-sm text-gray-500">Loading reset session...</div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="password" className="text-[13px] font-medium text-gray-500 ml-1">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm" className="text-[13px] font-medium text-gray-500 ml-1">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[20px] py-4 text-[17px] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Updating..." : "Update password"}
              {!submitting && (
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              )}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-gray-400">
          Back to{" "}
          <Link href="/client/sign-in" className="text-blue-600 hover:underline font-medium">
            Client sign in
          </Link>{" "}
          or{" "}
          <Link href="/freelancer/sign-in" className="text-blue-600 hover:underline font-medium">
            Freelancer sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
