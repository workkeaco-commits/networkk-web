"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

import FreelancerSignupStep1 from "@/components/FreelancerSignupStep1";
import FreelancerSignupStep2 from "@/components/FreelancerSignupStep2";
import FreelancerSignupStep3 from "@/components/FreelancerSignupStep3";

function SignupReviewScreen() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-200 px-6 py-6 md:px-10 md:py-8">
        <div className="mb-10">
          <Image
            src="/chatgpt-instructions3.jpeg"
            alt="Networkk"
            width={128}
            height={50}
            className="h-8 w-auto"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Account under review
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            We&apos;re reviewing your information to make sure everything looks good.
            We will send you a confirmation mail shortly.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function FreelancerSignupFlowPage() {
  const [step, setStep] = useState(1);
  const [acc, setAcc] = useState<any>({}); // accumulates data from steps
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // called by Step 1 and Step 2
  const handleNext = (chunk: any) => {
    setAcc((prev: any) => ({ ...prev, ...chunk }));
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  // called by Step 3 (finalize)
  const handleFinish = async (lastChunk: any) => {
    setSubmitting(true);
    try {
      const payload = { ...acc, ...lastChunk };

      // Expect Step3 to pass: { profileImage: File, nationalIdImage: File, ...rest }
      const { profileImage, nationalIdImage, ...rest } = payload;

      const form = new FormData();
      form.append("payload", JSON.stringify(rest));
      if (profileImage instanceof File) form.append("profileImage", profileImage);
      if (nationalIdImage instanceof File) form.append("nationalIdImage", nationalIdImage);

      const res = await fetch("/api/freelancers/signup", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error?.message || "Signup failed");

      // success → show review screen
      setStep(4);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) return <SignupReviewScreen />;

  // IMPORTANT: your step components must call onNext with a data object.
  // Step1 example -> onNext({ firstName, lastName, email, password, phone })
  // Step2 example -> onNext({ jobTitle, bio, skills: string[], projects: [...] })
  // Step3 example -> onNext({ education: {...}, certificates: [...], profileImage: File, nationalIdImage: File })

  if (step === 1) {
    return <FreelancerSignupStep1 onNext={handleNext} submitting={submitting} />;
  }
  if (step === 2) {
    return <FreelancerSignupStep2 onNext={handleNext} onBack={handleBack} submitting={submitting} />;
  }
  if (step === 3) {
    return <FreelancerSignupStep3 onNext={handleFinish} onBack={handleBack} submitting={submitting} />;
  }
  return null;
}
