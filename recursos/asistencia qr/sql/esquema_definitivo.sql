-- =============================================================
-- 📋 ESQUEMA DEFINITIVO: SISTEMA DE ASISTENCIA QR
-- ⚡ Extraído directamente de Supabase Cloud (2026-07-01)
-- =============================================================
-- Este archivo es la FUENTE DE VERDAD.
-- Refleja exactamente las tablas y políticas RLS que están
-- desplegadas actualmente en la nube.
-- =============================================================

-- =============================================================
-- FASE 1: CREACIÓN DE TABLAS (IF NOT EXISTS)
-- =============================================================

-- 1. Profesores
CREATE TABLE IF NOT EXISTS public.profesores (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    device_id TEXT,
    sesion_token TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Alumnos
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    matricula TEXT NOT NULL,
    device_id TEXT,
    sesion_token TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Grupos
CREATE TABLE IF NOT EXISTS public.grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id UUID NOT NULL REFERENCES public.profesores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    materia TEXT,
    limite_salidas INTEGER DEFAULT 3,
    numero_perdones INTEGER DEFAULT 2,
    codigo_unico TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    radio_metros DOUBLE PRECISION DEFAULT 100,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Grupo_Alumnos (inscripciones)
CREATE TABLE IF NOT EXISTS public.grupo_alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, grupo_id)
);

-- 5. Sesiones de Clase
CREATE TABLE IF NOT EXISTS public.sesiones_clase (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    profesor_id UUID NOT NULL REFERENCES public.profesores(id) ON DELETE CASCADE,
    codigo_sesion TEXT NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Asistencia
CREATE TABLE IF NOT EXISTS public.asistencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    estado TEXT DEFAULT 'presente',
    tipo_asistencia TEXT DEFAULT 'regular',
    sesion_codigo TEXT NOT NULL,
    cambios_pantalla INTEGER DEFAULT 0,
    confirmada BOOLEAN DEFAULT FALSE,
    perdonada BOOLEAN DEFAULT FALSE,
    ultimo_cambio TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, sesion_codigo)
);

-- 7. Log de Salidas (auditoría de pérdida de foco)
CREATE TABLE IF NOT EXISTS public.log_salidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID NOT NULL REFERENCES public.asistencia(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    duracion_segundos INTEGER,
    registrada_en TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Perdones
CREATE TABLE IF NOT EXISTS public.perdones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID NOT NULL REFERENCES public.asistencia(id) ON DELETE CASCADE,
    profesor_id UUID REFERENCES public.profesores(id) ON DELETE SET NULL,
    razon TEXT,
    otorgado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Horarios
CREATE TABLE IF NOT EXISTS public.horarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    puntual_minutos INTEGER DEFAULT 10,
    retardo_minutos INTEGER DEFAULT 20,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- FASE 2: POLÍTICAS RLS (extraídas de Supabase Cloud)
-- =============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE IF EXISTS public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grupo_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sesiones_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.log_salidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.perdones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.horarios ENABLE ROW LEVEL SECURITY;

-- ===== 1. PROFESORES =====
DROP POLICY IF EXISTS "profesores_insert_own" ON public.profesores;
CREATE POLICY "profesores_insert_own" ON public.profesores
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_select_own" ON public.profesores;
CREATE POLICY "profesores_select_own" ON public.profesores
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_update_own" ON public.profesores;
CREATE POLICY "profesores_update_own" ON public.profesores
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== 2. ALUMNOS =====
DROP POLICY IF EXISTS "alumnos_insert_own" ON public.alumnos;
CREATE POLICY "alumnos_insert_own" ON public.alumnos
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "alumnos_select_own" ON public.alumnos;
CREATE POLICY "alumnos_select_own" ON public.alumnos
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "alumnos_update_own" ON public.alumnos;
CREATE POLICY "alumnos_update_own" ON public.alumnos
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_select_alumnos" ON public.alumnos;
CREATE POLICY "profesores_select_alumnos" ON public.alumnos
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profesores WHERE profesores.id = auth.uid()
    ));

-- ===== 3. GRUPOS =====
DROP POLICY IF EXISTS "profesores_all_grupos" ON public.grupos;
CREATE POLICY "profesores_all_grupos" ON public.grupos
    FOR ALL USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "alumnos_select_grupos" ON public.grupos;
CREATE POLICY "alumnos_select_grupos" ON public.grupos
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.alumnos WHERE alumnos.id = auth.uid()
    ));

-- ===== 4. GRUPO_ALUMNOS (inscripciones) =====
DROP POLICY IF EXISTS "alumnos_insert_inscripcion" ON public.grupo_alumnos;
CREATE POLICY "alumnos_insert_inscripcion" ON public.grupo_alumnos
    FOR INSERT WITH CHECK (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "alumnos_select_inscripcion" ON public.grupo_alumnos;
CREATE POLICY "alumnos_select_inscripcion" ON public.grupo_alumnos
    FOR SELECT USING (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "profesores_all_inscripciones" ON public.grupo_alumnos;
CREATE POLICY "profesores_all_inscripciones" ON public.grupo_alumnos
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.grupos
        WHERE grupos.id = grupo_alumnos.grupo_id AND grupos.profesor_id = auth.uid()
    ));

