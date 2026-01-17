import type { Metadata } from "next";
import { defaultOgImage, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Freelancer sign in",
  description:
    "Sign in to manage proposals, contracts, and payments in your freelancer account.",
  keywords: ["freelancer sign in", "freelancer login", "Networkk"],
  alternates: { canonical: "/freelancer/sign-in" },
  openGraph: {
    title: "Freelancer sign in",
    description:
      "Sign in to manage proposals, contracts, and payments in your freelancer account.",
    type: "website",
    siteName,
    url: "/freelancer/sign-in",
    images: [{ url: defaultOgImage, alt: "Networkk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelancer sign in",
    description:
      "Sign in to manage proposals, contracts, and payments in your freelancer account.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FreelancerSignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
