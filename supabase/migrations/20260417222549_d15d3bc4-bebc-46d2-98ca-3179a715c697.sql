
-- ============================================
-- 1. FUNCIÓN: calcular_nota
-- ============================================
CREATE OR REPLACE FUNCTION public.calcular_nota(
  _bateria text,
  _prueba text,
  _sexo sexo_enum,
  _edad int,
  _valor numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nota numeric;
  _higher_better boolean;
BEGIN
  IF _valor IS NULL THEN RETURN NULL; END IF;

  SELECT higher_better INTO _higher_better
  FROM baremos
  WHERE bateria = _bateria AND prueba = _prueba AND sexo = _sexo
    AND _edad BETWEEN edad_min AND edad_max
  LIMIT 1;

  IF _higher_better IS NULL THEN RETURN NULL; END IF;

  IF _higher_better THEN
    -- Mayor valor = mejor nota
    SELECT nota INTO _nota
    FROM baremos
    WHERE bateria = _bateria AND prueba = _prueba AND sexo = _sexo
      AND _edad BETWEEN edad_min AND edad_max
      AND _valor >= COALESCE(valor_min, -1e9)
    ORDER BY nota DESC
    LIMIT 1;
  ELSE
    -- Menor valor = mejor nota (sprints, thomas)
    SELECT nota INTO _nota
    FROM baremos
    WHERE bateria = _bateria AND prueba = _prueba AND sexo = _sexo
      AND _edad BETWEEN edad_min AND edad_max
      AND _valor <= COALESCE(valor_max, 1e9)
    ORDER BY nota DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(_nota, 1);
END;
$$;

-- ============================================
-- 2. TRIGGER: índice elástico CFS
-- ============================================
CREATE OR REPLACE FUNCTION public.calc_indice_elastico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sj_cm IS NOT NULL AND NEW.cmj_cm IS NOT NULL AND NEW.sj_cm > 0 THEN
    NEW.indice_elastico = ROUND(((NEW.cmj_cm - NEW.sj_cm) / NEW.sj_cm * 100)::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_indice_elastico ON public.pruebas_cfs;
CREATE TRIGGER trg_indice_elastico
BEFORE INSERT OR UPDATE ON public.pruebas_cfs
FOR EACH ROW EXECUTE FUNCTION public.calc_indice_elastico();

-- ============================================
-- 3. SEED BAREMOS (provisionales)
-- Eurofit (Council of Europe, 1988) + ALPHA-Fitness (Ruiz et al., 2011)
-- Estructura: nota 1-10, valor_min para higher_better=true, valor_max para higher_better=false
-- Edades: 12-13, 14, 15, 16-18
-- ============================================

-- Limpiamos baremos previos para evitar duplicados al reaplicar
DELETE FROM public.baremos;

-- Helper inline: insertaremos por bloques

-- ===== EUROFIT =====

-- WELLS (cm) - higher_better. Valores típicos adolescentes españoles.
-- Masculino
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','wells','M',12,13,1,NULL,true),('eurofit','wells','M',12,13,2,5,true),('eurofit','wells','M',12,13,3,10,true),('eurofit','wells','M',12,13,4,14,true),('eurofit','wells','M',12,13,5,18,true),('eurofit','wells','M',12,13,6,22,true),('eurofit','wells','M',12,13,7,26,true),('eurofit','wells','M',12,13,8,30,true),('eurofit','wells','M',12,13,9,34,true),('eurofit','wells','M',12,13,10,38,true),
('eurofit','wells','M',14,14,1,NULL,true),('eurofit','wells','M',14,14,2,6,true),('eurofit','wells','M',14,14,3,11,true),('eurofit','wells','M',14,14,4,15,true),('eurofit','wells','M',14,14,5,19,true),('eurofit','wells','M',14,14,6,23,true),('eurofit','wells','M',14,14,7,27,true),('eurofit','wells','M',14,14,8,31,true),('eurofit','wells','M',14,14,9,35,true),('eurofit','wells','M',14,14,10,39,true),
('eurofit','wells','M',15,15,1,NULL,true),('eurofit','wells','M',15,15,2,7,true),('eurofit','wells','M',15,15,3,12,true),('eurofit','wells','M',15,15,4,16,true),('eurofit','wells','M',15,15,5,20,true),('eurofit','wells','M',15,15,6,24,true),('eurofit','wells','M',15,15,7,28,true),('eurofit','wells','M',15,15,8,32,true),('eurofit','wells','M',15,15,9,36,true),('eurofit','wells','M',15,15,10,40,true),
('eurofit','wells','M',16,18,1,NULL,true),('eurofit','wells','M',16,18,2,8,true),('eurofit','wells','M',16,18,3,13,true),('eurofit','wells','M',16,18,4,17,true),('eurofit','wells','M',16,18,5,21,true),('eurofit','wells','M',16,18,6,25,true),('eurofit','wells','M',16,18,7,29,true),('eurofit','wells','M',16,18,8,33,true),('eurofit','wells','M',16,18,9,37,true),('eurofit','wells','M',16,18,10,41,true);
-- Femenino (más flexibilidad típicamente)
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','wells','F',12,13,1,NULL,true),('eurofit','wells','F',12,13,2,8,true),('eurofit','wells','F',12,13,3,13,true),('eurofit','wells','F',12,13,4,17,true),('eurofit','wells','F',12,13,5,21,true),('eurofit','wells','F',12,13,6,25,true),('eurofit','wells','F',12,13,7,29,true),('eurofit','wells','F',12,13,8,33,true),('eurofit','wells','F',12,13,9,37,true),('eurofit','wells','F',12,13,10,41,true),
('eurofit','wells','F',14,14,1,NULL,true),('eurofit','wells','F',14,14,2,9,true),('eurofit','wells','F',14,14,3,14,true),('eurofit','wells','F',14,14,4,18,true),('eurofit','wells','F',14,14,5,22,true),('eurofit','wells','F',14,14,6,26,true),('eurofit','wells','F',14,14,7,30,true),('eurofit','wells','F',14,14,8,34,true),('eurofit','wells','F',14,14,9,38,true),('eurofit','wells','F',14,14,10,42,true),
('eurofit','wells','F',15,15,1,NULL,true),('eurofit','wells','F',15,15,2,10,true),('eurofit','wells','F',15,15,3,15,true),('eurofit','wells','F',15,15,4,19,true),('eurofit','wells','F',15,15,5,23,true),('eurofit','wells','F',15,15,6,27,true),('eurofit','wells','F',15,15,7,31,true),('eurofit','wells','F',15,15,8,35,true),('eurofit','wells','F',15,15,9,39,true),('eurofit','wells','F',15,15,10,43,true),
('eurofit','wells','F',16,18,1,NULL,true),('eurofit','wells','F',16,18,2,11,true),('eurofit','wells','F',16,18,3,16,true),('eurofit','wells','F',16,18,4,20,true),('eurofit','wells','F',16,18,5,24,true),('eurofit','wells','F',16,18,6,28,true),('eurofit','wells','F',16,18,7,32,true),('eurofit','wells','F',16,18,8,36,true),('eurofit','wells','F',16,18,9,40,true),('eurofit','wells','F',16,18,10,44,true);

-- SALTO VERTICAL (cm) - higher_better
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','salto_vertical','M',12,13,1,NULL,true),('eurofit','salto_vertical','M',12,13,2,15,true),('eurofit','salto_vertical','M',12,13,3,19,true),('eurofit','salto_vertical','M',12,13,4,22,true),('eurofit','salto_vertical','M',12,13,5,25,true),('eurofit','salto_vertical','M',12,13,6,28,true),('eurofit','salto_vertical','M',12,13,7,31,true),('eurofit','salto_vertical','M',12,13,8,34,true),('eurofit','salto_vertical','M',12,13,9,38,true),('eurofit','salto_vertical','M',12,13,10,42,true),
('eurofit','salto_vertical','M',14,14,1,NULL,true),('eurofit','salto_vertical','M',14,14,2,18,true),('eurofit','salto_vertical','M',14,14,3,22,true),('eurofit','salto_vertical','M',14,14,4,25,true),('eurofit','salto_vertical','M',14,14,5,28,true),('eurofit','salto_vertical','M',14,14,6,31,true),('eurofit','salto_vertical','M',14,14,7,34,true),('eurofit','salto_vertical','M',14,14,8,38,true),('eurofit','salto_vertical','M',14,14,9,42,true),('eurofit','salto_vertical','M',14,14,10,46,true),
('eurofit','salto_vertical','M',15,15,1,NULL,true),('eurofit','salto_vertical','M',15,15,2,21,true),('eurofit','salto_vertical','M',15,15,3,25,true),('eurofit','salto_vertical','M',15,15,4,28,true),('eurofit','salto_vertical','M',15,15,5,31,true),('eurofit','salto_vertical','M',15,15,6,34,true),('eurofit','salto_vertical','M',15,15,7,38,true),('eurofit','salto_vertical','M',15,15,8,42,true),('eurofit','salto_vertical','M',15,15,9,46,true),('eurofit','salto_vertical','M',15,15,10,50,true),
('eurofit','salto_vertical','M',16,18,1,NULL,true),('eurofit','salto_vertical','M',16,18,2,24,true),('eurofit','salto_vertical','M',16,18,3,28,true),('eurofit','salto_vertical','M',16,18,4,31,true),('eurofit','salto_vertical','M',16,18,5,34,true),('eurofit','salto_vertical','M',16,18,6,38,true),('eurofit','salto_vertical','M',16,18,7,42,true),('eurofit','salto_vertical','M',16,18,8,46,true),('eurofit','salto_vertical','M',16,18,9,50,true),('eurofit','salto_vertical','M',16,18,10,55,true);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','salto_vertical','F',12,13,1,NULL,true),('eurofit','salto_vertical','F',12,13,2,12,true),('eurofit','salto_vertical','F',12,13,3,15,true),('eurofit','salto_vertical','F',12,13,4,18,true),('eurofit','salto_vertical','F',12,13,5,20,true),('eurofit','salto_vertical','F',12,13,6,23,true),('eurofit','salto_vertical','F',12,13,7,26,true),('eurofit','salto_vertical','F',12,13,8,29,true),('eurofit','salto_vertical','F',12,13,9,32,true),('eurofit','salto_vertical','F',12,13,10,36,true),
('eurofit','salto_vertical','F',14,14,1,NULL,true),('eurofit','salto_vertical','F',14,14,2,13,true),('eurofit','salto_vertical','F',14,14,3,16,true),('eurofit','salto_vertical','F',14,14,4,19,true),('eurofit','salto_vertical','F',14,14,5,22,true),('eurofit','salto_vertical','F',14,14,6,25,true),('eurofit','salto_vertical','F',14,14,7,28,true),('eurofit','salto_vertical','F',14,14,8,31,true),('eurofit','salto_vertical','F',14,14,9,34,true),('eurofit','salto_vertical','F',14,14,10,38,true),
('eurofit','salto_vertical','F',15,15,1,NULL,true),('eurofit','salto_vertical','F',15,15,2,14,true),('eurofit','salto_vertical','F',15,15,3,17,true),('eurofit','salto_vertical','F',15,15,4,20,true),('eurofit','salto_vertical','F',15,15,5,23,true),('eurofit','salto_vertical','F',15,15,6,26,true),('eurofit','salto_vertical','F',15,15,7,29,true),('eurofit','salto_vertical','F',15,15,8,32,true),('eurofit','salto_vertical','F',15,15,9,36,true),('eurofit','salto_vertical','F',15,15,10,40,true),
('eurofit','salto_vertical','F',16,18,1,NULL,true),('eurofit','salto_vertical','F',16,18,2,15,true),('eurofit','salto_vertical','F',16,18,3,18,true),('eurofit','salto_vertical','F',16,18,4,21,true),('eurofit','salto_vertical','F',16,18,5,24,true),('eurofit','salto_vertical','F',16,18,6,27,true),('eurofit','salto_vertical','F',16,18,7,30,true),('eurofit','salto_vertical','F',16,18,8,33,true),('eurofit','salto_vertical','F',16,18,9,37,true),('eurofit','salto_vertical','F',16,18,10,41,true);

-- ABDOMINALES 60s (n) - higher_better
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','abdominales_60','M',12,13,1,NULL,true),('eurofit','abdominales_60','M',12,13,2,12,true),('eurofit','abdominales_60','M',12,13,3,16,true),('eurofit','abdominales_60','M',12,13,4,20,true),('eurofit','abdominales_60','M',12,13,5,23,true),('eurofit','abdominales_60','M',12,13,6,26,true),('eurofit','abdominales_60','M',12,13,7,29,true),('eurofit','abdominales_60','M',12,13,8,32,true),('eurofit','abdominales_60','M',12,13,9,36,true),('eurofit','abdominales_60','M',12,13,10,40,true),
('eurofit','abdominales_60','M',14,14,1,NULL,true),('eurofit','abdominales_60','M',14,14,2,14,true),('eurofit','abdominales_60','M',14,14,3,18,true),('eurofit','abdominales_60','M',14,14,4,22,true),('eurofit','abdominales_60','M',14,14,5,25,true),('eurofit','abdominales_60','M',14,14,6,28,true),('eurofit','abdominales_60','M',14,14,7,31,true),('eurofit','abdominales_60','M',14,14,8,35,true),('eurofit','abdominales_60','M',14,14,9,39,true),('eurofit','abdominales_60','M',14,14,10,43,true),
('eurofit','abdominales_60','M',15,15,1,NULL,true),('eurofit','abdominales_60','M',15,15,2,16,true),('eurofit','abdominales_60','M',15,15,3,20,true),('eurofit','abdominales_60','M',15,15,4,24,true),('eurofit','abdominales_60','M',15,15,5,27,true),('eurofit','abdominales_60','M',15,15,6,30,true),('eurofit','abdominales_60','M',15,15,7,33,true),('eurofit','abdominales_60','M',15,15,8,37,true),('eurofit','abdominales_60','M',15,15,9,41,true),('eurofit','abdominales_60','M',15,15,10,45,true),
('eurofit','abdominales_60','M',16,18,1,NULL,true),('eurofit','abdominales_60','M',16,18,2,18,true),('eurofit','abdominales_60','M',16,18,3,22,true),('eurofit','abdominales_60','M',16,18,4,26,true),('eurofit','abdominales_60','M',16,18,5,29,true),('eurofit','abdominales_60','M',16,18,6,32,true),('eurofit','abdominales_60','M',16,18,7,35,true),('eurofit','abdominales_60','M',16,18,8,39,true),('eurofit','abdominales_60','M',16,18,9,43,true),('eurofit','abdominales_60','M',16,18,10,48,true);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','abdominales_60','F',12,13,1,NULL,true),('eurofit','abdominales_60','F',12,13,2,10,true),('eurofit','abdominales_60','F',12,13,3,13,true),('eurofit','abdominales_60','F',12,13,4,16,true),('eurofit','abdominales_60','F',12,13,5,19,true),('eurofit','abdominales_60','F',12,13,6,22,true),('eurofit','abdominales_60','F',12,13,7,25,true),('eurofit','abdominales_60','F',12,13,8,28,true),('eurofit','abdominales_60','F',12,13,9,31,true),('eurofit','abdominales_60','F',12,13,10,35,true),
('eurofit','abdominales_60','F',14,14,1,NULL,true),('eurofit','abdominales_60','F',14,14,2,11,true),('eurofit','abdominales_60','F',14,14,3,14,true),('eurofit','abdominales_60','F',14,14,4,17,true),('eurofit','abdominales_60','F',14,14,5,20,true),('eurofit','abdominales_60','F',14,14,6,23,true),('eurofit','abdominales_60','F',14,14,7,26,true),('eurofit','abdominales_60','F',14,14,8,29,true),('eurofit','abdominales_60','F',14,14,9,33,true),('eurofit','abdominales_60','F',14,14,10,37,true),
('eurofit','abdominales_60','F',15,15,1,NULL,true),('eurofit','abdominales_60','F',15,15,2,12,true),('eurofit','abdominales_60','F',15,15,3,15,true),('eurofit','abdominales_60','F',15,15,4,18,true),('eurofit','abdominales_60','F',15,15,5,21,true),('eurofit','abdominales_60','F',15,15,6,24,true),('eurofit','abdominales_60','F',15,15,7,27,true),('eurofit','abdominales_60','F',15,15,8,30,true),('eurofit','abdominales_60','F',15,15,9,34,true),('eurofit','abdominales_60','F',15,15,10,38,true),
('eurofit','abdominales_60','F',16,18,1,NULL,true),('eurofit','abdominales_60','F',16,18,2,13,true),('eurofit','abdominales_60','F',16,18,3,16,true),('eurofit','abdominales_60','F',16,18,4,19,true),('eurofit','abdominales_60','F',16,18,5,22,true),('eurofit','abdominales_60','F',16,18,6,25,true),('eurofit','abdominales_60','F',16,18,7,28,true),('eurofit','abdominales_60','F',16,18,8,31,true),('eurofit','abdominales_60','F',16,18,9,35,true),('eurofit','abdominales_60','F',16,18,10,39,true);

-- LANZ HOMBROS (m) Eurofit - higher_better
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','lanz_hombros','M',12,13,1,NULL,true),('eurofit','lanz_hombros','M',12,13,2,3.0,true),('eurofit','lanz_hombros','M',12,13,3,3.8,true),('eurofit','lanz_hombros','M',12,13,4,4.5,true),('eurofit','lanz_hombros','M',12,13,5,5.2,true),('eurofit','lanz_hombros','M',12,13,6,5.9,true),('eurofit','lanz_hombros','M',12,13,7,6.6,true),('eurofit','lanz_hombros','M',12,13,8,7.4,true),('eurofit','lanz_hombros','M',12,13,9,8.2,true),('eurofit','lanz_hombros','M',12,13,10,9.0,true),
('eurofit','lanz_hombros','M',14,14,1,NULL,true),('eurofit','lanz_hombros','M',14,14,2,3.8,true),('eurofit','lanz_hombros','M',14,14,3,4.6,true),('eurofit','lanz_hombros','M',14,14,4,5.3,true),('eurofit','lanz_hombros','M',14,14,5,6.0,true),('eurofit','lanz_hombros','M',14,14,6,6.7,true),('eurofit','lanz_hombros','M',14,14,7,7.5,true),('eurofit','lanz_hombros','M',14,14,8,8.3,true),('eurofit','lanz_hombros','M',14,14,9,9.2,true),('eurofit','lanz_hombros','M',14,14,10,10.0,true),
('eurofit','lanz_hombros','M',15,15,1,NULL,true),('eurofit','lanz_hombros','M',15,15,2,4.5,true),('eurofit','lanz_hombros','M',15,15,3,5.3,true),('eurofit','lanz_hombros','M',15,15,4,6.0,true),('eurofit','lanz_hombros','M',15,15,5,6.7,true),('eurofit','lanz_hombros','M',15,15,6,7.5,true),('eurofit','lanz_hombros','M',15,15,7,8.3,true),('eurofit','lanz_hombros','M',15,15,8,9.1,true),('eurofit','lanz_hombros','M',15,15,9,10.0,true),('eurofit','lanz_hombros','M',15,15,10,11.0,true),
('eurofit','lanz_hombros','M',16,18,1,NULL,true),('eurofit','lanz_hombros','M',16,18,2,5.0,true),('eurofit','lanz_hombros','M',16,18,3,5.9,true),('eurofit','lanz_hombros','M',16,18,4,6.7,true),('eurofit','lanz_hombros','M',16,18,5,7.5,true),('eurofit','lanz_hombros','M',16,18,6,8.3,true),('eurofit','lanz_hombros','M',16,18,7,9.1,true),('eurofit','lanz_hombros','M',16,18,8,10.0,true),('eurofit','lanz_hombros','M',16,18,9,11.0,true),('eurofit','lanz_hombros','M',16,18,10,12.0,true);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','lanz_hombros','F',12,13,1,NULL,true),('eurofit','lanz_hombros','F',12,13,2,2.2,true),('eurofit','lanz_hombros','F',12,13,3,2.8,true),('eurofit','lanz_hombros','F',12,13,4,3.4,true),('eurofit','lanz_hombros','F',12,13,5,4.0,true),('eurofit','lanz_hombros','F',12,13,6,4.6,true),('eurofit','lanz_hombros','F',12,13,7,5.2,true),('eurofit','lanz_hombros','F',12,13,8,5.9,true),('eurofit','lanz_hombros','F',12,13,9,6.6,true),('eurofit','lanz_hombros','F',12,13,10,7.3,true),
('eurofit','lanz_hombros','F',14,14,1,NULL,true),('eurofit','lanz_hombros','F',14,14,2,2.6,true),('eurofit','lanz_hombros','F',14,14,3,3.2,true),('eurofit','lanz_hombros','F',14,14,4,3.8,true),('eurofit','lanz_hombros','F',14,14,5,4.4,true),('eurofit','lanz_hombros','F',14,14,6,5.0,true),('eurofit','lanz_hombros','F',14,14,7,5.7,true),('eurofit','lanz_hombros','F',14,14,8,6.4,true),('eurofit','lanz_hombros','F',14,14,9,7.2,true),('eurofit','lanz_hombros','F',14,14,10,8.0,true),
('eurofit','lanz_hombros','F',15,15,1,NULL,true),('eurofit','lanz_hombros','F',15,15,2,2.9,true),('eurofit','lanz_hombros','F',15,15,3,3.5,true),('eurofit','lanz_hombros','F',15,15,4,4.1,true),('eurofit','lanz_hombros','F',15,15,5,4.7,true),('eurofit','lanz_hombros','F',15,15,6,5.4,true),('eurofit','lanz_hombros','F',15,15,7,6.1,true),('eurofit','lanz_hombros','F',15,15,8,6.8,true),('eurofit','lanz_hombros','F',15,15,9,7.6,true),('eurofit','lanz_hombros','F',15,15,10,8.5,true),
('eurofit','lanz_hombros','F',16,18,1,NULL,true),('eurofit','lanz_hombros','F',16,18,2,3.1,true),('eurofit','lanz_hombros','F',16,18,3,3.7,true),('eurofit','lanz_hombros','F',16,18,4,4.3,true),('eurofit','lanz_hombros','F',16,18,5,5.0,true),('eurofit','lanz_hombros','F',16,18,6,5.7,true),('eurofit','lanz_hombros','F',16,18,7,6.4,true),('eurofit','lanz_hombros','F',16,18,8,7.2,true),('eurofit','lanz_hombros','F',16,18,9,8.0,true),('eurofit','lanz_hombros','F',16,18,10,9.0,true);

-- SPRINT 50m (seg) - lower_better
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_max, higher_better) VALUES
('eurofit','sprint_50','M',12,13,10,7.5,false),('eurofit','sprint_50','M',12,13,9,7.8,false),('eurofit','sprint_50','M',12,13,8,8.1,false),('eurofit','sprint_50','M',12,13,7,8.4,false),('eurofit','sprint_50','M',12,13,6,8.7,false),('eurofit','sprint_50','M',12,13,5,9.0,false),('eurofit','sprint_50','M',12,13,4,9.4,false),('eurofit','sprint_50','M',12,13,3,9.8,false),('eurofit','sprint_50','M',12,13,2,10.3,false),('eurofit','sprint_50','M',12,13,1,NULL,false),
('eurofit','sprint_50','M',14,14,10,7.2,false),('eurofit','sprint_50','M',14,14,9,7.5,false),('eurofit','sprint_50','M',14,14,8,7.8,false),('eurofit','sprint_50','M',14,14,7,8.1,false),('eurofit','sprint_50','M',14,14,6,8.4,false),('eurofit','sprint_50','M',14,14,5,8.7,false),('eurofit','sprint_50','M',14,14,4,9.1,false),('eurofit','sprint_50','M',14,14,3,9.5,false),('eurofit','sprint_50','M',14,14,2,10.0,false),('eurofit','sprint_50','M',14,14,1,NULL,false),
('eurofit','sprint_50','M',15,15,10,6.9,false),('eurofit','sprint_50','M',15,15,9,7.2,false),('eurofit','sprint_50','M',15,15,8,7.5,false),('eurofit','sprint_50','M',15,15,7,7.8,false),('eurofit','sprint_50','M',15,15,6,8.1,false),('eurofit','sprint_50','M',15,15,5,8.4,false),('eurofit','sprint_50','M',15,15,4,8.8,false),('eurofit','sprint_50','M',15,15,3,9.2,false),('eurofit','sprint_50','M',15,15,2,9.7,false),('eurofit','sprint_50','M',15,15,1,NULL,false),
('eurofit','sprint_50','M',16,18,10,6.7,false),('eurofit','sprint_50','M',16,18,9,7.0,false),('eurofit','sprint_50','M',16,18,8,7.3,false),('eurofit','sprint_50','M',16,18,7,7.6,false),('eurofit','sprint_50','M',16,18,6,7.9,false),('eurofit','sprint_50','M',16,18,5,8.2,false),('eurofit','sprint_50','M',16,18,4,8.6,false),('eurofit','sprint_50','M',16,18,3,9.0,false),('eurofit','sprint_50','M',16,18,2,9.5,false),('eurofit','sprint_50','M',16,18,1,NULL,false);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_max, higher_better) VALUES
('eurofit','sprint_50','F',12,13,10,8.2,false),('eurofit','sprint_50','F',12,13,9,8.5,false),('eurofit','sprint_50','F',12,13,8,8.8,false),('eurofit','sprint_50','F',12,13,7,9.1,false),('eurofit','sprint_50','F',12,13,6,9.4,false),('eurofit','sprint_50','F',12,13,5,9.7,false),('eurofit','sprint_50','F',12,13,4,10.1,false),('eurofit','sprint_50','F',12,13,3,10.5,false),('eurofit','sprint_50','F',12,13,2,11.0,false),('eurofit','sprint_50','F',12,13,1,NULL,false),
('eurofit','sprint_50','F',14,14,10,8.0,false),('eurofit','sprint_50','F',14,14,9,8.3,false),('eurofit','sprint_50','F',14,14,8,8.6,false),('eurofit','sprint_50','F',14,14,7,8.9,false),('eurofit','sprint_50','F',14,14,6,9.2,false),('eurofit','sprint_50','F',14,14,5,9.5,false),('eurofit','sprint_50','F',14,14,4,9.9,false),('eurofit','sprint_50','F',14,14,3,10.3,false),('eurofit','sprint_50','F',14,14,2,10.8,false),('eurofit','sprint_50','F',14,14,1,NULL,false),
('eurofit','sprint_50','F',15,15,10,7.9,false),('eurofit','sprint_50','F',15,15,9,8.2,false),('eurofit','sprint_50','F',15,15,8,8.5,false),('eurofit','sprint_50','F',15,15,7,8.8,false),('eurofit','sprint_50','F',15,15,6,9.1,false),('eurofit','sprint_50','F',15,15,5,9.4,false),('eurofit','sprint_50','F',15,15,4,9.8,false),('eurofit','sprint_50','F',15,15,3,10.2,false),('eurofit','sprint_50','F',15,15,2,10.7,false),('eurofit','sprint_50','F',15,15,1,NULL,false),
('eurofit','sprint_50','F',16,18,10,7.8,false),('eurofit','sprint_50','F',16,18,9,8.1,false),('eurofit','sprint_50','F',16,18,8,8.4,false),('eurofit','sprint_50','F',16,18,7,8.7,false),('eurofit','sprint_50','F',16,18,6,9.0,false),('eurofit','sprint_50','F',16,18,5,9.3,false),('eurofit','sprint_50','F',16,18,4,9.7,false),('eurofit','sprint_50','F',16,18,3,10.1,false),('eurofit','sprint_50','F',16,18,2,10.6,false),('eurofit','sprint_50','F',16,18,1,NULL,false);

