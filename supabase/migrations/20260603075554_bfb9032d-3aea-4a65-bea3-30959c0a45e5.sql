CREATE OR REPLACE FUNCTION public.get_stats_publicas_filtradas(_sexo text DEFAULT 'all'::text, _curso text DEFAULT 'all'::text, _evaluacion text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  _sexo_filter sexo_enum;
  _has_sexo boolean := (_sexo IN ('M','F'));
  _cursos text[];
  _has_curso boolean;
  _has_eval boolean := (_evaluacion IS NOT NULL AND _evaluacion <> '' AND _evaluacion <> 'all');
BEGIN
  IF _has_sexo THEN _sexo_filter := _sexo::sexo_enum; END IF;

  IF _curso IS NULL OR _curso = 'all' OR _curso = '' THEN
    _has_curso := false; _cursos := ARRAY[]::text[];
  ELSE
    _cursos := string_to_array(_curso, ',');
    _cursos := ARRAY(SELECT trim(c) FROM unnest(_cursos) c WHERE trim(c) IN ('1ESO','2ESO','3ESO','4ESO'));
    _has_curso := array_length(_cursos, 1) > 0;
  END IF;

  SELECT jsonb_build_object(
    'total_alumnos', (
      SELECT count(DISTINCT a.id) FROM alumnos a
      JOIN grupos g ON g.id = a.grupo_id
      LEFT JOIN evaluaciones ev ON ev.grupo_id = g.id
      WHERE a.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = ANY(_cursos))
        AND (NOT _has_eval OR ev.nombre = _evaluacion)
    ),
    'eurofit', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(p.wells_cm) as wells, stddev(p.wells_cm) as wells_dt,
        avg(p.salto_vertical_cm) as salto, stddev(p.salto_vertical_cm) as salto_dt,
        avg(p.abdominales_60) as abdo, stddev(p.abdominales_60) as abdo_dt,
        avg(p.lanz_hombros_m) as lanz, stddev(p.lanz_hombros_m) as lanz_dt,
        avg(p.sprint_50_seg) as sprint, stddev(p.sprint_50_seg) as sprint_dt,
        avg(p.cooper_m) as cooper, stddev(p.cooper_m) as cooper_dt
      FROM pruebas_eurofit p
      JOIN alumnos a ON a.id = p.alumno_id
      JOIN grupos g ON g.id = a.grupo_id
      LEFT JOIN evaluaciones ev ON ev.id = p.evaluacion_id
      WHERE p.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = ANY(_cursos))
        AND (NOT _has_eval OR ev.nombre = _evaluacion)
    ) t),
    'cfs', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(p.thomas) as thomas, stddev(p.thomas) as thomas_dt,
        avg(p.biering_sorensen_seg) as biering, stddev(p.biering_sorensen_seg) as biering_dt,
        avg(p.sj_cm) as sj, stddev(p.sj_cm) as sj_dt,
        avg(p.cmj_cm) as cmj, stddev(p.cmj_cm) as cmj_dt,
        avg(p.indice_elastico) as indice_elastico, stddev(p.indice_elastico) as indice_elastico_dt,
        avg(p.lanz_med_der_m) as lanz_der, stddev(p.lanz_med_der_m) as lanz_der_dt,
        avg(p.lanz_med_izq_m) as lanz_izq, stddev(p.lanz_med_izq_m) as lanz_izq_dt,
        avg(p.sprint_30_seg) as sprint30, stddev(p.sprint_30_seg) as sprint30_dt,
        avg(p.rockport_vo2) as rockport, stddev(p.rockport_vo2) as rockport_dt
      FROM pruebas_cfs p
      JOIN alumnos a ON a.id = p.alumno_id
      JOIN grupos g ON g.id = a.grupo_id
      LEFT JOIN evaluaciones ev ON ev.id = p.evaluacion_id
      WHERE p.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = ANY(_cursos))
        AND (NOT _has_eval OR ev.nombre = _evaluacion)
    ) t),
    'antropometria', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(a.imc) as imc, stddev(a.imc) as imc_dt,
        avg(a.envergadura_cm) as env, stddev(a.envergadura_cm) as env_dt,
        avg(a.biacromial_cm) as bia, stddev(a.biacromial_cm) as bia_dt,
        avg(a.longitud_pierna_cm) as pierna, stddev(a.longitud_pierna_cm) as pierna_dt
      FROM alumnos a
      JOIN grupos g ON g.id = a.grupo_id
      WHERE a.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = ANY(_cursos))
    ) t),
    'nota_eurofit', (
      SELECT avg(nota_alumno) FROM (
        SELECT a.id,
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
            (CASE WHEN p.cooper_m IS NOT NULL THEN 1 ELSE 0 END), 0)
          AS nota_alumno
        FROM pruebas_eurofit p
        JOIN alumnos a ON a.id = p.alumno_id
        JOIN grupos g ON g.id = a.grupo_id
        LEFT JOIN evaluaciones ev ON ev.id = p.evaluacion_id
        WHERE p.is_demo = true
          AND (NOT _has_sexo OR a.sexo = _sexo_filter)
          AND (NOT _has_curso OR g.curso::text = ANY(_cursos))
          AND (NOT _has_eval OR ev.nombre = _evaluacion)
      ) sub
    ),
    'nota_cfs', (
      SELECT avg(nota_alumno) FROM (
        SELECT a.id,
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
            (CASE WHEN p.rockport_vo2 IS NOT NULL THEN 1 ELSE 0 END), 0)
          AS nota_alumno
        FROM pruebas_cfs p
        JOIN alumnos a ON a.id = p.alumno_id
        JOIN grupos g ON g.id = a.grupo_id
        LEFT JOIN evaluaciones ev ON ev.id = p.evaluacion_id
        WHERE p.is_demo = true
          AND (NOT _has_sexo OR a.sexo = _sexo_filter)
          AND (NOT _has_curso OR g.curso::text = ANY(_cursos))
          AND (NOT _has_eval OR ev.nombre = _evaluacion)
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$function$;