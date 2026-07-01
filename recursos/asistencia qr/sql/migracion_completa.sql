-- =============================================================
-- SCRIPT DE BASE DE DATOS UNIFICADO: SISTEMA DE ASISTENCIAS
-- DESPLEGADO EN SUPABASE
-- =============================================================

-- =============================================================
-- FASE 1: LIMPIEZA DE RESIDUOS (En orden inverso de dependencia)
-- =============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.marcar_asistencia_alumno(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;
DROP FUNCTION IF EXISTS public.registrar_salida_pantalla(UUID, TEXT, INTEGER) CASCADE;

DROP TABLE IF EXISTS public.horarios CASCADE;
DROP TABLE IF EXISTS public.perdones CASCADE;
DROP TABLE IF EXISTS public.log_salidas CASCADE;
DROP TABLE IF EXISTS public.asistencia CASCADE;
DROP TABLE IF EXISTS public.sesiones_clase CASCADE;
DROP TABLE IF EXISTS public.grupo_alumnos CASCADE;
DROP TABLE IF EXISTS public.grupos CASCADE;
DROP TABLE IF EXISTS public.alumnos CASCADE;
DROP TABLE IF EXISTS public.profesores CASCADE;

-- =============================================================
-- FASE 2: CREACIÓN DE TABLAS ESTRUCTURALES
-- =============================================================

-- 1. Tabla de Profesores
CREATE TABLE public.profesores (
    id UUID PRIMARY KEY, -- Se empareja con auth.users.id
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Alumnos
CREATE TABLE public.alumnos (
    id UUID PRIMARY KEY, -- Se empareja con auth.users.id
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    matricula TEXT UNIQUE NOT NULL,
    device_id TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Grupos
CREATE TABLE public.grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id UUID NOT NULL REFERENCES public.profesores(id) ON DELETE CASCADE,
    nombre_materia TEXT NOT NULL,
    codigo_grupo TEXT UNIQUE NOT NULL, -- Código para que el alumno se inscriba
    limite_tolerancia INTEGER DEFAULT 3, -- Máximo de pérdidas de foco permitidas
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    radio_metros DOUBLE PRECISION DEFAULT 100,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla Intermedia: Inscripciones (Grupo <-> Alumnos)
CREATE TABLE public.grupo_alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    inscrito_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grupo_id, alumno_id)
);

-- 5. Tabla de Sesiones de Clase (Pase de lista activo)
CREATE TABLE public.sesiones_clase (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    profesor_id UUID NOT NULL REFERENCES public.profesores(id) ON DELETE CASCADE,
    codigo_sesion TEXT NOT NULL, -- Código dinámico del día
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMPTZ DEFAULT NOW(),
    expira_en TIMESTAMPTZ NOT NULL
);

-- 6. Tabla Principal de Asistencia
CREATE TABLE public.asistencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    sesion_codigo TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    hora_entrada TIME DEFAULT CURRENT_TIME,
    estado TEXT NOT NULL CHECK (estado IN ('presente', 'retardo', 'falta', 'justificado')),
    tipo_asistencia TEXT DEFAULT 'regular',
    cambios_pantalla INTEGER DEFAULT 0,
    confirmada BOOLEAN DEFAULT FALSE,
    ultimo_cambio TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, grupo_id, fecha)
);

