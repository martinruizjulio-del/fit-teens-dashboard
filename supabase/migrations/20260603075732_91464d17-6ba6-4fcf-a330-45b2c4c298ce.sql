CREATE OR REPLACE FUNCTION public.get_notas_por_curso_sexo(_evaluacion text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  _has_eval boolean := (_evaluacion IS NOT NULL AND _evaluacion <> '' AND _evaluacion <> 'all');
BEGIN
  WITH eurofit_notas AS (
    SELECT g.curso::text AS curso, a.sexo::text AS sexo,
      (
        COALESCE(calcular_nota('eurofit','wells',          a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.wells_cm),0) +
        COALESCE(calcular_nota('eurofit','salto_vertical', a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.salto_vertical_cm),0) +
        COALESCE(calcular_nota('eurofit','abdominales_60', a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.abdominales_60),0) +
        COALESCE(calcular_nota('eurofit','lanz_hombros',   a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.lanz_hombros_m),0) +
        COALESCE(calcular_nota('eurofit','sprint_50',      a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.sprint_50_seg),0) +
        COALESCE(calcular_nota('eurofit','cooper',         a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.cooper_m),0)
      )::numeric / NULLIF(
        (CASE WHEN p.wells_cm IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.salto_vertical_cm IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.abdominales_60 IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.lanz_hombros_m IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.sprint_50_seg IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.cooper_m IS NOT NULL THEN 1 ELSE 0 END), 0) AS nota
    FROM pruebas_eurofit p
    JOIN alumnos a ON a.id = p.alumno_id
    JOIN grupos g ON g.id = a.grupo_id
    LEFT JOIN evaluaciones ev ON ev.id = p.evaluacion_id
    WHERE p.is_demo = true
      AND (NOT _has_eval OR ev.nombre = _evaluacion)
  ),
  cfs_notas AS (
    SELECT g.curso::text AS curso, a.sexo::text AS sexo,
      (
        COALESCE(calcular_nota('cfs','thomas',           a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.thomas),0) +
        COALESCE(calcular_nota('cfs','biering_sorensen', a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.biering_sorensen_seg),0) +
        COALESCE(calcular_nota('cfs','sj',               a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.sj_cm),0) +
        COALESCE(calcular_nota('cfs','cmj',              a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.cmj_cm),0) +
        COALESCE(calcular_nota('cfs','lanz_med_der',     a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.lanz_med_der_m),0) +
        COALESCE(calcular_nota('cfs','lanz_med_izq',     a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.lanz_med_izq_m),0) +
        COALESCE(calcular_nota('cfs','sprint_30',        a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.sprint_30_seg),0) +
        COALESCE(calcular_nota('cfs','rockport',         a.sexo, EXTRACT(YEAR FROM age(a.fecha_nacimiento))::int, p.rockport_vo2),0)
      )::numeric / NULLIF(
        (CASE WHEN p.thomas IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.biering_sorensen_seg IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.sj_cm IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.cmj_cm IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.lanz_med_der_m IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.lanz_med_izq_m IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.sprint_30_seg IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN p.rockport_vo2 IS NOT NULL THEN 1 ELSE 0 END), 0) AS nota
    FROM pruebas_cfs p
    JOIN alumnos a ON a.id = p.alumno_id
    JOIN grupos g ON g.id = a.grupo_id
    LEFT JOIN evaluaciones ev ON ev.id = p.evaluacion_id
    WHERE p.is_demo = true
      AND (NOT _has_eval OR ev.nombre = _evaluacion)
  )
  SELECT jsonb_build_object(
    'por_curso', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('curso', curso, 'eurofit', eurofit, 'cfs', cfs) ORDER BY curso), '[]'::jsonb)
      FROM (
        SELECT COALESCE(e.curso, c.curso) AS curso,
               round(avg(e.nota)::numeric, 2) AS eurofit,
               round(avg(c.nota)::numeric, 2) AS cfs
        FROM (SELECT curso, avg(nota) AS nota FROM eurofit_notas GROUP BY curso) e
        FULL OUTER JOIN (SELECT curso, avg(nota) AS nota FROM cfs_notas GROUP BY curso) c USING (curso)
        GROUP BY COALESCE(e.curso, c.curso)
      ) s
    ),
    'por_sexo', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('sexo', sexo, 'eurofit', eurofit, 'cfs', cfs) ORDER BY sexo), '[]'::jsonb)
      FROM (
        SELECT COALESCE(e.sexo, c.sexo) AS sexo,
               round(avg(e.nota)::numeric, 2) AS eurofit,
               round(avg(c.nota)::numeric, 2) AS cfs
        FROM (SELECT sexo, avg(nota) AS nota FROM eurofit_notas GROUP BY sexo) e
        FULL OUTER JOIN (SELECT sexo, avg(nota) AS nota FROM cfs_notas GROUP BY sexo) c USING (sexo)
        GROUP BY COALESCE(e.sexo, c.sexo)
      ) s
    )
  ) INTO result;
  RETURN result;
END;
$function$;