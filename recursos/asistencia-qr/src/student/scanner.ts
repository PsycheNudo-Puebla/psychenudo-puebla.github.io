// ============================================================
// Escaneo de QR: cámara, validación GPS, ventana de tiempo
// ============================================================
import { supabase } from '@/config/supabase';
import { mostrarToast } from '@/config/toaster';
import { getAlumnoActual } from './auth';
import { iniciarMonitoreo } from './monitoring';
import { hoyLocal } from '@/shared/utils';

// ---- Variables de escaneo ----
export let html5QrCode: any = null;
export let escaneando = false;
let _intentosRotacion = 0;

// ====== INICIAR / DETENER ESCANEO ======
export async function iniciarEscaneo(): Promise<void> {
  const Html5Qrcode = (await import('html5-qrcode')).Html5Qrcode;

  const btn = document.getElementById('btn-escanear') as HTMLButtonElement;
  const lectorDiv = document.getElementById('qr-reader')!;
  const resultadoDiv = document.getElementById('escaneo-resultado')!;

  if (escaneando) {
    if (html5QrCode) {
      await html5QrCode.stop();
      html5QrCode.clear();
    }
    lectorDiv.classList.add('hidden');
    btn.textContent = '📷 Escanear QR';
    escaneando = false;
    resultadoDiv.textContent = '';
    return;
  }

  resultadoDiv.textContent = '';
  lectorDiv.classList.remove('hidden');
  btn.textContent = '⏹️ Detener escaneo';

  try {
    html5QrCode = new Html5Qrcode("qr-reader");

    const size = Math.min(window.innerWidth * 0.85, 380);
    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 35,
        qrbox: { width: size, height: size },
        formatsToSupport: [0], // solo QR_CODE
        disableFlip: true,
      },
      async (decodedText: string) => {
        await html5QrCode.stop();
        lectorDiv.classList.add('hidden');
        btn.textContent = '📷 Escanear QR';
        escaneando = false;
        resultadoDiv.textContent = 'Procesando...';
        await procesarQR(decodedText, resultadoDiv);
      },
      () => { /* ignore */ }
    );

    setTimeout(() => corregirRotacionCamara(), 500);
    escaneando = true;
  } catch (err: any) {
    const msg = err?.message || err?.toString() || 'Error desconocido';
    let userMsg = 'Error al acceder a la cámara: ' + msg;
    if (msg.includes('NotAllowedError') || msg.includes('Permission denied') || msg.includes('permission')) {
      userMsg = '❌ Permiso de cámara denegado. Permite el acceso a la cámara en la configuración del navegador.';
    } else if (msg.includes('NotFoundError') || msg.includes('No camera')) {
      userMsg = '❌ No se encontró una cámara en este dispositivo.';
    } else if (msg.includes('NotReadableError') || msg.includes('in use')) {
      userMsg = '❌ La cámara está siendo usada por otra aplicación.';
    } else if (msg.includes('OverconstrainedError') || msg.includes('facingMode')) {
      userMsg = '❌ No se pudo activar la cámara trasera.';
    }
    resultadoDiv.textContent = userMsg;
    resultadoDiv.style.color = '#e74c3c';
    resultadoDiv.style.fontWeight = 'bold';
    resultadoDiv.style.padding = '10px';
    resultadoDiv.style.backgroundColor = '#fef0f0';
    resultadoDiv.style.borderRadius = '8px';
    resultadoDiv.style.marginTop = '10px';
    lectorDiv.classList.add('hidden');
    btn.textContent = '📷 Escanear QR';
    escaneando = false;
  }
}

export function detenerEscaneo(): void {
  escaneando = false;
}

// ====== CORREGIR ROTACIÓN DE CÁMARA ======
function corregirRotacionCamara(): void {
  const video = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
  if (!video || !video.videoWidth || !video.videoHeight) {
    _intentosRotacion++;
    if (_intentosRotacion < 10) setTimeout(() => corregirRotacionCamara(), 300);
    return;
  }
  _intentosRotacion = 0;

  const esPortrait = window.innerHeight > window.innerWidth;
  if (!esPortrait) return;
  if (video.videoWidth <= video.videoHeight) return;

  console.log(`📷 Corrigiendo rotación — video ${video.videoWidth}x${video.videoHeight}`);

  const container = document.getElementById('qr-reader');
  if (!container) return;

  container.style.aspectRatio = '1 / 1';
  container.style.maxHeight = '70vh';
  container.style.overflow = 'hidden';

  video.style.position = 'absolute';
  video.style.top = '50%';
  video.style.left = '50%';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.minWidth = 'auto';
  video.style.minHeight = 'auto';
  video.style.maxWidth = 'none';
  video.style.maxHeight = 'none';
  video.style.objectFit = 'cover';
  video.style.transform = 'translate(-50%, -50%) rotate(90deg)';
  video.style.transformOrigin = 'center center';
}

