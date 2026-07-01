-- =====================================================
-- MIGRACIÓN: Sistema de monitoreo de asistencia
-- =====================================================

-- 1. Añadir columnas a la tabla asistencia
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS cambios_pantalla INTEGER DEFAULT 0;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS confirmada BOOLEAN DEFAULT false;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS perdonada BOOLEAN DEFAULT false;
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS ultimo_cambio TIMESTAMPTZ;

-- 2. Habilitar Realtime para la tabla asistencia
ALTER PUBLICATION supabase_realtime ADD TABLE asistencia;

-- 3. Política para que alumnos vean grupos (buscar por código)
DROP POLICY IF EXISTS "grupos_select_join" ON grupos;
CREATE POLICY "grupos_select_join" ON grupos
    FOR SELECT
    USING (auth.role() = 'authenticated');
