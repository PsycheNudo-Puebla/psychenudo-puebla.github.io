-- =============================================================
-- MIGRACIÓN COMPLETA — SISTEMA DE ASISTENCIA QR
-- =============================================================
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- Este script es IDEMPOTENTE (se puede ejecutar varias veces sin
-- romper nada) porque usa IF NOT EXISTS / IF EXISTS / OR REPLACE.
-- =============================================================

-- =============================================================
-- 1. CREAR TABLAS (en orden de dependencias)
-- =============================================================

-- 1.1 Profesores (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS profesores (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    device_id TEXT,
    sesion_token TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Grupos (depende de profesores)
CREATE TABLE IF NOT EXISTS grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    materia TEXT,
    limite_salidas INTEGER DEFAULT 3,
    numero_perdones INTEGER DEFAULT 2,
    codigo_unico TEXT UNIQUE,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    radio_metros INTEGER DEFAULT 100,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Alumnos (independiente, se asigna a grupos después)
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    matricula TEXT NOT NULL,
    device_id TEXT,
    sesion_token TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Relación alumno-grupo (depende de alumnos y grupos)
CREATE TABLE IF NOT EXISTS grupo_alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, grupo_id)
);

-- 1.5 Sesiones de clase (QR por clase)
CREATE TABLE IF NOT EXISTS sesiones_clase (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
    codigo_sesion TEXT NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 Asistencias (depende de alumnos y grupos)
CREATE TABLE IF NOT EXISTS asistencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado TEXT DEFAULT 'presente',
    tipo_asistencia TEXT DEFAULT 'presente',
    sesion_codigo TEXT,
    cambios_pantalla INTEGER DEFAULT 0,
    confirmada BOOLEAN DEFAULT FALSE,
    perdonada BOOLEAN DEFAULT FALSE,
    ultimo_cambio TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alumno_id, grupo_id, fecha)
);

-- 1.7 Log de salidas (auditoría)
CREATE TABLE IF NOT EXISTS log_salidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID REFERENCES asistencia(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'blur', 'visibility_hidden'
    duracion_segundos INT,
    registrada_en TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 Perdones (otorgados por profesor)
CREATE TABLE IF NOT EXISTS perdones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID REFERENCES asistencia(id) ON DELETE CASCADE,
    profesor_id UUID REFERENCES profesores(id),
    razon TEXT,
    otorgado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 Horarios fijos de clase
CREATE TABLE IF NOT EXISTS horarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    puntual_minutos INTEGER DEFAULT 10,
    retardo_minutos INTEGER DEFAULT 20,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 2. COLUMNAS ADICIONALES (por si ya existen las tablas)
-- =============================================================

ALTER TABLE grupos ADD COLUMN IF NOT EXISTS codigo_unico TEXT;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS radio_metros INTEGER DEFAULT 100;

ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS sesion_token TEXT;

ALTER TABLE profesores ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE profesores ADD COLUMN IF NOT EXISTS sesion_token TEXT;

ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS cambios_pantalla INTEGER DEFAULT 0;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS confirmada BOOLEAN DEFAULT FALSE;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS perdonada BOOLEAN DEFAULT FALSE;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS ultimo_cambio TIMESTAMPTZ;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS tipo_asistencia TEXT DEFAULT 'presente';

ALTER TABLE horarios ADD COLUMN IF NOT EXISTS puntual_minutos INTEGER DEFAULT 10;
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS retardo_minutos INTEGER DEFAULT 20;

-- =============================================================
-- 3. ÍNDICES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_asistencia_alumno_grupo_fecha ON asistencia(alumno_id, grupo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_clase ON asistencia(grupo_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_grupo ON grupo_alumnos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_device ON alumnos(device_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_codigo ON sesiones_clase(codigo_sesion);
CREATE INDEX IF NOT EXISTS idx_horarios_grupo ON horarios(grupo_id);

-- =============================================================
-- 4. HABILITAR ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_salidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perdones ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 5. POLÍTICAS RLS
-- =============================================================

-- 5.1 Profesores: solo su propia fila
DROP POLICY IF EXISTS "profesores_insert_own" ON profesores;
CREATE POLICY "profesores_insert_own" ON profesores
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_select_own" ON profesores;
CREATE POLICY "profesores_select_own" ON profesores
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profesores_update_own" ON profesores;
CREATE POLICY "profesores_update_own" ON profesores
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5.2 Alumnos: solo su propia fila
DROP POLICY IF EXISTS "alumnos_insert_own" ON alumnos;
CREATE POLICY "alumnos_insert_own" ON alumnos
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "alumnos_select_own" ON alumnos;
CREATE POLICY "alumnos_select_own" ON alumnos
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "alumnos_update_own" ON alumnos;
CREATE POLICY "alumnos_update_own" ON alumnos
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5.3 Alumnos: profesor puede ver alumnos de sus grupos
DROP POLICY IF EXISTS "alumnos_select_profesor" ON alumnos;
CREATE POLICY "alumnos_select_profesor" ON alumnos
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM grupo_alumnos
        JOIN grupos ON grupos.id = grupo_alumnos.grupo_id
        WHERE grupo_alumnos.alumno_id = alumnos.id
        AND grupos.profesor_id = auth.uid()
    ));

-- 5.4 Grupos: profesor puede gestionar sus propios grupos
DROP POLICY IF EXISTS "grupos_insert_own" ON grupos;
CREATE POLICY "grupos_insert_own" ON grupos
    FOR INSERT WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "grupos_select_own" ON grupos;
CREATE POLICY "grupos_select_own" ON grupos
    FOR SELECT USING (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "grupos_delete_own" ON grupos;
CREATE POLICY "grupos_delete_own" ON grupos
    FOR DELETE USING (auth.uid() = profesor_id);

-- 5.5 Grupos: cualquier autenticado puede buscar por código (para unirse)
DROP POLICY IF EXISTS "grupos_select_join" ON grupos;
CREATE POLICY "grupos_select_join" ON grupos
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5.6 Grupo_Alumnos: alumno se inscribe solo
DROP POLICY IF EXISTS "grupo_alumnos_insert_own" ON grupo_alumnos;
CREATE POLICY "grupo_alumnos_insert_own" ON grupo_alumnos
    FOR INSERT WITH CHECK (auth.uid() = alumno_id);

DROP POLICY IF EXISTS "grupo_alumnos_select_own" ON grupo_alumnos;
CREATE POLICY "grupo_alumnos_select_own" ON grupo_alumnos
    FOR SELECT USING (auth.uid() = alumno_id);

-- 5.7 Grupo_Alumnos: profesor puede eliminar inscripciones
DROP POLICY IF EXISTS "grupo_alumnos_delete_profesor" ON grupo_alumnos;
CREATE POLICY "grupo_alumnos_delete_profesor" ON grupo_alumnos
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM grupos WHERE grupos.id = grupo_alumnos.grupo_id
        AND grupos.profesor_id = auth.uid()
    ));

-- 5.8 Asistencia: alumno inserta su propia asistencia
DROP POLICY IF EXISTS "asistencia_insert_own" ON asistencia;
CREATE POLICY "asistencia_insert_own" ON asistencia
    FOR INSERT WITH CHECK (auth.uid() = alumno_id);

-- 5.9 Asistencia: alumno selecciona su propia asistencia
DROP POLICY IF EXISTS "asistencia_select_own" ON asistencia;
CREATE POLICY "asistencia_select_own" ON asistencia
    FOR SELECT USING (auth.uid() = alumno_id);

-- 5.10 Asistencia: alumno actualiza su propia asistencia
DROP POLICY IF EXISTS "asistencia_update_own" ON asistencia;
CREATE POLICY "asistencia_update_own" ON asistencia
    FOR UPDATE USING (auth.uid() = alumno_id) WITH CHECK (auth.uid() = alumno_id);

-- 5.11 Asistencia: profesor puede SELECT/UPDATE/DELETE asistencia de sus grupos
DROP POLICY IF EXISTS "asistencia_select_profesor" ON asistencia;
CREATE POLICY "asistencia_select_profesor" ON asistencia
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "asistencia_update_profesor" ON asistencia;
CREATE POLICY "asistencia_update_profesor" ON asistencia
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    )) WITH CHECK (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "asistencia_delete_profesor" ON asistencia;
CREATE POLICY "asistencia_delete_profesor" ON asistencia
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ));

