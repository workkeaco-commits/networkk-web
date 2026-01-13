"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

type Role = "freelancer" | "client" | null;

function roleFromPath(pathname: string): Role {
  if (pathname.startsWith("/freelancer") || pathname === "/jobs" || pathname.startsWith("/jobs/")) {
    return "freelancer";
  }
  if (pathname.startsWith("/client") || pathname === "/post-job" || pathname.startsWith("/post-job/")) {
    return "client";
  }
  return null;
}

const CLIENT_PUBLIC_PREFIXES = ["/client/sign-in", "/client/signup", "/client/sign-up"];
const FREELANCER_PUBLIC_PREFIXES = ["/freelancer/sign-in", "/freelancer/signup", "/freelancer/sign-up", "/freelancer/sign-out", "/freelancer/under-review"];

export default function AuthRedirect() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;

    const role = roleFromPath(pathname);
    if (!role) return;

    const publicPrefixes = role === "client" ? CLIENT_PUBLIC_PREFIXES : FREELANCER_PUBLIC_PREFIXES;
    if (publicPrefixes.some((p) => pathname.startsWith(p))) return;

    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (cancelled) return;
      if (!user) {
        const query = searchParams?.toString();
        const nextUrl = query ? `${pathname}?${query}` : pathname;
        const signInPath = role === "client" ? "/client/sign-in" : "/freelancer/sign-in";
        router.replace(`${signInPath}?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      if (role === "freelancer") {
        const { data: freelancer, error } = await supabase
          .from("freelancers")
          .select("approval_status")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.error("Freelancer approval check failed:", error);
          return;
        }

        if (freelancer) {
          const approvalStatus = freelancer.approval_status ?? "pending";
          if (approvalStatus !== "approved") {
            await supabase.auth.signOut();
            router.replace("/freelancer/under-review");
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams, router]);

  return null;
}
