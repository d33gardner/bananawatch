-- Add questionnaire_response to patients (survey form answers)
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS questionnaire_response jsonb;

-- Storage bucket for survey photo uploads (public so we can display image_url in app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-photos',
  'survey-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow anon to upload and read (MVP; restrict later with auth)
CREATE POLICY "Allow anon upload survey-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "Allow anon read survey-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'survey-photos');