-- COOPER (m en 12 min) - higher_better
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','cooper','M',12,13,1,NULL,true),('eurofit','cooper','M',12,13,2,1400,true),('eurofit','cooper','M',12,13,3,1600,true),('eurofit','cooper','M',12,13,4,1800,true),('eurofit','cooper','M',12,13,5,2000,true),('eurofit','cooper','M',12,13,6,2200,true),('eurofit','cooper','M',12,13,7,2400,true),('eurofit','cooper','M',12,13,8,2600,true),('eurofit','cooper','M',12,13,9,2800,true),('eurofit','cooper','M',12,13,10,3000,true),
('eurofit','cooper','M',14,14,1,NULL,true),('eurofit','cooper','M',14,14,2,1500,true),('eurofit','cooper','M',14,14,3,1700,true),('eurofit','cooper','M',14,14,4,1900,true),('eurofit','cooper','M',14,14,5,2100,true),('eurofit','cooper','M',14,14,6,2300,true),('eurofit','cooper','M',14,14,7,2500,true),('eurofit','cooper','M',14,14,8,2700,true),('eurofit','cooper','M',14,14,9,2900,true),('eurofit','cooper','M',14,14,10,3100,true),
('eurofit','cooper','M',15,15,1,NULL,true),('eurofit','cooper','M',15,15,2,1600,true),('eurofit','cooper','M',15,15,3,1800,true),('eurofit','cooper','M',15,15,4,2000,true),('eurofit','cooper','M',15,15,5,2200,true),('eurofit','cooper','M',15,15,6,2400,true),('eurofit','cooper','M',15,15,7,2600,true),('eurofit','cooper','M',15,15,8,2800,true),('eurofit','cooper','M',15,15,9,3000,true),('eurofit','cooper','M',15,15,10,3200,true),
('eurofit','cooper','M',16,18,1,NULL,true),('eurofit','cooper','M',16,18,2,1700,true),('eurofit','cooper','M',16,18,3,1900,true),('eurofit','cooper','M',16,18,4,2100,true),('eurofit','cooper','M',16,18,5,2300,true),('eurofit','cooper','M',16,18,6,2500,true),('eurofit','cooper','M',16,18,7,2700,true),('eurofit','cooper','M',16,18,8,2900,true),('eurofit','cooper','M',16,18,9,3100,true),('eurofit','cooper','M',16,18,10,3300,true);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('eurofit','cooper','F',12,13,1,NULL,true),('eurofit','cooper','F',12,13,2,1100,true),('eurofit','cooper','F',12,13,3,1300,true),('eurofit','cooper','F',12,13,4,1500,true),('eurofit','cooper','F',12,13,5,1700,true),('eurofit','cooper','F',12,13,6,1900,true),('eurofit','cooper','F',12,13,7,2100,true),('eurofit','cooper','F',12,13,8,2300,true),('eurofit','cooper','F',12,13,9,2500,true),('eurofit','cooper','F',12,13,10,2700,true),
('eurofit','cooper','F',14,14,1,NULL,true),('eurofit','cooper','F',14,14,2,1150,true),('eurofit','cooper','F',14,14,3,1350,true),('eurofit','cooper','F',14,14,4,1550,true),('eurofit','cooper','F',14,14,5,1750,true),('eurofit','cooper','F',14,14,6,1950,true),('eurofit','cooper','F',14,14,7,2150,true),('eurofit','cooper','F',14,14,8,2350,true),('eurofit','cooper','F',14,14,9,2550,true),('eurofit','cooper','F',14,14,10,2750,true),
('eurofit','cooper','F',15,15,1,NULL,true),('eurofit','cooper','F',15,15,2,1200,true),('eurofit','cooper','F',15,15,3,1400,true),('eurofit','cooper','F',15,15,4,1600,true),('eurofit','cooper','F',15,15,5,1800,true),('eurofit','cooper','F',15,15,6,2000,true),('eurofit','cooper','F',15,15,7,2200,true),('eurofit','cooper','F',15,15,8,2400,true),('eurofit','cooper','F',15,15,9,2600,true),('eurofit','cooper','F',15,15,10,2800,true),
('eurofit','cooper','F',16,18,1,NULL,true),('eurofit','cooper','F',16,18,2,1250,true),('eurofit','cooper','F',16,18,3,1450,true),('eurofit','cooper','F',16,18,4,1650,true),('eurofit','cooper','F',16,18,5,1850,true),('eurofit','cooper','F',16,18,6,2050,true),('eurofit','cooper','F',16,18,7,2250,true),('eurofit','cooper','F',16,18,8,2450,true),('eurofit','cooper','F',16,18,9,2650,true),('eurofit','cooper','F',16,18,10,2850,true);