-- 7. Tabla Log de Salidas (Auditoría de pérdida de foco)
CREATE TABLE public.log_salidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID NOT NULL REFERENCES public.asistencia(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'blur', 'visibility_hidden'
    duracion_segundos INTEGER,
    registrada_en TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Perdones (Justificaciones de incidencias)
CREATE TABLE public.perdones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID NOT NULL REFERENCES public.asistencia(id) ON DELETE CASCADE,
    profesor_id UUID REFERENCES public.profesores(id) ON DELETE SET NULL,
    razon TEXT,
    otorgado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabla de Horarios Fijos
CREATE TABLE public.horarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Lunes...
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    puntual_minutos INTEGER DEFAULT 10,
    retardo_minutos INTEGER DEFAULT 20,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- FASE 3: ÍNDICES DE RENDIMIENTO
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_asistencia_alumno_grupo_fecha ON public.asistencia(alumno_id, grupo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_clase ON public.asistencia(grupo_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_grupo ON public.grupo_alumnos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_device ON public.alumnos(device_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_codigo ON public.sesiones_clase(codigo_sesion);
CREATE INDEX IF NOT EXISTS idx_horarios_grupo ON public.horarios(grupo_id);

-- =============================================================
-- FASE 4: CONFIGURACIÓN DE SEGURIDAD POR FILAS (RLS)
-- =============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_salidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perdones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- Políticas: PROFESORES
CREATE POLICY "profesores_insert_own" ON public.profesores FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profesores_select_own" ON public.profesores FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profesores_update_own" ON public.profesores FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas: ALUMNOS
CREATE POLICY "alumnos_insert_own" ON public.alumnos FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "alumnos_select_own" ON public.alumnos FOR SELECT USING (auth.uid() = id);
CREATE POLICY "alumnos_update_own" ON public.alumnos FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profesores_select_alumnos" ON public.alumnos FOR SELECT USING (EXISTS (SELECT 1 FROM public.profesores WHERE profesores.id = auth.uid()));

-- Políticas: GRUPOS
CREATE POLICY "profesores_all_grupos" ON public.grupos FOR ALL USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "alumnos_select_grupos" ON public.grupos FOR SELECT USING (EXISTS (SELECT 1 FROM public.alumnos WHERE alumnos.id = auth.uid()));

-- Políticas: GRUPO_ALUMNOS (Inscripciones)
CREATE POLICY "alumnos_insert_inscripcion" ON public.grupo_alumnos FOR INSERT WITH CHECK (auth.uid() = alumno_id);
CREATE POLICY "alumnos_select_inscripcion" ON public.grupo_alumnos FOR SELECT USING (auth.uid() = alumno_id);
CREATE POLICY "profesores_all_inscripciones" ON public.grupo_alumnos FOR ALL USING (EXISTS (SELECT 1 FROM public.grupos WHERE grupos.id = grupo_alumnos.grupo_id AND grupos.profesor_id = auth.uid()));

-- Políticas: SESIONES_CLASE
CREATE POLICY "profesores_all_sesiones" ON public.sesiones_clase FOR ALL USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "alumnos_select_sesiones" ON public.sesiones_clase FOR SELECT USING (EXISTS (SELECT 1 FROM public.grupo_alumnos WHERE grupo_alumnos.grupo_id = sesiones_clase.grupo_id AND grupo_alumnos.alumno_id = auth.uid()));

-- Políticas: ASISTENCIA
CREATE POLICY "alumnos_insert_asistencia" ON public.asistencia FOR INSERT WITH CHECK (auth.uid() = alumno_id);
CREATE POLICY "alumnos_select_asistencia" ON public.asistencia FOR SELECT USING (auth.uid() = alumno_id);
CREATE POLICY "alumnos_update_asistencia" ON public.asistencia FOR UPDATE USING (auth.uid() = alumno_id) WITH CHECK (auth.uid() = alumno_id);
CREATE POLICY "profesores_all_asistencias" ON public.asistencia FOR ALL USING (EXISTS (SELECT 1 FROM public.grupos WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()));

-- Políticas: LOG_SALIDAS
CREATE POLICY "alumnos_insert_log" ON public.log_salidas FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = log_salidas.asistencia_id AND asistencia.alumno_id = auth.uid()));
CREATE POLICY "alumnos_select_log" ON public.log_salidas FOR SELECT USING (EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = log_salidas.asistencia_id AND asistencia.alumno_id = auth.uid()));
CREATE POLICY "profesores_select_logs" ON public.log_salidas FOR SELECT USING (EXISTS (SELECT 1 FROM public.asistencia JOIN public.grupos ON grupos.id = asistencia.grupo_id WHERE asistencia.id = log_salidas.asistencia_id AND grupos.profesor_id = auth.uid()));

-- Políticas: PERDONES
CREATE POLICY "profesores_all_perdones" ON public.perdones FOR ALL USING (EXISTS (SELECT 1 FROM public.asistencia JOIN public.grupos ON grupos.id = asistencia.grupo_id WHERE asistencia.id = perdones.asistencia_id AND grupos.profesor_id = auth.uid()));
CREATE POLICY "alumnos_select_perdones" ON public.perdones FOR SELECT USING (EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = perdones.asistencia_id AND asistencia.alumno_id = auth.uid()));

-- Políticas: HORARIOS
CREATE POLICY "profesores_all_horarios" ON public.horarios FOR ALL USING (EXISTS (SELECT 1 FROM public.grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()));
CREATE POLICY "alumnos_select_horarios" ON public.horarios FOR SELECT USING (EXISTS (SELECT 1 FROM public.grupo_alumnos WHERE grupo_alumnos.grupo_id = horarios.grupo_id AND grupo_alumnos.alumno_id = auth.uid()));

-- =============================================================
-- FASE 5: AUTOMATIZACIONES (TRIGGERS)
-- =============================================================

