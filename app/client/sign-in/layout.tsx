import type { Metadata } from "next";
import { defaultOgImage, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Client sign in",
  description:
    "Sign in to your client account to manage jobs, proposals, and payments.",
  keywords: ["client sign in", "client login", "Networkk"],
  alternates: { canonical: "/client/sign-in" },
  openGraph: {
    title: "Client sign in",
    description:
      "Sign in to your client account to manage jobs, proposals, and payments.",
    type: "website",
    siteName,
    url: "/client/sign-in",
    images: [{ url: defaultOgImage, alt: "Networkk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Client sign in",
    description:
      "Sign in to your client account to manage jobs, proposals, and payments.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ClientSignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
