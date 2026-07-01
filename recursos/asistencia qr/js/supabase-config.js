// ⚠️ REEMPLAZA CON TUS DATOS DE SUPABASE
const SUPABASE_URL = 'https://rmoaolmlqjwblhyfampb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PNcZaa5cHpDQAW0ilYEyqA_chOPimdM';

// Inicializar cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== SISTEMA DE DEVICE ID ======
// Cada dispositivo genera un ID único que se almacena en localStorage.
// Esto vincula la cuenta al dispositivo y evita iniciar sesión desde otro equipo.

function obtenerDeviceId() {
    let deviceId = localStorage.getItem('asistencia_qr_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('asistencia_qr_device_id', deviceId);
    }
    return deviceId;
}

function limpiarDeviceId() {
    localStorage.removeItem('asistencia_qr_device_id');
}

// ====== SISTEMA DE SESIÓN ACTIVA ======
// Cada inicio de sesión genera un token único que se guarda en sessionStorage.
// Se verifica periódicamente contra la BD para detectar si se abrió
// otra sesión desde un navegador o dispositivo diferente.

function generarSesionToken() {
    return crypto.randomUUID();
}