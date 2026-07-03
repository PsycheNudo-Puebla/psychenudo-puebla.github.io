// ⚠️ REEMPLAZA CON TUS DATOS DE SUPABASE
const SUPABASE_URL = 'https://rmoaolmlqjwblhyfampb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PNcZaa5cHpDQAW0ilYEyqA_chOPimdM';

// Inicializar cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== POLYFILL: crypto.randomUUID() ======
// Safari < 15.6 y algunos navegadores Android no soportan crypto.randomUUID().
// Esta función prioriza crypto.randomUUID() y tiene fallback manual.
function generarUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: UUID v4 manual
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ====== SISTEMA DE DEVICE ID ======
// Cada dispositivo genera un ID único que se almacena en localStorage.
// Esto vincula la cuenta al dispositivo y evita iniciar sesión desde otro equipo.

function obtenerDeviceId() {
    let deviceId = localStorage.getItem('asistencia_qr_device_id');
    if (!deviceId) {
        deviceId = generarUUID();
        localStorage.setItem('asistencia_qr_device_id', deviceId);
    }
    return deviceId;
}

function limpiarDeviceId() {
    localStorage.removeItem('asistencia_qr_device_id');
}