-- ===== CFS =====

-- THOMAS (grados, lower_better - 0 es perfecto)
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_max, higher_better) VALUES
('cfs','thomas','M',12,18,10,0,false),('cfs','thomas','M',12,18,9,3,false),('cfs','thomas','M',12,18,8,6,false),('cfs','thomas','M',12,18,7,9,false),('cfs','thomas','M',12,18,6,12,false),('cfs','thomas','M',12,18,5,15,false),('cfs','thomas','M',12,18,4,18,false),('cfs','thomas','M',12,18,3,22,false),('cfs','thomas','M',12,18,2,26,false),('cfs','thomas','M',12,18,1,NULL,false),
('cfs','thomas','F',12,18,10,0,false),('cfs','thomas','F',12,18,9,2,false),('cfs','thomas','F',12,18,8,5,false),('cfs','thomas','F',12,18,7,8,false),('cfs','thomas','F',12,18,6,11,false),('cfs','thomas','F',12,18,5,14,false),('cfs','thomas','F',12,18,4,17,false),('cfs','thomas','F',12,18,3,21,false),('cfs','thomas','F',12,18,2,25,false),('cfs','thomas','F',12,18,1,NULL,false);

-- BIERING-SÖRENSEN (seg, higher_better)
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('cfs','biering_sorensen','M',12,18,1,NULL,true),('cfs','biering_sorensen','M',12,18,2,40,true),('cfs','biering_sorensen','M',12,18,3,60,true),('cfs','biering_sorensen','M',12,18,4,80,true),('cfs','biering_sorensen','M',12,18,5,100,true),('cfs','biering_sorensen','M',12,18,6,120,true),('cfs','biering_sorensen','M',12,18,7,140,true),('cfs','biering_sorensen','M',12,18,8,160,true),('cfs','biering_sorensen','M',12,18,9,180,true),('cfs','biering_sorensen','M',12,18,10,200,true),
('cfs','biering_sorensen','F',12,18,1,NULL,true),('cfs','biering_sorensen','F',12,18,2,45,true),('cfs','biering_sorensen','F',12,18,3,65,true),('cfs','biering_sorensen','F',12,18,4,85,true),('cfs','biering_sorensen','F',12,18,5,105,true),('cfs','biering_sorensen','F',12,18,6,125,true),('cfs','biering_sorensen','F',12,18,7,145,true),('cfs','biering_sorensen','F',12,18,8,165,true),('cfs','biering_sorensen','F',12,18,9,185,true),('cfs','biering_sorensen','F',12,18,10,210,true);

