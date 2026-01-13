import Link from "next/link";
import { Clock } from "lucide-react";

export default function FreelancerUnderReviewPage() {
  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen pt-20">
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20 animate-fade-in">
        <div className="max-w-[540px] mx-auto text-center">
          <div className="w-20 h-20 bg-teal-50 text-[#10b8a6] rounded-[28px] flex items-center justify-center mx-auto mb-8">
            <Clock className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-6">
            Account under review
          </h1>
          <p className="text-xl text-gray-500 font-medium leading-relaxed mb-10">
            We are reviewing your information to make sure everything looks good.
            We will send you a confirmation email once your profile is verified.
          </p>
          <Link
            href="/"
            className="text-[#10b8a6] hover:text-[#0e9f8e] hover:underline font-semibold text-lg"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
