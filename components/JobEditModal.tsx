"use client";

import React, { useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/browser";

interface JobEditModalProps {
    job: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function JobEditModal({ job, isOpen, onClose, onUpdate }: JobEditModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState(job?.title || "");
    const [description, setDescription] = useState(job?.description || "");
    const [price, setPrice] = useState(job?.price || 0);

    // Sync state when job changes
    React.useEffect(() => {
        if (job) {
            setTitle(job.title || "");
            setDescription(job.description || "");
            setPrice(job.price || 0);
        }
    }, [job]);

    if (!isOpen || !job) return null;

    async function handleSave() {
        setLoading(true);
        setError(null);

        try {
            const { error: err } = await supabase
                .from("job_posts")
                .update({
                    title,
                    description,
                    price,
                })
                .eq("job_post_id", job.job_post_id);

            if (err) throw err;

            onUpdate(); // Trigger refresh
            onClose();
        } catch (e: any) {
            console.error("Error updating job:", e);
            setError(e.message || "Failed to update job.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Edit Job</h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-semibold">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
                                Job Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-base font-semibold focus:ring-2 focus:ring-black/5 transition-all"
                                placeholder="Ex. Senior React Developer"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-base font-medium focus:ring-2 focus:ring-black/5 transition-all resize-none"
                                placeholder="Describe the project..."
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
                                Budget ({job.price_currency || "EGP"})
                            </label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-base font-semibold focus:ring-2 focus:ring-black/5 transition-all"
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-white border border-gray-100 text-gray-900 font-bold hover:bg-gray-50 transition-all font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 py-4 rounded-2xl bg-black text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
