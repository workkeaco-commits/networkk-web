import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { defaultOgImage, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hire freelancers, manage projects",
  description:
    "Find, connect, and pay freelancers securely.",
  keywords: [
    "Networkk",
    "hire freelancers",
    "hire freelancers in egypt",
    "egyptian freelancers",
    "hire elite talents",
    "egyptain talents",
    "freelancers",
    "project management",
    "remote work",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hire freelancers, manage projects",
    description:
      "Find, connect, and pay freelancers securely.",
    type: "website",
    siteName,
    url: "/",
    images: [{ url: defaultOgImage, alt: "Networkk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hire freelancers, manage projects",
    description:
      "Find, connect, and pay freelancers securely..",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <HomePage />;
}