-- SJ (cm, higher_better) - usamos los mismos rangos que salto vertical pero un pelín menos
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('cfs','sj','M',12,13,1,NULL,true),('cfs','sj','M',12,13,2,13,true),('cfs','sj','M',12,13,3,17,true),('cfs','sj','M',12,13,4,20,true),('cfs','sj','M',12,13,5,23,true),('cfs','sj','M',12,13,6,26,true),('cfs','sj','M',12,13,7,29,true),('cfs','sj','M',12,13,8,32,true),('cfs','sj','M',12,13,9,36,true),('cfs','sj','M',12,13,10,40,true),
('cfs','sj','M',14,14,1,NULL,true),('cfs','sj','M',14,14,2,16,true),('cfs','sj','M',14,14,3,20,true),('cfs','sj','M',14,14,4,23,true),('cfs','sj','M',14,14,5,26,true),('cfs','sj','M',14,14,6,29,true),('cfs','sj','M',14,14,7,32,true),('cfs','sj','M',14,14,8,36,true),('cfs','sj','M',14,14,9,40,true),('cfs','sj','M',14,14,10,44,true),
('cfs','sj','M',15,15,1,NULL,true),('cfs','sj','M',15,15,2,19,true),('cfs','sj','M',15,15,3,23,true),('cfs','sj','M',15,15,4,26,true),('cfs','sj','M',15,15,5,29,true),('cfs','sj','M',15,15,6,32,true),('cfs','sj','M',15,15,7,36,true),('cfs','sj','M',15,15,8,40,true),('cfs','sj','M',15,15,9,44,true),('cfs','sj','M',15,15,10,48,true),
('cfs','sj','M',16,18,1,NULL,true),('cfs','sj','M',16,18,2,22,true),('cfs','sj','M',16,18,3,26,true),('cfs','sj','M',16,18,4,29,true),('cfs','sj','M',16,18,5,32,true),('cfs','sj','M',16,18,6,36,true),('cfs','sj','M',16,18,7,40,true),('cfs','sj','M',16,18,8,44,true),('cfs','sj','M',16,18,9,48,true),('cfs','sj','M',16,18,10,53,true);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better) VALUES
('cfs','sj','F',12,13,1,NULL,true),('cfs','sj','F',12,13,2,10,true),('cfs','sj','F',12,13,3,13,true),('cfs','sj','F',12,13,4,16,true),('cfs','sj','F',12,13,5,18,true),('cfs','sj','F',12,13,6,21,true),('cfs','sj','F',12,13,7,24,true),('cfs','sj','F',12,13,8,27,true),('cfs','sj','F',12,13,9,30,true),('cfs','sj','F',12,13,10,34,true),
('cfs','sj','F',14,14,1,NULL,true),('cfs','sj','F',14,14,2,11,true),('cfs','sj','F',14,14,3,14,true),('cfs','sj','F',14,14,4,17,true),('cfs','sj','F',14,14,5,20,true),('cfs','sj','F',14,14,6,23,true),('cfs','sj','F',14,14,7,26,true),('cfs','sj','F',14,14,8,29,true),('cfs','sj','F',14,14,9,32,true),('cfs','sj','F',14,14,10,36,true),
('cfs','sj','F',15,15,1,NULL,true),('cfs','sj','F',15,15,2,12,true),('cfs','sj','F',15,15,3,15,true),('cfs','sj','F',15,15,4,18,true),('cfs','sj','F',15,15,5,21,true),('cfs','sj','F',15,15,6,24,true),('cfs','sj','F',15,15,7,27,true),('cfs','sj','F',15,15,8,30,true),('cfs','sj','F',15,15,9,34,true),('cfs','sj','F',15,15,10,38,true),
('cfs','sj','F',16,18,1,NULL,true),('cfs','sj','F',16,18,2,13,true),('cfs','sj','F',16,18,3,16,true),('cfs','sj','F',16,18,4,19,true),('cfs','sj','F',16,18,5,22,true),('cfs','sj','F',16,18,6,25,true),('cfs','sj','F',16,18,7,28,true),('cfs','sj','F',16,18,8,31,true),('cfs','sj','F',16,18,9,35,true),('cfs','sj','F',16,18,10,39,true);

