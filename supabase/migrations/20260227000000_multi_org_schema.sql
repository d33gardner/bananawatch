-- Multi-org schema: organizations, patient_templates, profiles; org_id + contact on patients; FK-safe patient id rename.
-- Run in a single transaction. Run Migration 2 (RLS) after or with Auth.

-- 1. Organizations (code 1-8 chars, alphanumeric)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT organizations_code_format CHECK (
    char_length(code) >= 1 AND char_length(code) <= 8 AND code ~ '^[A-Za-z0-9]+$'
  )
);

-- 2. Patient templates (no org_id; seed from current patients)
CREATE TABLE IF NOT EXISTS public.patient_templates (
  id text PRIMARY KEY,
  status text DEFAULT 'active' CHECK (status IN ('active', 'critical', 'discharged')),
  decay_score float DEFAULT 0.0 CHECK (decay_score >= 0.0 AND decay_score <= 1.0),
  last_scan_date timestamptz,
  questionnaire_response jsonb
);

-- 3. Profiles (user_id = auth.uid(); org_id null for super_admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'org_member')),
  updated_at timestamptz DEFAULT now()
);

-- 4. Add org_id (nullable until backfilled) and contact columns to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- 5. Backfill patient_templates from current patients (id -> demo-001 .. demo-028)
INSERT INTO public.patient_templates (id, status, decay_score, last_scan_date, questionnaire_response)
SELECT
  'demo-' || lpad((row_number() OVER (ORDER BY id))::text, 3, '0'),
  status,
  decay_score,
  last_scan_date,
  questionnaire_response
FROM public.patients
ORDER BY id
ON CONFLICT (id) DO NOTHING;

-- 6. Create default org Demo and set patients.org_id
INSERT INTO public.organizations (id, name, code, created_at)
VALUES (gen_random_uuid(), 'Demo', 'DEMO', now())
ON CONFLICT (code) DO NOTHING;

UPDATE public.patients
SET org_id = (SELECT id FROM public.organizations WHERE code = 'DEMO' LIMIT 1)
WHERE org_id IS NULL;

-- 7. Patient id rename (FK-safe): drop FK, update ids, re-add FK
ALTER TABLE public.scans DROP CONSTRAINT IF EXISTS scans_patient_id_fkey;

UPDATE public.patients SET id = 'DEMO-' || id;
UPDATE public.scans SET patient_id = 'DEMO-' || patient_id;

ALTER TABLE public.scans
  ADD CONSTRAINT scans_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- 8. Enforce org_id NOT NULL on patients
ALTER TABLE public.patients ALTER COLUMN org_id SET NOT NULL;

-- Index for RLS / lookups
CREATE INDEX IF NOT EXISTS idx_patients_org_id ON public.patients(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);

-- Enable RLS on new tables (policies added in Migration 2)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
