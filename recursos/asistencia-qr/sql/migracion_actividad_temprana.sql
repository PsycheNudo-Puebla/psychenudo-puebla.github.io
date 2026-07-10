-- =============================================================
-- 📋 MIGRACIÓN: Actividad Temprana (indicador 🟡)
-- Fecha: 2026-07-10
-- =============================================================
-- Agrega la columna actividad_temprana a la tabla asistencia
-- para marcar cuando un alumno desbloquea el teléfono y vuelve
-- a la ventana de monitoreo antes de los 5 minutos finales de
-- la clase.
--
-- Cómo usar: Abre el SQL Editor de Supabase, pega todo y
-- haz clic en "Run".
-- =============================================================

-- 1. Columna: actividad_temprana (booleano, default false)
ALTER TABLE public.asistencia
ADD COLUMN IF NOT EXISTS actividad_temprana BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.asistencia.actividad_temprana
IS 'Indica si el alumno volvió a la ventana de monitoreo (desbloqueó teléfono) antes de los 5 min finales de la clase. Se muestra como 🟡 en el panel del profesor.';

-- =============================================================
-- VERIFICACIÓN (opcional, puedes ejecutarlo después)
-- =============================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'asistencia' AND column_name = 'actividad_temprana';
