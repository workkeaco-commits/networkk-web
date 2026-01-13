"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import DashboardSidebar from "@/components/DashboardSidebar";
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

type PaymentRow = {
  payment_id: number;
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

export default function ClientFinancialsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
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
        router.replace("/client/sign-in?next=/client/financials");
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
        setLoading(false);
        return;
      }

      const { data: walletRow, error: walletErr } = await supabase
        .from("client_wallets")
        .select("wallet_id, balance, currency, updated_at")
        .eq("client_id", clientRow.client_id)
        .maybeSingle();

      if (walletErr) {
        console.error("Wallet load error:", walletErr);
      }

      const { data: contracts, error: contractErr } = await supabase
        .from("contracts")
        .select("contract_id, job_posts(title)")
        .eq("client_id", clientRow.client_id);

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
        const { data: paymentRows, error: paymentErr } = await supabase
          .from("payments")
          .select("payment_id, contract_id, milestone_id, amount, currency, status, created_at")
          .in("contract_id", contractIds)
          .order("created_at", { ascending: false });

        if (paymentErr) {
          console.error("Payments load error:", paymentErr);
          setPayments([]);
        } else {
          setPayments((paymentRows as PaymentRow[]) || []);
        }
      } else {
        setPayments([]);
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
    router.push("/client/sign-in");
  }

  const heldTotal = useMemo(() => {
    return payments
      .filter((p) => (p.status || "").toLowerCase() === "held")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

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
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">Financials</div>
              <div className="text-xs text-gray-500">Wallet + milestone payments</div>
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
                  Held in escrow: {formatMoney(heldTotal, wallet?.currency || "EGP")}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="text-base font-semibold text-gray-900">Payments</div>
                <div className="mt-4 space-y-3">
                  {payments.length === 0 ? (
                    <div className="text-sm text-gray-500">No payments yet.</div>
                  ) : (
                    payments.map((p) => (
                      <div
                        key={p.payment_id}
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
