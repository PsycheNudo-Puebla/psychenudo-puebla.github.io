-- =============================================================
-- 📋 MIGRACIÓN: Token de Monitoreo + KeepAlive
-- Fecha: 2026-07-08
-- =============================================================
-- Agrega las columnas necesarias para el sistema de token
-- de monitoreo que permite mantener sesiones activas y
-- limpiarlas al confirmar asistencia.
--
-- Cómo usar: Abre el SQL Editor de Supabase, pega todo y
-- haz clic en "Run".
-- =============================================================

-- 1. Columna: token de monitoreo en asistencia (UUID generado por el alumno)
ALTER TABLE public.asistencia
ADD COLUMN IF NOT EXISTS token_monitoreo TEXT;

COMMENT ON COLUMN public.asistencia.token_monitoreo
IS 'UUID único generado por el alumno al iniciar monitoreo. Se elimina al confirmar asistencia.';

-- 2. Columna: último acceso del token (timestamp actualizado cada 60s)
ALTER TABLE public.asistencia
ADD COLUMN IF NOT EXISTS ultimo_acceso_token TIMESTAMPTZ;

COMMENT ON COLUMN public.asistencia.ultimo_acceso_token
IS 'Timestamp del último keepalive del token de monitoreo (se actualiza cada 60s)';

-- =============================================================
-- VERIFICACIÓN (opcional, puedes ejecutarlo después)
-- =============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'asistencia'
--   AND column_name IN ('token_monitoreo', 'ultimo_acceso_token')
-- ORDER BY column_name;
