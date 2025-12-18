"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";

export default function FreelancerMessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Loading messages…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