-- CMJ (cm, higher_better) - mismos baremos que salto_vertical
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better)
SELECT 'cfs', 'cmj', sexo, edad_min, edad_max, nota, valor_min, higher_better
FROM public.baremos WHERE bateria='eurofit' AND prueba='salto_vertical';

-- LANZ MED DERECHA (m, higher_better) - bola medicinal 3kg sobre cabeza, distinta del lanz_hombros eurofit
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better)
SELECT 'cfs', 'lanz_med_der', sexo, edad_min, edad_max, nota, valor_min, higher_better
FROM public.baremos WHERE bateria='eurofit' AND prueba='lanz_hombros';

INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_min, higher_better)
SELECT 'cfs', 'lanz_med_izq', sexo, edad_min, edad_max, nota, valor_min, higher_better
FROM public.baremos WHERE bateria='eurofit' AND prueba='lanz_hombros';

-- SPRINT 30m (seg, lower_better) - factor 0.62 sobre 50m aprox
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_max, higher_better) VALUES
('cfs','sprint_30','M',12,13,10,4.6,false),('cfs','sprint_30','M',12,13,9,4.8,false),('cfs','sprint_30','M',12,13,8,5.0,false),('cfs','sprint_30','M',12,13,7,5.2,false),('cfs','sprint_30','M',12,13,6,5.4,false),('cfs','sprint_30','M',12,13,5,5.6,false),('cfs','sprint_30','M',12,13,4,5.8,false),('cfs','sprint_30','M',12,13,3,6.1,false),('cfs','sprint_30','M',12,13,2,6.4,false),('cfs','sprint_30','M',12,13,1,NULL,false),
('cfs','sprint_30','M',14,14,10,4.4,false),('cfs','sprint_30','M',14,14,9,4.6,false),('cfs','sprint_30','M',14,14,8,4.8,false),('cfs','sprint_30','M',14,14,7,5.0,false),('cfs','sprint_30','M',14,14,6,5.2,false),('cfs','sprint_30','M',14,14,5,5.4,false),('cfs','sprint_30','M',14,14,4,5.6,false),('cfs','sprint_30','M',14,14,3,5.9,false),('cfs','sprint_30','M',14,14,2,6.2,false),('cfs','sprint_30','M',14,14,1,NULL,false),
('cfs','sprint_30','M',15,15,10,4.3,false),('cfs','sprint_30','M',15,15,9,4.5,false),('cfs','sprint_30','M',15,15,8,4.7,false),('cfs','sprint_30','M',15,15,7,4.9,false),('cfs','sprint_30','M',15,15,6,5.1,false),('cfs','sprint_30','M',15,15,5,5.3,false),('cfs','sprint_30','M',15,15,4,5.5,false),('cfs','sprint_30','M',15,15,3,5.8,false),('cfs','sprint_30','M',15,15,2,6.1,false),('cfs','sprint_30','M',15,15,1,NULL,false),
('cfs','sprint_30','M',16,18,10,4.2,false),('cfs','sprint_30','M',16,18,9,4.4,false),('cfs','sprint_30','M',16,18,8,4.6,false),('cfs','sprint_30','M',16,18,7,4.8,false),('cfs','sprint_30','M',16,18,6,5.0,false),('cfs','sprint_30','M',16,18,5,5.2,false),('cfs','sprint_30','M',16,18,4,5.4,false),('cfs','sprint_30','M',16,18,3,5.7,false),('cfs','sprint_30','M',16,18,2,6.0,false),('cfs','sprint_30','M',16,18,1,NULL,false);
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_max, higher_better) VALUES
('cfs','sprint_30','F',12,13,10,5.0,false),('cfs','sprint_30','F',12,13,9,5.2,false),('cfs','sprint_30','F',12,13,8,5.4,false),('cfs','sprint_30','F',12,13,7,5.6,false),('cfs','sprint_30','F',12,13,6,5.8,false),('cfs','sprint_30','F',12,13,5,6.0,false),('cfs','sprint_30','F',12,13,4,6.3,false),('cfs','sprint_30','F',12,13,3,6.6,false),('cfs','sprint_30','F',12,13,2,6.9,false),('cfs','sprint_30','F',12,13,1,NULL,false),
('cfs','sprint_30','F',14,14,10,4.9,false),('cfs','sprint_30','F',14,14,9,5.1,false),('cfs','sprint_30','F',14,14,8,5.3,false),('cfs','sprint_30','F',14,14,7,5.5,false),('cfs','sprint_30','F',14,14,6,5.7,false),('cfs','sprint_30','F',14,14,5,5.9,false),('cfs','sprint_30','F',14,14,4,6.2,false),('cfs','sprint_30','F',14,14,3,6.5,false),('cfs','sprint_30','F',14,14,2,6.8,false),('cfs','sprint_30','F',14,14,1,NULL,false),
('cfs','sprint_30','F',15,15,10,4.8,false),('cfs','sprint_30','F',15,15,9,5.0,false),('cfs','sprint_30','F',15,15,8,5.2,false),('cfs','sprint_30','F',15,15,7,5.4,false),('cfs','sprint_30','F',15,15,6,5.6,false),('cfs','sprint_30','F',15,15,5,5.8,false),('cfs','sprint_30','F',15,15,4,6.1,false),('cfs','sprint_30','F',15,15,3,6.4,false),('cfs','sprint_30','F',15,15,2,6.7,false),('cfs','sprint_30','F',15,15,1,NULL,false),
('cfs','sprint_30','F',16,18,10,4.8,false),('cfs','sprint_30','F',16,18,9,5.0,false),('cfs','sprint_30','F',16,18,8,5.2,false),('cfs','sprint_30','F',16,18,7,5.4,false),('cfs','sprint_30','F',16,18,6,5.6,false),('cfs','sprint_30','F',16,18,5,5.8,false),('cfs','sprint_30','F',16,18,4,6.1,false),('cfs','sprint_30','F',16,18,3,6.4,false),('cfs','sprint_30','F',16,18,2,6.7,false),('cfs','sprint_30','F',16,18,1,NULL,false);

