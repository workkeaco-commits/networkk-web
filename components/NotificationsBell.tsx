"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Briefcase, Check, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";

type Role = "client" | "freelancer";

type NotificationRow = {
  notification_id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

type NotificationsBellProps = {
  role: Role;
  showLabel?: boolean;
  panelSide?: "left" | "right";
  className?: string;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

function iconForType(type: string) {
  if (type === "job_invite") return Briefcase;
  if (type === "proposal_received") return FileText;
  return Bell;
}

function withOpenNonce(link: string, nonce: string) {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(link, base);
    url.searchParams.set("open", nonce);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const joiner = link.includes("?") ? "&" : "?";
    return `${link}${joiner}open=${encodeURIComponent(nonce)}`;
  }
}

export default function NotificationsBell({
  role,
  showLabel = true,
  panelSide = "right",
  className = "",
}: NotificationsBellProps) {
  const router = useRouter();
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  useEffect(() => {
    let active = true;

    const loadRecipient = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        setRecipientId(null);
        return;
      }

      const table = role === "client" ? "clients" : "freelancers";
      const idField = role === "client" ? "client_id" : "freelancer_id";

      const { data, error } = await supabase
        .from(table)
        .select(idField)
        .eq("auth_user_id", user.id)
        .single();

      if (!active) return;
      if (error || !data) {
        console.error("[notifications] profile lookup failed", error);
        setRecipientId(null);
        return;
      }

      const idValue = (data as Record<string, number>)[idField];
      setRecipientId(typeof idValue === "number" ? idValue : null);
    };

    loadRecipient();

    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (!recipientId) return;
    let active = true;

    const fetchNotifications = async (withLoading = false) => {
      if (withLoading) setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("notification_id,type,title,body,link,created_at,read_at")
        .eq("recipient_role", role)
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active) return;
      if (error) {
        console.error("[notifications] fetch failed", error);
      } else {
        setNotifications((data as NotificationRow[]) || []);
      }

      if (withLoading) setLoading(false);
    };

    fetchNotifications(true);
    const id = setInterval(() => fetchNotifications(false), 15000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [recipientId, role]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const markRead = async (notificationId: number) => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId && !n.read_at
          ? { ...n, read_at: nowIso }
          : n
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("notification_id", notificationId)
      .is("read_at", null);

    if (error) {
      console.error("[notifications] mark read failed", error);
    }
  };

  const markAllRead = async () => {
    if (!recipientId) return;
    const nowIso = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso }))
    );

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("recipient_role", role)
      .eq("recipient_id", recipientId)
      .is("read_at", null);

    if (error) {
      console.error("[notifications] mark all read failed", error);
    }
  };

  if (!recipientId) return null;

  const panelPosition =
    panelSide === "right"
      ? "left-full ml-3 top-0"
      : "right-full mr-3 top-0";

  const buttonClasses = showLabel
    ? "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
    : "w-12 h-12 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={buttonClasses}
        aria-label="Notifications"
      >
        <span className="relative">
          <Bell size={22} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        {showLabel && <span className="font-semibold text-[15px]">Notifications</span>}
      </button>

      {open && (
        <div
          className={`absolute ${panelPosition} z-[70] w-[340px] rounded-3xl border border-gray-100 bg-white shadow-2xl shadow-gray-200/60`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">
                {unreadCount ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => {
                  const Icon = iconForType(n.type);
                  const baseClasses =
                    "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors";
                  const rowClasses = n.read_at
                    ? "bg-white hover:bg-gray-50"
                    : "bg-blue-50/70 hover:bg-blue-50";
                  const inner = (
                    <>
                      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] font-medium text-gray-400">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </>
                  );

                  if (n.link) {
                    return (
                      <button
                        key={n.notification_id}
                        type="button"
                        onClick={() => {
                          markRead(n.notification_id);
                          setOpen(false);
                          const target = withOpenNonce(
                            n.link!,
                            `${n.notification_id}-${Date.now()}`
                          );
                          router.push(target);
                        }}
                        className={`${baseClasses} ${rowClasses}`}
                      >
                        {inner}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={n.notification_id}
                      type="button"
                      onClick={() => markRead(n.notification_id)}
                      className={`${baseClasses} ${rowClasses}`}
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
