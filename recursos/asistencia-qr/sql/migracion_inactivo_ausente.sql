-- =============================================================
-- MIGRACIÓN: Distinción entre Inactivo y Ausente (2026-07-09)
-- =============================================================
-- Agrega:
--  1. asistencia.tiempo_ausente_acumulado → segundos totales de ausencia
--     intencional (cambio de app/cierre de pestaña), NO incluye
--     tiempo inactivo (pantalla bloqueada sin interacción).
--  2. grupos.limite_ausente_min → minutos máximos de ausencia
--     acumulada permitidos antes de marcar al alumno.
-- =============================================================

ALTER TABLE IF EXISTS public.asistencia
    ADD COLUMN IF NOT EXISTS tiempo_ausente_acumulado INTEGER DEFAULT 0;

COMMENT ON COLUMN public.asistencia.tiempo_ausente_acumulado
    IS 'Segundos totales de ausencia intencional (cambio de app/cierre) acumulados durante la clase. No incluye tiempo inactivo (pantalla bloqueada sin interacción).';

ALTER TABLE IF EXISTS public.grupos
    ADD COLUMN IF NOT EXISTS limite_ausente_min INTEGER DEFAULT 5;

COMMENT ON COLUMN public.grupos.limite_ausente_min
    IS 'Minutos máximos de ausencia acumulada permitidos antes de considerar al alumno como ausente. Default 5 minutos.';
