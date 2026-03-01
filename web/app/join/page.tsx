"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PasswordInput } from "@/app/components/PasswordInput";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm py-16 text-muted">
          Loading…
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}

function JoinForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("App misconfigured: missing Supabase URL or anon key.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${url}/functions/v1/create-staff-from-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: JSON.stringify({ token, email: email.trim(), password }),
      });
      const text = await res.text();
      let data: { error?: string; success?: boolean };
      try {
        data = text ? (JSON.parse(text) as { error?: string; success?: boolean }) : {};
      } catch {
        setError(res.ok ? "Invalid response from server." : `Request failed (${res.status}). Check the browser console or try again.`);
        setLoading(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      if (data.success) {
        setSuccess(true);
      } else {
        setError("Something went wrong. No account was created.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network or server error. Check your connection and that the Edge Function is deployed.");
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-page-title">Invalid link</h1>
        <p className="mt-2 text-muted">
          This join link is missing a token.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-primary-600 hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-page-title">Account created</h1>
        <p className="mt-2 text-muted">
          You can now sign in with your email and password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-button bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-page-title">Create your account</h1>
      <p className="mt-1 text-muted">
        Enter your email and choose a password to join.
      </p>
      {error && (
        <p
          className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-stone-700"
          >
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
          <label
            htmlFor="password"
            className="block text-sm font-medium text-stone-700"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-stone-700"
          >
            Confirm password
          </label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-muted">
        <Link href="/login" className="text-primary-600 hover:underline">
          Already have an account? Sign in
        </Link>
      </p>
    </div>
  );
}
