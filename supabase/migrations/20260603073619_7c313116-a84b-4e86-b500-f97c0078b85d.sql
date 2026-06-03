CREATE OR REPLACE FUNCTION public.get_landing_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'profesores', (SELECT count(*) FROM public.user_roles WHERE role = 'teacher'),
    'alumnos',    (SELECT count(*) FROM public.alumnos WHERE is_demo = false)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_public_stats() TO anon, authenticated;