"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { supabase } from "@/lib/supabase/browser";
import ConversationList from "@/components/chat/ConversationList";
import MessageBubble from "@/components/chat/MessageBubble";

type Role = "client" | "freelancer";

type Conversation = {
  id: string;
  job_post_id: number | null;
  client_id?: number | null;
  freelancer_id?: number | null;
  created_at: string;
  last_message_at: string | null;
  job_posts?: { title: string | null } | null;
  freelancer?: {
    first_name?: string | null;
    last_name?: string | null;
    personal_img_url?: string | null;
    freelancer_id?: number | null;
  } | null;
  client?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    client_id?: number | null;
  } | null;
  last_message_body?: string | null;
  unread_count?: number;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_auth_id: string;
  sender_role: "freelancer" | "client" | "admin";
  body: string;
  created_at: string;
};

type Props = {
  open: boolean;
  role: Role;
  onClose: () => void;
};

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

function displayFreelancerName(f?: { first_name?: string | null; last_name?: string | null; freelancer_id?: number | null } | null) {
  if (!f) return "Freelancer";
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ").trim();
  return name || `Freelancer #${f.freelancer_id || "?"}`;
}

function displayClientName(
  c?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    client_id?: number | null;
  } | null
) {
  if (!c) return "Client";
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return fullName || `Client #${c.client_id || "?"}`;
}

