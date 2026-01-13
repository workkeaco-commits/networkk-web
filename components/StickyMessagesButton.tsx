"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import StickyChatModal from "@/components/chat/StickyChatModal";

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

export default function StickyMessagesButton() {
  const pathname = usePathname();

  const [hasSession, setHasSession] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  // ✅ compute role + shouldHideHere using useMemo so they are stable values
  const role = useMemo(() => roleFromPath(pathname || ""), [pathname]);

  const shouldHideHere = useMemo(() => {
    const hiddenPrefixes = [
      "/freelancer/sign-in",
      "/freelancer/sign-up",
      "/freelancer/signup",
      "/freelancer/under-review",
      "/freelancer/messages",
      "/client/sign-in",
      "/client/sign-up",
      "/client/signup",
      "/client/messages",
    ];
    const p = pathname || "";
    return hiddenPrefixes.some((x) => p.startsWith(x));
  }, [pathname]);

  // 1) Check session
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

  useEffect(() => {
    if (!hasSession || !role || shouldHideHere) setOpen(false);
  }, [hasSession, role, shouldHideHere]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // 2) Fetch unread count (2s polling) — ✅ constant dependency array
  useEffect(() => {
    // Always stop polling when we shouldn't show the button
    if (!hasSession || !role || shouldHideHere) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      const fnName =
        role === "freelancer" ? "count_unread_for_freelancer" : "count_unread_for_client";

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
  }, [hasSession, role, shouldHideHere]); // ✅ NEVER change length/order

  // Render gate
  if (!hasSession || !role || shouldHideHere) return null;

  const handleClick = () => {
    // Optimistic: clear badge locally
    setUnreadCount(0);
    setOpen(true);
  };

  return (
    <>
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

      {open && role && <StickyChatModal open={open} role={role} onClose={() => setOpen(false)} />}
    </>
  );
}