-- ROCKPORT (min, lower_better) - tiempo total mile walking test
INSERT INTO public.baremos (bateria, prueba, sexo, edad_min, edad_max, nota, valor_max, higher_better) VALUES
('cfs','rockport','M',12,18,10,11.0,false),('cfs','rockport','M',12,18,9,11.5,false),('cfs','rockport','M',12,18,8,12.0,false),('cfs','rockport','M',12,18,7,12.5,false),('cfs','rockport','M',12,18,6,13.0,false),('cfs','rockport','M',12,18,5,13.5,false),('cfs','rockport','M',12,18,4,14.0,false),('cfs','rockport','M',12,18,3,14.7,false),('cfs','rockport','M',12,18,2,15.5,false),('cfs','rockport','M',12,18,1,NULL,false),
('cfs','rockport','F',12,18,10,11.5,false),('cfs','rockport','F',12,18,9,12.0,false),('cfs','rockport','F',12,18,8,12.5,false),('cfs','rockport','F',12,18,7,13.0,false),('cfs','rockport','F',12,18,6,13.5,false),('cfs','rockport','F',12,18,5,14.0,false),('cfs','rockport','F',12,18,4,14.5,false),('cfs','rockport','F',12,18,3,15.2,false),('cfs','rockport','F',12,18,2,16.0,false),('cfs','rockport','F',12,18,1,NULL,false);

-- ============================================
-- 4. SEED PROCEDIMIENTOS (12 pruebas, ES)
-- ============================================
DELETE FROM public.procedimientos;

