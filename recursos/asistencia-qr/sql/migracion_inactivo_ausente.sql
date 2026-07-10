-- =============================================================
-- MIGRACIÓN: Reversión — Eliminar columnas de ausencia (2026-07-09)
-- =============================================================
-- Ya no diferenciamos entre inactivo y ausente porque no podemos
-- discernir con certeza entre pantalla bloqueada y cambio de app.
-- Nos quedamos solo con cambios_pantalla como métrica principal.
-- La bitácora de actividad se mantiene para comportamientos sospechosos.
-- =============================================================

ALTER TABLE IF EXISTS public.asistencia
    DROP COLUMN IF EXISTS tiempo_ausente_acumulado;

ALTER TABLE IF EXISTS public.grupos
    DROP COLUMN IF EXISTS limite_ausente_min;
