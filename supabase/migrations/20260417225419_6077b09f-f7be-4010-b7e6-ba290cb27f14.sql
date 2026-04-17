CREATE OR REPLACE FUNCTION public.get_stats_publicas_filtradas(_sexo text DEFAULT 'all', _curso text DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  _sexo_filter sexo_enum;
  _has_sexo boolean := (_sexo IN ('M','F'));
  _has_curso boolean := (_curso IN ('1ESO','2ESO','3ESO','4ESO'));
BEGIN
  IF _has_sexo THEN
    _sexo_filter := _sexo::sexo_enum;
  END IF;

  SELECT jsonb_build_object(
    'total_alumnos', (
      SELECT count(*) FROM alumnos a
      JOIN grupos g ON g.id = a.grupo_id
      WHERE a.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = _curso)
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
      WHERE p.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = _curso)
    ) t),
    'cfs', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(p.thomas) as thomas, stddev(p.thomas) as thomas_dt,
        avg(p.biering_sorensen_seg) as biering, stddev(p.biering_sorensen_seg) as biering_dt,
        avg(p.sj_cm) as sj, stddev(p.sj_cm) as sj_dt,
        avg(p.cmj_cm) as cmj, stddev(p.cmj_cm) as cmj_dt,
        avg(p.indice_elastico) as ie, stddev(p.indice_elastico) as ie_dt,
        avg(p.lanz_med_der_m) as lanz_der, stddev(p.lanz_med_der_m) as lanz_der_dt,
        avg(p.sprint_30_seg) as sprint30, stddev(p.sprint_30_seg) as sprint30_dt,
        avg(p.rockport_min + p.rockport_seg/60.0) as rockport, stddev(p.rockport_min + p.rockport_seg/60.0) as rockport_dt
      FROM pruebas_cfs p
      JOIN alumnos a ON a.id = p.alumno_id
      JOIN grupos g ON g.id = a.grupo_id
      WHERE p.is_demo = true
        AND (NOT _has_sexo OR a.sexo = _sexo_filter)
        AND (NOT _has_curso OR g.curso::text = _curso)
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
        AND (NOT _has_curso OR g.curso::text = _curso)
    ) t)
  ) INTO result;
  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_stats_publicas_filtradas(text, text) TO anon, authenticated;