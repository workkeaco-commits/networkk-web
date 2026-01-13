"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Loader2, FileText, Calendar, User, ArrowRight } from "lucide-react";

type MilestoneRow = {
  milestone_id: number;
  status: string | null;
  due_date: string | null;
  due_at: string | null;
};

type ContractRow = {
  contract_id: number;
  status: string | null;
  fees_total: number | null;
  currency: string | null;
  created_at: string;
  job_posts?: { title: string | null } | null;
  freelancers?: { first_name?: string | null; last_name?: string | null; freelancer_id?: number | null } | null;
  milestones?: MilestoneRow[] | null;
};

function formatMoney(amount: number | null, currency: string | null) {
  const value = Number(amount || 0);
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || "EGP"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function getNextDue(milestones?: MilestoneRow[] | null) {
  if (!milestones || !milestones.length) return null;
  const now = Date.now();
  const dates = milestones
    .map((m) => {
      const raw = m.due_at || (m.due_date ? `${m.due_date}T23:59:59.999Z` : null);
      const d = raw ? new Date(raw) : null;
      return d && !Number.isNaN(d.getTime()) ? d : null;
    })
    .filter(Boolean) as Date[];

  if (!dates.length) return null;
  const upcoming = dates.filter((d) => d.getTime() >= now).sort((a, b) => a.getTime() - b.getTime());
  if (upcoming.length) return upcoming[0];
  return dates.sort((a, b) => a.getTime() - b.getTime())[0];
}

export default function ClientContractsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (userErr || !user) {
        router.replace("/client/sign-in?next=/client/contracts");
        return;
      }

      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .select("client_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!mounted) return;

      if (clientErr || !clientRow) {
        setErrorMsg("Could not load your client profile.");
        setContracts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("contracts")
        .select(
          "contract_id, status, fees_total, currency, created_at, job_posts(title), freelancers(first_name, last_name, freelancer_id), milestones(milestone_id, status, due_date, due_at)"
        )
        .eq("client_id", clientRow.client_id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Contracts load error:", error);
        setErrorMsg("Could not load contracts.");
        setContracts([]);
      } else {
        setContracts((data as ContractRow[]) || []);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/client/sign-in");
  }

  const totalContracts = useMemo(() => contracts.length, [contracts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10b8a6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <DashboardSidebar onSignOut={handleSignOut} />

      <main className="pl-20 md:pl-64 transition-all duration-300">
        <div className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 md:px-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-[#10b8a6] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">Contracts</div>
              <div className="text-xs text-gray-500">{totalContracts} total</div>
            </div>
          </div>
        </div>

        <div className="px-8 md:px-12 py-8">
          {errorMsg ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Something went wrong</div>
              <div className="text-sm text-gray-500 mt-2">{errorMsg}</div>
              <button
                onClick={() => router.refresh()}
                className="mt-6 px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : contracts.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">No contracts yet</div>
              <div className="text-sm text-gray-500 mt-2">
                Once you accept a proposal, the contract will show up here.
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {contracts.map((c) => {
                const freelancerName = [c.freelancers?.first_name, c.freelancers?.last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                const nextDue = getNextDue(c.milestones);
                const statusLabel = (c.status || "active").toString();

                return (
                  <Link
                    key={c.contract_id}
                    href={`/client/contracts/${c.contract_id}`}
                    className="group relative block bg-white rounded-[28px] p-8 border border-[#f5f5f7] hover:border-[#ebebeb] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden"
                  >
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-[#f5f5f7] rounded-2xl flex items-center justify-center group-hover:bg-teal-50 transition-colors duration-500">
                            <FileText className="w-6 h-6 text-[#1d1d1f] group-hover:text-[#10b8a6] transition-colors duration-500" />
                          </div>
                          <div>
                            <h3 className="text-[21px] font-semibold text-[#1d1d1f] leading-tight mb-1">
                              {c.job_posts?.title || "Untitled contract"}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[12px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  statusLabel === "active"
                                    ? "bg-[#e3f9e5] text-[#1db32e]"
                                    : "bg-[#f5f5f7] text-[#86868b]"
                                }`}
                              >
                                {statusLabel}
                              </span>
                              <span className="text-[#d2d2d7]">•</span>
                              <span className="text-[13px] text-[#86868b] font-medium">#{c.contract_id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 mt-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider mb-1">
                              Freelancer
                            </span>
                            <div className="flex items-center gap-2 text-[15px] text-[#1d1d1f] font-semibold">
                              <User className="w-3.5 h-3.5 text-[#86868b]" />
                              {freelancerName || `Freelancer #${c.freelancers?.freelancer_id ?? "?"}`}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider mb-1">
                              Budget
                            </span>
                            <div className="text-[15px] text-[#1d1d1f] font-semibold">
                              {formatMoney(c.fees_total, c.currency)}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider mb-1">
                              Started
                            </span>
                            <div className="flex items-center gap-2 text-[15px] text-[#1d1d1f] font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-[#86868b]" />
                              {formatDate(c.created_at)}
                            </div>
                            <div className="text-[13px] text-[#86868b] font-medium mt-1">
                              Next due {formatDate(nextDue?.toISOString() || null)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto self-stretch flex items-center justify-end sm:border-l sm:border-[#f5f5f7] sm:pl-8">
                        <div className="text-[13px] text-[#86868b] font-semibold flex items-center gap-1.5">
                          View Details <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b8a6]/[0.02] rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-[#10b8a6]/[0.05] transition-all duration-700" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
