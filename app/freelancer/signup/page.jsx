"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

import FreelancerSignupStep1 from "@/components/FreelancerSignupStep1";
import FreelancerSignupStep2 from "@/components/FreelancerSignupStep2";
import FreelancerSignupStep3 from "@/components/FreelancerSignupStep3";

function SignupReviewScreen() {
  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen pt-20">
      <SiteHeader />
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20 animate-fade-in">
        <div className="max-w-[540px] mx-auto text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-6">
            Account under review
          </h1>
          <p className="text-xl text-gray-500 font-medium leading-relaxed mb-10">
            We&apos;re reviewing your information to make sure everything looks good.
            We will send you a confirmation email once your profile is verified.
          </p>
          <button
            onClick={() => window.location.href = "/"}
            className="text-blue-600 hover:underline font-semibold text-lg"
          >
            Back to Home
          </button>
        </div>
      </main>
    </div>
  );
}

export default function FreelancerSignupFlowPage() {
  const [step, setStep] = useState(1);
  const [acc, setAcc] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const handleNext = (chunk) => {
    setAcc((p) => ({ ...p, ...chunk }));
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async (lastChunk) => {
    setSubmitting(true);
    try {
      const payload = { ...acc, ...lastChunk };
      const { profileImage, nationalIdImage, ...rest } = payload;
      const form = new FormData();
      form.append("payload", JSON.stringify(rest));
      if (profileImage instanceof File) form.append("profileImage", profileImage);
      if (nationalIdImage instanceof File) form.append("nationalIdImage", nationalIdImage);

      const res = await fetch("/api/freelancers/signup", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Signup failed");

      setStep(4);
    } catch (e) {
      alert(e.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) return <SignupReviewScreen />;

  if (step === 1)
    return <FreelancerSignupStep1 onNext={handleNext} submitting={submitting} />;

  if (step === 2)
    return (
      <FreelancerSignupStep2
        onNext={handleNext}
        onBack={handleBack}
        submitting={submitting}
      />
    );

  if (step === 3)
    return (
      <FreelancerSignupStep3
        onNext={handleFinish}
        onBack={handleBack}
        submitting={submitting}
      />
    );

  return null;
}
