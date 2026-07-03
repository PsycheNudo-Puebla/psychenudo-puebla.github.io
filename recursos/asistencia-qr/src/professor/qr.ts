// ============================================================
// Generación de QR y sesiones de clase
// ============================================================
import { supabase } from '@/config/supabase';
import { profesorActual } from '@/shared/auth';
import { mostrarToast } from '@/config/toaster';
import { generarCodigo } from '@/shared/utils';

let qrInterval: ReturnType<typeof setInterval> | null = null;
let qrSesionId: string | null = null;
let qrGrupoId: string | null = null;

// Constantes de QR
const QR_REFRESH_MS = 10000; // 10 segundos

export async function generarQR(grupoId: string, grupoNombre: string): Promise<void> {
  qrGrupoId = grupoId;
  const modal = document.getElementById('modal-qr')!;
  modal.classList.remove('hidden');

  (document.getElementById('qr-grupo-nombre') as HTMLElement).textContent = `📚 ${grupoNombre}`;
  (document.getElementById('qr-timer') as HTMLElement).textContent = '⏳ Generando...';
  (document.getElementById('qr-estado') as HTMLElement).textContent = '';
  (document.getElementById('qr-mensaje-alumno') as HTMLElement).innerHTML = '';

  // Limpiar QR anterior
  const container = document.getElementById('qr-code-container')!;
  container.innerHTML = '';

  // Cargar horarios del grupo para calcular ventana de tiempo
  let tiempos: { inicio: string; fin: string; puntual: number; retardo: number } | null = null;
  try {
    const hoy = new Date().getDay(); // 0=Dom
    const { data: horarios } = await supabase
      .from('horarios')
      .select('hora_inicio, hora_fin, puntual_minutos, retardo_minutos')
      .eq('grupo_id', grupoId)
      .eq('dia_semana', hoy);

    if (horarios && horarios.length > 0) {
      // Buscar el horario más cercano a la hora actual
      const ahora = new Date();
      const actualMin = ahora.getHours() * 60 + ahora.getMinutes();
      let masCercano = horarios[0];
      let minDiff = Infinity;
      for (const h of horarios) {
        const [hh, mm] = h.hora_inicio.split(':').map(Number);
        const inicioMin = hh * 60 + mm;
        const diff = Math.abs(actualMin - inicioMin);
        if (diff < minDiff) { minDiff = diff; masCercano = h; }
      }
      tiempos = {
        inicio: masCercano.hora_inicio,
        fin: masCercano.hora_fin,
        puntual: masCercano.puntual_minutos || 10,
        retardo: masCercano.retardo_minutos || 20,
      };
    }
  } catch { /* sin horarios */ }

  // Crear sesión
  const codigoSesion = generarCodigo(8);
  const { data: sesion, error } = await supabase
    .from('sesiones_clase')
    .insert({
      grupo_id: grupoId,
      profesor_id: profesorActual!.id,
      codigo_sesion: codigoSesion,
      activa: true,
    })
    .select()
    .maybeSingle();

  if (error || !sesion) {
    mostrarToast('Error al crear sesión: ' + (error?.message || 'desconocido'), 'error');
    return;
  }

  qrSesionId = sesion.id;

  // Totales de la ventana
  const ahora = new Date();
  let totalMin = 120; // default 2h
  let inicioMin = ahora.getTime();
  let finClaseMin = inicioMin + totalMin * 60000;
  let puntualHasta: Date | null = null;
  let retardoHasta: Date | null = null;

  if (tiempos) {
    const [hI, mI] = tiempos.inicio.split(':').map(Number);
    const [hF, mF] = tiempos.fin.split(':').map(Number);
    const inicioClase = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hI, mI);
    finClaseMin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hF, mF).getTime();
    inicioMin = inicioClase.getTime();
    totalMin = (finClaseMin - inicioMin) / 60000;

    puntualHasta = new Date(inicioMin + tiempos.puntual * 60000);
    retardoHasta = new Date(inicioMin + (tiempos.puntual + tiempos.retardo) * 60000);
  }

  function actualizarQR(): void {
    const ahoraMs = Date.now();
    const payload = JSON.stringify({
      g: grupoId,
      s: codigoSesion,
      t: ahoraMs,
    });
    const qrData = `ASISTENCIA_QR:${btoa(payload)}`;

    // Generar QR con qrcode.js
    container.innerHTML = '';
    try {
      new window.QRCode(container, {
        text: qrData,
        width: 256,
        height: 256,
        colorDark: '#1a1a2e',
        colorLight: '#ffffff',
        correctLevel: window.QRCode?.CorrectLevel?.H || 3,
      });
    } catch {
      container.innerHTML = `<p style="color:#999;">Error al generar QR</p>`;
    }

    // Timer
    const diff = Math.max(0, finClaseMin - ahoraMs);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    (document.getElementById('qr-timer') as HTMLElement).textContent =
      `⏱️ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Estado
    const estadoEl = document.getElementById('qr-estado') as HTMLElement;
    if (!tiempos) {
      estadoEl.textContent = '';
    } else if (puntualHasta && ahoraMs < puntualHasta.getTime()) {
      estadoEl.innerHTML = '<span style="color:#2e7d32; font-weight:700;">🟢 A TIEMPO</span>';
    } else if (retardoHasta && ahoraMs < retardoHasta.getTime()) {
      estadoEl.innerHTML = '<span style="color:#e65100; font-weight:700;">🟡 RETARDO</span>';
    } else if (ahoraMs < finClaseMin) {
      estadoEl.innerHTML = '<span style="color:#c62828; font-weight:700;">🔴 SIN DERECHO</span>';
    } else {
      estadoEl.innerHTML = '<span style="color:#999; font-weight:700;">🔴 CERRADO</span>';
    }

    // Mensaje para alumno
    const msgEl = document.getElementById('qr-mensaje-alumno') as HTMLElement;
    if (tiempos) {
      msgEl.innerHTML = `<small style="color:#888;">
        Sesión: ${codigoSesion} · Horario: ${tiempos.inicio.substring(0, 5)}–${tiempos.fin.substring(0, 5)}
        · Puntual: ${tiempos.puntual}min · Retardo: ${tiempos.retardo}min
      </small>`;
    }
  }

  actualizarQR();
  qrInterval = setInterval(actualizarQR, QR_REFRESH_MS);
}

export function cerrarQR(): void {
  if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
  // Cerrar sesión en BD
  if (qrSesionId) {
    supabase.from('sesiones_clase').update({ activa: false }).eq('id', qrSesionId).then();
    qrSesionId = null;
  }
  qrGrupoId = null;
  document.getElementById('modal-qr')!.classList.add('hidden');
}

/** Detiene el auto-refresh del QR (llamado al cerrar sesión) */
export function detenerAutoScheduler(): void {
  if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
  qrSesionId = null;
  qrGrupoId = null;
}
