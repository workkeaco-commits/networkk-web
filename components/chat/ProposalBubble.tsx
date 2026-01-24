"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ProposalBubbleProps {
  proposalId: number;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  isMe: boolean;
  jobTitle?: string | null; // NEW
}

export default function ProposalBubble({
  proposalId,
  onClick,
  isMe,
  jobTitle,
}: ProposalBubbleProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    total: number;
    currency: string;
    milestonesCount: number;
    status: string;
  } | null>(null);

  const titleLabel = (jobTitle || "").trim() || "Proposal";

  useEffect(() => {
    let cancelled = false;

    const fetchProposal = async () => {
      setLoading(true);

      const { data: prop, error } = await supabase
        .from("proposals")
        .select(
          `
          total_gross,
          currency,
          status,
          proposal_milestones ( position )
        `
        )
        .eq("proposal_id", proposalId)
        .single();

      if (cancelled) return;

      if (!error && prop) {
        setData({
          total: prop.total_gross || 0,
          currency: prop.currency || "EGP",
          milestonesCount: prop.proposal_milestones?.length || 0,
          status: prop.status,
        });
      } else {
        setData(null);
      }

      setLoading(false);
    };

    fetchProposal();
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  if (loading) {
    return (
      <div className={`flex w-full mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
        <div className="w-[240px] h-[72px] bg-gray-50/50 animate-pulse rounded-2xl flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex w-full mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
        <div
          onClick={onClick}
          className="w-[240px] px-4 py-3 bg-white rounded-2xl border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {titleLabel}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Proposal unavailable
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isAccepted = data.status === "accepted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex w-full mb-3 ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div
        onClick={(e) => onClick(e)}
        className="group cursor-pointer w-[240px] bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 active:scale-[0.98] overflow-hidden"
      >
        <div className="px-4 py-3">
          <div className="flex items-start justify-between mb-2 gap-3">
            {isAccepted ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[11px] font-medium text-gray-500 capitalize">
                  {data.status}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-gray-400">Proposal</span>
            )}

            {/* REPLACED: proposal id -> job title */}
            <span className="text-[10px] font-medium text-gray-400 max-w-[140px] truncate text-right">
              {titleLabel}
            </span>
          </div>

          <div className="mb-2">
            <p className="text-xl font-semibold text-gray-900 tracking-tight">
              {data.currency} {data.total.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span>
              {data.milestonesCount}{" "}
              {data.milestonesCount === 1 ? "milestone" : "milestones"}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-400 group-hover:text-blue-600 transition-colors">
              View details
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