-- Función que procesa el registro nativo de Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_matricula TEXT;
BEGIN
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'alumno');
    user_name := COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario Nuevo');
    
    IF user_role = 'profesor' THEN
        INSERT INTO public.profesores (id, email, nombre)
        VALUES (new.id, new.email, user_name)
        ON CONFLICT (id) DO UPDATE 
        SET email = EXCLUDED.email, nombre = EXCLUDED.nombre;
    ELSE
        user_matricula := COALESCE(new.raw_user_meta_data->>'matricula', 'SIN_MATRICULA');
        
        INSERT INTO public.alumnos (id, email, nombre, matricula)
        VALUES (new.id, new.email, user_name, user_matricula)
        ON CONFLICT (id) DO UPDATE 
        SET email = EXCLUDED.email, nombre = EXCLUDED.nombre, matricula = EXCLUDED.matricula;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador asociado a auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- FASE 6: PROCEDIMIENTOS REMOTOS (RPC) - LÓGICA DE NEGOCIO
-- =============================================================

-- 1. RPC para validar código de pase de lista y geolocalización (Haversine)
CREATE OR REPLACE FUNCTION public.marcar_asistencia_alumno(
    p_alumno_id UUID,
    p_codigo_sesion TEXT,
    p_latitud DOUBLE PRECISION,
    p_longitud DOUBLE PRECISION
)
RETURNS JSONB AS $$
DECLARE
    v_sesion RECORD;
    v_grupo RECORD;
    v_distancia DOUBLE PRECISION;
    v_estado TEXT := 'presente';
    v_tipo TEXT := 'presente';
    v_asistencia_id UUID;
BEGIN
    SELECT s.* INTO v_sesion FROM public.sesiones_clase s WHERE s.codigo_sesion = p_codigo_sesion AND s.activa = TRUE LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', FALSE, 'mensaje', 'El código de sesión no es válido o ya expiró.');
    END IF;

    SELECT g.* INTO v_grupo FROM public.grupos g WHERE g.id = v_sesion.grupo_id;

    IF v_grupo.latitud IS NOT NULL AND v_grupo.longitud IS NOT NULL THEN
        v_distancia := 6371000 * acos(
            cos(radians(p_latitud)) * cos(radians(v_grupo.latitud)) * cos(radians(v_grupo.longitud) - radians(p_longitud)) + 
            sin(radians(p_latitud)) * sin(radians(v_grupo.latitud))
        );
        IF v_distancia > v_grupo.radio_metros THEN
            RETURN jsonb_build_object('ok', FALSE, 'mensaje', 'No te encuentras dentro del rango geográfico del aula de clases.', 'distancia_metros', round(v_distancia::numeric, 2));
        END IF;
    END IF;

    INSERT INTO public.asistencia (alumno_id, grupo_id, sesion_codigo, estado, tipo_asistencia, confirmada)
    VALUES (p_alumno_id, v_grupo.id, p_codigo_sesion, v_estado, v_tipo, TRUE)
    ON CONFLICT (alumno_id, grupo_id, fecha) 
    DO UPDATE SET sesion_codigo = EXCLUDED.sesion_codigo, estado = EXCLUDED.estado, tipo_asistencia = EXCLUDED.tipo_asistencia, confirmada = TRUE, ultimo_cambio = NOW()
    RETURNING id INTO v_asistencia_id;

    RETURN jsonb_build_object('ok', TRUE, 'mensaje', 'Asistencia registrada con éxito.', 'asistencia_id', v_asistencia_id, 'estado', v_estado);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', FALSE, 'mensaje', 'Error interno en el servidor: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC para registrar logs de pérdidas de foco y aplicar penalización automática
CREATE OR REPLACE FUNCTION public.registrar_salida_pantalla(
    p_asistencia_id UUID,
    p_tipo TEXT,
    p_duracion_segundos INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_grupo_id UUID;
    v_cambios_actuales INTEGER;
    v_limite_maximo INTEGER;
BEGIN
    INSERT INTO public.log_salidas (asistencia_id, tipo, duracion_segundos)
    VALUES (p_asistencia_id, p_tipo, p_duracion_segundos);

    UPDATE public.asistencia
    SET cambios_pantalla = cambios_pantalla + 1, ultimo_cambio = NOW()
    WHERE id = p_asistencia_id
    RETURNING grupo_id, cambios_pantalla INTO v_grupo_id, v_cambios_actuales;

    SELECT limite_tolerancia INTO v_limite_maximo FROM public.grupos WHERE id = v_grupo_id;

    IF v_limite_maximo IS NOT NULL AND v_cambios_actuales > v_limite_maximo THEN
        UPDATE public.asistencia SET estado = 'retardo' WHERE id = p_asistencia_id;
        RETURN jsonb_build_object('ok', TRUE, 'mensaje', 'Salida registrada. Se ha aplicado una penalización por exceder el límite de cambios de pantalla.', 'cambios_pantalla', v_cambios_actuales, 'penalizado', TRUE);
    END IF;

    RETURN jsonb_build_object('ok', TRUE, 'mensaje', 'Salida registrada correctamente.', 'cambios_pantalla', v_cambios_actuales, 'penalizado', FALSE);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', FALSE, 'mensaje', 'Error al registrar salida: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;