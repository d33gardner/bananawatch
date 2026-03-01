"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { PatientLinkRow, ScanStaffNoteRow } from "@bananawatch/types";
import { getPatientImageUrls, PATIENT_IDS } from "@/lib/patient-images";
import {
  PatientTimelineAndSurvey,
  buildTimelineEntries,
  type SelectedEntry,
} from "@/app/components/PatientTimelineAndSurvey";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [exists, setExists] = useState<boolean | null>(null);
  const [contact, setContact] = useState<{ first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null>(null);
  const [scans, setScans] = useState<Array<{ id: string; image_url: string; questionnaire_response: unknown; submitted_at: string | null; created_at: string | null }>>([]);
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry>(null);
  const [selectedSurveyPhotoIndex, setSelectedSurveyPhotoIndex] = useState(0);
  const [patientLinks, setPatientLinks] = useState<PatientLinkRow[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [currentUserDisplayLabel, setCurrentUserDisplayLabel] = useState<string | null>(null);
  const [notesByScanId, setNotesByScanId] = useState<Record<string, ScanStaffNoteRow[]>>({});
  const [authorByUserId, setAuthorByUserId] = useState<Record<string, string>>({});
  const [addNoteScanId, setAddNoteScanId] = useState<string | null>(null);
  const [addNoteBody, setAddNoteBody] = useState("");
  const [addNoteLoading, setAddNoteLoading] = useState(false);
  const [surveyNotesOpen, setSurveyNotesOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
    });
  }, [router]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("patients")
        .select("linked_user_id")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data?.linked_user_id === user.id) {
            router.replace("/portal");
          }
        });
    });
  }, [id, router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("role, email")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const d = data as { role?: string; email?: string | null } | null;
          setStaffRole(d?.role ?? null);
          setCurrentUserDisplayLabel(
            d?.email?.trim() ? d.email.trim() : (d?.role ?? null)
          );
        });
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("patients")
      .select("id, first_name, last_name, phone, email")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setExists(!!data);
        if (data) setContact({ first_name: data.first_name, last_name: data.last_name, phone: data.phone, email: data.email });
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("patient_links")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPatientLinks((data ?? []) as PatientLinkRow[]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("scans")
      .select("id, image_url, questionnaire_response, submitted_at, created_at")
      .eq("patient_id", id)
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setScans(data ?? []);
      });
  }, [id]);

  const isStaff = staffRole === "super_admin" || staffRole === "org_admin" || staffRole === "org_member";

  useEffect(() => {
    const m = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isStaff || selectedEntry?.type !== "survey" || selectedEntry.scanIds.length === 0) {
      setNotesByScanId({});
      setAuthorByUserId({});
      return;
    }
    const supabase = createClient();
    supabase
      .from("scan_staff_notes")
      .select("*")
      .in("scan_id", selectedEntry.scanIds)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const byScan: Record<string, ScanStaffNoteRow[]> = {};
        selectedEntry.scanIds.forEach((sid) => (byScan[sid] = []));
        const notes = (data ?? []) as ScanStaffNoteRow[];
        notes.forEach((note) => {
          if (byScan[note.scan_id]) byScan[note.scan_id].push(note);
        });
        setNotesByScanId(byScan);
        const userIds = [...new Set(notes.map((n) => n.created_by).filter(Boolean))] as string[];
        if (userIds.length === 0) {
          setAuthorByUserId({});
          return;
        }
        supabase.from("profiles").select("user_id, role, email").in("user_id", userIds)
          .then(({ data }) => {
            const profiles = data ?? [];
            const author: Record<string, string> = {};
            userIds.forEach((uid) => {
              const p = profiles.find((r) => r.user_id === uid);
              author[uid] = p?.email?.trim() || p?.role || "patient";
            });
            setAuthorByUserId(author);
          });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, selectedEntry?.type, selectedEntry?.type === "survey" ? selectedEntry.scanIds.join(",") : ""]);

  const hasStaticImages = useMemo(() => Boolean(id && PATIENT_IDS.includes(id)), [id]);
  const { avatar, days } = useMemo(
    () => (id ? getPatientImageUrls(id) : { avatar: "", days: [] }),
    [id]
  );

  const timelineEntries = useMemo(
    () => buildTimelineEntries(hasStaticImages, days, scans),
    [hasStaticImages, days, scans]
  );

  const hasContact = contact && [contact.first_name, contact.last_name, contact.phone, contact.email].some(Boolean);

  if (!id) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-stone-600">Invalid patient.</p>
        <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (exists === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-stone-600">Loading…</p>
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-stone-600">Patient not found.</p>
        <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-primary-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-page-title">{id}</h1>
      <p className="mt-1 text-stone-600">
        {hasStaticImages ? "Compare Day 1 vs Day N" : "Patient detail"}
      </p>

      {timelineEntries.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              if (selectedEntry?.type === "survey") setSurveyNotesOpen(true);
            }}
            disabled={selectedEntry?.type !== "survey"}
            className="rounded rounded-button bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary-600"
          >
            Survey response & notes
          </button>
          {hasStaticImages && (!selectedEntry || selectedEntry.type === "static") && (
            <p className="mt-2 text-sm text-stone-500">
              No notes or survey responses for demo images.
            </p>
          )}
        </div>
      )}

      {hasContact && (
        <section className="mt-6 rounded-card border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-section-title">Contact</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {(contact.first_name || contact.last_name) && (
              <div>
                <dt className="text-stone-500">Name</dt>
                <dd className="font-medium text-stone-900">
                  {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
                </dd>
              </div>
            )}
            {contact.phone && (
              <div>
                <dt className="text-stone-500">Phone</dt>
                <dd className="font-medium text-stone-900">{contact.phone}</dd>
              </div>
            )}
            {contact.email && (
              <div>
                <dt className="text-stone-500">Email</dt>
                <dd className="font-medium text-stone-900">{contact.email}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {!hasStaticImages && (
        <p className="mt-4">
          <Link href={`/survey/${id}`} className="text-primary-600 hover:underline">
            Open survey link (questionnaire + photos)
          </Link>
        </p>
      )}

      <section className="mt-6 rounded-card border border-stone-200 bg-surface p-4">
        <h2 className="text-section-title">Patient link</h2>
        <p className="mt-1 text-xs text-stone-500">
          Create a link for this patient to activate their account and open the survey. Link expires in 3 days if not activated; after activation it works until you deactivate it.
        </p>
        {patientLinks.length === 0 && !newLinkUrl && (
          <button
            type="button"
            onClick={async () => {
              setLinkError("");
              setNewLinkUrl(null);
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 3);
              const { data: link, error } = await supabase
                .from("patient_links")
                .insert({
                  patient_id: id,
                  expires_at: expiresAt.toISOString(),
                  created_by: user?.id ?? null,
                })
                .select("token")
                .single();
              if (error) {
                setLinkError(error.message);
                return;
              }
              const base = typeof window !== "undefined" ? window.location.origin : "";
              setNewLinkUrl(`${base}/survey/link/${(link as { token: string }).token}`);
            }}
            className="mt-3 rounded-button bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create patient link
          </button>
        )}
        {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
        {newLinkUrl && (
          <div className="mt-3 rounded border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-medium text-stone-500">Copy and send this link (email or text):</p>
            <p className="mt-1 break-all font-mono text-sm text-stone-800">{newLinkUrl}</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(newLinkUrl!)}
              className="mt-2 text-sm text-primary-600 hover:underline"
            >
              Copy to clipboard
            </button>
          </div>
        )}
        {patientLinks.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-stone-200 pt-4">
            {patientLinks.map((pl) => {
              const isDeactivated = !!pl.deactivated_at;
              const isActivated = !!pl.activated_at;
              const expired = !isActivated && new Date(pl.expires_at) <= new Date();
              const fullUrl = typeof window !== "undefined" ? `${window.location.origin}/survey/link/${pl.token}` : "";
              const justCopied = copiedLinkId === pl.id;
              return (
                <li key={pl.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-stone-600">
                      …/survey/link/{pl.token.slice(0, 8)}…
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (fullUrl) {
                          void navigator.clipboard.writeText(fullUrl).then(() => {
                            setCopiedLinkId(pl.id);
                            setTimeout(() => setCopiedLinkId(null), 2000);
                          });
                        }
                      }}
                      className="inline-flex shrink-0 rounded p-0.5 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                      aria-label="Copy link"
                      title="Copy link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16V4a2 2 0 0 1 2-2h10" />
                      </svg>
                    </button>
                    {justCopied && <span className="text-xs text-primary-600">Copied!</span>}
                  </span>
                  <span className="text-stone-500">
                    {isDeactivated ? "Deactivated" : isActivated ? "Active" : expired ? "Expired" : "Pending activation"}
                  </span>
                  {isActivated && !isDeactivated && (
                    <button
                      type="button"
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase
                          .from("patient_links")
                          .update({ deactivated_at: new Date().toISOString() })
                          .eq("id", pl.id);
                        setPatientLinks((prev) =>
                          prev.map((l) => (l.id === pl.id ? { ...l, deactivated_at: new Date().toISOString() } : l))
                        );
                      }}
                      className="text-amber-600 hover:underline"
                    >
                      Deactivate
                    </button>
                  )}
                  {isDeactivated && (
                    <button
                      type="button"
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.from("patient_links").update({ deactivated_at: null }).eq("id", pl.id);
                        setPatientLinks((prev) =>
                          prev.map((l) => (l.id === pl.id ? { ...l, deactivated_at: null } : l))
                        );
                      }}
                      className="text-primary-600 hover:underline"
                    >
                      Reactivate
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {timelineEntries.length > 0 && (
        <>
          <div className="mt-4">
            {isStaff && (
              <button
                type="button"
                onClick={() => {
                  if (selectedEntry?.type === "survey") setSurveyNotesOpen(true);
                }}
                disabled={selectedEntry?.type !== "survey"}
                className="rounded-button bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary-600"
              >
                Survey response & notes
              </button>
            )}
            {hasStaticImages && (selectedEntry === null || selectedEntry?.type === "static") && isStaff && (
              <p className="mt-2 text-sm text-stone-500">
                No notes or survey responses for demo images.
              </p>
            )}
          </div>
          <PatientTimelineAndSurvey
            patientId={id}
            timelineEntries={timelineEntries}
            selectedEntry={selectedEntry}
            onSelectEntry={setSelectedEntry}
            selectedSurveyPhotoIndex={selectedSurveyPhotoIndex}
            onSelectSurveyPhotoIndex={setSelectedSurveyPhotoIndex}
            hasStaticImages={hasStaticImages}
            days={days}
            avatar={avatar}
            isPatientView={false}
          />

          {isStaff && selectedEntry?.type === "survey" && surveyNotesOpen && (
                <>
                  <div
                    role="presentation"
                    aria-hidden
                    className="fixed inset-0 z-40 bg-black/50"
                    onClick={() => setSurveyNotesOpen(false)}
                  />
                  <div
                    role="dialog"
                    aria-label="Survey response and notes"
                    className={`fixed z-50 flex flex-col bg-surface shadow-lg ${
                      isMobile ? "inset-4 rounded-lg" : "right-0 top-0 bottom-0 w-96 max-w-full"
                    }`}
                  >
                    <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
                      <h2 className="text-sm font-medium text-stone-700">Survey response & notes</h2>
                      <button
                        type="button"
                        onClick={() => setSurveyNotesOpen(false)}
                        className="text-sm text-stone-600 hover:underline"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                        <h3 className="text-sm font-medium text-stone-700">Survey response</h3>
                        {selectedEntry.questionnaireResponse ? (
                          <dl className="mt-2 space-y-2 text-sm">
                            {selectedEntry.questionnaireResponse.condition && (
                              <div>
                                <dt className="text-stone-500">Condition</dt>
                                <dd className="font-medium text-stone-900 capitalize">{selectedEntry.questionnaireResponse.condition}</dd>
                              </div>
                            )}
                            {selectedEntry.questionnaireResponse.pain_level != null && (
                              <div>
                                <dt className="text-stone-500">Pain level</dt>
                                <dd className="font-medium text-stone-900">{selectedEntry.questionnaireResponse.pain_level}</dd>
                              </div>
                            )}
                            {selectedEntry.questionnaireResponse.notes && (
                              <div>
                                <dt className="text-stone-500">Notes</dt>
                                <dd className="font-medium text-stone-900 whitespace-pre-wrap">{selectedEntry.questionnaireResponse.notes}</dd>
                              </div>
                            )}
                            {selectedEntry.questionnaireResponse.submitted_at && (
                              <div>
                                <dt className="text-stone-500">Submitted</dt>
                                <dd className="font-medium text-stone-900">
                                  {new Date(selectedEntry.questionnaireResponse.submitted_at).toLocaleString()}
                                </dd>
                              </div>
                            )}
                          </dl>
                        ) : (
                          <p className="mt-2 text-sm text-stone-500">No response recorded for this submission.</p>
                        )}
                      </section>

                      {isStaff && selectedEntry.scanIds.length > 0 && (
                        <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                          <h3 className="text-sm font-medium text-amber-900">Staff notes (internal)</h3>
                          <p className="mt-1 text-xs text-amber-800/80">
                            These notes are only visible to staff. The patient cannot see them.
                          </p>
                          <div className="mt-4 space-y-6">
                            {selectedEntry.scanIds.map((scanId, photoIndex) => {
                              const notes = notesByScanId[scanId] ?? [];
                              const photoLabel =
                                selectedEntry.imageUrls.length > 1 ? `Photo ${photoIndex + 1}` : "Survey image";
                              return (
                                <div key={scanId} className="rounded border border-amber-200/80 bg-surface p-3">
                                  <h4 className="text-xs font-medium text-amber-900">{photoLabel}</h4>
                                  <ul className="mt-2 space-y-2">
                                    {notes.map((n) => (
                                      <li
                                        key={n.id}
                                        className="rounded bg-stone-50 px-2 py-1.5 text-sm text-stone-800"
                                      >
                                        <span className="whitespace-pre-wrap">{n.body}</span>
                                        <span className="mt-1 block text-xs text-stone-500">
                                          Added {n.created_at ? new Date(n.created_at).toLocaleString() : "—"}
                                          {n.created_by && (
                                            <span> by {authorByUserId[n.created_by] ?? "patient"}</span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="mt-3">
                                    {addNoteScanId === scanId ? (
                                      <div>
                                        <textarea
                                          value={addNoteBody}
                                          onChange={(e) => setAddNoteBody(e.target.value)}
                                          placeholder="Add an internal note…"
                                          rows={2}
                                          className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
                                        />
                                        <div className="mt-2 flex gap-2">
                                          <button
                                            type="button"
                                            disabled={addNoteLoading || !addNoteBody.trim()}
                                            onClick={async () => {
                                              const supabase = createClient();
                                              const { data: { user } } = await supabase.auth.getUser();
                                              if (!user) return;
                                              setAddNoteLoading(true);
                                              const { data: inserted, error } = await supabase
                                                .from("scan_staff_notes")
                                                .insert({
                                                  scan_id: scanId,
                                                  body: addNoteBody.trim(),
                                                  created_by: user.id,
                                                })
                                                .select("*")
                                                .single();
                                              setAddNoteLoading(false);
                                              if (error) return;
                                              setAddNoteBody("");
                                              setAddNoteScanId(null);
                                              if (inserted) {
                                                setNotesByScanId((prev) => ({
                                                  ...prev,
                                                  [scanId]: [...(prev[scanId] ?? []), inserted as ScanStaffNoteRow],
                                                }));
                                                if (currentUserDisplayLabel)
                                                  setAuthorByUserId((prev) => ({
                                                    ...prev,
                                                    [user.id]: currentUserDisplayLabel,
                                                  }));
                                              }
                                            }}
                                            className="rounded bg-amber-600 px-2 py-1 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                                          >
                                            Save note
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddNoteScanId(null);
                                              setAddNoteBody("");
                                            }}
                                            className="text-sm text-stone-600 hover:underline"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAddNoteScanId(scanId);
                                          setAddNoteBody("");
                                        }}
                                        className="text-sm text-amber-700 hover:underline"
                                      >
                                        Add note
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                </>
              )}
        </>
      )}
    </div>
  );
}
