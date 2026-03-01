-- Staff-only notes on scan images (super_admin, org_admin, org_member only; patients never see).
CREATE TABLE public.scan_staff_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_scan_staff_notes_scan_id ON public.scan_staff_notes(scan_id);

ALTER TABLE public.scan_staff_notes ENABLE ROW LEVEL SECURITY;

-- Staff only: must be super_admin or org_admin/org_member with scan's patient in their org.
CREATE POLICY "scan_staff_notes_select"
  ON public.scan_staff_notes FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('super_admin', 'org_admin', 'org_member')
    AND (
      public.current_user_role() = 'super_admin'
      OR EXISTS (
        SELECT 1 FROM public.scans s
        JOIN public.patients p ON p.id = s.patient_id
        WHERE s.id = scan_staff_notes.scan_id
        AND p.org_id = public.current_user_org_id()
      )
    )
  );

CREATE POLICY "scan_staff_notes_insert"
  ON public.scan_staff_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('super_admin', 'org_admin', 'org_member')
    AND (
      public.current_user_role() = 'super_admin'
      OR EXISTS (
        SELECT 1 FROM public.scans s
        JOIN public.patients p ON p.id = s.patient_id
        WHERE s.id = scan_staff_notes.scan_id
        AND p.org_id = public.current_user_org_id()
      )
    )
  );

CREATE POLICY "scan_staff_notes_update"
  ON public.scan_staff_notes FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('super_admin', 'org_admin', 'org_member')
    AND (
      public.current_user_role() = 'super_admin'
      OR EXISTS (
        SELECT 1 FROM public.scans s
        JOIN public.patients p ON p.id = s.patient_id
        WHERE s.id = scan_staff_notes.scan_id
        AND p.org_id = public.current_user_org_id()
      )
    )
  );

CREATE POLICY "scan_staff_notes_delete"
  ON public.scan_staff_notes FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('super_admin', 'org_admin', 'org_member')
    AND (
      public.current_user_role() = 'super_admin'
      OR EXISTS (
        SELECT 1 FROM public.scans s
        JOIN public.patients p ON p.id = s.patient_id
        WHERE s.id = scan_staff_notes.scan_id
        AND p.org_id = public.current_user_org_id()
      )
    )
  );
