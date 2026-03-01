"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/app/components/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorParam = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const userId = data.user?.id;
    if (userId) {
      const { data: patientRow } = await supabase
        .from("patients")
        .select("id")
        .eq("linked_user_id", userId)
        .maybeSingle();
      if (patientRow) {
        router.push("/portal");
      } else {
        router.push("/");
      }
    } else {
      router.push("/");
    }
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-page-title">Sign in</h1>
      <p className="mt-1 text-muted">
        Sign in to access the dashboard and add patients.
      </p>
      {(error || errorParam) && (
        <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error || (errorParam === "auth" ? "Authentication failed." : "Something went wrong.")}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-button border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-muted">
        <Link href="/" className="text-primary-600 hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16 text-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
