"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user || null);
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // ✅ Hide Messages on auth pages (support both signup and sign-up)
  const hideMessages = useMemo(() => {
    const blocked = new Set([
      "/client/signup",
      "/client/sign-up",
      "/client/sign-in",
      "/freelancer/signup",
      "/freelancer/sign-up",
      "/freelancer/sign-in",
    ]);
    return blocked.has(pathname || "");
  }, [pathname]);

  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          Networkk
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="/post-job" className="text-sm text-slate-700 hover:text-slate-900">
            Post a job
          </Link>

          {/* Messages hidden on signup/sign-in pages */}
          {!hideMessages && user && (
            <Link href="/client/messages" className="text-sm text-slate-700 hover:text-slate-900">
              Messages
            </Link>
          )}

          {user ? (
            <button
              onClick={handleSignOut}
              className="rounded-lg bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-950"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/client/sign-in"
              className="rounded-lg border border-slate-300 text-sm px-3 py-1.5 hover:bg-slate-50"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
