-- BananaWatch MVP: patients and scans tables
-- RLS: public read/write for MVP (restrict in production).

-- Patients table (28 banana "patients", e.g. 20260214-001 to 20260214-028)
CREATE TABLE IF NOT EXISTS public.patients (
  id text PRIMARY KEY,
  status text DEFAULT 'active' CHECK (status IN ('active', 'critical', 'discharged')),
  decay_score float DEFAULT 0.0 CHECK (decay_score >= 0.0 AND decay_score <= 1.0),
  last_scan_date timestamptz DEFAULT now()
);

-- Scans table (one row per photo/scan per patient)
CREATE TABLE IF NOT EXISTS public.scans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  analysis_result jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scans_patient_id ON public.scans(patient_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- MVP: allow public read/write (replace with proper auth policies later)
CREATE POLICY "Allow public read patients"
  ON public.patients FOR SELECT USING (true);

CREATE POLICY "Allow public insert patients"
  ON public.patients FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update patients"
  ON public.patients FOR UPDATE USING (true);

CREATE POLICY "Allow public read scans"
  ON public.scans FOR SELECT USING (true);

CREATE POLICY "Allow public insert scans"
  ON public.scans FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update scans"
  ON public.scans FOR UPDATE USING (true);

CREATE POLICY "Allow public delete scans"
  ON public.scans FOR DELETE USING (true);

-- Seed 28 patients with decay_score spread (for demo ranking: top 3 red, next 3 orange, bottom 3 green)
INSERT INTO public.patients (id, status, decay_score)
VALUES
  ('20260214-001', 'active', 0.05),
  ('20260214-002', 'active', 0.08),
  ('20260214-003', 'active', 0.68),
  ('20260214-004', 'active', 0.35),
  ('20260214-005', 'active', 0.42),
  ('20260214-006', 'active', 0.92),
  ('20260214-007', 'active', 0.88),
  ('20260214-008', 'active', 0.28),
  ('20260214-009', 'active', 0.50),
  ('20260214-010', 'active', 0.22),
  ('20260214-011', 'active', 0.55),
  ('20260214-012', 'active', 0.65),
  ('20260214-013', 'active', 0.38),
  ('20260214-014', 'active', 0.45),
  ('20260214-015', 'active', 0.85),
  ('20260214-016', 'active', 0.30),
  ('20260214-017', 'active', 0.48),
  ('20260214-018', 'active', 0.18),
  ('20260214-019', 'active', 0.52),
  ('20260214-020', 'active', 0.25),
  ('20260214-021', 'active', 0.72),
  ('20260214-022', 'active', 0.40),
  ('20260214-023', 'active', 0.33),
  ('20260214-024', 'active', 0.58),
  ('20260214-025', 'active', 0.12),
  ('20260214-026', 'active', 0.60),
  ('20260214-027', 'active', 0.15),
  ('20260214-028', 'active', 0.10)
ON CONFLICT (id) DO UPDATE SET decay_score = EXCLUDED.decay_score;

-- Add questionnaire_response if not present (survey form answers)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS questionnaire_response jsonb;
