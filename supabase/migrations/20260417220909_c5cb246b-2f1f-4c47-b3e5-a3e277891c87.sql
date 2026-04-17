
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');
CREATE TYPE public.sexo_enum AS ENUM ('M', 'F');
CREATE TYPE public.curso_enum AS ENUM ('1ESO', '2ESO', '3ESO', '4ESO');

-- ============================================================
-- FUNCIÓN COMPARTIDA: actualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLA: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'es',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: user_roles (separada por seguridad)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función security definer para evitar recursión RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

-- ============================================================
-- TRIGGER: alta de usuario nuevo → profile + role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  -- Admin: solo julio.martin@ucv.es
  IF NEW.email = 'julio.martin@ucv.es' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLA: centros
-- ============================================================
CREATE TABLE public.centros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  provincia TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.centros ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_centros_nombre ON public.centros(nombre);

CREATE TRIGGER trg_centros_updated_at
BEFORE UPDATE ON public.centros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: grupos
-- ============================================================
CREATE TABLE public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
  curso curso_enum NOT NULL,
  letra TEXT NOT NULL CHECK (letra IN ('A','B','C','D','E','F')),
  anio_escolar TEXT NOT NULL, -- ej: '2025/26'
  profesor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centro_id, curso, letra, anio_escolar)
);

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_grupos_profesor ON public.grupos(profesor_id);
CREATE INDEX idx_grupos_centro ON public.grupos(centro_id);

CREATE TRIGGER trg_grupos_updated_at
BEFORE UPDATE ON public.grupos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: alumnos
-- ============================================================
CREATE TABLE public.alumnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                  -- ID interno intransferible
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  id_aula INTEGER NOT NULL,                                       -- ID autonumerado por profesor
  apellidos TEXT NOT NULL,
  nombre TEXT NOT NULL,
  sexo sexo_enum NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  peso_kg NUMERIC(5,2),
  talla_m NUMERIC(4,2),
  imc NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN talla_m IS NOT NULL AND talla_m > 0 AND peso_kg IS NOT NULL
         THEN ROUND((peso_kg / (talla_m * talla_m))::numeric, 2)
         ELSE NULL END
  ) STORED,
  envergadura_cm NUMERIC(5,2),
  biacromial_cm NUMERIC(5,2),
  biacromial_15_cm NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE WHEN biacromial_cm IS NOT NULL THEN ROUND((biacromial_cm * 1.5)::numeric, 2) ELSE NULL END
  ) STORED,
  longitud_pierna_cm NUMERIC(5,2),
  extraescolar BOOLEAN NOT NULL DEFAULT false,
  horas_extraescolar NUMERIC(4,1),
  codigo_acceso TEXT NOT NULL UNIQUE DEFAULT (
    upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 9))
  ),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, id_aula)
);

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alumnos_grupo ON public.alumnos(grupo_id);
CREATE INDEX idx_alumnos_codigo ON public.alumnos(codigo_acceso);

CREATE TRIGGER trg_alumnos_updated_at
BEFORE UPDATE ON public.alumnos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: pruebas_eurofit
-- ============================================================
CREATE TABLE public.pruebas_eurofit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Valores
  wells_cm NUMERIC(5,2),
  salto_vertical_cm NUMERIC(5,2),
  abdominales_60 INTEGER,
  lanz_hombros_m NUMERIC(5,2),
  sprint_50_seg NUMERIC(5,2),
  cooper_m INTEGER,
  -- Percepción esfuerzo Omni-Res 0-10 por cada prueba
  omni_wells SMALLINT CHECK (omni_wells BETWEEN 0 AND 10),
  omni_salto SMALLINT CHECK (omni_salto BETWEEN 0 AND 10),
  omni_abdominales SMALLINT CHECK (omni_abdominales BETWEEN 0 AND 10),
  omni_lanz SMALLINT CHECK (omni_lanz BETWEEN 0 AND 10),
  omni_sprint SMALLINT CHECK (omni_sprint BETWEEN 0 AND 10),
  omni_cooper SMALLINT CHECK (omni_cooper BETWEEN 0 AND 10),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_id)
);

