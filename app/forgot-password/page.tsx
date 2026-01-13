"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setMessage("If an account exists, we sent a reset link to your email.");
    } catch (err) {
      setMessage("If an account exists, we sent a reset link to your email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen flex flex-col justify-center">
      <main className="max-w-[480px] w-full mx-auto px-6 py-12 animate-fade-in">
        <div className="text-center mb-10">
          <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
            Password reset
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
            Reset your password
          </h1>
          <p className="text-lg text-gray-500 font-medium leading-relaxed">
            Enter the email you used to sign up. We will send a reset link.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-600 animate-fade-in">
            {message}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[20px] py-4 text-[17px] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Send reset link"}
            {!submitting && (
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            )}
          </button>
        </form>

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
