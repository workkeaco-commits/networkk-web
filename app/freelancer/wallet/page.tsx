"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import FreelancerSidebar from "@/components/FreelancerSidebar";
import { Loader2, Wallet } from "lucide-react";

type WalletRow = {
  wallet_id: number;
  balance: number | null;
  currency: string | null;
  updated_at: string | null;
};

type ContractRow = {
  contract_id: number;
  job_posts?: { title: string | null }[] | { title: string | null } | null;
};

type PayoutRow = {
  payout_id: number;
  contract_id: number;
  milestone_id: number | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};

function formatMoney(amount: number | null, currency: string | null) {
  const value = Number(amount || 0);
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || "EGP"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function FreelancerWalletPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [contractTitles, setContractTitles] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (userErr || !user) {
        router.replace("/freelancer/sign-in?next=/freelancer/wallet");
        return;
      }

      const { data: freelancerRow, error: freelancerErr } = await supabase
        .from("freelancers")
        .select("freelancer_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!mounted) return;

      if (freelancerErr || !freelancerRow) {
        setErrorMsg("Could not load your freelancer profile.");
        setLoading(false);
        return;
      }

      const { data: walletRow, error: walletErr } = await supabase
        .from("freelancer_wallets")
        .select("wallet_id, balance, currency, updated_at")
        .eq("freelancer_id", freelancerRow.freelancer_id)
        .maybeSingle();

      if (walletErr) {
        console.error("Wallet load error:", walletErr);
      }

      const { data: contracts, error: contractErr } = await supabase
        .from("contracts")
        .select("contract_id, job_posts(title)")
        .eq("freelancer_id", freelancerRow.freelancer_id);

      if (contractErr) {
        console.error("Contracts load error:", contractErr);
      }

      const contractIds = (contracts || []).map((c) => c.contract_id);
      const titleMap: Record<number, string> = {};
      for (const c of contracts || []) {
        const jobPosts = (c as ContractRow).job_posts;
        const title = Array.isArray(jobPosts) ? jobPosts[0]?.title ?? null : jobPosts?.title ?? null;
        titleMap[c.contract_id] = title || "Untitled contract";
      }
      setContractTitles(titleMap);

      if (contractIds.length) {
        const { data: payoutRows, error: payoutErr } = await supabase
          .from("payouts")
          .select("payout_id, contract_id, milestone_id, amount, currency, status, created_at")
          .in("contract_id", contractIds)
          .order("created_at", { ascending: false });

        if (payoutErr) {
          console.error("Payouts load error:", payoutErr);
          setPayouts([]);
        } else {
          setPayouts((payoutRows as PayoutRow[]) || []);
        }
      } else {
        setPayouts([]);
      }

      setWallet(walletRow ? (walletRow as WalletRow) : null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/freelancer/sign-in");
  }

  const pendingTotal = useMemo(() => {
    return payouts
      .filter((p) => (p.status || "").toLowerCase() === "initiated")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payouts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <FreelancerSidebar onSignOut={handleSignOut} />

      <main className="pl-20 md:pl-64 transition-all duration-300">
        <div className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 md:px-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">Wallet</div>
              <div className="text-xs text-gray-500">Balance + payouts</div>
            </div>
          </div>
        </div>

        <div className="px-8 md:px-12 py-8">
          {errorMsg ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Something went wrong</div>
              <div className="text-sm text-gray-500 mt-2">{errorMsg}</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="text-sm text-gray-500">Wallet balance</div>
                <div className="text-2xl font-semibold text-gray-900 mt-2">
                  {formatMoney(wallet?.balance || 0, wallet?.currency || "EGP")}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Last updated {formatDate(wallet?.updated_at || null)}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  Pending payouts: {formatMoney(pendingTotal, wallet?.currency || "EGP")}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="text-base font-semibold text-gray-900">Payouts</div>
                <div className="mt-4 space-y-3">
                  {payouts.length === 0 ? (
                    <div className="text-sm text-gray-500">No payouts yet.</div>
                  ) : (
                    payouts.map((p) => (
                      <div
                        key={p.payout_id}
                        className="flex flex-col gap-2 border border-gray-100 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {contractTitles[p.contract_id] || "Contract"}
                          </div>
                          <div className="text-xs text-gray-500">Milestone #{p.milestone_id ?? "-"}</div>
                          <div className="text-xs text-gray-400 mt-1">{formatDate(p.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatMoney(p.amount || 0, p.currency || wallet?.currency || "EGP")}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{p.status || "initiated"}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