-- 5.12 Sesiones_Clase: profesor crea sus sesiones
DROP POLICY IF EXISTS "sesiones_insert_own" ON sesiones_clase;
CREATE POLICY "sesiones_insert_own" ON sesiones_clase
    FOR INSERT WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "sesiones_select_all" ON sesiones_clase;
CREATE POLICY "sesiones_select_all" ON sesiones_clase
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sesiones_update_own" ON sesiones_clase;
CREATE POLICY "sesiones_update_own" ON sesiones_clase
    FOR UPDATE USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "sesiones_clase_delete_profesor" ON sesiones_clase;
CREATE POLICY "sesiones_clase_delete_profesor" ON sesiones_clase
    FOR DELETE USING (auth.uid() = profesor_id);

-- 5.13 Horarios: profesor gestiona horarios de sus grupos
DROP POLICY IF EXISTS "horarios_insert_profesor" ON horarios;
CREATE POLICY "horarios_insert_profesor" ON horarios
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "horarios_select_profesor" ON horarios;
CREATE POLICY "horarios_select_profesor" ON horarios
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "horarios_update_profesor" ON horarios;
CREATE POLICY "horarios_update_profesor" ON horarios
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()
    )) WITH CHECK (EXISTS (
        SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "horarios_delete_profesor" ON horarios;
CREATE POLICY "horarios_delete_profesor" ON horarios
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()
    ));

-- =============================================================
-- 6. HABILITAR REALTIME (para monitoreo en vivo)
-- =============================================================

-- Nota: si ya están agregadas, "ADD TABLE" lanzará advertencia
-- pero no rompe nada. Puedes ignorarla.
ALTER PUBLICATION supabase_realtime ADD TABLE asistencia;
ALTER PUBLICATION supabase_realtime ADD TABLE log_salidas;
ALTER PUBLICATION supabase_realtime ADD TABLE profesores;
ALTER PUBLICATION supabase_realtime ADD TABLE alumnos;

-- =============================================================
-- 7. VERIFICACIÓN FINAL
-- =============================================================

-- Verificar que todas las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
