// app/jobs/[jobId]/invite/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

type FreelancerRow = {
  freelancer_id: number;
  first_name: string | null;
  last_name: string | null;
  personal_img_url: string | null;
  job_title: string | null;
  skills: string | null; // comma-separated
  category_id: number | null;
  created_at: string;
};

function initials(name: string) {
  if (!name) return "F";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return (
    parts
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "F"
  );
}

function displayFreelancerName(f: FreelancerRow | null) {
  if (!f) return "Freelancer";
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ").trim();
  return name || `Freelancer #${f.freelancer_id}`;
}

export default function InviteFreelancersPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FreelancerRow[]>([]);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [matchedOnCategory, setMatchedOnCategory] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Message modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] =
    useState<FreelancerRow | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");

  async function load(all = false) {
    setLoading(true);
    setError("");
    try {
      const url = all
        ? `/api/jobs/${jobId}/invite/list?all=1`
        : `/api/jobs/${jobId}/invite/list`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok)
        throw new Error(json?.error || "Failed to load freelancers");

      setRows(json.freelancers || []);
      setJobTitle(json.job?.title || "");
      setMatchedOnCategory(Boolean(json.matchedOnCategory));
    } catch (e: any) {
      setRows([]);
      setError(e.message || "Failed to load freelancers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (jobId) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  function handleInvite(freelancerId: number) {
    // You can keep this or later wire it to proposals/invites
    alert(`Invite sent to freelancer #${freelancerId} for job #${jobId}`);
  }

  function openMessageModal(f: FreelancerRow) {
    setSelectedFreelancer(f);
    setMessageText("");
    setMessageError("");
    setMessageSuccess("");
    setMessageModalOpen(true);
  }

  function closeMessageModal() {
    setMessageModalOpen(false);
    setSelectedFreelancer(null);
    setMessageText("");
    setMessageError("");
    setMessageSuccess("");
  }

  // 🔑 Client sends the FIRST message → create/reuse conversation + insert message
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!selectedFreelancer || !jobId) return;

    const text = messageText.trim();
    if (!text) {
      setMessageError("Please type a message before sending.");
      return;
    }

    setSending(true);
    setMessageError("");
    setMessageSuccess("");

    try {
      const numericJobId = Number(jobId);
      if (Number.isNaN(numericJobId)) {
        throw new Error("Invalid job id.");
      }

      // 1) Get current user (must be client)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/client/sign-in?next=/jobs/${jobId}/invite`);
        return;
      }

      // 2) Get client row
      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("client_id")
        .eq("auth_user_id", user.id)
        .single();

      if (clientErr || !clientRow) {
        throw new Error("Could not find your client profile.");
      }

      const clientId = clientRow.client_id as number;

      // (Optional but nice) Confirm this job belongs to this client
      const { data: jobRow, error: jobErr } = await supabase
        .from("job_posts")
        .select("client_id")
        .eq("job_post_id", numericJobId)
        .single();

      if (jobErr || !jobRow) {
        throw new Error("Job post not found.");
      }

      if (jobRow.client_id !== clientId) {
        throw new Error("You are not allowed to message freelancers for this job.");
      }

      // 3) Find existing conversation (ONE per job/client/freelancer)
      const { data: existingConv, error: convErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("job_post_id", numericJobId)
        .eq("client_id", clientId)
        .eq("freelancer_id", selectedFreelancer.freelancer_id)
        .maybeSingle();

      if (convErr) {
        console.error("Error checking existing conversation", convErr);
      }

      let conversationId: string;

      if (existingConv && existingConv.id) {
        conversationId = existingConv.id as string;
      } else {
        // 4) Create a new conversation
        const { data: newConv, error: newConvErr } = await supabase
          .from("conversations")
          .insert({
            job_post_id: numericJobId,
            client_id: clientId,
            freelancer_id: selectedFreelancer.freelancer_id,
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (newConvErr || !newConv) {
          console.error("Error creating conversation", newConvErr);
          throw new Error("Could not create conversation.");
        }

        conversationId = newConv.id as string;
      }

      // 5) Insert the first message from client
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_auth_id: user.id,
        sender_role: "client",
        body: text,
      });

      if (msgErr) {
        console.error("Error inserting message", msgErr);
        throw new Error("Could not send message.");
      }

      // 6) Update last_message_at (optional but nice)
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setMessageSuccess("Message sent! The freelancer will see it in their inbox.");
      setMessageText("");

      // If you want: redirect client directly to this chat
      // router.push(`/client/messages?conversation=${conversationId}`);
    } catch (err: any) {
      setMessageError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Invite freelancers
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Job:{" "}
            <span className="font-medium">
              {jobTitle || `#${jobId}`}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Showing freelancers{" "}
            {matchedOnCategory
              ? "matching this job’s category"
              : "from all categories"}
            .
          </p>
        </header>

        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => load(false)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Filter by job category
          </button>
          <button
            onClick={() => load(true)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Show all freelancers
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading freelancers…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              No freelancers found for this filter.
            </p>
            <button
              onClick={() => load(true)}
              className="mt-4 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-950"
            >
              Show all freelancers
            </button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((f) => {
              const name =
                displayFreelancerName(f);
              const skillBadges =
                (f.skills || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 8) || [];

              return (
                <li
                  key={f.freelancer_id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {f.personal_img_url ? (
                      <img
                        src={f.personal_img_url}
                        alt={name}
                        className="h-12 w-12 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-semibold">
                        {initials(name)}
                      </div>
                    )}

                    <div className="flex-1">
                      {/* Name as link */}
                      <a
                        href={`/freelancers/${f.freelancer_id}`}
                        className="text-base font-semibold text-slate-900 hover:underline"
                      >
                        {name}
                      </a>

                      {/* Title */}
                      <p className="text-sm text-slate-600">
                        {f.job_title || "—"}
                      </p>

                      {/* Skills */}
                      {skillBadges.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {skillBadges.map((s, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleInvite(f.freelancer_id)}
                        className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950"
                      >
                        Invite
                      </button>
                      <button
                        onClick={() => openMessageModal(f)}
                        className="inline-flex items-center rounded-full border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Message modal */}
      {messageModalOpen && selectedFreelancer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeMessageModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Message freelancer
                </h2>
                <p className="text-xs text-slate-500">
                  Job: {jobTitle || `#${jobId}`}
                </p>
                <p className="text-xs text-slate-500">
                  To:{" "}
                  <span className="font-medium">
                    {displayFreelancerName(selectedFreelancer)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeMessageModal}
                className="text-lg text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            {messageError && (
              <p className="mb-2 text-xs text-red-600">{messageError}</p>
            )}
            {messageSuccess && (
              <p className="mb-2 text-xs text-emerald-600">
                {messageSuccess}
              </p>
            )}

            <form onSubmit={handleSendMessage} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Your message
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Introduce yourself and explain why you’re reaching out."
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeMessageModal}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
