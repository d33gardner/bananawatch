/**
 * Data helper: image URLs per patient.
 * Static: uses flat naming in public/patients (e.g. 20260214-001-Day01.jpg).
 * Later: merge with Supabase scans when present (same interface).
 */

// Legacy format (for static asset paths); after migration, patient ids are DEMO-20260214-001 etc.
export const PATIENT_IDS = Array.from({ length: 28 }, (_, i) =>
  `DEMO-20260214-${String(i + 1).padStart(3, "0")}`
);

export type DayImage = { day: number; url: string };

/** Static asset path: strip org prefix so DEMO-20260214-001 -> 20260214-001 for /patients/20260214-001.jpg */
function staticAssetId(patientId: string): string {
  const match = patientId.match(/^[A-Z0-9]+-(.+)$/);
  return match ? match[1] : patientId;
}

export function getPatientImageUrls(patientId: string): {
  avatar: string;
  days: DayImage[];
} {
  const base = `/patients/${staticAssetId(patientId)}`;
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
