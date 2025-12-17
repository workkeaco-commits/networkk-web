// components/StickyMessagesButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

type Role = "freelancer" | "client" | null;

function roleFromPath(pathname: string): Role {
  if (
    pathname.startsWith("/freelancer") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs/")
  ) {
    return "freelancer";
  }

  if (
    pathname.startsWith("/client") ||
    pathname === "/post-job" ||
    pathname.startsWith("/post-job/")
  ) {
    return "client";
  }

  return null;
}

export default function StickyMessagesButton() {
  const router = useRouter();
  const pathname = usePathname();

  const [hasSession, setHasSession] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const role: Role = roleFromPath(pathname);

  const hiddenPrefixes = [
    "/freelancer/sign-in",
    "/freelancer/sign-up",
    "/client/sign-in",
    "/client/sign-up",
  ];
  const shouldHideHere = hiddenPrefixes.some((p) =>
    pathname.startsWith(p)
  );

  // Check session
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setHasSession(!!user);
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch unread count (2s polling)
  useEffect(() => {
    if (!hasSession || !role) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      const fnName =
        role === "freelancer"
          ? "count_unread_for_freelancer"
          : "count_unread_for_client";

      const { data, error } = await supabase.rpc(fnName);

      if (cancelled) return;

      if (error) {
        console.error("unread count error", error);
        return;
      }

      setUnreadCount(typeof data === "number" ? data : 0);
    };

    fetchCount();
    const id = setInterval(fetchCount, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hasSession, role]);

  if (!hasSession || !role || shouldHideHere) return null;

  const handleClick = () => {
    // Optimistic: hide badge immediately on this device
    setUnreadCount(0);

    if (role === "freelancer") {
      router.push("/freelancer/messages");
    } else {
      router.push("/client/messages");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-40 flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
    >
      <div className="relative flex items-center gap-2">
        <span>Messages</span>
        {unreadCount > 0 && (
          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
