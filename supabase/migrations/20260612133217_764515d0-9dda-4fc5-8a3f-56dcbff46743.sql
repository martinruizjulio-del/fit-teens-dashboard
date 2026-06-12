
DROP VIEW IF EXISTS public.centros_publicos;

CREATE OR REPLACE FUNCTION public.get_centros_publicos()
RETURNS TABLE (
  id uuid,
  nombre text,
  ciudad text,
  provincia text,
  anonimo boolean,
  codigo_anonimo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    CASE WHEN c.anonimo THEN NULL ELSE c.nombre END,
    CASE WHEN c.anonimo THEN NULL ELSE c.ciudad END,
    c.provincia,
    c.anonimo,
    c.codigo_anonimo
  FROM public.centros c
  WHERE c.mostrar_publico = true
  ORDER BY c.provincia, c.nombre;
$$;

GRANT EXECUTE ON FUNCTION public.get_centros_publicos() TO anon, authenticated;
