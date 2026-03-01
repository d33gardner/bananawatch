"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { OrganizationRow, PatientInsert, ProfileRow } from "@bananawatch/types";

function datePrefix(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export default function NewPatientPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [idLoading, setIdLoading] = useState(true);
  const [orgCode, setOrgCode] = useState<string | null>(null);
  const [noOrg, setNoOrg] = useState(false);
  const [status, setStatus] = useState<"active" | "critical" | "discharged">("active");
  const [decayScore, setDecayScore] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const profileRow = profile as Pick<ProfileRow, "org_id"> | null;
      if (!profileRow?.org_id) {
        if (!cancelled) setNoOrg(true);
        setIdLoading(false);
        return;
      }
      const { data: org } = await supabase
        .from("organizations")
        .select("code")
        .eq("id", profileRow.org_id)
        .maybeSingle();
      const orgRow = org as Pick<OrganizationRow, "code"> | null;
      if (!orgRow?.code) {
        if (!cancelled) setNoOrg(true);
        setIdLoading(false);
        return;
      }
      if (!cancelled) setOrgCode(orgRow.code);
      const prefix = `${orgRow.code}-${datePrefix()}-`;
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .like("id", `${prefix}%`);
      if (cancelled) return;
      const numbers = ((existing ?? []) as { id: string }[])
        .map((r) => {
          const parts = r.id.split("-");
          return parseInt(parts[parts.length - 1], 10);
        })
        .filter((n) => !Number.isNaN(n));
      const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
      if (!cancelled) {
        setId(`${prefix}${String(next).padStart(4, "0")}`);
        setIdLoading(false);
      }
    })().catch(() => {
      if (!cancelled) setIdLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedId = id.trim();
    if (!trimmedId) {
      setError("Patient ID is required.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const decay = decayScore === "" ? undefined : parseFloat(decayScore);
    if (decay !== undefined && (Number.isNaN(decay) || decay < 0 || decay > 1)) {
      setError("Decay score must be between 0 and 1.");
      setSubmitting(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("user_id", user.id).maybeSingle();
    const profileRow = profile as Pick<ProfileRow, "org_id"> | null;
    if (!profileRow?.org_id) {
      setError("No organization assigned. Contact an admin.");
      setSubmitting(false);
      return;
    }
    const payload: PatientInsert = {
      id: trimmedId,
      org_id: profileRow.org_id,
      status,
      decay_score: decay ?? 0,
    };
    const { error: insertError } = await supabase.from("patients").insert(payload);
    setSubmitting(false);
    if (insertError) {
      if (insertError.code === "23505") {
        setError("Patient ID already exists.");
      } else {
        setError(insertError.message || "Failed to create patient.");
      }
      return;
    }
    router.push("/");
    router.refresh();
  };

  if (noOrg) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <Link href="/" className="text-sm text-primary-600 hover:underline">
          ← Dashboard
        </Link>
        <p className="mt-4 text-stone-700">
          No organization assigned. Contact a super admin to be assigned to an organization.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-sm text-primary-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-page-title">Add patient</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="id" className="block text-sm font-medium text-stone-700">
            Patient ID *
          </label>
          <div className="mt-1">
            <input
              id="id"
              type="text"
              value={id}
              readOnly
              placeholder={idLoading ? "Loading…" : "e.g. DEMO-20260227-0001"}
              className="w-full rounded border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-stone-50 disabled:text-stone-600"
              required
            />
            <p className="mt-1 text-xs text-stone-500">
              Auto-generated (today’s date + next sequence). Cannot be changed.
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-stone-700">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "critical" | "discharged")}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="active">Active</option>
            <option value="critical">Critical</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>
        <div>
          <label htmlFor="decay" className="block text-sm font-medium text-stone-700">
            Decay score (0–1, optional)
          </label>
          <input
            id="decay"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={decayScore}
            onChange={(e) => setDecayScore(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || idLoading}
            className="rounded-button bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Creating…" : idLoading ? "Preparing…" : "Create patient"}
          </button>
          <Link
            href="/"
            className="rounded-button border border-stone-300 bg-surface px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
