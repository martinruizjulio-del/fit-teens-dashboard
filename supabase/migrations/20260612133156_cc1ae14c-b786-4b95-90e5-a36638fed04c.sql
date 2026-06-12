
-- Drop the over-permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated can view centros" ON public.centros;
DROP POLICY IF EXISTS "Public read centros publicos" ON public.centros;

-- Only owners and admins can read the full centros row (including contact info)
CREATE POLICY "Owners or admin can view centros"
ON public.centros
FOR SELECT
TO authenticated
USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Public listing via a safe view that masks sensitive contact details
-- and hides the name when the centro is marked anonimo.
CREATE OR REPLACE VIEW public.centros_publicos
WITH (security_invoker = false) AS
SELECT
  id,
  CASE WHEN anonimo THEN NULL ELSE nombre END AS nombre,
  CASE WHEN anonimo THEN NULL ELSE ciudad END AS ciudad,
  provincia,
  anonimo,
  codigo_anonimo,
  mostrar_publico
FROM public.centros
WHERE mostrar_publico = true;

GRANT SELECT ON public.centros_publicos TO anon, authenticated;
