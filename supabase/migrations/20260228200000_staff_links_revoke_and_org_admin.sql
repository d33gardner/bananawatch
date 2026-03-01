-- Staff join links: revoked_at + org_admin RLS. Patient links: DELETE for org.

-- 1. Add revoked_at to staff_join_links
ALTER TABLE public.staff_join_links
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- 2. RLS for super_admin UPDATE (revoke) and org_admin on staff_join_links
CREATE POLICY "staff_join_links_update_super_admin"
  ON public.staff_join_links FOR UPDATE
  USING (public.current_user_role() = 'super_admin');

CREATE POLICY "staff_join_links_select_org_admin"
  ON public.staff_join_links FOR SELECT
  USING (
    public.current_user_role() = 'org_admin'
    AND org_id = public.current_user_org_id()
  );

CREATE POLICY "staff_join_links_insert_org_admin"
  ON public.staff_join_links FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'org_admin'
    AND org_id = public.current_user_org_id()
  );

CREATE POLICY "staff_join_links_update_org_admin"
  ON public.staff_join_links FOR UPDATE
  USING (
    public.current_user_role() = 'org_admin'
    AND org_id = public.current_user_org_id()
  );

CREATE POLICY "staff_join_links_delete_super_admin"
  ON public.staff_join_links FOR DELETE
  USING (public.current_user_role() = 'super_admin');

CREATE POLICY "staff_join_links_delete_org_admin"
  ON public.staff_join_links FOR DELETE
  USING (
    public.current_user_role() = 'org_admin'
    AND org_id = public.current_user_org_id()
  );

-- 3. patient_links: DELETE for org_admin and org_member (their org's links only)
CREATE POLICY "patient_links_delete_org"
  ON public.patient_links FOR DELETE
  USING (
    public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() IN ('org_admin', 'org_member')
      AND EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_links.patient_id
        AND p.org_id = public.current_user_org_id()
      )
    )
  );
