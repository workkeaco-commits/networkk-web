import type { Metadata } from "next";
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
  return children;
}
