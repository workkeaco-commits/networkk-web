import type { Metadata } from "next";
import Link from "next/link";
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