INSERT INTO public.procedimientos (bateria, prueba, idioma, procedimiento_md, referencia_apa) VALUES
('eurofit','wells','es','**Test sit-and-reach (Wells)**: alumno descalzo, sentado con piernas extendidas y plantas contra el cajón. Manos superpuestas, empuja lentamente el indicador hacia delante hasta el máximo sin rebotes. Dos intentos, mejor registro en cm.','Wells, K. F., & Dillon, E. K. (1952). The sit and reach: a test of back and leg flexibility. *Research Quarterly*, 23(1), 115-118.'),
('eurofit','salto_vertical','es','**Salto vertical (Sargent)**: alumno de pie junto a pared, marca con dedo a máxima altura. Tras flexión rápida de piernas, salta y marca el punto más alto. Diferencia entre marcas en cm. Tres intentos, mejor registro.','Sargent, D. A. (1921). The physical test of a man. *American Physical Education Review*, 26(4), 188-194.'),
('eurofit','abdominales_60','es','**Abdominales en 60 segundos**: tumbado boca arriba, rodillas flexionadas a 90°, manos en nuca, compañero sujeta los pies. Subir hasta tocar codos con rodillas y bajar hasta apoyar omóplatos. Contar repeticiones completas en 60 s.','Council of Europe (1988). *Eurofit: European tests of physical fitness*. Council of Europe, Committee for the Development of Sport.'),
('eurofit','lanz_hombros','es','**Lanzamiento balón medicinal sobre hombros (3 kg)**: de pie, espalda a la línea, balón sostenido con ambas manos por encima de la cabeza. Lanzar hacia atrás flexionando tronco. Mejor de tres intentos, distancia en metros.','Stockbrugger, B. A., & Haennel, R. G. (2001). Validity and reliability of a medicine ball explosive power test. *Journal of Strength and Conditioning Research*, 15(4), 431-438.'),
('eurofit','sprint_50','es','**Sprint 50 metros**: salida en posición alta, recorrido de 50 m en línea recta a máxima velocidad. Cronometraje con cronómetro manual o células fotoeléctricas. Un único intento válido.','Council of Europe (1988). *Eurofit: European tests of physical fitness*. Council of Europe, Committee for the Development of Sport.'),
('eurofit','cooper','es','**Test de Cooper (12 minutos)**: recorrer la mayor distancia posible en 12 minutos a ritmo constante. Pista de 400 m balizada cada 50 m. Anotar metros totales recorridos.','Cooper, K. H. (1968). A means of assessing maximal oxygen intake. *JAMA*, 203(3), 201-204.'),
('cfs','thomas','es','**Test de Thomas modificado (flexibilidad cadera)**: tumbado boca arriba en camilla, abrazar una rodilla contra el pecho. La pierna contraria debe permanecer en la camilla. Medir con goniómetro el ángulo de flexión coxofemoral residual. 0° es óptimo.','Harvey, D. (1998). Assessment of the flexibility of elite athletes using the modified Thomas test. *British Journal of Sports Medicine*, 32(1), 68-70.'),
('cfs','biering_sorensen','es','**Biering-Sörensen (resistencia musculatura extensora del tronco)**: alumno en decúbito prono sobre camilla con tronco fuera del borde a partir de EIAS. Brazos cruzados, mantener tronco horizontal el máximo tiempo posible. Cronometrar segundos.','Biering-Sørensen, F. (1984). Physical measurements as risk indicators for low-back trouble over a one-year period. *Spine*, 9(2), 106-119.'),
('cfs','sj','es','**Squat Jump (SJ)**: partiendo de semi-flexión de rodillas (90°) sin contramovimiento, salto vertical máximo con manos en cintura. Plataforma de contacto o app validada (ej. My Jump). Mejor de tres intentos.','Bosco, C., Luhtanen, P., & Komi, P. V. (1983). A simple method for measurement of mechanical power in jumping. *European Journal of Applied Physiology*, 50(2), 273-282.'),
('cfs','cmj','es','**Counter Movement Jump (CMJ)**: desde de pie, contramovimiento rápido y salto vertical máximo con manos en cintura. Plataforma de contacto o app validada. Mejor de tres intentos. Índice elástico = (CMJ-SJ)/SJ × 100.','Bosco, C., Luhtanen, P., & Komi, P. V. (1983). A simple method for measurement of mechanical power in jumping. *European Journal of Applied Physiology*, 50(2), 273-282.'),
('cfs','lanz_med','es','**Lanzamiento balón medicinal (3 kg) brazo dominante y no dominante**: sentado contra pared, balón sostenido con una mano a la altura del hombro. Lanzar al frente como en tiro de balonmano. Tres intentos por brazo, mejor registro en m.','Van den Tillaar, R., & Marques, M. C. (2009). Effect of two different training programs with the same workload on throwing performance with overweight and underweight balls. *Perceptual and Motor Skills*, 109(3), 943-954.'),
('cfs','sprint_30','es','**Sprint 30 metros**: salida en posición alta tras línea, recorrido lineal de 30 m a máxima velocidad. Cronometraje con células fotoeléctricas preferiblemente. Mejor de dos intentos con 5 min recuperación.','Mayhew, J. L., et al. (2010). Comparison of the backward overhead medicine ball throw to power production in college football players. *Journal of Strength and Conditioning Research*, 24(7), 1795-1799.'),
('cfs','rockport','es','**Test de Rockport (1 milla andando)**: recorrer 1609 m caminando a máxima velocidad sin correr. Anotar tiempo total (min:seg) y FC al finalizar. VO₂máx estimado: 132.853 - 0.0769×peso(lb) - 0.3877×edad + 6.315×sexo(M=1,F=0) - 3.2649×tiempo - 0.1565×FC.','Kline, G. M., Porcari, J. P., Hintermeister, R., Freedson, P. S., Ward, A., McCarron, R. F., Ross, J., & Rippe, J. M. (1987). Estimation of VO2max from a one-mile track walk. *Medicine and Science in Sports and Exercise*, 19(3), 253-259.');

-- ============================================
-- 5. CONFIG PUBLICA por defecto
-- ============================================
INSERT INTO public.config_publica (idioma_default, mostrar_eurofit, mostrar_cfs, mostrar_antropometria, mostrar_por_curso, mostrar_por_sexo)
SELECT 'es', true, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.config_publica);

-- ============================================
-- 6. SEED 100 ALUMNOS DEMO
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_demo_alumnos()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _centro_id uuid;
  _grupo_id uuid;
  _alumno_id uuid;
  _cursos curso_enum[] := ARRAY['1ESO','2ESO','3ESO','4ESO']::curso_enum[];
  _curso curso_enum;
  _edad_base int;
  _sexo sexo_enum;
  _talla numeric; _peso numeric; _envergadura numeric; _biacromial numeric; _pierna numeric;
  _i int; _aula int;
  _nombres_m text[] := ARRAY['Marc','Pau','Hugo','Daniel','Álvaro','Adrián','Mario','Lucas','Diego','Iván','Javier','Sergio','David','Carlos','Jorge'];
  _nombres_f text[] := ARRAY['Lucía','Marta','Sofía','Paula','Carla','Julia','Andrea','Alba','Claudia','Noa','Valeria','Emma','Daniela','Sara','Nora'];
  _apellidos text[] := ARRAY['García','Martínez','López','Sánchez','Pérez','Gómez','Fernández','Ruiz','Hernández','Jiménez','Moreno','Álvarez','Romero','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Serrano'];
  _nombre text;
