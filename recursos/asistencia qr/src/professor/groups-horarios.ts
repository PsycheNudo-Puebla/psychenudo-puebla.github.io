// ============================================================
// Helper para insertar horarios con fallback GPS
// ============================================================
import { supabase } from '@/config/supabase';

interface InsertHorarioData {
  grupo_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  puntual_minutos: number;
  retardo_minutos: number;
  latitud?: number | null;
  longitud?: number | null;
  radio_metros?: number | null;
}

export async function insertarHorario(datos: InsertHorarioData): Promise<any> {
  const gpsData: Record<string, any> = {};
  if (datos.latitud != null) gpsData.latitud = datos.latitud;
  if (datos.longitud != null) gpsData.longitud = datos.longitud;
  if (datos.radio_metros != null) gpsData.radio_metros = datos.radio_metros;

  const { error: err } = await supabase.from('horarios').insert({
    grupo_id: datos.grupo_id,
    dia_semana: datos.dia_semana,
    hora_inicio: datos.hora_inicio,
    hora_fin: datos.hora_fin,
    puntual_minutos: datos.puntual_minutos,
    retardo_minutos: datos.retardo_minutos,
    activo: true,
    creado_en: new Date().toISOString(),
    ...gpsData,
  });

  // Fallback si columnas GPS no existen
  if (err?.message?.includes("Could not find the 'latitud' column")) {
    console.warn('⚠️ Columnas GPS no disponibles, insertando sin GPS.');
    const { error: err2 } = await supabase.from('horarios').insert({
      grupo_id: datos.grupo_id,
      dia_semana: datos.dia_semana,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
      puntual_minutos: datos.puntual_minutos,
      retardo_minutos: datos.retardo_minutos,
      activo: true,
      creado_en: new Date().toISOString(),
    });
    return err2;
  }
  return err;
}
