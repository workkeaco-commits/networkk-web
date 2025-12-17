"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

export default function FreelancerSignOutPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Error signing out", e);
      } finally {
        if (mounted) {
          router.replace("/freelancer/sign-in");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-4">
        <p className="text-sm text-slate-600">Signing you out…</p>
      </div>
    </main>
  );
}
