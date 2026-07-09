-- =============================================================
-- MIGRACIÓN: Bitácora de Actividad del Alumno (2026-07-08)
-- =============================================================
-- Crea la tabla bitacora_actividad que registra eventos cronológicos
-- de cada alumno durante la clase. El profesor puede visualizar
-- desde el panel de monitoreo quién salió/entró a otras aplicaciones.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.bitacora_actividad (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asistencia_id UUID NOT NULL REFERENCES public.asistencia(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    detalle TEXT,
    registrada_en TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.bitacora_actividad IS 'Registro cronológico de eventos de cada alumno durante la clase. Visible para el profesor en el panel de monitoreo.';
COMMENT ON COLUMN public.bitacora_actividad.tipo IS 'inicio_monitoreo | salida_pantalla | regreso_pantalla | limite_alcanzado | perdonado | reingreso_solicitado | reingreso_aprobado | asistencia_confirmada | clase_terminada | sin_derecho';

ALTER TABLE IF EXISTS public.bitacora_actividad ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "alumnos_insert_bitacora" ON public.bitacora_actividad;
CREATE POLICY "alumnos_insert_bitacora" ON public.bitacora_actividad FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = bitacora_actividad.asistencia_id AND asistencia.alumno_id = auth.uid())
);

DROP POLICY IF EXISTS "alumnos_update_bitacora" ON public.bitacora_actividad;
CREATE POLICY "alumnos_update_bitacora" ON public.bitacora_actividad FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = bitacora_actividad.asistencia_id AND asistencia.alumno_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = bitacora_actividad.asistencia_id AND asistencia.alumno_id = auth.uid())
);

DROP POLICY IF EXISTS "alumnos_select_bitacora" ON public.bitacora_actividad;
CREATE POLICY "alumnos_select_bitacora" ON public.bitacora_actividad FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.asistencia WHERE asistencia.id = bitacora_actividad.asistencia_id AND asistencia.alumno_id = auth.uid())
);

DROP POLICY IF EXISTS "profesores_select_bitacora" ON public.bitacora_actividad;
CREATE POLICY "profesores_select_bitacora" ON public.bitacora_actividad FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.asistencia JOIN public.grupos ON grupos.id = asistencia.grupo_id WHERE asistencia.id = bitacora_actividad.asistencia_id AND grupos.profesor_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_bitacora_asistencia ON public.bitacora_actividad(asistencia_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_registrada ON public.bitacora_actividad(registrada_en DESC);
