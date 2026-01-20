"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase/browser";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Filter, Send, MessageCircle, Check, Loader2, AlertCircle } from "lucide-react";

type FreelancerRow = {
    freelancer_id: number;
    first_name: string | null;
    last_name: string | null;
    personal_img_url: string | null;
    job_title: string | null;
    bio: string | null;
    skills: string | null; // comma-separated
    category_id: number | null;
    created_at: string;
};

type ClientRow = {
    client_id: number;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
};

interface JobInviteModalProps {
    jobId: number;
    isOpen: boolean;
    onClose: () => void;
}

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

function displayClientName(c: ClientRow | null) {
    if (!c) return "A client";
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    return name || c.company_name || `Client #${c.client_id}`;
}

export default function JobInviteModal({ jobId, isOpen, onClose }: JobInviteModalProps) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<FreelancerRow[]>([]);
    const [jobTitle, setJobTitle] = useState<string>("");
    const [matchedOnCategory, setMatchedOnCategory] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Message modal state (internal to this modal)
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [selectedFreelancer, setSelectedFreelancer] = useState<FreelancerRow | null>(null);
    const [messageText, setMessageText] = useState("");
    const [sending, setSending] = useState(false);
    const [messageError, setMessageError] = useState("");
    const [messageSuccess, setMessageSuccess] = useState("");
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [profileFreelancer, setProfileFreelancer] = useState<FreelancerRow | null>(null);

    const [invitedFreelancers, setInvitedFreelancers] = useState<Set<number>>(new Set());
    const [invitingIds, setInvitingIds] = useState<Set<number>>(new Set());
    const [inviteError, setInviteError] = useState("");

    useEffect(() => {
        if (isOpen && jobId) {
            load(false);
        }
    }, [isOpen, jobId]);

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

    async function handleInvite(freelancerId: number) {
        if (!jobId || invitedFreelancers.has(freelancerId)) return;

        setInviteError("");
        setInvitingIds((prev) => new Set(prev).add(freelancerId));

        try {
            const numericJobId = Number(jobId);
            if (Number.isNaN(numericJobId)) {
                throw new Error("Invalid job id.");
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("You must be logged in.");
            }

            const { data: clientRow, error: clientErr } = await supabase
                .from("clients")
                .select("client_id, first_name, last_name, company_name")
                .eq("auth_user_id", user.id)
                .single();

            if (clientErr || !clientRow) {
                throw new Error("Could not find your client profile.");
            }

            const clientId = clientRow.client_id as number;

            const { data: jobRow, error: jobErr } = await supabase
                .from("job_posts")
                .select("client_id, title")
                .eq("job_post_id", numericJobId)
                .single();

            if (jobErr || !jobRow) {
                throw new Error("Job post not found.");
            }

            if (jobRow.client_id !== clientId) {
                throw new Error("You are not allowed to invite freelancers for this job.");
            }

            const senderName = displayClientName(clientRow as ClientRow);
            const title = jobRow.title || jobTitle || `Job #${numericJobId}`;

            const { error: notifyErr } = await supabase.from("notifications").insert({
                recipient_role: "freelancer",
                recipient_id: freelancerId,
                type: "job_invite",
                title: "New job invite",
                body: `${senderName} invited you to submit a proposal for "${title}".`,
                link: `/jobs?job_id=${numericJobId}`,
                job_post_id: numericJobId,
                metadata: { client_id: clientId },
            });

            if (notifyErr) {
                console.error("Notification insert failed", notifyErr);
                throw new Error("Failed to send invite.");
            }

            setInvitedFreelancers((prev) => new Set(prev).add(freelancerId));
        } catch (err: any) {
            setInviteError(err?.message || "Failed to send invite.");
        } finally {
            setInvitingIds((prev) => {
                const next = new Set(prev);
                next.delete(freelancerId);
                return next;
            });
        }
    }

    function openMessageModal(f: FreelancerRow) {
        setSelectedFreelancer(f);
        setMessageText("");
        setMessageError("");
        setMessageSuccess("");
        setMessageModalOpen(true);
    }

    function openProfileModal(f: FreelancerRow) {
        setProfileFreelancer(f);
        setProfileModalOpen(true);
    }

    function closeProfileModal() {
        setProfileModalOpen(false);
        setProfileFreelancer(null);
    }

    function closeMessageModal() {
        setMessageModalOpen(false);
        setSelectedFreelancer(null);
        setMessageText("");
        setMessageError("");
        setMessageSuccess("");
    }

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
                throw new Error("You must be logged in.");
            }

            // 2) Get client row
            const { data: clientRow, error: clientErr } = await supabase
                .from("clients")
                .select("client_id, first_name, last_name, company_name")
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

            // 7) Create notification for freelancer
            const senderName = displayClientName(clientRow as ClientRow);
            const title = jobTitle || `Job #${numericJobId}`;
            const { error: notifyErr } = await supabase.from("notifications").insert({
                recipient_role: "freelancer",
                recipient_id: selectedFreelancer.freelancer_id,
                type: "job_invite",
                title: "New job invite",
                body: `${senderName} invited you to submit a proposal for "${title}".`,
                link: `/jobs?job_id=${numericJobId}`,
                job_post_id: numericJobId,
                metadata: { conversation_id: conversationId, client_id: clientId },
            });

            if (notifyErr) {
                console.error("Notification insert failed", notifyErr);
            }

            setMessageSuccess("Message sent! The freelancer will see it in their inbox.");
            setMessageText("");

            setTimeout(closeMessageModal, 1500);

        } catch (err: any) {
            setMessageError(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-white z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invite Freelancers</h2>
                                <p className="text-gray-500 mt-1 font-medium">
                                    Find the perfect match for <span className="text-gray-900 font-bold">{jobTitle}</span>
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                            <button
                                onClick={() => load(false)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${matchedOnCategory
                                        ? "bg-black text-white shadow-lg"
                                        : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                                    }`}
                            >
                                <Filter size={14} />
                                Matching Category
                            </button>
                            <button
                                onClick={() => load(true)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!matchedOnCategory
                                        ? "bg-black text-white shadow-lg"
                                        : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                                    }`}
                            >
                                <Search size={14} />
                                Show All
                            </button>
                        </div>
                        {inviteError && (
                            <div className="px-8 pt-4 text-xs font-medium text-red-600">
                                {inviteError}
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#fbfbfd]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 size={32} className="animate-spin mb-4 text-blue-600" />
                                    <p className="font-medium">Finding best matches...</p>
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center py-20 gap-3 text-red-600">
                                    <AlertCircle size={20} />
                                    <p className="font-medium">{error}</p>
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <Search size={24} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">No matches found</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto mb-6">
                                        We couldn't find any freelancers matching your criteria ideally.
                                    </p>
                                    <button
                                        onClick={() => load(true)}
                                        className="px-6 py-3 rounded-xl bg-black text-white font-bold text-sm hover:opacity-90 transition-all"
                                    >
                                        View all freelancers
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {rows.map((f) => {
                                        const name = displayFreelancerName(f);
                                        const skillBadges = (f.skills || "")
                                            .split(",")
                                            .map((s) => s.trim())
                                            .filter(Boolean)
                                            .slice(0, 4) || [];
                                        const isInvited = invitedFreelancers.has(f.freelancer_id);
                                        const isInviting = invitingIds.has(f.freelancer_id);

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={f.freelancer_id}
                                                className="bg-white p-5 rounded-[24px] border border-gray-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center text-gray-400 font-bold border border-gray-100">
                                                        {f.personal_img_url ? (
                                                            <img src={f.personal_img_url} alt={name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            initials(name)
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => openProfileModal(f)}
                                                            className="text-left font-bold text-gray-900 group-hover:text-[#10b8a6] transition-colors truncate"
                                                        >
                                                            {name}
                                                        </button>
                                                        <p className="text-xs font-medium text-gray-500 truncate mb-2">
                                                            {f.job_title || "Freelancer"}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {skillBadges.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-md bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-5 flex gap-2">
                                                    <button
                                                        onClick={() => handleInvite(f.freelancer_id)}
                                                        disabled={isInvited || isInviting}
                                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${isInvited
                                                                ? "bg-green-50 text-green-600 cursor-default"
                                                                : "bg-black text-white hover:opacity-90 active:scale-95"
                                                            }`}
                                                    >
                                                        {isInviting ? (
                                                            <>
                                                                <Loader2 size={14} className="animate-spin" /> Inviting
                                                            </>
                                                        ) : isInvited ? (
                                                            <>
                                                                <Check size={14} /> Invited
                                                            </>
                                                        ) : (
                                                            "Invite"
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => openMessageModal(f)}
                                                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Freelancer Profile Modal */}
                        <AnimatePresence>
                            {profileModalOpen && profileFreelancer && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6"
                                    onClick={closeProfileModal}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.95, opacity: 0 }}
                                        onClick={(e) => e.stopPropagation()}
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="Freelancer profile"
                                        className="w-full max-w-lg rounded-[32px] border border-white/40 bg-white/70 shadow-[0_30px_80px_rgba(15,15,15,0.25)] backdrop-blur-2xl p-6"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-white/70 flex-shrink-0 overflow-hidden flex items-center justify-center text-gray-600 font-bold border border-white/60">
                                                    {profileFreelancer.personal_img_url ? (
                                                        <img
                                                            src={profileFreelancer.personal_img_url}
                                                            alt={displayFreelancerName(profileFreelancer)}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        initials(displayFreelancerName(profileFreelancer))
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">
                                                        {displayFreelancerName(profileFreelancer)}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {profileFreelancer.job_title || "Freelancer"}
                                                    </p>
                                                    {profileFreelancer.created_at && (
                                                        <p className="text-[11px] text-gray-400 mt-1">
                                                            Member since{" "}
                                                            {new Date(profileFreelancer.created_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={closeProfileModal}
                                                className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white transition-all"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        <div className="mt-6 space-y-5">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                                                    About
                                                </p>
                                                <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                    {profileFreelancer.bio?.trim() || "No bio provided yet."}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                                                    Skills
                                                </p>
                                                {profileFreelancer.skills ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {profileFreelancer.skills
                                                            .split(",")
                                                            .map((s) => s.trim())
                                                            .filter(Boolean)
                                                            .map((s, i) => (
                                                                <span
                                                                    key={`${s}-${i}`}
                                                                    className="rounded-full bg-white/80 border border-white/70 px-3 py-1 text-[11px] font-semibold text-gray-600"
                                                                >
                                                                    {s}
                                                                </span>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-sm text-gray-500">No skills listed.</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Nested Message Modal */}
                        <AnimatePresence>
                            {messageModalOpen && selectedFreelancer && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm p-8"
                                    onClick={closeMessageModal}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 border border-gray-100"
                                    >
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="font-bold text-gray-900">Message</h3>
                                                <p className="text-xs text-gray-500">To: {displayFreelancerName(selectedFreelancer)}</p>
                                            </div>
                                            <button onClick={closeMessageModal} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100">
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {messageError && (
                                            <div className="mb-4 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl flex items-center gap-2">
                                                <AlertCircle size={14} /> {messageError}
                                            </div>
                                        )}
                                        {messageSuccess && (
                                            <div className="mb-4 text-xs font-medium text-green-600 bg-green-50 p-3 rounded-xl flex items-center gap-2">
                                                <Check size={14} /> {messageSuccess}
                                            </div>
                                        )}

                                        <form onSubmit={handleSendMessage} className="space-y-4">
                                            <textarea
                                                autoFocus
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                className="w-full h-32 p-4 bg-gray-50 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 resize-none placeholder:text-gray-400"
                                                placeholder="Hi, I'd like to invite you to discuss this project..."
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={closeMessageModal}
                                                    className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={sending}
                                                    className="flex-1 py-3 rounded-xl bg-black text-white text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                    Send
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
