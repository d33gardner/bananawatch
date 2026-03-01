"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { PatientRow } from "@bananawatch/types";
import { getPatientImageUrls, PATIENT_IDS } from "@/lib/patient-images";
import {
  PatientTimelineAndSurvey,
  buildTimelineEntries,
  type SelectedEntry,
} from "@/app/components/PatientTimelineAndSurvey";

type ScanRow = {
  id: string;
  image_url: string;
  questionnaire_response: unknown;
  submitted_at: string | null;
  created_at: string | null;
};

export default function PortalPage() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry>(null);
  const [selectedSurveyPhotoIndex, setSelectedSurveyPhotoIndex] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.role) {
        router.replace("/");
        return;
      }
      const { data: row } = await supabase
        .from("patients")
        .select("id, first_name, last_name, phone, email")
        .eq("linked_user_id", user.id)
        .single();
      if (!row) {
        router.replace("/login");
        return;
      }
      setPatient(row as PatientRow);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!patient?.id) return;
    const supabase = createClient();
    supabase
      .from("scans")
      .select("id, image_url, questionnaire_response, submitted_at, created_at")
      .eq("patient_id", patient.id)
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setScans(data ?? []);
      });
  }, [patient?.id]);

  const hasStaticImages = useMemo(
    () => !!(patient?.id && PATIENT_IDS.includes(patient.id)),
    [patient?.id]
  );
  const { avatar, days } = useMemo(
    () => (patient?.id ? getPatientImageUrls(patient.id) : { avatar: "", days: [] as { day: number; url: string }[] }),
    [patient?.id]
  );
  const timelineEntries = useMemo(
    () => buildTimelineEntries(hasStaticImages, days, scans),
    [hasStaticImages, days, scans]
  );

  if (loading || !patient) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-muted">
        Loading…
      </div>
    );
  }

  const name = [patient.first_name, patient.last_name].filter(Boolean).join(" ").trim() || `Patient ${patient.id}`;
  const hasContact = [patient.first_name, patient.last_name, patient.phone, patient.email].some(Boolean);

  return (
    <div className="mx-auto max-w-7xl py-12">
      <h1 className="text-page-title">Your care portal</h1>
      <p className="mt-1 text-muted">
        Your progress and survey responses.
      </p>
      <p className="mt-1 text-muted">
        Patient ID: <span className="font-mono font-medium text-stone-800">{patient.id}</span>
      </p>

      {hasContact && (
        <section className="mt-6 rounded-card border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-section-title">Your information</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {(patient.first_name || patient.last_name) && (
              <div>
                <dt className="text-stone-500">Name</dt>
                <dd className="font-medium text-stone-900">
                  {[patient.first_name, patient.last_name].filter(Boolean).join(" ")}
                </dd>
              </div>
            )}
            {patient.phone && (
              <div>
                <dt className="text-stone-500">Phone</dt>
                <dd className="font-medium text-stone-900">{patient.phone}</dd>
              </div>
            )}
            {patient.email && (
              <div>
                <dt className="text-stone-500">Email</dt>
                <dd className="font-medium text-stone-900">{patient.email}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <div className="mt-6">
        <Link
          href={`/survey/${patient.id}`}
          className="inline-block w-full rounded-button bg-primary-600 py-3 text-center text-sm font-medium text-white hover:bg-primary-700 sm:w-auto sm:px-6"
        >
          Add a picture
        </Link>
      </div>

      {timelineEntries.length > 0 ? (
        <PatientTimelineAndSurvey
          patientId={patient.id}
          timelineEntries={timelineEntries}
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
          selectedSurveyPhotoIndex={selectedSurveyPhotoIndex}
          onSelectSurveyPhotoIndex={setSelectedSurveyPhotoIndex}
          hasStaticImages={hasStaticImages}
          days={days}
          avatar={avatar}
          isPatientView={true}
          addPictureSlot={
            <Link
              href={`/survey/${patient.id}`}
              className="inline-block w-full rounded-button bg-primary-600 py-3 text-center text-sm font-medium text-white hover:bg-primary-700"
            >
              Add a picture
            </Link>
          }
        />
      ) : (
        <div className="mt-4 rounded-card border border-stone-200 bg-surface p-6 shadow-sm">
          <p className="text-muted">
            No survey submissions yet. Use the button above to submit your first survey and photos.
          </p>
        </div>
      )}
    </div>
  );
}
