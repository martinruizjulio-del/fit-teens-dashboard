
ALTER TABLE public.procedimientos ADD COLUMN IF NOT EXISTS imagen_url TEXT;

CREATE POLICY "Public read procedimientos images"
ON storage.objects FOR SELECT
USING (bucket_id = 'procedimientos');

CREATE POLICY "Admin upload procedimientos images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'procedimientos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin update procedimientos images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'procedimientos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin delete procedimientos images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'procedimientos' AND public.is_admin(auth.uid()));
