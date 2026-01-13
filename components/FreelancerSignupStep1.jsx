"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";

export default function FreelancerSignupStep1({ onNext, submitting = false }) {
  const [err, setErr] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    const fd = new FormData(e.currentTarget);
    const firstName = (fd.get("firstName") || "").toString().trim();
    const lastName = (fd.get("lastName") || "").toString().trim();
    const phone = (fd.get("phone") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim().toLowerCase();
    const password = (fd.get("password") || "").toString();
    const passwordConfirm = (fd.get("passwordConfirm") || "").toString();

    if (!email || !password) return setErr("Email and password are required.");
    if (password !== passwordConfirm) return setErr("Passwords do not match.");

    // Optional validation (only if phone was entered)
    const phoneOk = /^(?:\+20|0)1[0125][0-9]{8}$/.test(phone);
    if (phone && !phoneOk) return setErr("Please enter a valid Egyptian mobile number.");

    onNext({ firstName, lastName, phone, email, password });
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen py-12 md:py-20">
      <main className="max-w-[1000px] mx-auto px-6 animate-fade-in text-center">
        <div className="max-w-[480px] mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
              Step 1 of 3
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
              Join the Networkk community
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Start with your basic info. You&apos;ll add your skills and profile details next.
            </p>
          </div>

          {err && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600 animate-fade-in text-left">
              {err}
            </div>
          )}

          <form className="space-y-6 text-left" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-[13px] font-medium text-gray-500 ml-1">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Tameem"
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-[13px] font-medium text-gray-500 ml-1">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Hussein"
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-[13px] font-medium text-gray-500 ml-1">
                Phone number (Egypt)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01012345678"
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-[13px] font-medium text-gray-500 ml-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-[13px] font-medium text-gray-500 ml-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="passwordConfirm" className="text-[13px] font-medium text-gray-500 ml-1">
                  Confirm
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                />
              </div>
            </div>

            {/* Navigation (Next only) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[20px] py-3.5 text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Next..." : "Next"}
                {!submitting && (
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
