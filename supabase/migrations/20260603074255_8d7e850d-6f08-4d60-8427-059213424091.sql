-- 1. Evaluaciones
CREATE TABLE public.evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL,
  nombre text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  anio_escolar text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluaciones TO authenticated;
GRANT SELECT ON public.evaluaciones TO anon;
GRANT ALL ON public.evaluaciones TO service_role;

ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profesores ven evaluaciones de sus grupos" ON public.evaluaciones
FOR SELECT USING (
  EXISTS (SELECT 1 FROM grupos g WHERE g.id = evaluaciones.grupo_id AND (g.profesor_id = auth.uid() OR is_admin(auth.uid())))
);
CREATE POLICY "Profesores crean evaluaciones en sus grupos" ON public.evaluaciones
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM grupos g WHERE g.id = evaluaciones.grupo_id AND (g.profesor_id = auth.uid() OR is_admin(auth.uid())))
);
CREATE POLICY "Profesores editan evaluaciones de sus grupos" ON public.evaluaciones
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM grupos g WHERE g.id = evaluaciones.grupo_id AND (g.profesor_id = auth.uid() OR is_admin(auth.uid())))
);
CREATE POLICY "Profesores borran evaluaciones de sus grupos" ON public.evaluaciones
FOR DELETE USING (
  EXISTS (SELECT 1 FROM grupos g WHERE g.id = evaluaciones.grupo_id AND (g.profesor_id = auth.uid() OR is_admin(auth.uid())))
);
-- Lectura pública para que la página pública pueda mostrar nombres de evaluación
CREATE POLICY "Lectura publica evaluaciones" ON public.evaluaciones
FOR SELECT TO anon USING (true);

CREATE INDEX idx_evaluaciones_grupo ON public.evaluaciones(grupo_id);

CREATE TRIGGER trg_evaluaciones_updated
BEFORE UPDATE ON public.evaluaciones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Añadir evaluacion_id a pruebas_*
ALTER TABLE public.pruebas_eurofit ADD COLUMN evaluacion_id uuid;
ALTER TABLE public.pruebas_cfs    ADD COLUMN evaluacion_id uuid;

-- 3. Crear 1 evaluación por grupo existente que tenga pruebas, y asignar
DO $$
DECLARE
  g RECORD;
  _eval_id uuid;
BEGIN
  FOR g IN SELECT DISTINCT gr.id, gr.anio_escolar, gr.is_demo
           FROM grupos gr
           WHERE EXISTS (
             SELECT 1 FROM alumnos a
             LEFT JOIN pruebas_eurofit pe ON pe.alumno_id = a.id
             LEFT JOIN pruebas_cfs pc ON pc.alumno_id = a.id
             WHERE a.grupo_id = gr.id AND (pe.id IS NOT NULL OR pc.id IS NOT NULL)
           )
  LOOP
    INSERT INTO evaluaciones (grupo_id, nombre, fecha, anio_escolar, is_demo)
    VALUES (g.id, 'Evaluación inicial', CURRENT_DATE, g.anio_escolar, g.is_demo)
    RETURNING id INTO _eval_id;

    UPDATE pruebas_eurofit pe SET evaluacion_id = _eval_id
    WHERE pe.evaluacion_id IS NULL
      AND pe.alumno_id IN (SELECT id FROM alumnos WHERE grupo_id = g.id);

    UPDATE pruebas_cfs pc SET evaluacion_id = _eval_id
    WHERE pc.evaluacion_id IS NULL
      AND pc.alumno_id IN (SELECT id FROM alumnos WHERE grupo_id = g.id);
  END LOOP;
END $$;

-- 4. NOT NULL + UNIQUE
ALTER TABLE public.pruebas_eurofit ALTER COLUMN evaluacion_id SET NOT NULL;
ALTER TABLE public.pruebas_cfs    ALTER COLUMN evaluacion_id SET NOT NULL;

-- Eliminar posibles unique antiguos sobre alumno_id
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE contype = 'u'
      AND conrelid IN ('public.pruebas_eurofit'::regclass, 'public.pruebas_cfs'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.pruebas_eurofit ADD CONSTRAINT pruebas_eurofit_alumno_eval_uniq UNIQUE (alumno_id, evaluacion_id);
ALTER TABLE public.pruebas_cfs    ADD CONSTRAINT pruebas_cfs_alumno_eval_uniq    UNIQUE (alumno_id, evaluacion_id);

CREATE INDEX idx_pruebas_eurofit_eval ON public.pruebas_eurofit(evaluacion_id);
CREATE INDEX idx_pruebas_cfs_eval    ON public.pruebas_cfs(evaluacion_id);

-- 5. Recrear get_alumno_by_codigo para devolver arrays
CREATE OR REPLACE FUNCTION public.get_alumno_by_codigo(_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'alumno', to_jsonb(a.*) - 'id' - 'grupo_id',
    'evaluaciones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ev.id,
        'nombre', ev.nombre,
        'fecha', ev.fecha,
        'eurofit', (SELECT to_jsonb(e.*) - 'id' - 'alumno_id' - 'evaluacion_id' FROM pruebas_eurofit e WHERE e.alumno_id = a.id AND e.evaluacion_id = ev.id),
        'cfs',     (SELECT to_jsonb(c.*) - 'id' - 'alumno_id' - 'evaluacion_id' FROM pruebas_cfs c    WHERE c.alumno_id = a.id AND c.evaluacion_id = ev.id)
      ) ORDER BY ev.fecha)
      FROM evaluaciones ev
      WHERE ev.grupo_id = a.grupo_id
        AND (EXISTS (SELECT 1 FROM pruebas_eurofit pe WHERE pe.alumno_id = a.id AND pe.evaluacion_id = ev.id)
          OR EXISTS (SELECT 1 FROM pruebas_cfs pc    WHERE pc.alumno_id = a.id AND pc.evaluacion_id = ev.id))
    ), '[]'::jsonb)
  ) INTO result
  FROM alumnos a
  WHERE a.codigo_acceso = upper(_codigo);
  RETURN result;
END;
$function$;