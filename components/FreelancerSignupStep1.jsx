"use client";

import Image from "next/image";
import { useState } from "react";

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

    // optional: basic Egypt mobile validation
    const phoneOk = /^(?:\+20|0)1[0125][0-9]{8}$/.test(phone);
    if (phone && !phoneOk) return setErr("Please enter a valid Egyptian mobile number.");

    onNext({ firstName, lastName, phone, email, password });
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* LEFT SIDE – LOGO */}
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="space-y-4">
              <Image
                src="/chatgpt-instructions3.jpeg"
                alt="Networkk"
                width={128}
                height={50}
                className="h-10 w-auto"
              />
              <p className="text-sm text-slate-500 mb-6">
                Join the hub for remote work in Egypt.
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px bg-slate-200" />

          {/* RIGHT SIDE – FORM */}
          <div className="flex-1 p-8 md:p-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase mb-2">
              Step 1 of 3
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-1">
              Become a freelancer on Networkk
            </h1>
            <p className="text-sm text-slate-500 mb-4">
              Start with your basic info. You&apos;ll add your skills and profile
              details on the next pages.
            </p>

            {err && (
              <div className="mb-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
                {err}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="e.g. Tameem"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="e.g. Hussein"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone number (Egypt)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 01012345678 or +201012345678"
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Must start with 010, 011, 012, or 015 (or +20).
                </p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Re-write your password
                  </label>
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl 
                  bg-[#079c02] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                  transition hover:bg-[#056b01] disabled:opacity-60 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079c02]/70 
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Next
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
