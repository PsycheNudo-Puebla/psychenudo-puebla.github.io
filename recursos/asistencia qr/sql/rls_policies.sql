-- =====================================================
-- SETUP COMPLETO: TABLAS + POLÍTICAS RLS
-- SISTEMA DE ASISTENCIA QR
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- ===== 1. CREAR TABLAS (si no existen) =====

-- Tabla: profesores
CREATE TABLE IF NOT EXISTS profesores (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    device_id TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: alumnos
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    matricula TEXT NOT NULL,
    device_id TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: grupos
CREATE TABLE IF NOT EXISTS grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    materia TEXT,
    limite_salidas INTEGER DEFAULT 3,
    numero_perdones INTEGER DEFAULT 2,
    codigo_unico TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: grupo_alumnos
CREATE TABLE IF NOT EXISTS grupo_alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, grupo_id)
);

-- Tabla: asistencia
CREATE TABLE IF NOT EXISTS asistencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado TEXT DEFAULT 'presente',
    sesion_codigo TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, grupo_id, fecha)
);

-- Tabla: sesiones_clase
CREATE TABLE IF NOT EXISTS sesiones_clase (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
    codigo_sesion TEXT NOT NULL,
    activa BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 2. POLÍTICAS RLS =====

-- 1. TABLA: profesores
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;

-- 1. TABLA: profesores
DROP POLICY IF EXISTS "profesores_insert_own" ON profesores;
CREATE POLICY "profesores_insert_own" ON profesores
    FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_select_own" ON profesores;
CREATE POLICY "profesores_select_own" ON profesores
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_update_own" ON profesores;
CREATE POLICY "profesores_update_own" ON profesores
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- 2. TABLA: alumnos
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumnos_insert_own" ON alumnos;
CREATE POLICY "alumnos_insert_own" ON alumnos
    FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "alumnos_select_own" ON alumnos;
CREATE POLICY "alumnos_select_own" ON alumnos
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "alumnos_update_own" ON alumnos;
CREATE POLICY "alumnos_update_own" ON alumnos
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- 3. TABLA: grupos
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grupos_insert_own" ON grupos;
CREATE POLICY "grupos_insert_own" ON grupos
    FOR INSERT
    WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "grupos_select_own" ON grupos;
CREATE POLICY "grupos_select_own" ON grupos
    FOR SELECT
    USING (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "grupos_select_join" ON grupos;
CREATE POLICY "grupos_select_join" ON grupos
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "grupos_delete_own" ON grupos;
CREATE POLICY "grupos_delete_own" ON grupos
    FOR DELETE
    USING (auth.uid() = profesor_id);


-- 4. TABLA: grupo_alumnos
ALTER TABLE grupo_alumnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grupo_alumnos_insert_own" ON grupo_alumnos;
CREATE POLICY "grupo_alumnos_insert_own" ON grupo_alumnos
    FOR INSERT
    WITH CHECK (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "grupo_alumnos_select_own" ON grupo_alumnos;
CREATE POLICY "grupo_alumnos_select_own" ON grupo_alumnos
    FOR SELECT
    USING (auth.uid() = alumno_id);


-- 5. TABLA: asistencia
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asistencia_insert_own" ON asistencia;
CREATE POLICY "asistencia_insert_own" ON asistencia
    FOR INSERT
    WITH CHECK (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "asistencia_select_own" ON asistencia;
CREATE POLICY "asistencia_select_own" ON asistencia
    FOR SELECT
    USING (auth.uid() = alumno_id);


-- 6. TABLA: sesiones_clase
ALTER TABLE sesiones_clase ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sesiones_insert_own" ON sesiones_clase;
CREATE POLICY "sesiones_insert_own" ON sesiones_clase
    FOR INSERT
    WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "sesiones_select_all" ON sesiones_clase;
CREATE POLICY "sesiones_select_all" ON sesiones_clase
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sesiones_update_own" ON sesiones_clase;
CREATE POLICY "sesiones_update_own" ON sesiones_clase
    FOR UPDATE
    USING (auth.uid() = profesor_id)
    WITH CHECK (auth.uid() = profesor_id);
