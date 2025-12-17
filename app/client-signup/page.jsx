"use client";

import { useState } from "react";
import Image from "next/image";

export default function ClientSignupPage() {
  const [accountType, setAccountType] = useState("company"); // "personal" | "company"

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    companyField: "",
    companyLocation: "",
    phone: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          password: form.password,
          companyName: accountType === "company" ? form.companyName : null,
          companyField: accountType === "company" ? form.companyField : null,
          companyLocation:
            accountType === "company" ? form.companyLocation : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create client account.");
      }

      setSuccess("Client account created successfully.");
      // TODO: if you want, redirect here (e.g. router.push("/jobs"))
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* LEFT SIDE – LOGO & TAGLINE */}
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
                Hire vetted freelancers for projects in Egypt.
              </p>
            </div>
          </div>

          {/* THIN VERTICAL DIVIDER */}
          <div className="hidden md:block w-px bg-slate-200" />

          {/* RIGHT SIDE – FORM */}
          <div className="flex-1 p-8 md:p-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase mb-2">
              Client signup
            </p>

            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-1">
              Create your client account
            </h1>

            <p className="text-sm text-slate-500 mb-6">
              Tell us who you are so we can match you with the right freelancers.
            </p>

            {/* STATUS MESSAGES */}
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {success}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* First & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="e.g. Tameem"
                    value={form.firstName}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="e.g. Hussein"
                    value={form.lastName}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* ACCOUNT TYPE: COMPANY / PERSONAL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  How will you use Networkk?
                </label>
                <p className="text-xs text-slate-400">
                  Choose whether you&apos;re hiring on behalf of a company or as an
                  individual.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                  {/* Company FIRST */}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="accountType"
                      value="company"
                      checked={accountType === "company"}
                      onChange={() => setAccountType("company")}
                      className="h-4 w-4 text-[#079c02] border-slate-300 focus:ring-[#079c02]"
                    />
                    <span>Company</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="accountType"
                      value="personal"
                      checked={accountType === "personal"}
                      onChange={() => setAccountType("personal")}
                      className="h-4 w-4 text-[#079c02] border-slate-300 focus:ring-[#079c02]"
                    />
                    <span>Personal</span>
                  </label>
                </div>

                {/* COMPANY DETAILS – only when 'company' is selected */}
                {accountType === "company" && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="companyName"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Company name
                        </label>
                        <input
                          id="companyName"
                          name="companyName"
                          type="text"
                          placeholder="e.g. Networkk Inc."
                          value={form.companyName}
                          onChange={handleChange}
                          className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="companyField"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Field / industry
                        </label>
                        <input
                          id="companyField"
                          name="companyField"
                          type="text"
                          placeholder="e.g. Construction, Software, Design"
                          value={form.companyField}
                          onChange={handleChange}
                          className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="companyLocation"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Location
                      </label>
                      <input
                        id="companyLocation"
                        name="companyLocation"
                        type="text"
                        placeholder="e.g. Cairo, Egypt"
                        value={form.companyLocation}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Phone (Egypt) */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Phone number (Egypt)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 01012345678 or +201012345678"
                  pattern="^(?:\+20|0)1[0125][0-9]{8}$"
                  title="Enter a valid Egyptian mobile number, e.g. 01012345678 or +201012345678."
                  value={form.phone}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Must be an Egyptian mobile starting with 010, 011, 012, or 015.
                </p>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Password + Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="passwordConfirm"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Re-write your password
                  </label>
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    value={form.passwordConfirm}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Create account button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl 
                  bg-[#079c02] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                  transition hover:bg-[#056b01] disabled:cursor-not-allowed disabled:opacity-70
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079c02]/70 
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {isSubmitting ? "Creating account..." : "Create client account"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
