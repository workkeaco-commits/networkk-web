import type { Metadata } from "next";
import Link from "next/link";
import { defaultOgImage, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Freelancer signup",
  description:
    "Create a freelancer profile, showcase your skills, and get hired on Networkk.",
  keywords: ["freelancer signup", "freelancers", "get hired", "Networkk"],
  alternates: { canonical: "/freelancer/signup" },
  openGraph: {
    title: "Freelancer signup",
    description:
      "Create a freelancer profile, showcase your skills, and get hired on Networkk.",
    type: "website",
    siteName,
    url: "/freelancer/signup",
    images: [{ url: defaultOgImage, alt: "Networkk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelancer signup",
    description:
      "Create a freelancer profile, showcase your skills, and get hired on Networkk.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FreelancerSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200/50">
        <div className="max-w-[1200px] mx-auto px-6 h-[52px] flex items-center">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/logo-sf-display.png"
              alt="Networkk"
              className="h-[38.4px] w-auto object-contain"
            />
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