ALTER TABLE public.pruebas_eurofit ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_eurofit_alumno ON public.pruebas_eurofit(alumno_id);

CREATE TRIGGER trg_eurofit_updated_at
BEFORE UPDATE ON public.pruebas_eurofit
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: pruebas_cfs
-- ============================================================
CREATE TABLE public.pruebas_cfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Valores
  thomas SMALLINT CHECK (thomas IN (1,2)), -- 1 contacta, 2 no contacta
  biering_sorensen_seg NUMERIC(5,2),
  sj_cm NUMERIC(5,2),
  cmj_cm NUMERIC(5,2),
  indice_elastico NUMERIC(6,3) GENERATED ALWAYS AS (
    CASE WHEN sj_cm IS NOT NULL AND sj_cm > 0 AND cmj_cm IS NOT NULL
         THEN ROUND(((cmj_cm - sj_cm) / sj_cm * 100)::numeric, 3)
         ELSE NULL END
  ) STORED,
  lanz_med_izq_m NUMERIC(5,2),
  lanz_med_der_m NUMERIC(5,2),
  sprint_30_seg NUMERIC(5,2),
  rockport_min INTEGER,
  rockport_seg INTEGER,
  rockport_fc INTEGER,
  -- Omni-Res
  omni_thomas SMALLINT CHECK (omni_thomas BETWEEN 0 AND 10),
  omni_biering SMALLINT CHECK (omni_biering BETWEEN 0 AND 10),
  omni_saltos SMALLINT CHECK (omni_saltos BETWEEN 0 AND 10),
  omni_lanz SMALLINT CHECK (omni_lanz BETWEEN 0 AND 10),
  omni_sprint SMALLINT CHECK (omni_sprint BETWEEN 0 AND 10),
  omni_rockport SMALLINT CHECK (omni_rockport BETWEEN 0 AND 10),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_id)
);

ALTER TABLE public.pruebas_cfs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cfs_alumno ON public.pruebas_cfs(alumno_id);

CREATE TRIGGER trg_cfs_updated_at
BEFORE UPDATE ON public.pruebas_cfs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: baremos
-- ============================================================
CREATE TABLE public.baremos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prueba TEXT NOT NULL,             -- ej: 'wells', 'salto_vertical', 'thomas', etc.
  bateria TEXT NOT NULL CHECK (bateria IN ('eurofit','cfs')),
  sexo sexo_enum NOT NULL,
  edad_min SMALLINT NOT NULL,
  edad_max SMALLINT NOT NULL,
  valor_min NUMERIC(8,3),
  valor_max NUMERIC(8,3),
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 10),
  -- Si higher_better = true, valores más altos dan mejor nota; si false, más bajos
  higher_better BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.baremos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_baremos_lookup ON public.baremos(prueba, sexo, edad_min, edad_max);

CREATE TRIGGER trg_baremos_updated_at
BEFORE UPDATE ON public.baremos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: procedimientos
-- ============================================================
CREATE TABLE public.procedimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prueba TEXT NOT NULL,
  bateria TEXT NOT NULL CHECK (bateria IN ('eurofit','cfs')),
  idioma TEXT NOT NULL DEFAULT 'es' CHECK (idioma IN ('es','val','en')),
  procedimiento_md TEXT NOT NULL,   -- markdown con instrucciones
  baremo_descripcion_md TEXT,
  referencia_apa TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prueba, idioma)
);

ALTER TABLE public.procedimientos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_proc_lookup ON public.procedimientos(prueba, idioma);

CREATE TRIGGER trg_proc_updated_at
BEFORE UPDATE ON public.procedimientos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLA: config_publica (singleton)
-- ============================================================
CREATE TABLE public.config_publica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idioma_default TEXT NOT NULL DEFAULT 'es' CHECK (idioma_default IN ('es','val','en')),
  mostrar_eurofit BOOLEAN NOT NULL DEFAULT true,
  mostrar_cfs BOOLEAN NOT NULL DEFAULT true,
  mostrar_antropometria BOOLEAN NOT NULL DEFAULT true,
  mostrar_por_curso BOOLEAN NOT NULL DEFAULT true,
  mostrar_por_sexo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_publica ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_config_publica_updated_at
