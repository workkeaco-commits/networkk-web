"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";

export default function FreelancerSignInLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Loading sign-in…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
