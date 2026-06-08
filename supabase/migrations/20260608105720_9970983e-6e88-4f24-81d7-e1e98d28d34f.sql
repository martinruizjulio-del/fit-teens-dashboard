
-- centros: restrict authenticated SELECT
DROP POLICY IF EXISTS "Authenticated can view centros" ON public.centros;
CREATE POLICY "Authenticated can view centros"
ON public.centros FOR SELECT
TO authenticated
USING (
  mostrar_publico = true
  OR auth.uid() = created_by
  OR public.is_admin(auth.uid())
);

-- evaluaciones: drop anon SELECT
DROP POLICY IF EXISTS "Lectura publica evaluaciones" ON public.evaluaciones;
