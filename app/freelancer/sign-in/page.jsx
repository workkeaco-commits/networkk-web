"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

export default function FreelancerSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/jobs";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // 1) Auth with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError || !authData?.user) {
        setErrorMsg(authError?.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      const user = authData.user;

      // 2) Check that this user is a FREELANCER
      const { data: freelancer, error: freelancerError } = await supabase
        .from("freelancers")
        .select("freelancer_id")
        .eq("auth_user_id", user.id)
        .single();

      if (freelancerError || !freelancer) {
        // Not a freelancer → log them out and show message
        await supabase.auth.signOut();
        setErrorMsg(
          "This account is not registered as a freelancer. Please sign up as a freelancer or use the client login."
        );
        setLoading(false);
        return;
      }

      // 3) All good → go to next (default /jobs)
      router.push(next);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while signing in.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          Log in as a freelancer
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Access your freelancer account to browse jobs and send proposals.
        </p>

        {errorMsg && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Freelancer email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="you@freelancer.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-950 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Log in as freelancer"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Don&apos;t have a freelancer account?{" "}
          <a
            href="/freelancer/signup"
            className="font-medium text-slate-900 hover:underline"
          >
            Sign up as a freelancer
          </a>
        </p>
      </section>
    </main>
  );
}
