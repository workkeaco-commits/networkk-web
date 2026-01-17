import type { Metadata } from "next";
import { defaultOgImage, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Client signup",
  description:
    "Create a client account to post jobs, hire freelancers, and manage projects on Networkk.",
  keywords: ["client signup", "post jobs", "hire freelancers", "Networkk"],
  alternates: { canonical: "/client/signup" },
  openGraph: {
    title: "Client signup",
    description:
      "Create a client account to post jobs, hire freelancers, and manage projects on Networkk.",
    type: "website",
    siteName,
    url: "/client/signup",
    images: [{ url: defaultOgImage, alt: "Networkk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Client signup",
    description:
      "Create a client account to post jobs, hire freelancers, and manage projects on Networkk.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ClientSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