BEGIN
  -- Admin (julio.martin@ucv.es) como profesor del centro demo
  SELECT user_id INTO _admin_id FROM user_roles WHERE role='admin' LIMIT 1;
  IF _admin_id IS NULL THEN
    RETURN 'No hay admin. Registra primero julio.martin@ucv.es y vuelve a ejecutar.';
  END IF;

  -- Limpiar demo previo
  PERFORM borrar_demo();

  -- Centro demo
  INSERT INTO centros (nombre, provincia, ciudad, codigo_postal, direccion, email, is_demo, created_by)
  VALUES ('IES Demo Lovable', 'Valencia/València', 'Valencia', '46001', 'Av. de la Educación Física, 1', 'demo@cf-adolescentes.app', true, _admin_id)
  RETURNING id INTO _centro_id;

  _aula := 1;

  FOREACH _curso IN ARRAY _cursos LOOP
    -- Grupo D demo por curso
    INSERT INTO grupos (centro_id, profesor_id, curso, letra, anio_escolar, is_demo)
    VALUES (_centro_id, _admin_id, _curso, 'D', '2024-2025', true)
    RETURNING id INTO _grupo_id;

    _edad_base := CASE _curso
      WHEN '1ESO' THEN 12
      WHEN '2ESO' THEN 13
      WHEN '3ESO' THEN 14
      WHEN '4ESO' THEN 15
    END;

    FOR _i IN 1..25 LOOP
      _sexo := CASE WHEN _i % 2 = 0 THEN 'M'::sexo_enum ELSE 'F'::sexo_enum END;
      _nombre := CASE WHEN _sexo='M' THEN _nombres_m[1+floor(random()*15)::int] ELSE _nombres_f[1+floor(random()*15)::int] END;

      -- Antropometría realista
      IF _sexo='M' THEN
        _talla := round((1.45 + (_edad_base-12)*0.04 + random()*0.15)::numeric, 2);
        _peso := round((40 + (_edad_base-12)*5 + random()*15)::numeric, 1);
      ELSE
        _talla := round((1.48 + (_edad_base-12)*0.025 + random()*0.10)::numeric, 2);
        _peso := round((42 + (_edad_base-12)*3 + random()*12)::numeric, 1);
      END IF;
      _envergadura := round((_talla*100 + (random()*6 - 3))::numeric, 1);
      _biacromial := round((_talla*100*0.23 + random()*2)::numeric, 1);
      _pierna := round((_talla*100*0.47 + random()*2)::numeric, 1);

      INSERT INTO alumnos (grupo_id, id_aula, nombre, apellidos, sexo, fecha_nacimiento, peso_kg, talla_m, envergadura_cm, biacromial_cm, longitud_pierna_cm, extraescolar, horas_extraescolar, is_demo)
      VALUES (
        _grupo_id, _aula, _nombre, _apellidos[1+floor(random()*20)::int]||' '||_apellidos[1+floor(random()*20)::int],
        _sexo,
        (CURRENT_DATE - ((_edad_base*365 + floor(random()*365))::int))::date,
        _peso, _talla, _envergadura, _biacromial, _pierna,
        random() > 0.4, CASE WHEN random()>0.4 THEN round((1+random()*5)::numeric,1) ELSE NULL END,
        true
      ) RETURNING id INTO _alumno_id;
      _aula := _aula + 1;

      -- Pruebas Eurofit
      INSERT INTO pruebas_eurofit (alumno_id, wells_cm, salto_vertical_cm, abdominales_60, lanz_hombros_m, sprint_50_seg, cooper_m,
        omni_wells, omni_salto, omni_abdominales, omni_lanz, omni_sprint, omni_cooper, is_demo)
      VALUES (
        _alumno_id,
        round((15 + random()*25)::numeric,1),
        round((20 + (_edad_base-12)*4 + random()*15 + CASE WHEN _sexo='M' THEN 5 ELSE 0 END)::numeric,1),
        round((15 + (_edad_base-12)*3 + random()*15 + CASE WHEN _sexo='M' THEN 3 ELSE 0 END)::numeric)::int,
        round((4 + (_edad_base-12)*0.7 + random()*3 + CASE WHEN _sexo='M' THEN 1.2 ELSE 0 END)::numeric,2),
        round((9 - (_edad_base-12)*0.2 + random()*1.5 + CASE WHEN _sexo='F' THEN 0.5 ELSE 0 END)::numeric,2),
        round((1700 + (_edad_base-12)*100 + random()*600 + CASE WHEN _sexo='M' THEN 250 ELSE 0 END)::numeric)::int,
        floor(2+random()*7)::int, floor(4+random()*6)::int, floor(5+random()*5)::int,
        floor(3+random()*6)::int, floor(6+random()*4)::int, floor(6+random()*4)::int,
        true
      );

      -- Pruebas CFS
      INSERT INTO pruebas_cfs (alumno_id, thomas, biering_sorensen_seg, sj_cm, cmj_cm, lanz_med_der_m, lanz_med_izq_m, sprint_30_seg, rockport_min, rockport_seg, rockport_fc,
        omni_thomas, omni_biering, omni_saltos, omni_lanz, omni_sprint, omni_rockport, is_demo)
      VALUES (
        _alumno_id,
        floor(random()*20)::int,
        round((60 + random()*120)::numeric,1),
        round((18 + (_edad_base-12)*3 + random()*12 + CASE WHEN _sexo='M' THEN 4 ELSE 0 END)::numeric,1),
        round((22 + (_edad_base-12)*4 + random()*14 + CASE WHEN _sexo='M' THEN 5 ELSE 0 END)::numeric,1),
        round((4 + (_edad_base-12)*0.6 + random()*3 + CASE WHEN _sexo='M' THEN 1 ELSE 0 END)::numeric,2),
        round((3.5 + (_edad_base-12)*0.5 + random()*2.5 + CASE WHEN _sexo='M' THEN 0.9 ELSE 0 END)::numeric,2),
        round((5.5 - (_edad_base-12)*0.15 + random()*1 + CASE WHEN _sexo='F' THEN 0.3 ELSE 0 END)::numeric,2),
        floor((11 + random()*5))::int, floor(random()*60)::int, floor(140+random()*40)::int,
        floor(2+random()*5)::int, floor(7+random()*3)::int, floor(4+random()*5)::int,
        floor(3+random()*6)::int, floor(8+random()*2)::int, floor(5+random()*4)::int,
        true
      );
    END LOOP;
  END LOOP;

  RETURN 'Creados 100 alumnos demo en IES Demo Lovable';
END;
$$;

-- ============================================
-- 7. BORRAR DEMO
-- ============================================
CREATE OR REPLACE FUNCTION public.borrar_demo()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pruebas_eurofit WHERE is_demo = true;
  DELETE FROM pruebas_cfs WHERE is_demo = true;
  DELETE FROM alumnos WHERE is_demo = true;
  DELETE FROM grupos WHERE is_demo = true;
  DELETE FROM centros WHERE is_demo = true;
  RETURN 'Datos demo eliminados';
END;
$$;

-- Sólo admins pueden ejecutar seed/borrar demo
REVOKE ALL ON FUNCTION public.seed_demo_alumnos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.borrar_demo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_alumnos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.borrar_demo() TO authenticated;

-- Wrapper que valida admin
CREATE OR REPLACE FUNCTION public.admin_seed_demo()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Solo admin'; END IF;
  RETURN seed_demo_alumnos();
END; $$;

CREATE OR REPLACE FUNCTION public.admin_borrar_demo()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Solo admin'; END IF;
  RETURN borrar_demo();
END; $$;

-- Función pública para estadísticas agregadas (acceso anónimo)
CREATE OR REPLACE FUNCTION public.get_stats_publicas()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_alumnos', (SELECT count(*) FROM alumnos WHERE is_demo = true),
    'eurofit', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(wells_cm) as wells, stddev(wells_cm) as wells_dt,
        avg(salto_vertical_cm) as salto, stddev(salto_vertical_cm) as salto_dt,
        avg(abdominales_60) as abdo, stddev(abdominales_60) as abdo_dt,
        avg(lanz_hombros_m) as lanz, stddev(lanz_hombros_m) as lanz_dt,
        avg(sprint_50_seg) as sprint, stddev(sprint_50_seg) as sprint_dt,
        avg(cooper_m) as cooper, stddev(cooper_m) as cooper_dt
      FROM pruebas_eurofit WHERE is_demo = true
    ) t),
    'cfs', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(thomas) as thomas, stddev(thomas) as thomas_dt,
        avg(biering_sorensen_seg) as biering, stddev(biering_sorensen_seg) as biering_dt,
        avg(sj_cm) as sj, stddev(sj_cm) as sj_dt,
        avg(cmj_cm) as cmj, stddev(cmj_cm) as cmj_dt,
        avg(indice_elastico) as ie, stddev(indice_elastico) as ie_dt,
        avg(lanz_med_der_m) as lanz_der, stddev(lanz_med_der_m) as lanz_der_dt,
        avg(sprint_30_seg) as sprint30, stddev(sprint_30_seg) as sprint30_dt,
        avg(rockport_min + rockport_seg/60.0) as rockport, stddev(rockport_min + rockport_seg/60.0) as rockport_dt
      FROM pruebas_cfs WHERE is_demo = true
    ) t),
    'antropometria', (SELECT to_jsonb(t) FROM (
      SELECT
        avg(imc) as imc, stddev(imc) as imc_dt,
        avg(envergadura_cm) as env, stddev(envergadura_cm) as env_dt,
        avg(biacromial_cm) as bia, stddev(biacromial_cm) as bia_dt,
        avg(longitud_pierna_cm) as pierna, stddev(longitud_pierna_cm) as pierna_dt
      FROM alumnos WHERE is_demo = true
    ) t)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stats_publicas() TO anon, authenticated;