-- ===== 5. SESIONES_CLASE =====
DROP POLICY IF EXISTS "profesores_all_sesiones" ON public.sesiones_clase;
CREATE POLICY "profesores_all_sesiones" ON public.sesiones_clase
    FOR ALL USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "alumnos_select_sesiones" ON public.sesiones_clase;
CREATE POLICY "alumnos_select_sesiones" ON public.sesiones_clase
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.grupo_alumnos
        WHERE grupo_alumnos.grupo_id = sesiones_clase.grupo_id
          AND grupo_alumnos.alumno_id = auth.uid()
    ));

-- ===== 6. ASISTENCIA =====
DROP POLICY IF EXISTS "alumnos_insert_asistencia" ON public.asistencia;
CREATE POLICY "alumnos_insert_asistencia" ON public.asistencia
    FOR INSERT WITH CHECK (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "alumnos_select_asistencia" ON public.asistencia;
CREATE POLICY "alumnos_select_asistencia" ON public.asistencia
    FOR SELECT USING (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "alumnos_update_asistencia" ON public.asistencia;
CREATE POLICY "alumnos_update_asistencia" ON public.asistencia
    FOR UPDATE USING (auth.uid() = alumno_id) WITH CHECK (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "profesores_all_asistencias" ON public.asistencia;
CREATE POLICY "profesores_all_asistencias" ON public.asistencia
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ));

-- ===== 7. LOG_SALIDAS =====
DROP POLICY IF EXISTS "alumnos_insert_log" ON public.log_salidas;
CREATE POLICY "alumnos_insert_log" ON public.log_salidas
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.asistencia
        WHERE asistencia.id = log_salidas.asistencia_id
          AND asistencia.alumno_id = auth.uid()
    ));

DROP POLICY IF EXISTS "alumnos_select_log" ON public.log_salidas;
CREATE POLICY "alumnos_select_log" ON public.log_salidas
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.asistencia
        WHERE asistencia.id = log_salidas.asistencia_id
          AND asistencia.alumno_id = auth.uid()
    ));

DROP POLICY IF EXISTS "profesores_select_logs" ON public.log_salidas;
CREATE POLICY "profesores_select_logs" ON public.log_salidas
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.asistencia
        JOIN public.grupos ON grupos.id = asistencia.grupo_id
        WHERE asistencia.id = log_salidas.asistencia_id
          AND grupos.profesor_id = auth.uid()
    ));

-- ===== 8. PERDONES =====
DROP POLICY IF EXISTS "profesores_all_perdones" ON public.perdones;
CREATE POLICY "profesores_all_perdones" ON public.perdones
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.asistencia
        JOIN public.grupos ON grupos.id = asistencia.grupo_id
        WHERE asistencia.id = perdones.asistencia_id
          AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "alumnos_select_perdones" ON public.perdones;
CREATE POLICY "alumnos_select_perdones" ON public.perdones
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.asistencia
        WHERE asistencia.id = perdones.asistencia_id
          AND asistencia.alumno_id = auth.uid()
    ));

-- ===== 9. HORARIOS =====
DROP POLICY IF EXISTS "profesores_all_horarios" ON public.horarios;
CREATE POLICY "profesores_all_horarios" ON public.horarios
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.grupos
        WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "alumnos_select_horarios" ON public.horarios;
CREATE POLICY "alumnos_select_horarios" ON public.horarios
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.grupo_alumnos
        WHERE grupo_alumnos.grupo_id = horarios.grupo_id
          AND grupo_alumnos.alumno_id = auth.uid()
    ));

-- =============================================================
-- FASE 3: ÍNDICES DE RENDIMIENTO
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_asistencia_alumno_grupo_fecha
    ON public.asistencia(alumno_id, grupo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_clase
    ON public.asistencia(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_alumnos_grupo
    ON public.grupo_alumnos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_alumnos_alumno
    ON public.grupo_alumnos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_codigo
    ON public.sesiones_clase(codigo_sesion);
CREATE INDEX IF NOT EXISTS idx_horarios_grupo
    ON public.horarios(grupo_id);
CREATE INDEX IF NOT EXISTS idx_log_salidas_asistencia
    ON public.log_salidas(asistencia_id);

-- =============================================================
-- 🔄 MIGRACIÓN: Soporte múltiples clases por día
-- =============================================================
ALTER TABLE public.asistencia DROP CONSTRAINT IF EXISTS asistencia_alumno_grupo_fecha_key;
ALTER TABLE public.asistencia DROP CONSTRAINT IF EXISTS unique_alumno_grupo_fecha;
ALTER TABLE public.asistencia ADD CONSTRAINT unique_alumno_sesion UNIQUE(alumno_id, sesion_codigo);

-- =============================================================
-- ✅ VERIFICACIÓN: debe mostrar 25 políticas (tras limpiar fantasmas)
-- =============================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
