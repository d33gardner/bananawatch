/**
 * Data helper: image URLs per patient.
 * Static: uses flat naming in public/patients (e.g. 20260214-001-Day01.jpg).
 * Later: merge with Supabase scans when present (same interface).
 */

export const PATIENT_IDS = Array.from({ length: 28 }, (_, i) =>
  `20260214-${String(i + 1).padStart(3, "0")}`
);

export type DayImage = { day: number; url: string };

export function getPatientImageUrls(patientId: string): {
  avatar: string;
  days: DayImage[];
} {
  const base = `/patients/${patientId}`;
  const days: DayImage[] = [];
  for (let d = 1; d <= 7; d++) {
    const dayStr = String(d).padStart(2, "0");
    days.push({ day: d, url: `${base}-Day${dayStr}.jpg` });
  }
  return {
    avatar: `${base}.jpg`,
    days,
  };
}

export function getPatientIds(): string[] {
  return [...PATIENT_IDS];
}
