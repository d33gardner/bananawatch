"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { getPatientImageUrls, PATIENT_IDS } from "@/lib/patient-images";

export default function PatientDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [compareDay, setCompareDay] = useState(7);

  const isValid = useMemo(() => PATIENT_IDS.includes(id), [id]);
  const { avatar, days } = useMemo(
    () => (id ? getPatientImageUrls(id) : { avatar: "", days: [] }),
    [id]
  );

  if (!id || !isValid) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-gray-600">Patient not found.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{id}</h1>
      <p className="mt-1 text-gray-600">Compare Day 1 vs Day N</p>

      {/* Timeline strip: Day 1 … Day 7 thumbnails */}
      <section className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">Timeline</h2>
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-2">
          {days.map(({ day, url }) => (
            <li key={day}>
              <button
                type="button"
                onClick={() => setCompareDay(day)}
                aria-label={`Compare with Day ${day}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                  compareDay === day ? "border-blue-600" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Image
                  src={url}
                  alt={`Day ${day}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              </button>
              <span className="mt-1 block text-center text-xs text-gray-500">Day {day}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Side-by-side: Day 1 vs Day N */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-700">
          Day 1 vs Day {compareDay}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <div className="relative aspect-square w-full">
              <Image
                src={days[0]?.url ?? avatar}
                alt="Day 1"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 400px"
                unoptimized
              />
            </div>
            <p className="p-2 text-center text-sm font-medium text-gray-700">Day 1</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <div className="relative aspect-square w-full">
              <Image
                src={days.find((d) => d.day === compareDay)?.url ?? avatar}
                alt={`Day ${compareDay}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 400px"
                unoptimized
              />
            </div>
            <p className="p-2 text-center text-sm font-medium text-gray-700">
              Day {compareDay}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
