"use client";

import Image from "next/image";
import type { ReactNode } from "react";

export type SurveyResponse = {
  notes?: string | null;
  condition?: string;
  pain_level?: number | null;
  submitted_at?: string;
};

export type TimelineEntryStatic = { type: "static"; day: number; url: string };
export type TimelineEntrySurvey = {
  type: "survey";
  submittedAt: string;
  imageUrls: string[];
  scanIds: string[];
  questionnaireResponse: SurveyResponse | null;
};
export type TimelineEntry = TimelineEntryStatic | TimelineEntrySurvey;

export type SelectedEntry =
  | null
  | { type: "static"; day: number }
  | {
      type: "survey";
      submittedAt: string;
      imageUrls: string[];
      scanIds: string[];
      questionnaireResponse: SurveyResponse | null;
    };

export function formatTimelineDate(isoDate: string): string {
  const d = new Date(isoDate);
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

type ScanRow = {
  id: string;
  image_url: string;
  questionnaire_response: unknown;
  submitted_at: string | null;
  created_at: string | null;
};

export function buildTimelineEntries(
  hasStaticImages: boolean,
  days: { day: number; url: string }[],
  scans: ScanRow[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  if (hasStaticImages && days.length) {
    days.forEach(({ day, url }) => entries.push({ type: "static", day, url }));
  }
  const scanGroups = new Map<
    string,
    { submittedAt: string; imageUrls: string[]; scanIds: string[]; questionnaireResponse: SurveyResponse | null }
  >();
  scans.forEach((s) => {
    const key = s.submitted_at ?? s.created_at ?? new Date().toISOString();
    const qr =
      s.questionnaire_response &&
      typeof s.questionnaire_response === "object" &&
      s.questionnaire_response !== null
        ? (s.questionnaire_response as SurveyResponse)
        : null;
    if (!scanGroups.has(key)) {
      scanGroups.set(key, { submittedAt: key, imageUrls: [], scanIds: [], questionnaireResponse: qr });
    }
    const g = scanGroups.get(key)!;
    g.imageUrls.push(s.image_url);
    g.scanIds.push(s.id);
  });
  scanGroups.forEach((v) =>
    entries.push({
      type: "survey",
      submittedAt: v.submittedAt,
      imageUrls: v.imageUrls,
      scanIds: v.scanIds,
      questionnaireResponse: v.questionnaireResponse,
    })
  );
  return entries;
}

type Props = {
  patientId: string;
  timelineEntries: TimelineEntry[];
  selectedEntry: SelectedEntry;
  onSelectEntry: (entry: SelectedEntry) => void;
  selectedSurveyPhotoIndex: number;
  onSelectSurveyPhotoIndex: (i: number) => void;
  hasStaticImages: boolean;
  days: { day: number; url: string }[];
  avatar: string;
  isPatientView: boolean;
  addPictureSlot?: ReactNode;
};

export function PatientTimelineAndSurvey({
  timelineEntries,
  selectedEntry,
  onSelectEntry,
  selectedSurveyPhotoIndex,
  onSelectSurveyPhotoIndex,
  hasStaticImages,
  days,
  avatar,
  isPatientView,
  addPictureSlot,
}: Props) {
  const compareDay = selectedEntry?.type === "static" ? selectedEntry.day : 7;

  return (
    <>
      <section className="mt-6">
        <h2 className="text-section-title">Timeline</h2>
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-2">
          {timelineEntries.map((entry, idx) => {
            if (entry.type === "static") {
              const isSelected = selectedEntry?.type === "static" && selectedEntry.day === entry.day;
              return (
                <li key={`static-${entry.day}`}>
                  <button
                    type="button"
                    onClick={() => onSelectEntry({ type: "static", day: entry.day })}
                    aria-label={`Compare with Day ${entry.day}`}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                      isSelected ? "border-primary-600" : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <Image src={entry.url} alt={`Day ${entry.day}`} fill className="object-cover" sizes="64px" unoptimized />
                  </button>
                  <span className="mt-1 block text-center text-xs text-stone-500">Day {entry.day}</span>
                </li>
              );
            }
            const surveyEntry = entry as TimelineEntrySurvey;
            const isSelected = selectedEntry?.type === "survey" && selectedEntry.submittedAt === surveyEntry.submittedAt;
            const dateLabel = formatTimelineDate(surveyEntry.submittedAt);
            return (
              <li key={`survey-${idx}-${surveyEntry.submittedAt}`}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectEntry({
                      type: "survey",
                      submittedAt: surveyEntry.submittedAt,
                      imageUrls: surveyEntry.imageUrls,
                      scanIds: surveyEntry.scanIds,
                      questionnaireResponse: surveyEntry.questionnaireResponse,
                    });
                    onSelectSurveyPhotoIndex(0);
                  }}
                  aria-label={`Survey ${dateLabel}`}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                    isSelected ? "border-primary-600" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <Image
                    src={surveyEntry.imageUrls[0]}
                    alt={dateLabel}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </button>
                <span className="mt-1 block max-w-[5.5rem] truncate text-center text-xs text-stone-500">{dateLabel}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {selectedEntry?.type === "survey" && (() => {
        const surveyImageCount = selectedEntry.imageUrls.length;
        const displayPhotoIndex =
          surveyImageCount > 0 ? Math.min(selectedSurveyPhotoIndex, surveyImageCount - 1) : 0;
        return (
          <>
            <section className="mt-6">
              <h2 className="text-section-title">Survey — {formatTimelineDate(selectedEntry.submittedAt)}</h2>
              <p className="mt-1 text-xs text-stone-500">
                {hasStaticImages
                  ? "Day 1 vs survey image"
                  : surveyImageCount > 1
                    ? "First image vs selected image"
                    : "Survey image"}
              </p>
              {surveyImageCount > 1 && (
                <ul className="mt-2 flex gap-2 overflow-x-auto pb-2">
                  {selectedEntry.imageUrls.map((url, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => onSelectSurveyPhotoIndex(i)}
                        aria-label={`Select photo ${i + 1}`}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                          displayPhotoIndex === i ? "border-primary-600" : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="56px" unoptimized />
                      </button>
                      <span className="mt-0.5 block text-center text-xs text-stone-500">{i + 1}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={hasStaticImages ? (days[0]?.url ?? avatar) : selectedEntry.imageUrls[0]}
                      alt={hasStaticImages ? "Day 1" : "First image"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 400px"
                      unoptimized
                    />
                  </div>
                  <p className="p-2 text-center text-sm font-medium text-stone-700">
                    {hasStaticImages ? "Day 1" : "First image"}
                  </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={selectedEntry.imageUrls[displayPhotoIndex]}
                      alt={
                        surveyImageCount > 1
                          ? `Selected image (photo ${displayPhotoIndex + 1})`
                          : "Survey image"
                      }
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 400px"
                      unoptimized
                    />
                  </div>
                  <p className="p-2 text-center text-sm font-medium text-stone-700">
                    {surveyImageCount > 1 ? `Photo ${displayPhotoIndex + 1}` : "Survey image"}
                  </p>
                </div>
              </div>
            </section>

            {isPatientView && (
              <>
                <section className="mt-4 rounded-card border border-stone-200 bg-stone-50 p-4">
                  <h3 className="text-section-title">Survey response</h3>
                  {selectedEntry.questionnaireResponse ? (
                    <dl className="mt-2 space-y-2 text-sm">
                      {selectedEntry.questionnaireResponse.condition && (
                        <div>
                          <dt className="text-stone-500">Condition</dt>
                          <dd className="font-medium text-stone-900 capitalize">
                            {selectedEntry.questionnaireResponse.condition}
                          </dd>
                        </div>
                      )}
                      {selectedEntry.questionnaireResponse.pain_level != null && (
                        <div>
                          <dt className="text-stone-500">Pain level</dt>
                          <dd className="font-medium text-stone-900">
                            {selectedEntry.questionnaireResponse.pain_level}
                          </dd>
                        </div>
                      )}
                      {selectedEntry.questionnaireResponse.notes && (
                        <div>
                          <dt className="text-stone-500">Notes</dt>
                          <dd className="font-medium text-stone-900 whitespace-pre-wrap">
                            {selectedEntry.questionnaireResponse.notes}
                          </dd>
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
                {addPictureSlot && <div className="mt-4">{addPictureSlot}</div>}
              </>
            )}
          </>
        );
      })()}

      {hasStaticImages && (selectedEntry?.type === "static" || selectedEntry === null) && (
        <section className="mt-8">
          <h2 className="text-section-title">Day 1 vs Day {compareDay}</h2>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
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
              <p className="p-2 text-center text-sm font-medium text-stone-700">Day 1</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
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
              <p className="p-2 text-center text-sm font-medium text-stone-700">Day {compareDay}</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
