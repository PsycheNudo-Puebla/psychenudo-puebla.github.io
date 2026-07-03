-- =============================================================
-- LIMPIEZA DE TABLAS FANTASMA (versiones anteriores del sistema)
-- =============================================================
-- Ejecutar en el SQL Editor de Supabase
-- =============================================================

-- 1. Eliminar políticas de las tablas fantasma
DROP POLICY IF EXISTS "Permitir todo temporal" ON public.asistencias;
DROP POLICY IF EXISTS "Permitir todo temporal" ON public.clases;

-- 2. Eliminar las tablas fantasma (CASCADE elimina todo)
DROP TABLE IF EXISTS public.asistencias CASCADE;
DROP TABLE IF EXISTS public.clases CASCADE;

-- 3. Verificar que se limpiaron
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (tablename = 'asistencias' OR tablename = 'clases');
-- Si la consulta de arriba no devuelve filas, quedó limpio ✅
