"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { PasswordInput } from "@/app/components/PasswordInput";

type LinkInfo = {
  id: string;
  patient_id: string;
  expires_at: string;
  activated_at: string | null;
  deactivated_at: string | null;
};

export default function SurveyLinkPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-4 py-16 text-muted">Loading…</div>}>
      <SurveyLinkForm />
    </Suspense>
  );
}

function SurveyLinkForm() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "invalid" | "activate" | "go-survey">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const supabase = createClient();
    supabase
      .rpc("get_patient_link_by_token", { link_token: token })
      .then(({ data, error: rpcError }) => {
        if (rpcError || !data || (Array.isArray(data) && data.length === 0)) {
          setStatus("invalid");
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const info: LinkInfo = {
          id: row.id,
          patient_id: row.patient_id,
          expires_at: row.expires_at,
          activated_at: row.activated_at ?? null,
          deactivated_at: row.deactivated_at ?? null,
        };
        setLink(info);
        if (info.deactivated_at) {
          setStatus("invalid");
          return;
        }
        if (info.activated_at) {
          setStatus("go-survey");
          return;
        }
        const expiresAt = new Date(info.expires_at);
        if (expiresAt <= new Date()) {
          setStatus("invalid");
          return;
        }
        setStatus("activate");
      });
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("App misconfigured.");
      setLoading(false);
      return;
    }
    const res = await fetch(`${url}/functions/v1/activate-patient-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({ token, email: email.trim(), password }),
    });
    const data = (await res.json()) as { error?: string; success?: boolean };
    setLoading(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    if (data.success) {
      router.push("/login");
      router.refresh();
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center text-muted">
        Loading…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-page-title">Invalid or expired link</h1>
        <p className="mt-2 text-muted">
          This patient link may have expired (3 days if not activated), been deactivated, or the link is incorrect.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (status === "go-survey") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-page-title">Open survey</h1>
        <p className="mt-2 text-muted">
          Your account is already set up. Sign in to access your portal, or open the survey directly.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/survey/${link!.patient_id}`}
            className="rounded-button bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
          >
            Open survey
          </Link>
          <Link href="/login" className="text-center text-sm text-primary-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-page-title">Activate your account</h1>
      <p className="mt-1 text-muted">
        Enter your email and choose a password to access your survey and care portal.
      </p>
      {error && (
        <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleActivate} className="mt-6 space-y-4">
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
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputClassName="mt-1 w-full rounded border border-stone-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-stone-700">
            Confirm password
          </label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            inputClassName="mt-1 w-full rounded border border-stone-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Activate account"}
        </button>
      </form>
    </div>
  );
}
