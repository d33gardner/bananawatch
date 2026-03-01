-- Allow linked patients to read their own patient row and their own scans (for portal timeline).
-- Authenticated user with patients.linked_user_id = auth.uid() can SELECT that patient and its scans.

CREATE POLICY "patients_select_linked"
  ON public.patients FOR SELECT
  TO authenticated
  USING (linked_user_id = auth.uid());

CREATE POLICY "scans_select_linked_patient"
  ON public.scans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scans.patient_id AND p.linked_user_id = auth.uid()
    )
  );
