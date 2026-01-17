import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StickyMessagesButton from "@/components/StickyMessagesButton";
import AuthRedirect from "@/components/AuthRedirect";
import { defaultOgImage, siteName, siteUrl } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s | Networkk",
  },
  description: "Freelancers & clients, done right.",
  openGraph: {
    title: siteName,
    description: "Freelancers & clients, done right.",
    type: "website",
    siteName,
    images: [{ url: defaultOgImage, alt: "Networkk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: "Freelancers & clients, done right.",
    images: [defaultOgImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
      >
        {children}
        <Suspense fallback={null}>
          <AuthRedirect />
        </Suspense>
        <StickyMessagesButton />
      </body>
    </html>
  );
}
