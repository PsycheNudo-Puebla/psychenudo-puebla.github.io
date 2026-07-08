-- =============================================================
-- 📋 MIGRACIÓN: Heartbeat + Reingreso Controlado
-- Fecha: 2026-07-08
-- =============================================================
-- Agrega las columnas necesarias para el sistema de
-- reingreso controlado con heartbeat.
--
-- Cómo usar: Abre el SQL Editor de Supabase, pega todo y
-- haz clic en "Run".
-- =============================================================

-- 1. Columna: ventana de reingreso en grupos (minutos)
ALTER TABLE public.grupos
ADD COLUMN IF NOT EXISTS ventana_reingreso_min INTEGER DEFAULT 2;

COMMENT ON COLUMN public.grupos.ventana_reingreso_min
IS 'Tiempo máximo en minutos para auto-reingreso sin autorización del profesor';

-- 2. Columna: último latido (heartbeat) en asistencia
ALTER TABLE public.asistencia
ADD COLUMN IF NOT EXISTS ultimo_latido TIMESTAMPTZ;

COMMENT ON COLUMN public.asistencia.ultimo_latido
IS 'Timestamp del último heartbeat del estudiante (prueba presencia activa)';

-- 3. Columna: solicitud de reingreso en asistencia
ALTER TABLE public.asistencia
ADD COLUMN IF NOT EXISTS reingreso_solicitado BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.asistencia.reingreso_solicitado
IS 'Indica si el estudiante ha solicitado reingreso al monitoreo';

-- 4. Actualizar grupos existentes con valor por defecto
UPDATE public.grupos
SET ventana_reingreso_min = 2
WHERE ventana_reingreso_min IS NULL;

-- 5. Actualizar asistencias existentes con heartbeat = creado_en
UPDATE public.asistencia
SET ultimo_latido = creado_en
WHERE ultimo_latido IS NULL AND confirmada = true;

-- =============================================================
-- VERIFICACIÓN (opcional, puedes ejecutarlo después)
-- =============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('grupos', 'asistencia')
--   AND column_name IN ('ventana_reingreso_min', 'ultimo_latido', 'reingreso_solicitado')
-- ORDER BY table_name, column_name;