export default function StickyChatModal({ open, role, onClose }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setMessages([]);
      setInput("");
      return;
    }

    let mounted = true;
    setLoadingList(true);

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user || !mounted) {
        setLoadingList(false);
        return;
      }
      setCurrentUserId(user.id);

      if (role === "client") {
        const { data: dbClient, error: clientErr } = await supabase
          .from("clients")
          .select("client_id")
          .eq("auth_user_id", user.id)
          .single();
        if (clientErr || !dbClient?.client_id || !mounted) {
          setLoadingList(false);
          return;
        }
        const clientId = dbClient.client_id as number;

        const { data: rawConvs } = await supabase
          .from("conversations")
          .select("id, job_post_id, freelancer_id, created_at, last_message_at")
          .eq("client_id", clientId)
          .order("last_message_at", { ascending: false });

        const convs = rawConvs || [];
        if (!convs.length || !mounted) {
          setConversations([]);
          setLoadingList(false);
          return;
        }

        const jobIds = Array.from(new Set(convs.map((c) => c.job_post_id).filter(Boolean)));
        const { data: jobs } = await supabase
          .from("job_posts")
          .select("job_post_id, title")
          .in("job_post_id", jobIds);

        const freelancerIds = Array.from(
          new Set(convs.map((c) => c.freelancer_id).filter(Boolean))
        );
        const { data: freelancers } = await supabase
          .from("freelancers")
          .select("freelancer_id, first_name, last_name, personal_img_url")
          .in("freelancer_id", freelancerIds);

        const enriched = await Promise.all(
          convs.map(async (c) => {
            const job = jobs?.find((j) => j.job_post_id === c.job_post_id);
            const freelancer = freelancers?.find(
              (f) => String(f.freelancer_id) === String(c.freelancer_id)
            );

            const { data: lastMsgs } = await supabase
              .from("messages")
              .select("body")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const { count } = await supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", c.id)
              .neq("sender_role", "client")
              .eq("is_read", false);

            return {
              ...(c as Conversation),
              job_posts: job ? { title: job.title } : undefined,
              freelancer: freelancer || undefined,
              last_message_body: lastMsgs?.[0]?.body || null,
              unread_count: count ?? 0,
            };
          })
        );

        if (mounted) setConversations(enriched as Conversation[]);
        setLoadingList(false);
        return;
      }

      const { data: dbFreelancer, error: freelancerErr } = await supabase
        .from("freelancers")
        .select("freelancer_id")
        .eq("auth_user_id", user.id)
        .single();
      if (freelancerErr || !dbFreelancer?.freelancer_id || !mounted) {
        setLoadingList(false);
        return;
      }
      const freelancerId = dbFreelancer.freelancer_id as number;

      const { data: rawConvs } = await supabase
        .from("conversations")
        .select("id, job_post_id, client_id, created_at, last_message_at")
        .eq("freelancer_id", freelancerId)
        .order("last_message_at", { ascending: false });

      const convs = rawConvs || [];
      if (!convs.length || !mounted) {
        setConversations([]);
        setLoadingList(false);
        return;
      }

      const jobIds = Array.from(new Set(convs.map((c) => c.job_post_id).filter(Boolean)));
      const { data: jobs } = await supabase
        .from("job_posts")
        .select("job_post_id, title")
        .in("job_post_id", jobIds);

      const clientIds = Array.from(new Set(convs.map((c) => c.client_id).filter(Boolean)));
      let clients: Array<{
        client_id: number;
        first_name?: string | null;
        last_name?: string | null;
        company_name?: string | null;
      }> = [];
      if (clientIds.length) {
        try {
          const response = await fetch("/api/conversations/client-names", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_ids: clientIds }),
          });
          const data = await response.json();
          clients = data.clients || [];
        } catch {
          clients = [];
        }
      }

      const enriched = await Promise.all(
        convs.map(async (c) => {
          const job = jobs?.find((j) => j.job_post_id === c.job_post_id);
          const client = clients?.find((cl) => String(cl.client_id) === String(c.client_id));

          const { data: lastMsgs } = await supabase
            .from("messages")
            .select("body")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("sender_role", "freelancer")
            .eq("is_read", false);

          return {
            ...(c as Conversation),
            job_posts: job ? { title: job.title } : undefined,
            client: client || { client_id: c.client_id },
            last_message_body: lastMsgs?.[0]?.body || null,
            unread_count: count ?? 0,
          };
        })
      );

      if (mounted) setConversations(enriched as Conversation[]);
      setLoadingList(false);
    })();

    return () => {
      mounted = false;
    };
  }, [open, role]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const sortedConversations = useMemo(() => {
    const copy = [...conversations];
    copy.sort((a, b) => {
      const aTime = Date.parse(a.last_message_at || a.created_at || "");
      const bTime = Date.parse(b.last_message_at || b.created_at || "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
    return copy;
  }, [conversations]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  const markConversationSeen = async (conversationId: string) => {
    if (!conversationId) return;
    const fnName =
      role === "freelancer"
        ? "mark_conversation_seen_as_freelancer"
        : "mark_conversation_seen_as_client";
    const { error } = await supabase.rpc(fnName, { p_conversation_id: conversationId });
    if (error) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  };

  useEffect(() => {
    if (!open || !selectedId) {
      setMessages([]);
      return;
    }

    let sub: ReturnType<typeof supabase.channel> | undefined;
    setLoadingMessages(true);

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      setMessages((data || []) as MessageRow[]);
      setLoadingMessages(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
      markConversationSeen(selectedId);

      sub = supabase
        .channel(`sticky-chat:${selectedId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${selectedId}`,
          },
          (payload) => {
            const newMsg = payload.new as MessageRow;
            setMessages((prev) => [...prev, newMsg]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === selectedId
                  ? { ...c, last_message_at: newMsg.created_at, last_message_body: newMsg.body }
                  : c
              )
            );
            if (
              (role === "client" && newMsg.sender_role !== "client") ||
              (role === "freelancer" && newMsg.sender_role !== "freelancer")
            ) {
              markConversationSeen(selectedId);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [open, selectedId, role]);

  const handleSend = async () => {
    if (!selectedId || !currentUserId || !input.trim()) return;
    const txt = input.trim();
    setInput("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      sender_auth_id: currentUserId,
      sender_role: role,
      body: txt,
    });

    if (error) {
      setInput(txt);
      return;
    }

    const nowIso = new Date().toISOString();
    await supabase.from("conversations").update({ last_message_at: nowIso }).eq("id", selectedId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, last_message_at: nowIso, last_message_body: txt, unread_count: 0 }
          : c
      )
    );
    markConversationSeen(selectedId);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-[70vh] w-[320px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <div className="text-xs font-semibold text-gray-800">Messages</div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              x
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-3 text-xs text-gray-400">Loading...</div>
            ) : (
              <ConversationList
                conversations={sortedConversations}
                selectedId={selectedId}
                onSelect={(id: string) => setSelectedId(id)}
                getAvatar={(c: Conversation) =>
                  role === "client"
                    ? {
                        url: c.freelancer?.personal_img_url || null,
                        fallback: initials(displayFreelancerName(c.freelancer)),
                      }
                    : {
                        url: null,
                        fallback: initials(displayClientName(c.client)),
                      }
                }
                getName={(c: Conversation) =>
                  role === "client"
                    ? displayFreelancerName(c.freelancer)
                    : displayClientName(c.client)
                }
                getPreview={(c: Conversation) => c.last_message_body || c.job_posts?.title || "Project Inquiry"}
                getTime={(c: Conversation) =>
                  c.last_message_at
                    ? new Date(c.last_message_at as string).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : ""
                }
                getUnreadCount={(c: Conversation) => c.unread_count || 0}
              />
            )}
          </div>
        </div>

        {selectedId && (
          <div className="flex h-[70vh] w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {role === "client"
                    ? displayFreelancerName(selectedConv?.freelancer)
                    : displayClientName(selectedConv?.client)}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {selectedConv?.job_posts?.title || "Conversation"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Close conversation"
              >
              x
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingMessages ? (
                <div className="text-xs text-gray-400">Loading conversation...</div>
              ) : (
                <>
                  {messages.map((m) => {
                    const isMe = role === "client" ? m.sender_role === "client" : m.sender_role === "freelancer";
                    return (
                      <MessageBubble
                        key={m.id}
                        isMe={isMe}
                        body={m.body}
                        time={new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      />
                    );
                  })}
                  <div ref={bottomRef} className="h-4" />
                </>
              )}
            </div>

            <div className="border-t border-gray-100 px-3 py-3">
              <div className="flex items-end gap-2 rounded-2xl bg-gray-100 px-3 py-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
