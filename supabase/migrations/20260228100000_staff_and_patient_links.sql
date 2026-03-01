-- Staff join links, patient links, and patients.linked_user_id.
-- Run after multi_org schema and RLS.

-- 1. Add linked_user_id to patients (patient's auth account after activation)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_linked_user_id ON public.patients(linked_user_id);

-- 2. Staff join links (super_admin creates; recipient uses token to sign up)
CREATE TABLE IF NOT EXISTS public.staff_join_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('org_admin', 'org_member')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_staff_join_links_token ON public.staff_join_links(token);
CREATE INDEX IF NOT EXISTS idx_staff_join_links_expires_at ON public.staff_join_links(expires_at);

ALTER TABLE public.staff_join_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_join_links_select_super_admin"
  ON public.staff_join_links FOR SELECT
  USING (public.current_user_role() = 'super_admin');

CREATE POLICY "staff_join_links_insert_super_admin"
  ON public.staff_join_links FOR INSERT
  WITH CHECK (public.current_user_role() = 'super_admin');

-- Edge Function (service role) will UPDATE used_at; no client policy needed for UPDATE.

-- 3. Patient links (staff create for a patient; patient activates then uses until deactivated)
CREATE TABLE IF NOT EXISTS public.patient_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_links_token ON public.patient_links(token);
CREATE INDEX IF NOT EXISTS idx_patient_links_patient_id ON public.patient_links(patient_id);

ALTER TABLE public.patient_links ENABLE ROW LEVEL SECURITY;

-- Staff see links for their org's patients; anon/authenticated need to read by token for activate/survey page
CREATE POLICY "patient_links_select_org"
  ON public.patient_links FOR SELECT
  USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_links.patient_id
      AND p.org_id = public.current_user_org_id()
    )
  );

CREATE POLICY "patient_links_select_own_patient"
  ON public.patient_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_links.patient_id AND p.linked_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_links_insert"
  ON public.patient_links FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('org_admin', 'org_member') AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND p.org_id = public.current_user_org_id()
    ))
  );

CREATE POLICY "patient_links_update"
  ON public.patient_links FOR UPDATE
  USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_links.patient_id
      AND p.org_id = public.current_user_org_id()
    )
  );

-- RPC: fetch one patient_link by token (for public activate/survey page; no anon SELECT on table)
CREATE OR REPLACE FUNCTION public.get_patient_link_by_token(link_token uuid)
RETURNS TABLE (
  id uuid,
  patient_id text,
  expires_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz
) AS $$
  SELECT pl.id, pl.patient_id, pl.expires_at, pl.activated_at, pl.deactivated_at
  FROM public.patient_links pl
  WHERE pl.token = link_token
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_patient_link_by_token(uuid) TO anon, authenticated;
