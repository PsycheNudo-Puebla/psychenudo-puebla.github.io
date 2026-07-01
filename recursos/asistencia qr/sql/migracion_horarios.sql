-- =====================================================
-- MIGRACIÓN: Horarios fijos + GPS + Límites configurables + RLS faltantes
-- =====================================================

-- 1. COLUMNAS NUEVAS EN grupos (GPS del salón)
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS radio_metros INTEGER DEFAULT 100;

-- 2. COLUMNA NUEVA EN asistencia (tipo: presente/retardo)
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS tipo_asistencia TEXT DEFAULT 'presente';

-- 3. TABLA: horarios (días, horas y límites por día)
CREATE TABLE IF NOT EXISTS horarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    puntual_minutos INTEGER DEFAULT 10,
    retardo_minutos INTEGER DEFAULT 20,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS PARA TABLA horarios
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horarios_insert_profesor" ON horarios;
CREATE POLICY "horarios_insert_profesor" ON horarios
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()));

DROP POLICY IF EXISTS "horarios_select_profesor" ON horarios;
CREATE POLICY "horarios_select_profesor" ON horarios
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()));

DROP POLICY IF EXISTS "horarios_update_profesor" ON horarios;
CREATE POLICY "horarios_update_profesor" ON horarios
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()));

DROP POLICY IF EXISTS "horarios_delete_profesor" ON horarios;
CREATE POLICY "horarios_delete_profesor" ON horarios
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id AND grupos.profesor_id = auth.uid()));

-- 5. RLS FALTANTES PARA asistencia (profesor puede leer/actualizar, alumno puede actualizar)

-- Profesor: SELECT en asistencia de sus grupos
DROP POLICY IF EXISTS "asistencia_select_profesor" ON asistencia;
CREATE POLICY "asistencia_select_profesor" ON asistencia
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ));

-- Profesor: UPDATE en asistencia de sus grupos (perdonar)
DROP POLICY IF EXISTS "asistencia_update_profesor" ON asistencia;
CREATE POLICY "asistencia_update_profesor" ON asistencia
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM grupos
        WHERE grupos.id = asistencia.grupo_id AND grupos.profesor_id = auth.uid()
    ));

-- Alumno: UPDATE en su propia asistencia (cambios_pantalla, confirmar)
DROP POLICY IF EXISTS "asistencia_update_own" ON asistencia;
CREATE POLICY "asistencia_update_own" ON asistencia
    FOR UPDATE
    USING (auth.uid() = alumno_id)
    WITH CHECK (auth.uid() = alumno_id);

-- 6. RLS FALTANTES PARA alumnos (profesor puede ver alumnos de sus grupos)
DROP POLICY IF EXISTS "alumnos_select_profesor" ON alumnos;
CREATE POLICY "alumnos_select_profesor" ON alumnos
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM grupo_alumnos
        JOIN grupos ON grupos.id = grupo_alumnos.grupo_id
        WHERE grupo_alumnos.alumno_id = alumnos.id
        AND grupos.profesor_id = auth.uid()
    ));

-- 7. Realtime ya está habilitado (de migración anterior)
-- ALTER PUBLICATION supabase_realtime ADD TABLE asistencia;
