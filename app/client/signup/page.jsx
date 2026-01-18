"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, User, ChevronRight } from "lucide-react";

export default function ClientSignupPage() {
  const [accountType, setAccountType] = useState("company"); // "personal" | "company"
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);

      const password = (fd.get("password") || "").toString();
      const passwordConfirm = (fd.get("passwordConfirm") || "").toString();
      if (!password || password !== passwordConfirm) {
        throw new Error("Passwords do not match.");
      }

      // include current selector state
      fd.set("accountType", accountType);

      const res = await fetch("/api/clients/signup", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Signup failed");

      if (json?.email_status === "sent") {
        window.location.href = "/client/signup/sent";
      } else {
        window.location.href = "/client/signup/failed";
      }
    } catch (err) {
      setErrorMsg(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen">
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20 animate-fade-in">
        <div className="max-w-[480px] mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
              Client signup
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
              Create your client account
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Tell us who you are so we can match you with the right freelancers.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600 animate-fade-in">
              {errorMsg}
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* ACCOUNT TYPE SELECTOR */}
            <div className="space-y-4">
              <label className="text-[14px] font-semibold text-gray-900 ml-1">
                How will you use Networkk?
              </label>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAccountType("company")}
                  className={`relative p-6 rounded-3xl border-2 transition-all text-left group ${
                    accountType === "company"
                      ? "border-[#10b8a6] bg-white"
                      : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                      accountType === "company"
                        ? "bg-[#10b8a6] text-white"
                        : "bg-white text-gray-400"
                    }`}
                  >
                    <Building2 className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Company</h3>
                  <p className="text-xs text-gray-500 mt-1">Hiring for a business</p>

                  {accountType === "company" && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-[#10b8a6] rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType("personal")}
                  className={`relative p-6 rounded-3xl border-2 transition-all text-left group ${
                    accountType === "personal"
                      ? "border-[#10b8a6] bg-white"
                      : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                      accountType === "personal"
                        ? "bg-[#10b8a6] text-white"
                        : "bg-white text-gray-400"
                    }`}
                  >
                    <User className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Personal</h3>
                  <p className="text-xs text-gray-500 mt-1">Individual projects</p>

                  {accountType === "personal" && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-[#10b8a6] rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* FORM FIELDS */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-[13px] font-medium text-gray-500 ml-1">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
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
                    placeholder="Last name"
                    className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>

              {accountType === "company" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-[13px] font-medium text-gray-500 ml-1">
                      Company name
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      placeholder="Company name"
                      className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="companyField" className="text-[13px] font-medium text-gray-500 ml-1">
                        Industry
                      </label>
                      <input
                        id="companyField"
                        name="companyField"
                        type="text"
                      placeholder="Industry"
                        className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="companyLocation" className="text-[13px] font-medium text-gray-500 ml-1">
                        Location
                      </label>
                      <input
                        id="companyLocation"
                        name="companyLocation"
                        type="text"
                      placeholder="Location"
                        className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="phone" className="text-[13px] font-medium text-gray-500 ml-1">
                  Phone number (Egypt)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Phone number"
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
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
                  placeholder="you@company.com"
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300"
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
                    className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all"
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
                    className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#10b8a6] hover:bg-[#0e9f8e] text-white font-semibold rounded-[20px] py-4 text-[17px] shadow-lg shadow-[#10b8a6]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create client account"}
              {!submitting && (
                <ChevronRight
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  strokeWidth={2.5}
                />
              )}
            </button>

            <p className="text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link href="/client/sign-in" className="text-[#10b8a6] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
