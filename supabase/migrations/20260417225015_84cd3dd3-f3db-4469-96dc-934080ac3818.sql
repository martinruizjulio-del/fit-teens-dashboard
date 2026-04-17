CREATE TABLE public.solicitudes_implantacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_solicitante text NOT NULL,
  email_solicitante text NOT NULL,
  centro_nombre text NOT NULL,
  ciudad text,
  provincia text,
  mensaje text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  notas_admin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitudes_implantacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON public.solicitudes_implantacion FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage all" ON public.solicitudes_implantacion FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_sol_imp_updated BEFORE UPDATE ON public.solicitudes_implantacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.centros
  ADD COLUMN IF NOT EXISTS mostrar_publico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonimo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS codigo_anonimo text UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_codigo_anonimo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo_anonimo IS NULL THEN
    NEW.codigo_anonimo := 'CFA-' || upper(substring(replace(gen_random_uuid()::text,'-',''),1,5));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_centros_codigo BEFORE INSERT ON public.centros FOR EACH ROW EXECUTE FUNCTION public.gen_codigo_anonimo();

CREATE POLICY "Public read centros publicos" ON public.centros FOR SELECT TO anon
  USING (mostrar_publico = true);

ALTER TABLE public.config_publica
  ADD COLUMN IF NOT EXISTS autores text NOT NULL DEFAULT 'Julio Martín-Ruiz',
  ADD COLUMN IF NOT EXISTS politica_privacidad_md text NOT NULL DEFAULT '# Política de privacidad

Esta aplicación recoge datos antropométricos y resultados de pruebas físicas de adolescentes en el contexto educativo de Educación Física. El tratamiento de los datos se realiza conforme al Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD 3/2018.

## Responsable del tratamiento
Julio Martín-Ruiz · Universidad Católica de Valencia · julio.martin@ucv.es

## Datos recogidos
- Datos identificativos del alumnado: nombre, apellidos, fecha de nacimiento, sexo.
- Datos antropométricos: peso, talla, envergadura, etc.
- Resultados de pruebas físicas (Eurofit y CFS) y percepción de esfuerzo (Omni-Res).

## Finalidad
Evaluación pedagógica de la condición física y elaboración de estadísticas anonimizadas con fines de investigación educativa.

## Anonimato
Los datos publicados en la página pública se muestran siempre de forma agregada y anónima. Ningún alumno o centro puede ser identificado individualmente sin su consentimiento explícito.

## Derechos
Acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a julio.martin@ucv.es.

## Conservación
Los datos se conservan mientras dure el proyecto educativo y se eliminan cuando el centro lo solicite.',
  ADD COLUMN IF NOT EXISTS manual_uso_md text NOT NULL DEFAULT '# Manual de uso

## 1. Registro
1. Acepta la política de privacidad y la solicitud de implantación de tu centro.
2. Crea tu cuenta como profesor de Educación Física.

## 2. Centros y grupos
1. Da de alta tu centro (puedes elegir aparecer con nombre real o código anónimo).
2. Crea los grupos (curso + letra).

## 3. Alumnado
1. Añade el alumnado al grupo correspondiente.
2. Cada alumno recibe un código de acceso único para consultar sus resultados.

## 4. Pruebas
1. Eurofit (6 pruebas) y CFS (8 pruebas).
2. Cada prueba registra valor + escala Omni-Res de esfuerzo percibido.
3. La nota (1-10) se calcula automáticamente según baremos por edad y sexo.

## 5. Estadísticas
- Dashboard del profesor con medias y comparativas.
- Página pública con datos agregados anónimos.

## 6. Soporte
Para cualquier duda escribe a julio.martin@ucv.es',
  ADD COLUMN IF NOT EXISTS video_manual_url text;

CREATE TABLE public.consentimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('implantacion','privacidad')),
  version text NOT NULL DEFAULT 'v1',
  aceptado boolean NOT NULL DEFAULT true,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consentimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own consents" ON public.consentimientos FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users insert own consents" ON public.consentimientos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage consents" ON public.consentimientos FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));