// ====== PROCESAR QR ======
async function procesarQR(qrData: string, resultadoDiv: HTMLElement): Promise<void> {
  const alumno = getAlumnoActual();
  if (!alumno) { resultadoDiv.textContent = '❌ Sesión no encontrada.'; return; }

  try {
    let datos: any;
    try {
      // El formato del QR es: ASISTENCIA_QR:<base64>
      // donde base64 decodifica a {"g":"<grupo_id>","s":"<codigo_sesion>","t":<timestamp>}
      let rawData = qrData;
      if (rawData.startsWith('ASISTENCIA_QR:')) {
        const base64 = rawData.substring('ASISTENCIA_QR:'.length);
        rawData = atob(base64);
      }
      datos = JSON.parse(rawData);
    } catch {
      resultadoDiv.textContent = '❌ Código QR inválido.';
      return;
    }

    // Compatibilidad: el QR usado usa claves cortas (g, s, t),
    // pero también soporta claves largas por si hay otro formato
    const grupoId: string = datos.grupo_id || datos.g || '';
    const codigoSesion: string = datos.codigo_sesion || datos.s || '';
    const ts: number = datos.ts || datos.t || 0;

    if (!grupoId && !codigoSesion) {
      resultadoDiv.textContent = '❌ QR no reconocido.';
      return;
    }

    // Validación de timestamp (anti-screenshot)
    const ahora = Date.now();
    const diffMs = Math.abs(ahora - ts);
    if (ts > 0 && diffMs > 15000) {
      resultadoDiv.textContent = '❌ QR expirado (timestamp inválido). Escanea directamente del profesor.';
      return;
    }

    // Verificar membresía
    const { data: inscripcion } = await supabase
      .from('grupo_alumnos')
      .select('*')
      .eq('alumno_id', alumno.id)
      .eq('grupo_id', grupoId)
      .maybeSingle();
    if (!inscripcion) {
      resultadoDiv.textContent = '❌ No estás inscrito en este grupo.';
      return;
    }
    if (inscripcion.abandono_en) {
      resultadoDiv.textContent = '❌ Ya no perteneces a este grupo. Contacta a tu profesor.';
      return;
    }

    // Obtener grupo + horarios para GPS
    const { data: grupo } = await supabase
      .from('grupos')
      .select('latitud, longitud, radio_metros, nombre, limite_salidas')
      .eq('id', grupoId)
      .maybeSingle();

    // Buscar horario actual para GPS específico del salón
    const diaHoy = new Date().getDay();
    const fechaActual = new Date();
    const horaActualStr = `${fechaActual.getHours().toString().padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}`;
    const { data: horariosHoy } = await supabase
      .from('horarios')
      .select('hora_inicio, hora_fin, latitud, longitud, radio_metros')
      .eq('grupo_id', grupoId)
      .eq('dia_semana', diaHoy)
      .eq('activo', true);

    let horarioGps: any = null;
    if (horariosHoy) {
      for (const h of horariosHoy) {
        const hInicio = h.hora_inicio?.substring(0, 5);
        const hFin = h.hora_fin?.substring(0, 5);
        if (hInicio && hFin && horaActualStr >= hInicio && horaActualStr <= hFin) {
          horarioGps = h;
          break;
        }
      }
    }

    const gpsLat = horarioGps?.latitud ?? grupo?.latitud;
    const gpsLng = horarioGps?.longitud ?? grupo?.longitud;
    const gpsRadio = horarioGps?.radio_metros ?? grupo?.radio_metros ?? 50;

    if (gpsLat && gpsLng) {
      try {
        const gpsOk = await verificarGPS(gpsLat, gpsLng, gpsRadio);
        if (!gpsOk) {
          resultadoDiv.textContent = '❌ Debes estar en el salón de clase para escanear. GPS no coincide.';
          return;
        }
      } catch {
        resultadoDiv.textContent = '❌ Activa tu ubicación (GPS) para escanear.';
        return;
      }
    }

    const limiteCambios = grupo?.limite_salidas ?? 3;

    // Verificar sesión activa
    const { data: sesion } = await supabase
      .from('sesiones_clase')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('activa', true)
      .maybeSingle();
    if (!sesion) {
      resultadoDiv.textContent = '❌ No hay clase activa.';
      return;
    }
    if (sesion.codigo_sesion !== codigoSesion) {
      resultadoDiv.textContent = '❌ QR expirado.';
      return;
    }

    const hoy = hoyLocal();

    // Verificar si ya hay registro para este código de sesión
    const { data: asistenciaHoy } = await supabase
      .from('asistencia')
      .select('*')
      .eq('alumno_id', alumno.id)
      .eq('sesion_codigo', codigoSesion)
      .maybeSingle();

    if (asistenciaHoy) {
      if (!asistenciaHoy.confirmada) {
        const nomG = grupo?.nombre || 'Grupo';
        iniciarMonitoreo(asistenciaHoy.id, grupoId, nomG, limiteCambios);
        return;
      }
      resultadoDiv.textContent = '⚠️ Ya registraste asistencia para esta sesión.';
      return;
    }

    // Determinar ventana de tiempo
    let tipoAsistencia = 'presente';
    let estadoAsistencia = 'presente';
    const ventanaInfo = await calcularVentanaAlumno(grupoId);
    if (ventanaInfo === 'cerrado') {
      resultadoDiv.textContent = '❌ Fuera del horario de clase. La ventana de asistencia está cerrada.';
      return;
    } else if (ventanaInfo === 'sin_derecho') {
      tipoAsistencia = 'sin_derecho';
      estadoAsistencia = 'ausente';
      (window as any)._tipoAsistenciaActual = 'sin_derecho';
    } else if (ventanaInfo === 'retardo') {
      tipoAsistencia = 'retardo';
    }

    const nomGrupo = grupo?.nombre || 'Grupo';

    // Insertar asistencia
    const { data: nueva, error: asisError } = await supabase
      .from('asistencia')
      .insert({
        alumno_id: alumno.id,
        grupo_id: grupoId,
        fecha: hoy,
        estado: estadoAsistencia,
        tipo_asistencia: tipoAsistencia,
        sesion_codigo: codigoSesion,
        cambios_pantalla: 0,
        confirmada: false,
        perdonada: false,
        ultimo_latido: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (asisError || !nueva) {
      resultadoDiv.textContent = '❌ Error al registrar: ' + (asisError?.message || '');
      return;
    }

    if (tipoAsistencia === 'sin_derecho') {
      mostrarToast('⚠️ Llegaste muy tarde. Registrado como AUSENCIA sin derecho.', 'warning', 5000);
    } else if (tipoAsistencia === 'retardo') {
      mostrarToast('⚠️ Asistencia registrada como RETARDO', 'warning', 4000);
    } else {
      mostrarToast('✅ ¡Asistencia registrada!', 'exito', 3000);
    }

    // Transición directa a monitoreo (sin esperar)
    iniciarMonitoreo(nueva.id, grupoId, nomGrupo, limiteCambios);
  } catch (err: any) {
    resultadoDiv.textContent = '❌ Error: ' + err.message;
  }
}

// ====== GPS ======
function verificarGPS(latSalon: number, lonSalon: number, radioMetros: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS no disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distancia = calcularDistancia(pos.coords.latitude, pos.coords.longitude, latSalon, lonSalon);
        resolve(distancia <= radioMetros);
      },
      (err) => { reject(err); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ====== VENTANA DE TIEMPO ======
async function calcularVentanaAlumno(grupoId: string): Promise<string> {
  const hoy = new Date().getDay();
  const ahora = new Date();
  const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

  const { data: horarios } = await supabase
    .from('horarios')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('dia_semana', hoy)
    .eq('activo', true);

  if (!horarios || horarios.length === 0) return 'libre';

  for (const h of horarios) {
    const inicio = h.hora_inicio.substring(0, 5);
    const fin = h.hora_fin.substring(0, 5);

    if (horaActual >= inicio && horaActual <= fin) {
      const [hI, mI] = inicio.split(':').map(Number);
      const [hA, mA] = horaActual.split(':').map(Number);
      const minutosDesdeInicio = (hA - hI) * 60 + (mA - mI);
      const puntualMin = h.puntual_minutos ?? 10;
      const retardoMin = h.retardo_minutos ?? 20;

      if (minutosDesdeInicio <= puntualMin) return 'puntual';
      if (minutosDesdeInicio <= retardoMin) return 'retardo';
      return 'sin_derecho';
    }
  }

  return 'cerrado';
}

// Exponer globalmente para onclick HTML
(window as any).iniciarEscaneo = iniciarEscaneo;

