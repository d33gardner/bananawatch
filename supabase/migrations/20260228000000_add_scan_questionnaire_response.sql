-- Add questionnaire_response and submitted_at to scans (survey response per photo)
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS questionnaire_response jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_scans_patient_submitted
  ON public.scans(patient_id, submitted_at NULLS LAST);
