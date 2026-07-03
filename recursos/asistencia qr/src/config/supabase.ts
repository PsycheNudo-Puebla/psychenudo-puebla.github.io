// ============================================================
// Configuración de Supabase
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rmoaolmlqjwblhyfampb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PNcZaa5cHpDQAW0ilYEyqA_chOPimdM';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// Polyfill: crypto.randomUUID() para Safari < 15.6
// ============================================================
export function generarUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================
// Device ID — vincula cuenta al dispositivo
// ============================================================
const DEVICE_ID_KEY = 'asistencia_qr_device_id';

export function obtenerDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generarUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function obtenerDeviceIdViejo(): string | null {
  return localStorage.getItem('asistencia_qr_device_id_viejo');
}

export function guardarDeviceIdViejo(id: string): void {
  localStorage.setItem('asistencia_qr_device_id_viejo', id);
}

export function limpiarDeviceIdViejo(): void {
  localStorage.removeItem('asistencia_qr_device_id_viejo');
}