BEFORE UPDATE ON public.config_publica
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.config_publica DEFAULT VALUES;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- centros: el profesor puede ver TODOS los centros (para reutilizar) pero solo edita los que creó.
CREATE POLICY "Authenticated can view centros" ON public.centros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create centros" ON public.centros
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update own centros" ON public.centros
  FOR UPDATE USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "Owners or admin can delete centros" ON public.centros
  FOR DELETE USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- grupos
CREATE POLICY "Profesores ven sus grupos" ON public.grupos
  FOR SELECT USING (auth.uid() = profesor_id OR public.is_admin(auth.uid()));
CREATE POLICY "Profesores crean grupos" ON public.grupos
  FOR INSERT WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Profesores editan sus grupos" ON public.grupos
  FOR UPDATE USING (auth.uid() = profesor_id OR public.is_admin(auth.uid()));
CREATE POLICY "Profesores borran sus grupos" ON public.grupos
  FOR DELETE USING (auth.uid() = profesor_id OR public.is_admin(auth.uid()));

-- alumnos: vinculados a grupo del profesor
CREATE POLICY "Profesores ven alumnos de sus grupos" ON public.alumnos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Profesores crean alumnos en sus grupos" ON public.alumnos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.profesor_id = auth.uid())
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "Profesores editan alumnos de sus grupos" ON public.alumnos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Profesores borran alumnos de sus grupos" ON public.alumnos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );

-- pruebas_eurofit
CREATE POLICY "Pruebas eurofit visibles para profesor del grupo" ON public.pruebas_eurofit
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Pruebas eurofit creables por profesor" ON public.pruebas_eurofit
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Pruebas eurofit editables por profesor" ON public.pruebas_eurofit
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Pruebas eurofit borrables por profesor" ON public.pruebas_eurofit
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );

-- pruebas_cfs (mismas reglas)
CREATE POLICY "Pruebas cfs visibles para profesor del grupo" ON public.pruebas_cfs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Pruebas cfs creables por profesor" ON public.pruebas_cfs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Pruebas cfs editables por profesor" ON public.pruebas_cfs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );
CREATE POLICY "Pruebas cfs borrables por profesor" ON public.pruebas_cfs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.alumnos a JOIN public.grupos g ON g.id = a.grupo_id
            WHERE a.id = alumno_id AND (g.profesor_id = auth.uid() OR public.is_admin(auth.uid())))
  );

-- baremos: lectura pública autenticada, escritura solo admin
CREATE POLICY "Authenticated read baremos" ON public.baremos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read baremos" ON public.baremos
  FOR SELECT TO anon USING (true);
CREATE POLICY "Only admin write baremos" ON public.baremos
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- procedimientos: lectura pública, escritura solo admin
CREATE POLICY "Authenticated read procedimientos" ON public.procedimientos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read procedimientos" ON public.procedimientos
  FOR SELECT TO anon USING (true);
CREATE POLICY "Only admin write procedimientos" ON public.procedimientos
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- config_publica: lectura pública, escritura solo admin
CREATE POLICY "Anyone read config publica" ON public.config_publica
  FOR SELECT USING (true);
CREATE POLICY "Only admin update config publica" ON public.config_publica
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- ============================================================
-- FUNCIÓN PÚBLICA: obtener datos de alumno por código de acceso
-- (sin auth, lectura limitada a sus propios datos)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_alumno_by_codigo(_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'alumno', to_jsonb(a.*) - 'id' - 'grupo_id',
    'eurofit', (SELECT to_jsonb(e.*) - 'id' - 'alumno_id' FROM public.pruebas_eurofit e WHERE e.alumno_id = a.id),
    'cfs', (SELECT to_jsonb(c.*) - 'id' - 'alumno_id' FROM public.pruebas_cfs c WHERE c.alumno_id = a.id)
  )
  INTO result
  FROM public.alumnos a
  WHERE a.codigo_acceso = upper(_codigo);

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_alumno_by_codigo(TEXT) TO anon, authenticated;
