CREATE TABLE public.visitas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ruta text NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.visitas TO anon;
GRANT SELECT, INSERT ON public.visitas TO authenticated;
GRANT ALL ON public.visitas TO service_role;

ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede registrar visita"
  ON public.visitas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Solo admin lee visitas"
  ON public.visitas FOR SELECT
  USING (is_admin(auth.uid()));

CREATE INDEX idx_visitas_created_at ON public.visitas(created_at);

CREATE OR REPLACE FUNCTION public.registrar_visita(_ruta text DEFAULT '/')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.visitas (ruta) VALUES (COALESCE(_ruta, '/'));
$$;

CREATE OR REPLACE FUNCTION public.get_landing_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'profesores', (SELECT count(*) FROM public.user_roles WHERE role = 'teacher'),
    'alumnos',    (SELECT count(*) FROM public.alumnos),
    'visitas',    (SELECT count(*) FROM public.visitas)
  );
$$;