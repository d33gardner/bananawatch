-- Multi-org RLS: drop permissive policies; add org-scoped policies + anon policies for Survey Option A.
-- Run after or with Auth so dashboard/add-patient work for logged-in users.

-- Helper: current user's org_id (null for super_admin)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- Drop existing permissive policies on patients and scans
DROP POLICY IF EXISTS "Allow public read patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public insert patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public update patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public read scans" ON public.scans;
DROP POLICY IF EXISTS "Allow public insert scans" ON public.scans;
DROP POLICY IF EXISTS "Allow public update scans" ON public.scans;
DROP POLICY IF EXISTS "Allow public delete scans" ON public.scans;

-- --- organizations ---
CREATE POLICY "orgs_select"
  ON public.organizations FOR SELECT
  USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_org_id() IS NOT NULL AND id = public.current_user_org_id())
  );
CREATE POLICY "orgs_insert_update_delete"
  ON public.organizations FOR ALL
  USING (public.current_user_role() = 'super_admin');

-- --- patients (org-scoped for authenticated; anon for survey Option A) ---
CREATE POLICY "patients_select_org"
  ON public.patients FOR SELECT
  USING (
    public.current_user_role() = 'super_admin'
    OR (org_id = public.current_user_org_id())
  );
CREATE POLICY "patients_select_anon"
  ON public.patients FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "patients_insert"
  ON public.patients FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (org_id = public.current_user_org_id() AND public.current_user_role() IN ('org_admin', 'org_member'))
  );
CREATE POLICY "patients_update_org"
  ON public.patients FOR UPDATE
  USING (
    public.current_user_role() = 'super_admin'
    OR (org_id = public.current_user_org_id() AND public.current_user_role() IN ('org_admin', 'org_member'))
  );
CREATE POLICY "patients_update_anon"
  ON public.patients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "patients_delete"
  ON public.patients FOR DELETE
  USING (
    public.current_user_role() = 'super_admin'
    OR (org_id = public.current_user_org_id() AND public.current_user_role() IN ('org_admin', 'org_member'))
  );

-- --- scans (via patient org; anon insert for survey) ---
CREATE POLICY "scans_select"
  ON public.scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scans.patient_id
      AND (p.org_id = public.current_user_org_id() OR public.current_user_role() = 'super_admin')
    )
  );
CREATE POLICY "scans_select_anon"
  ON public.scans FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "scans_insert"
  ON public.scans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scans.patient_id
      AND (p.org_id = public.current_user_org_id() OR public.current_user_role() = 'super_admin')
    )
  );
CREATE POLICY "scans_insert_anon"
  ON public.scans FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "scans_update"
  ON public.scans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scans.patient_id
      AND (p.org_id = public.current_user_org_id() OR public.current_user_role() = 'super_admin')
    )
  );
CREATE POLICY "scans_delete"
  ON public.scans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scans.patient_id
      AND (p.org_id = public.current_user_org_id() OR public.current_user_role() = 'super_admin')
    )
  );

-- --- patient_templates (all authenticated can read; super_admin can write) ---
CREATE POLICY "templates_select"
  ON public.patient_templates FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "templates_select_anon"
  ON public.patient_templates FOR SELECT
  TO anon
  USING (true);
CREATE POLICY "templates_insert_update_delete"
  ON public.patient_templates FOR ALL
  USING (public.current_user_role() = 'super_admin');

-- --- profiles (users read own; super_admin read all) ---
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "profiles_select_super_admin"
  ON public.profiles FOR SELECT
  USING (public.current_user_role() = 'super_admin');
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);
