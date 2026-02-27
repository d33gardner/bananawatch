"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase";
import type { PatientRow } from "@bananawatch/types";
import { getPatientImageUrls, getPatientIds } from "@/lib/patient-images";

type SortOption = "default" | "most_decay" | "last_scanned";

export default function DashboardPage() {
  const [patientsMap, setPatientsMap] = useState<Record<string, PatientRow>>({});
  const [sort, setSort] = useState<SortOption>("default");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("patients")
      .select("id, decay_score, last_scan_date, status")
      .then(({ data, error }) => {
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
      });
  }, []);

  const sortedIds = useMemo(() => {
    const ids = getPatientIds();
    if (sort === "default") return ids;
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
  }, [sort, patientsMap]);

  // Decay rank by id (1 = most decay, 28 = least) for box-shadow tiers
  const decayRankById = useMemo(() => {
    const ids = getPatientIds();
    const byDecay = [...ids].sort((a, b) => {
      const sa = patientsMap[a]?.decay_score ?? -1;
      const sb = patientsMap[b]?.decay_score ?? -1;
      return sb - sa;
    });
    const rank: Record<string, number> = {};
    byDecay.forEach((id, i) => {
      rank[id] = i + 1;
    });
    return rank;
  }, [patientsMap]);

  const getShadowStyle = (id: string): CSSProperties => {
    const rank = decayRankById[id];
    if (!rank) return {};
    if (rank <= 3) return { boxShadow: "0 0 24px 4px rgba(220, 38, 38, 0.7)" };
    if (rank <= 6) return { boxShadow: "0 0 24px 4px rgba(234, 88, 12, 0.7)" };
    if (rank >= 26) return { boxShadow: "0 0 24px 4px rgba(22, 163, 74, 0.7)" };
    return {};
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-600">
        28 patients — banana decay tracking
      </p>
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor="sort" className="text-sm font-medium text-gray-700">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="default">Default (ID)</option>
          <option value="most_decay">Most decay</option>
          <option value="last_scanned">Last scanned</option>
        </select>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {sortedIds.map((id) => {
          const { avatar } = getPatientImageUrls(id);
          const patient = patientsMap[id];
          const decayDisplay =
            patient?.decay_score != null
              ? (patient.decay_score * 100).toFixed(0) + "%"
              : "—";
          return (
            <li key={id} className="rounded-lg" style={getShadowStyle(id)}>
              <Link
                href={`/patients/${id}`}
                className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square w-full bg-gray-100">
                  <Image
                    src={avatar}
                    alt={`Patient ${id}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 14vw"
                  />
                </div>
                <div className="p-2 text-center">
                  <span className="font-medium text-gray-900">{id}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Decay: {decayDisplay}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
