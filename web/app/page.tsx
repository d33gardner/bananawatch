"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { OrganizationRow, PatientRow } from "@bananawatch/types";
import { getPatientImageUrls, PATIENT_IDS } from "@/lib/patient-images";

type SortOption = "default" | "most_decay" | "last_scanned";

function CopySurveyLinkButton({ patientId }: { patientId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/survey/${patientId}` : "";
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="mt-1 text-xs text-primary-600 hover:underline"
    >
      {copied ? "Copied!" : "Copy survey link"}
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [patientsMap, setPatientsMap] = useState<Record<string, PatientRow>>({});
  const [sort, setSort] = useState<SortOption>("default");
  const [role, setRole] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [currentUserOrg, setCurrentUserOrg] = useState<{ name: string; code: string } | null>(null);
  const [thumbnailUrlByPatient, setThumbnailUrlByPatient] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: patientRow } = await supabase
        .from("patients")
        .select("id")
        .eq("linked_user_id", user.id)
        .maybeSingle();
      if (patientRow) {
        router.replace("/portal");
        return;
      }
      const { data, error } = await supabase
        .from("patients")
        .select("id, org_id, decay_score, last_scan_date, status, questionnaire_response, first_name, last_name, phone, email");
      if (error) {
        console.error("Failed to fetch patients:", error);
        return;
      }
      const map: Record<string, PatientRow> = {};
      const rows = (data ?? []) as PatientRow[];
      rows.forEach((row) => {
        map[row.id] = row;
      });
      setPatientsMap(map);

      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: scans } = await supabase
          .from("scans")
          .select("patient_id, image_url")
          .in("patient_id", ids)
          .order("created_at", { ascending: false });
        const byPatient: Record<string, string> = {};
        (scans ?? []).forEach((s: { patient_id: string; image_url: string }) => {
          if (byPatient[s.patient_id] == null) byPatient[s.patient_id] = s.image_url;
        });
        setThumbnailUrlByPatient(byPatient);
      } else {
        setThumbnailUrlByPatient({});
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      const profileRole = (profile as { role?: string } | null)?.role ?? null;
      setRole(profileRole);
      if (profileRole === "super_admin") {
        const { data: orgs } = await supabase.from("organizations").select("*").order("name");
        setOrganizations((orgs ?? []) as OrganizationRow[]);
      } else if (profileRole === "org_admin" || profileRole === "org_member") {
        const { data: profileRow } = await supabase.from("profiles").select("org_id").eq("user_id", user.id).maybeSingle();
        const orgId = (profileRow as { org_id?: string } | null)?.org_id;
        if (orgId) {
          const { data: org } = await supabase.from("organizations").select("name, code").eq("id", orgId).maybeSingle();
          if (org) setCurrentUserOrg(org as { name: string; code: string });
        }
      }
    })();
  }, [router]);

  const patientIds = useMemo(() => Object.keys(patientsMap), [patientsMap]);

  const filteredAndSortedIds = useMemo(() => {
    let ids = patientIds;
    if (role === "super_admin" && selectedOrgId) {
      ids = ids.filter((id) => patientsMap[id]?.org_id === selectedOrgId);
    }
    if (sort === "default") return [...ids].sort();
    const getPatient = (id: string) => patientsMap[id];
    if (sort === "most_decay") {
      return [...ids].sort((a, b) => {
        const sa = getPatient(a)?.decay_score ?? -1;
        const sb = getPatient(b)?.decay_score ?? -1;
        return sb - sa;
      });
    }
    if (sort === "last_scanned") {
      return [...ids].sort((a, b) => {
        const da = getPatient(a)?.last_scan_date ?? "";
        const db = getPatient(b)?.last_scan_date ?? "";
        return db.localeCompare(da);
      });
    }
    return ids;
  }, [role, selectedOrgId, patientIds, patientsMap, sort]);

  // Decay rank by id (1 = most decay, N = least) for box-shadow tiers
  const decayRankById = useMemo(() => {
    const byDecay = [...filteredAndSortedIds].sort((a, b) => {
      const sa = patientsMap[a]?.decay_score ?? -1;
      const sb = patientsMap[b]?.decay_score ?? -1;
      return sb - sa;
    });
    const rank: Record<string, number> = {};
    byDecay.forEach((id, i) => {
      rank[id] = i + 1;
    });
    return rank;
  }, [patientsMap, filteredAndSortedIds]);

  const orgFiltered = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  }, [organizations, orgSearch]);

  const getDecayBorderClass = (id: string): string => {
    const rank = decayRankById[id];
    const n = patientIds.length;
    if (!rank || n < 3) return "";
    if (rank <= 3) return "border-l-4 border-status-critical";
    if (rank <= 6) return "border-l-4 border-status-warning";
    if (rank >= n - 2) return "border-l-4 border-status-success";
    return "";
  };

  const hasStaticImage = (id: string) => PATIENT_IDS.includes(id);

  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="text-page-title">Dashboard</h1>
      {currentUserOrg && (
        <p className="mt-1 text-muted">
          Current org: <strong className="text-stone-800">{currentUserOrg.name}</strong> ({currentUserOrg.code})
        </p>
      )}
      <p className="mt-1 text-muted">
        {filteredAndSortedIds.length === patientIds.length
          ? `${patientIds.length} patients`
          : `${filteredAndSortedIds.length} of ${patientIds.length} patients`}{" "}
        — banana decay tracking
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {role === "super_admin" && organizations.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="org-filter" className="text-sm font-medium text-stone-700">
              Organization
            </label>
            <input
              id="org-filter"
              type="text"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Search orgs…"
              className="w-36 rounded-button border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <select
              id="org-select"
              value={selectedOrgId ?? ""}
              onChange={(e) => setSelectedOrgId(e.target.value || null)}
              className="rounded-button border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by organization"
            >
              <option value="">All organizations</option>
              {orgFiltered.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </div>
        )}
        <Link
          href="/patients/new"
          className="rounded-button bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add patient
        </Link>
        <label htmlFor="sort" className="text-sm font-medium text-stone-700">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-button border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="default">Default (ID)</option>
          <option value="most_decay">Most decay</option>
          <option value="last_scanned">Last scanned</option>
        </select>
      </div>
      {patientIds.length === 0 ? (
        <p className="mt-6 text-muted">
          No patients yet.{" "}
          <Link href="/patients/new" className="text-primary-600 hover:underline">
            Add a patient
          </Link>{" "}
          or run the Supabase seed to load the initial 28.
        </p>
      ) : filteredAndSortedIds.length === 0 ? (
        <p className="mt-6 text-muted">No patients in the selected organization.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {filteredAndSortedIds.map((id) => {
            const { avatar } = getPatientImageUrls(id);
            const patient = patientsMap[id];
            const decayDisplay =
              patient?.decay_score != null
                ? (patient.decay_score * 100).toFixed(0) + "%"
                : "—";
            const showStaticImage = hasStaticImage(id);
            const thumbnailUrl = showStaticImage ? avatar : thumbnailUrlByPatient[id] ?? null;
            const decayBorder = getDecayBorderClass(id);
            return (
              <li key={id} className={`rounded-card ${decayBorder}`}>
                <Link
                  href={`/patients/${id}`}
                  className="flex flex-col overflow-hidden rounded-card border border-stone-200 bg-surface shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square w-full bg-stone-100">
                    {thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl}
                        alt={`Patient ${id}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 14vw"
                        unoptimized={!showStaticImage}
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-2xl font-semibold text-stone-400"
                        aria-hidden
                      >
                        {id.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <span className="font-medium text-stone-900">{id}</span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      Decay: {decayDisplay}
                    </span>
                    <CopySurveyLinkButton patientId={id} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
