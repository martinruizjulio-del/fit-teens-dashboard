-- Make admin-only SELECT intent explicit on solicitudes_implantacion
CREATE POLICY "Only admins can view solicitudes"
  ON public.solicitudes_implantacion
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));