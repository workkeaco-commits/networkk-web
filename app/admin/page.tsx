import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";
import FreelancerReviewList from "./FreelancerReviewList";
import type { FreelancerReviewRow } from "./types";

export const dynamic = "force-dynamic";

const ACTIVE_PROPOSAL_STATUSES = ["sent", "countered", "pending"] as const;

type ClientRow = {
  client_id: number;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
};

type FreelancerRow = {
  freelancer_id: number;
  first_name?: string | null;
  last_name?: string | null;
};

type ProposalRow = {
  client_id: number | null;
  freelancer_id: number | null;
};

function formatClientName(client?: ClientRow | null) {
  if (!client) return "Unknown client";
  const company = String(client.company_name || "").trim();
  const full = [client.first_name, client.last_name].filter(Boolean).join(" ").trim();
  return company || full || `Client #${client.client_id}`;
}

function formatFreelancerName(freelancer?: FreelancerRow | null) {
  if (!freelancer) return "Unknown freelancer";
  const full = [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ").trim();
  return full || `Freelancer #${freelancer.freelancer_id}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function StatCard(props: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {props.label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">
        {props.value.toLocaleString("en-US")}
      </div>
      {props.helper ? <div className="mt-2 text-sm text-slate-500">{props.helper}</div> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignore set errors in server component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            // ignore remove errors in server component
          }
        },
      },
    }
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    redirect("/admin/sign-in?next=/admin");
  }

  const { data: adminRow } = await supabaseAdmin
    .from("app_users")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminRow?.user_id) {
    notFound();
  }

  const [
    freelancersCount,
    clientsCount,
    jobPostsCount,
    contractsCount,
    conversationsCount,
  ] = await Promise.all([
    supabaseAdmin.from("freelancers").select("freelancer_id", { count: "exact", head: true }),
    supabaseAdmin.from("clients").select("client_id", { count: "exact", head: true }),
    supabaseAdmin.from("job_posts").select("job_post_id", { count: "exact", head: true }),
    supabaseAdmin.from("contracts").select("contract_id", { count: "exact", head: true }),
    supabaseAdmin.from("conversations").select("id", { count: "exact", head: true }),
  ]);

  const { data: activeProposals, error: activeProposalsError } = await supabaseAdmin
    .from("proposals")
    .select("client_id, freelancer_id")
    .in("status", [...ACTIVE_PROPOSAL_STATUSES]);

  if (activeProposalsError) {
    console.error("[admin] active proposals error:", activeProposalsError);
  }

  const proposals = (activeProposals || []) as ProposalRow[];
  const activeProposalTotal = proposals.length;

  const clientCounts = new Map<number, number>();
  const freelancerCounts = new Map<number, number>();

  for (const proposal of proposals) {
    if (proposal.client_id) {
      clientCounts.set(proposal.client_id, (clientCounts.get(proposal.client_id) || 0) + 1);
    }
    if (proposal.freelancer_id) {
      freelancerCounts.set(
        proposal.freelancer_id,
        (freelancerCounts.get(proposal.freelancer_id) || 0) + 1
      );
    }
  }

  const clientIds = Array.from(clientCounts.keys());
  const freelancerIds = Array.from(freelancerCounts.keys());

  const [clientsLookup, freelancersLookup] = await Promise.all([
    clientIds.length
      ? supabaseAdmin
          .from("clients")
          .select("client_id, first_name, last_name, company_name")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [] as ClientRow[] }),
    freelancerIds.length
      ? supabaseAdmin
          .from("freelancers")
          .select("freelancer_id, first_name, last_name")
          .in("freelancer_id", freelancerIds)
      : Promise.resolve({ data: [] as FreelancerRow[] }),
  ]);

  const clientById = new Map<number, ClientRow>();
  for (const client of clientsLookup.data || []) {
    clientById.set(client.client_id, client);
  }

  const freelancerById = new Map<number, FreelancerRow>();
  for (const freelancer of freelancersLookup.data || []) {
    freelancerById.set(freelancer.freelancer_id, freelancer);
  }

  const perClient = clientIds
    .map((id) => ({
      id,
      count: clientCounts.get(id) || 0,
      name: formatClientName(clientById.get(id)),
    }))
    .sort((a, b) => b.count - a.count);

  const perFreelancer = freelancerIds
    .map((id) => ({
      id,
      count: freelancerCounts.get(id) || 0,
      name: formatFreelancerName(freelancerById.get(id)),
    }))
    .sort((a, b) => b.count - a.count);

  const { data: freelancers, error: freelancersError } = await supabaseAdmin
    .from("freelancers")
    .select(
      "freelancer_id, first_name, last_name, email, phone_number, approval_status, created_at, job_title"
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (freelancersError) {
    console.error("[admin] freelancer list error:", freelancersError);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Admin Panel</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Marketplace overview
          </h1>
          <p className="text-sm text-slate-500">
            Live snapshot of core activity and freelancer review status.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Freelancers"
            value={freelancersCount.count ?? 0}
            helper="Total active profiles"
          />
          <StatCard label="Clients" value={clientsCount.count ?? 0} helper="Registered accounts" />
          <StatCard label="Job Posts" value={jobPostsCount.count ?? 0} helper="Published jobs" />
          <StatCard
            label="Active Proposals"
            value={activeProposalTotal}
            helper="Sent, countered, or pending"
          />
          <StatCard
            label="Conversations"
            value={conversationsCount.count ?? 0}
            helper="Client ↔ freelancer threads"
          />
          <StatCard label="Contracts" value={contractsCount.count ?? 0} helper="Active + completed" />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Active proposals</h2>
                <p className="text-sm text-slate-500">Total: {activeProposalTotal}</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Updated {formatDate(new Date().toISOString())}
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="text-sm font-semibold text-slate-700">Per client</h3>
                {perClient.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No active proposals.</p>
                ) : (
                  <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-2">
                    {perClient.map((row) => (
                      <div key={`client-${row.id}`} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-800">{row.name}</div>
                          <div className="text-xs text-slate-400">Client #{row.id}</div>
                        </div>
                        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          {row.count}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="text-sm font-semibold text-slate-700">Per freelancer</h3>
                {perFreelancer.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No active proposals.</p>
                ) : (
                  <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-2">
                    {perFreelancer.map((row) => (
                      <div key={`freelancer-${row.id}`} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-800">{row.name}</div>
                          <div className="text-xs text-slate-400">Freelancer #{row.id}</div>
                        </div>
                        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          {row.count}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Freelancer review</h2>
            <p className="text-sm text-slate-500">Latest sign-ups and approval status.</p>
            <FreelancerReviewList
              initialFreelancers={(freelancers || []) as FreelancerReviewRow[]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
