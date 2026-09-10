-- ============================================================
-- 🔧 MIGRACIÓN: Permitir múltiples asistencias por día
-- ────────────────────────────────────────────────────────────
-- PROBLEMA:
--   La tabla asistencia tiene una restricción única sobre
--   (alumno_id, grupo_id, fecha) cuyo nombre real en la BD viva
--   es "asistencia_alumno_id_grupo_id_fecha_key".
--   Al tener 2 clases el mismo día (misma hora o distinta), el
--   2º escaneo falla con:
--     duplicate key value violates unique constraint
--     "asistencia_alumno_id_grupo_id_fecha_key"
--
-- SOLUCIÓN:
--   Eliminar cualquier unique (constraint o índice) que toque la
--   columna "fecha" y garantizar la única por
--   (alumno_id, sesion_codigo): un registro por SESIÓN, lo que
--   permite 2 clases el mismo día (cada sesión tiene su código).
--
-- ✅ EJECUTAR 1 VEZ EN SUPABASE: SQL Editor > New query > Run
--    (es idempotente: se puede volver a correr sin problema)
-- ============================================================

DO $$
DECLARE
  c RECORD;
BEGIN
  -- 1) Quitar constraints UNIQUE que incluyan la columna "fecha"
  --    (ej: asistencia_alumno_id_grupo_id_fecha_key, unique_alumno_grupo_fecha, ...)
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'asistencia'
      AND con.contype = 'u'
      AND EXISTS (
        SELECT 1
        FROM unnest(con.conkey) k
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k
        WHERE a.attname = 'fecha'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.asistencia DROP CONSTRAINT %I', c.conname);
  END LOOP;

  -- 2) Quitar posibles ÍNDICES únicos que incluyan "fecha"
  FOR c IN
    SELECT i.relname AS idxname
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
    WHERE nsp.nspname = 'public'
      AND t.relname = 'asistencia'
      AND ix.indisunique
      AND EXISTS (
        SELECT 1
        FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE a.attname = 'fecha'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', c.idxname);
  END LOOP;

  -- 3) Garantizar la única por (alumno_id, sesion_codigo)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'asistencia'
      AND con.conname = 'unique_alumno_sesion'
  ) THEN
    ALTER TABLE public.asistencia
      ADD CONSTRAINT unique_alumno_sesion UNIQUE (alumno_id, sesion_codigo);
  END IF;
END $$;

-- Índice de apoyo (no único) por (alumno, grupo, fecha) sigue siendo útil
-- para consultas/reportes diarios.
-- (ya existe como índice no único: idx_asistencia_alumno_grupo_fecha)