// ============================================================
// Monitoreo de asistencia: detección de cambios de pantalla,
// confirmación, sincronización en tiempo real, auto-reentrada
// ============================================================
import { supabase, generarUUID } from '@/config/supabase';
import { mostrarToast } from '@/config/toaster';
import { getAlumnoActual, setMonitoreoActivo } from './auth';
import { cargarGrupos } from './dashboard';
import { iniciarKeepAliveSesion, detenerKeepAliveSesion } from '@/shared/auth';
import { hoyLocal } from '@/shared/utils';

// ---- Variables de monitoreo ----
export let monitoreoActivo = false;
let asistenciaActualId: string | null = null;
let grupoActualId: string | null = null;
let grupoActualNombre = '';
let cambiosContador = 0;
let cambiosLimite = 3;
let monitorChannel: any = null;
let monitorInterval: number | null = null;
let timerInterval: number | null = null;
let heartbeatInterval: number | null = null;
let tokenInterval: number | null = null;
let reingresoChannel: any = null;
let cambioEnProgreso = false;
let ultimoCambioTimestamp = 0;
let _inicioMonitoreo = 0;
let _confirmarDesde: Date | null = null;
let _horaFinStr = '';
let _btnConfirmarMostrado = false;
let _tipoAsistenciaActual: string | null = null;
let _actividadTempranaAdvertida = false;

// ---- Variables de polling/eventos ----
let _reingresoPollInterval: number | null = null;  // polling fallback para reingreso
let _reingresoEjecutandose = false;            // evita doble ejecución de ejecutarReingresoAprobado

// ---- Variables de tracking ----
let _paginaVisible: boolean = true;            // true si la página está visible y con foco
let tiempoActivoAcumulado: number = 0;          // segundos con página visible
let _ultimoEventoSalida: number = 0;            // timestamp del último evento blur/oculto (evita duplicados)

// ---- Variables para manejar recarga/cierre de página ----
let _manejadorBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;  // referencia para cleanup

// ====== REGISTRAR EN BITÁCORA ======
/**
 * Inserta un evento en bitacora_actividad.
 * @returns El ID del registro insertado, o null si falló.
 */
async function registrarEvento(tipo: string, detalle: string, asistenciaOverride?: string): Promise<string | null> {
  const id = asistenciaOverride || asistenciaActualId;
  if (!id) return null;
  try {
    const { data } = await supabase
      .from('bitacora_actividad')
      .insert({
        asistencia_id: id,
        tipo,
        detalle,
        registrada_en: new Date().toISOString(),
      })
      .select('id')
      .single();
    return data?.id ?? null;
  } catch (e) {
    console.warn('⚠️ Error al registrar bitácora:', e);
    return null;
  }
}

/** Formatea duración en segundos a texto legible */
function formatearDuracion(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const mins = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return segs > 0 ? `${mins}m ${segs}s` : `${mins}m`;
}

// ====== FORMATEAR DURACIÓN ======

// ====== VERIFICAR SI LA CLASE ESTÁ EN CURSO ======
/** Devuelve true si hay sesión activa o el horario indica clase en curso.
 *  Orden de chequeo:
 *    1. Horario del día (fuente primaria): si la hora actual está dentro → true
 *    2. Gracia post-clase (30 min): si la sesión sigue activa → true
 *    3. Sin horario: sesión activa con sanity check de duración máxima (3h)
 *  Esto evita que una sesión que el profe olvidó cerrar mantenga
 *  el banner "Ausente del monitoreo" horas después. */
async function verificarClaseEnCurso(grupoId: string): Promise<boolean> {
  try {
    const diaHoy = new Date().getDay();
    const ahora = new Date();
    const hh = ahora.getHours().toString().padStart(2,'0');
    const mm = ahora.getMinutes().toString().padStart(2,'0');
    const horaActualStr = `${hh}:${mm}`;

    // 1. Horario programado hoy (fuente primaria de verdad)
    const { data: horarios } = await supabase
      .from('horarios')
      .select('hora_inicio, hora_fin')
      .eq('grupo_id', grupoId)
      .eq('dia_semana', diaHoy)
      .eq('activo', true);

    if (horarios && horarios.length > 0) {
      for (const h of horarios) {
        const inicio = h.hora_inicio.substring(0, 5);
        const fin = h.hora_fin.substring(0, 5);
        if (horaActualStr >= inicio && horaActualStr <= fin) return true;
      }

      // Estamos fuera del horario. Si pasó menos de 30 min del fin,
      // verificar si la sesión sigue activa (el profe no la cerró aún).
      // Si pasó más de 30 min → clase terminada, así haya sesión activa.
      const finMasReciente = horarios.reduce((latest, h) =>
        h.hora_fin > latest ? h.hora_fin : latest, horarios[0].hora_fin);
      const [hf, mf] = finMasReciente.substring(0, 5).split(':').map(Number);
      const finDate = new Date();
      finDate.setHours(hf, mf, 0, 0);
      const msDesdeFin = Date.now() - finDate.getTime();
      const GRACIA_MS = 30 * 60 * 1000; // 30 min de gracia

      if (msDesdeFin <= GRACIA_MS) {
        const { data: sesion } = await supabase
          .from('sesiones_clase')
          .select('id')
          .eq('grupo_id', grupoId)
          .eq('activa', true)
          .maybeSingle();
        if (sesion) return true;
      }
      return false; // Fuera de horario + fuera de gracia
    }

    // 2. Sin horario: verificar sesión activa con sanity check de duración
    const { data: sesion } = await supabase
      .from('sesiones_clase')
      .select('id, creado_en')
      .eq('grupo_id', grupoId)
      .eq('activa', true)
      .maybeSingle();
    if (sesion) {
      if (sesion.creado_en) {
        const horasActiva = (Date.now() - new Date(sesion.creado_en).getTime()) / 3_600_000;
        if (horasActiva > 3) return false; // sesión abandonada >3h
      }
      return true;
    }
    return false;
  } catch { return false; }
}

// ====== AUTO-REENTRADA ======

export async function autoReanudarMonitoreo(userId: string): Promise<boolean> {
  if (monitoreoActivo) return true;
  try {
    const hoy = hoyLocal();

    // ── Obtener TODAS las asistencias pendientes del día ──
    // (pueden ser varias si el alumno tiene múltiples clases el mismo día)
    const { data: pendientes } = await supabase
      .from('asistencia')
      .select('id, grupo_id, tipo_asistencia, ultimo_latido')
      .eq('alumno_id', userId)
      .eq('fecha', hoy)
      .eq('confirmada', false);

    if (!pendientes || pendientes.length === 0) return false;

    // ── Paso 1: Separar en curso vs terminadas ──
    // Auto-confirmar silenciosamente todas las clases que ya terminaron,
    // para que no bloqueen la interacción con otros grupos.
    // Si hay una en curso, procesarla con la lógica de reingreso.
    let pendienteEnCurso: typeof pendientes[0] | null = null;
    for (const p of pendientes) {
      const enCurso = await verificarClaseEnCurso(p.grupo_id);
      if (enCurso) {
        if (!pendienteEnCurso) pendienteEnCurso = p;
      } else {
        // Clase terminada → auto-confirmar silenciosamente
        await registrarEvento('asistencia_confirmada', 'Auto-confirmada — clase terminada', p.id);
        localStorage.removeItem('token_monitoreo_' + p.id);
        await supabase
          .from('asistencia')
          .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
          .eq('id', p.id);
      }
    }

    // Si no hay ninguna en curso, mostrar dashboard
    if (!pendienteEnCurso) return false;
    const pendiente = pendienteEnCurso;

    const { data: grupo } = await supabase
      .from('grupos')
      .select('nombre, limite_salidas, ventana_reingreso_min')
      .eq('id', pendiente.grupo_id)
      .maybeSingle();
    if (!grupo) return false;

    // Clase en curso. Verificar si el alumno estuvo ausente poco tiempo
    const ventanaMin = grupo.ventana_reingreso_min ?? 2;
    const ventanaMs = ventanaMin * 60 * 1000;
    const ahora = Date.now();
    const ultimoLatido = pendiente.ultimo_latido
      ? new Date(pendiente.ultimo_latido).getTime()
      : 0;
    const tiempoAusente = ultimoLatido > 0 ? ahora - ultimoLatido : Infinity;

    // Si ventanaMin es 0, nunca se permite auto-reingreso (siempre pedir permiso)
    // Verificar si la página fue cerrada intencionalmente (beforeunload en desktop)
    const cerradoKey = 'monitoreo_cerrado_' + pendiente.id;
    const cerradoPreviamente = localStorage.getItem(cerradoKey);
    if (cerradoPreviamente) {
      localStorage.removeItem(cerradoKey);
    }
    // Verificar si la pestaña fue cerrada y reabierta (sessionStorage se borra al cerrar pestaña)
    const sessionActivo = sessionStorage.getItem('monitoreo_vivo_' + pendiente.id);
    const tabFueCerrada = sessionActivo === null; // null = pestaña nueva, no había monitoreo

    if (ventanaMin > 0 && tiempoAusente <= ventanaMs && !cerradoPreviamente && !tabFueCerrada) {
      // Reciente y la página no fue cerrada → auto-reanudar
      document.getElementById('login-view')!.classList.add('hidden');
      document.getElementById('dashboard-view')!.classList.add('hidden');
      _tipoAsistenciaActual = pendiente.tipo_asistencia;
      iniciarMonitoreo(pendiente.id, pendiente.grupo_id, grupo.nombre, grupo.limite_salidas ?? 3);
      return true;
    }

    // Ausente más tiempo del permitido → guardamos para que el banner
    // ofrezca "Solicitar reingreso"
    (window as any)._pendienteAsistenciaId = pendiente.id;
    (window as any)._pendienteGrupoId = pendiente.grupo_id;
    (window as any)._pendienteGrupoNombre = grupo.nombre;
    (window as any)._pendienteLimite = grupo.limite_salidas ?? 3;
    (window as any)._pendienteUltimoLatido = pendiente.ultimo_latido;
    (window as any)._pendienteVentanaMin = ventanaMin;
    (window as any)._pendienteClaseEnCurso = true;
    return false;
  } catch (e) {
    console.warn('Error en autoReanudarMonitoreo:', e);
    return false;
  }
}

// ====== BANNER DE ASISTENCIA PENDIENTE ======
export async function revisarAsistenciaPendiente(): Promise<void> {
  const alumno = getAlumnoActual();
  const banner = document.getElementById('reanudar-banner');
  if (!banner || !alumno) return;

  banner.classList.add('hidden');
  banner.innerHTML = '';
  if (monitoreoActivo) return;

  try {
    const hoy = hoyLocal();

    // ── Obtener TODAS las asistencias pendientes del día ──
    // (varias si el alumno tiene múltiples clases el mismo día)
    const { data: pendientes } = await supabase
      .from('asistencia')
      .select('id, grupo_id, cambios_pantalla, sesion_codigo, ultimo_latido, tipo_asistencia, perdonada')
      .eq('alumno_id', alumno.id)
      .eq('fecha', hoy)
      .eq('confirmada', false);

    if (!pendientes || pendientes.length === 0) return;

    // ── Separar en curso vs terminadas ──
    let pendienteEnCurso: typeof pendientes[0] | null = null;
    let autoConfirmadas = 0;
    for (const p of pendientes) {
      const enCurso = await verificarClaseEnCurso(p.grupo_id);
      if (enCurso) {
        if (!pendienteEnCurso) pendienteEnCurso = p;
      } else {
        // Clase terminada → auto-confirmar silenciosamente
        await registrarEvento('asistencia_confirmada', 'Auto-confirmada — clase terminada', p.id);
        localStorage.removeItem('token_monitoreo_' + p.id);
        await supabase
          .from('asistencia')
          .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
          .eq('id', p.id);
        autoConfirmadas++;
      }
    }

    // Si todas fueron auto-confirmadas, mostrar banner genérico de éxito
    if (!pendienteEnCurso) {
      detenerKeepAliveSesion();
      if (autoConfirmadas > 0) {
        banner.innerHTML = `
          <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:12px; padding:14px 16px; text-align:center;">
            ✅ <strong style="color:#2e7d32;">Asistencias registradas</strong>
            <br><small style="color:#666;">${autoConfirmadas === 1 ? 'Tu clase anterior ya terminó. Tu asistencia ha sido registrada.' : `Tus ${autoConfirmadas} clases anteriores ya terminaron. Tus asistencias han sido registradas.`}</small>
          </div>`;
        banner.classList.remove('hidden');
      }
      return;
    }

    // ── Hay una clase en curso → mostrar banner ──
    const { data: grupo } = await supabase
      .from('grupos')
      .select('nombre, limite_salidas, ventana_reingreso_min')
      .eq('id', pendienteEnCurso.grupo_id)
      .maybeSingle();
    if (!grupo) return;

    const limite = grupo.limite_salidas ?? 3;
    const cambiosActuales = pendienteEnCurso.cambios_pantalla || 0;
    const ventanaMin = grupo.ventana_reingreso_min ?? 2;

    (window as any)._pendienteAsistenciaId = pendienteEnCurso.id;
    (window as any)._pendienteGrupoId = pendienteEnCurso.grupo_id;
    (window as any)._pendienteGrupoNombre = grupo.nombre;
    (window as any)._pendienteLimite = limite;
    (window as any)._pendienteUltimoLatido = pendienteEnCurso.ultimo_latido;
    (window as any)._pendienteVentanaMin = ventanaMin;
    (window as any)._pendienteCambios = cambiosActuales;

    const claseEnCurso = await verificarClaseEnCurso(pendienteEnCurso.grupo_id);
    const w = window as any;
    w._pendienteClaseEnCurso = claseEnCurso;

    if (!claseEnCurso) {
      // ── CLASE TERMINADA → auto-confirmar ──
      await registrarEvento('asistencia_confirmada', 'Auto-confirmada — clase terminada', pendienteEnCurso.id);
      localStorage.removeItem('token_monitoreo_' + pendienteEnCurso.id);
      await supabase
        .from('asistencia')
        .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
        .eq('id', pendienteEnCurso.id);
      detenerKeepAliveSesion();
      banner.innerHTML = `
        <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:12px; padding:14px 16px; text-align:center;">
          ✅ <strong style="color:#2e7d32;">Asistencia registrada</strong>
          <br><small style="color:#666;">Clase terminada. Tu asistencia ha sido registrada.</small>
        </div>`;
    } else if (ventanaMin > 0 && pendienteEnCurso.ultimo_latido &&
        Date.now() - new Date(pendienteEnCurso.ultimo_latido).getTime() <= ventanaMin * 60 * 1000) {
      // Verificar si la página fue cerrada (beforeunload en desktop)
      const cerradoKey = 'monitoreo_cerrado_' + pendienteEnCurso.id;
      const cerradoPreviamente = localStorage.getItem(cerradoKey);
      if (cerradoPreviamente) {
        localStorage.removeItem(cerradoKey);
      }
      // Verificar si la pestaña fue cerrada y reabierta (sessionStorage se borra al cerrar)
      const sessionActivo = sessionStorage.getItem('monitoreo_vivo_' + pendienteEnCurso.id);
      const tabFueCerrada = sessionActivo === null;
      if (!cerradoPreviamente && !tabFueCerrada) {
        // ── CLASE EN CURSO, LATIDO RECIENTE Y NO CERRADA → auto-reanudar
        try {
          reanudarMonitoreo();
        } catch { /* ignore */ }
      } else {
        // ── CLASE EN CURSO PERO FUE CERRADA → solicitar reingreso
        const msgAusente = ventanaMin > 0
          ? `La página fue cerrada. Solicita reingreso al profesor para continuar.`
          : `Debes solicitar reingreso al profesor para volver a clase.`;
        banner.innerHTML = `
          <div style="background:#fff8e1; border:1px solid #ffe082; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="font-size:1.5em;">⏳</div>
            <div style="flex:1; min-width:150px;">
              <strong style="color:#e65100;">Sesión cerrada</strong>
              <br><small style="color:#666;">${escHTML(grupo.nombre)} — ${msgAusente}</small>
            </div>
            <button onclick="window.solicitarReingreso()" class="btn-primary" style="background:#e65100; white-space:nowrap; font-size:0.9em;">🔁 Solicitar reingreso</button>
          </div>`;
        banner.classList.remove('hidden');
      }
    } else {
      // ── CLASE EN CURSO PERO AUSENTE → solicitar reingreso
      const msgAusente = ventanaMin > 0
        ? `Estuviste ausente más de ${ventanaMin} min. Solicita reingreso al profesor.`
        : `Debes solicitar reingreso al profesor para volver a clase.`;
      banner.innerHTML = `
        <div style="background:#fff8e1; border:1px solid #ffe082; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="font-size:1.5em;">⏳</div>
          <div style="flex:1; min-width:150px;">
            <strong style="color:#e65100;">Ausente del monitoreo</strong>
            <br><small style="color:#666;">${escHTML(grupo.nombre)} — ${msgAusente}</small>
          </div>
          <button onclick="window.solicitarReingreso()" class="btn-primary" style="background:#e65100; white-space:nowrap; font-size:0.9em;">🔁 Solicitar reingreso</button>
        </div>`;
    }
    banner.classList.remove('hidden');
  } catch (e) {
    console.warn('Error al revisar asistencia pendiente:', e);
  }
}

// ====== SOLICITAR REINGRESO AL PROFESOR ======
export async function solicitarReingreso(): Promise<void> {
  const w = window as any;
  const asistenciaId = w._pendienteAsistenciaId;
  if (!asistenciaId) return;

  // Resetear guard por si quedó trabado de una ejecución anterior
  _reingresoEjecutandose = false;

  try {
    // ── Verificar estado actual en BD ──
    const { data: estado } = await supabase
      .from('asistencia')
      .select('reingreso_solicitado, ultimo_latido')
      .eq('id', asistenciaId)
      .maybeSingle();

    // Si ultimo_latido cambió desde que cargamos la página, el profesor
    // ya lo aprobó mientras estábamos fuera → reanudar directamente
    const latidoPrev = w._pendienteUltimoLatido;
    if (estado && !estado.reingreso_solicitado && estado.ultimo_latido && 
        latidoPrev && estado.ultimo_latido !== latidoPrev) {
      _reingresoEjecutandose = true;
      ejecutarReingresoAprobado(asistenciaId);
      return;
    }

    // Solo hacer UPDATE si no está ya solicitado; si ya lo está,
    // el valor en BD no cambia y Realtime no detectaría la "actualización".
    if (!estado?.reingreso_solicitado) {
      await supabase
        .from('asistencia')
        .update({ reingreso_solicitado: true })
        .eq('id', asistenciaId);
    }

    registrarEvento('reingreso_solicitado', estado?.reingreso_solicitado
      ? 'Reanudó espera de reingreso (ya solicitado antes)'
      : 'Solicitó reingreso al profesor');

    // Mostrar pantalla de espera
    const banner = document.getElementById('reanudar-banner');
    if (banner) {
      banner.innerHTML = `
        <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:12px; padding:14px 16px; text-align:center;">
          <div style="font-size:2em; margin-bottom:8px;">⏳</div>
          <strong style="color:#2e7d32;">Solicitud enviada</strong>
          <br><small style="color:#666;">Espera a que el profesor autorice tu reingreso...</small>
          <div style="margin-top:8px; font-size:0.8em; color:#999;" id="reingreso-espera-msg">
            La pantalla se reanudará automáticamente.
          </div>
          <button onclick="window.cancelarReingreso()" class="btn-secondary" style="margin-top:10px; font-size:0.8em;">Cancelar</button>
        </div>`;
    }

    // Limpiar canales/intervalos previos
    if (reingresoChannel) { supabase.removeChannel(reingresoChannel); reingresoChannel = null; }
    if (_reingresoPollInterval) { clearInterval(_reingresoPollInterval); _reingresoPollInterval = null; }

    // --- ESTRATEGIA DUAL: Realtime + Polling ---
    // 1) Realtime channel (rápido pero a veces falla)
    reingresoChannel = supabase
      .channel('reingreso-' + asistenciaId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'asistencia', filter: `id=eq.${asistenciaId}` },
        (payload: any) => {
          if (_reingresoEjecutandose) return;
          if (!payload.new.reingreso_solicitado && payload.new.ultimo_latido) {
            _reingresoEjecutandose = true;
            ejecutarReingresoAprobado(asistenciaId);
          }
        }
      )
      .subscribe();

    // 2) Polling fallback cada 2s (robusto, nunca falla)
    _reingresoPollInterval = window.setInterval(async () => {
      try {
        const { data: asis } = await supabase
          .from('asistencia')
          .select('reingreso_solicitado, ultimo_latido')
          .eq('id', asistenciaId)
          .maybeSingle();
        if (asis && !asis.reingreso_solicitado && asis.ultimo_latido) {
          // Aprobado detectado por polling — con guard para evitar doble ejecución
          if (_reingresoEjecutandose) return;
          _reingresoEjecutandose = true;
          if (_reingresoPollInterval) { clearInterval(_reingresoPollInterval); _reingresoPollInterval = null; }
          if (reingresoChannel) { supabase.removeChannel(reingresoChannel); reingresoChannel = null; }
          ejecutarReingresoAprobado(asistenciaId);
        }
      } catch (e) {
        console.warn('⚠️ Error en polling de reingreso:', e);
      }
    }, 2000);
  } catch (e) {
    console.warn('Error al solicitar reingreso:', e);
    mostrarToast('Error al solicitar reingreso', 'error');
  }
}

/** Ejecuta la reanudación del monitoreo cuando el profesor aprueba el reingreso */
function ejecutarReingresoAprobado(asistenciaId: string): void {
  try {
    _reingresoEjecutandose = true;
    console.log('✅ Reingreso aprobado, reanudando monitoreo:', asistenciaId);

    // Registrar en bitácora con asistenciaOverride porque asistenciaActualId aún es null
    registrarEvento('reingreso_aprobado', 'El profesor aprobó el reingreso', asistenciaId);

    // Limpiar channel + polling
    if (reingresoChannel) { supabase.removeChannel(reingresoChannel); reingresoChannel = null; }
    if (_reingresoPollInterval) { clearInterval(_reingresoPollInterval); _reingresoPollInterval = null; }

    const w = window as any;
    const grupoId = w._pendienteGrupoId;
    const grupoNombre = w._pendienteGrupoNombre;
    const limite = w._pendienteLimite ?? 3;
    if (grupoId && grupoNombre) {
      // Ocultar banner de reingreso y vistas previas
      const banner = document.getElementById('reanudar-banner');
      if (banner) banner.classList.add('hidden');
      document.getElementById('login-view')!.classList.add('hidden');
      document.getElementById('dashboard-view')!.classList.add('hidden');
      iniciarMonitoreo(asistenciaId, grupoId, grupoNombre, limite);
    } else {
      console.warn('⚠️ reingreso: faltan _pendienteGrupoId o _pendienteGrupoNombre');
    }
  } catch (e) {
    console.error('❌ Error al ejecutar reingreso aprobado:', e);
    _reingresoEjecutandose = false; // Permitir reintento
  }
}

export function cancelarReingreso(): void {
  _reingresoEjecutandose = false;
  if (reingresoChannel) { supabase.removeChannel(reingresoChannel); reingresoChannel = null; }
  if (_reingresoPollInterval) { clearInterval(_reingresoPollInterval); _reingresoPollInterval = null; }
  // Volver al banner anterior recargando
  revisarAsistenciaPendiente();
}

export function reanudarMonitoreo(): void {
  const w = window as any;
  if (w._pendienteAsistenciaId) {
    // Ocultar banner de reingreso pendiente
    const banner = document.getElementById('reanudar-banner');
    if (banner) banner.classList.add('hidden');

    supabase
      .from('asistencia')
      .select('tipo_asistencia, cambios_pantalla')
      .eq('id', w._pendienteAsistenciaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          _tipoAsistenciaActual = data.tipo_asistencia;
          w._pendienteCambios = data.cambios_pantalla || 0;
        }
      });

    iniciarMonitoreo(
      w._pendienteAsistenciaId,
      w._pendienteGrupoId,
      w._pendienteGrupoNombre,
      w._pendienteLimite
    );
    const cambiosPrevios = w._pendienteCambios || 0;
    if (cambiosPrevios > 0) {
      cambiosContador = cambiosPrevios;
      document.getElementById('monitor-contador')!.textContent = String(cambiosContador);
      const pct = Math.min((cambiosContador / cambiosLimite) * 100, 100);
      const barra = document.getElementById('monitor-barra')!;
      barra.style.width = pct + '%';
      if (pct >= 80) barra.style.background = '#ff5722';
    }
  }
}

// ====== INICIAR MONITOREO ======
export function iniciarMonitoreo(
  asistenciaId: string,
  grupoId: string,
  grupoNombre: string,
  limite: number
): void {
  monitoreoActivo = true;
  setMonitoreoActivo(true);
  asistenciaActualId = asistenciaId;
  grupoActualId = grupoId;
  grupoActualNombre = grupoNombre;
  cambiosLimite = limite || 3;
  cambiosContador = 0;
  _paginaVisible = true;
  _ultimoEventoSalida = 0;
  tiempoActivoAcumulado = 0;
  _actividadTempranaAdvertida = false;
  // Ocultar advertencia temprana al iniciar
  const advElInit = document.getElementById('monitor-advertencia-temprana');
  if (advElInit) advElInit.classList.add('hidden');

  // ── Marcar en sessionStorage que el monitoreo está activo en esta pestaña ──
  // sessionStorage se borra al cerrar la pestaña, permitiendo detectar
  // si el navegador fue cerrado y reabierto (incluso en móvil donde beforeunload no funciona)
  sessionStorage.setItem('monitoreo_vivo_' + asistenciaId, '1');

  // ── Generar token de monitoreo ──
  const tokenMonitoreo = generarUUID();
  localStorage.setItem('token_monitoreo_' + asistenciaId, tokenMonitoreo);
  supabase
    .from('asistencia')
    .update({
      token_monitoreo: tokenMonitoreo,
      ultimo_acceso_token: new Date().toISOString()
    })
    .eq('id', asistenciaId)
    .then(() => {
      console.log('🔑 Token de monitoreo generado:', tokenMonitoreo);
    });
  iniciarKeepAliveSesion();

  document.getElementById('dashboard-view')!.classList.add('hidden');
  document.getElementById('monitor-view')!.classList.remove('hidden');
  document.getElementById('monitor-grupo')!.textContent = `📚 ${grupoNombre}`;
  document.getElementById('monitor-limite')!.textContent = String(cambiosLimite);
  document.getElementById('monitor-historial')!.innerHTML = '<div style="color:#999;">Cargando...</div>';

  _inicioMonitoreo = Date.now();
  _confirmarDesde = null;
  _btnConfirmarMostrado = false;

  const btnConfirmar = document.getElementById('btn-confirmar-asistencia') as HTMLButtonElement;
  btnConfirmar.style.display = 'none';
  // espera-confirmar se muestra solo después de que el alumno haga clic en "Iniciar registro"
  document.getElementById('espera-confirmar')!.style.display = 'none';
  (window as any)._btnConfirmarMostrado = false;

  // Obtener horario de hoy
  const hoy = new Date().getDay();
  supabase
    .from('horarios')
    .select('hora_fin')
    .eq('grupo_id', grupoId)
    .eq('dia_semana', hoy)
    .eq('activo', true)
    .then(({ data: horarios }) => {
      if (horarios && horarios.length > 0) {
        const horaFin = horarios[0].hora_fin.substring(0, 5);
        const [hf, mf] = horaFin.split(':').map(Number);
        const finDate = new Date();
        finDate.setHours(hf, mf, 0, 0);
        _confirmarDesde = new Date(finDate.getTime() - 5 * 60 * 1000);
        _horaFinStr = horaFin;

        // Mostrar temporizador
        const timerContainer = document.getElementById('monitor-timer-container');
        if (timerContainer) timerContainer.style.display = '';

        if (_tipoAsistenciaActual === 'sin_derecho') {
          const st = document.getElementById('monitor-estado')!;
          st.innerHTML = '⚠️ <strong>Llegaste tarde.</strong> Registrado como ausencia. Debes permanecer en clase.';
          st.style.background = '#ffebee';
          st.style.color = '#c62828';
          document.getElementById('espera-confirmar')!.style.display = 'none';
        } else {
          const st = document.getElementById('monitor-estado')!;
          st.innerHTML = `⏳ Clase hasta las <strong>${horaFin}</strong>. Podrás confirmar 5 minutos antes.`;
          st.style.background = '#e3f2fd';
          st.style.color = '#1565c0';
        }
      } else {
        const st = document.getElementById('monitor-estado')!;
        st.innerHTML = '✅ Asistencia registrada. ¡Mantén la app abierta!';
        st.style.background = '#e8f5e9';
        st.style.color = '#2e7d32';
      }
    });

  // Canal Realtime
  const canalId = 'monitor-alumno-' + asistenciaId;
  if (monitorChannel) supabase.removeChannel(monitorChannel);
  monitorChannel = supabase
    .channel(canalId)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'asistencia', filter: `id=eq.${asistenciaId}` },
      (payload: any) => {
        if (payload.new.cambios_pantalla !== undefined && payload.new.cambios_pantalla < cambiosContador) {
          cambiosContador = payload.new.cambios_pantalla;
          actualizarMonitorUI();
        }
        if (payload.new.perdonada && !payload.new.confirmada) {
          // Resetear contador al ser perdonado
          cambiosContador = 0;
          actualizarMonitorUI();
          registrarEvento('perdonado', 'El profesor perdonó los cambios de pantalla');
          const st = document.getElementById('monitor-estado')!;
          st.innerHTML = '🙏 <strong>Perdonado por el profesor.</strong> Continúa en clase.';
          st.style.background = '#e8f5e9';
          st.style.color = '#2e7d32';
          // NO mostrar botón de confirmar — se mostrará cuando la clase termine
        }
      })
    .subscribe((status: string, err?: any) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('⚠️ Canal de monitoreo:', status, err);
        setTimeout(() => {
          if (monitoreoActivo && asistenciaActualId) {
            try {
              if (monitorChannel) supabase.removeChannel(monitorChannel);
              monitorChannel = supabase.channel(canalId)
                .on('postgres_changes',
                  { event: 'UPDATE', schema: 'public', table: 'asistencia', filter: `id=eq.${asistenciaActualId}` },
                  (payload: any) => {
                    if (payload.new.cambios_pantalla !== undefined && payload.new.cambios_pantalla < cambiosContador) {
                      cambiosContador = payload.new.cambios_pantalla;
                      actualizarMonitorUI();
                    }
                    if (payload.new.perdonada && !payload.new.confirmada) {
                      cambiosContador = 0;
                      actualizarMonitorUI();
                      registrarEvento('perdonado', 'El profesor perdonó los cambios de pantalla');
                      document.getElementById('monitor-estado')!.innerHTML = '🙏 <strong>Perdonado por el profesor.</strong> Continúa en clase.';
                      document.getElementById('monitor-estado')!.style.background = '#e8f5e9';
                      document.getElementById('monitor-estado')!.style.color = '#2e7d32';
                    }
                  }).subscribe();
            } catch (e) {
              console.warn('⚠️ Error al reintentar canal:', e);
            }
          }
        }, 5000);
      }
    });

  // Intervalo de verificación
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = window.setInterval(async () => {
    if (!monitoreoActivo || !grupoActualId) {
      clearInterval(monitorInterval!);
      return;
    }
    const ahora = new Date();

    // 1. Mostrar botón si ya es tiempo
    const minutosDesdeEscaneo = (ahora.getTime() - _inicioMonitoreo) / 60000;
    if (minutosDesdeEscaneo >= 1 && _confirmarDesde && ahora >= _confirmarDesde && !_btnConfirmarMostrado) {
      _btnConfirmarMostrado = true;
      document.getElementById('btn-confirmar-asistencia')!.style.display = '';
      document.getElementById('espera-confirmar')!.style.display = 'none';
      const st = document.getElementById('monitor-estado')!;
      st.innerHTML = '✅ <strong>Ya puedes confirmar tu asistencia.</strong>';
      st.style.background = '#e8f5e9';
      st.style.color = '#2e7d32';
    }

    // 2. Verificar si la clase terminó (por horario o por sesión)
    let claseTerminada = false;
    if (_horaFinStr) {
      // Tenemos horario → comparar con hora de fin
      const [hf, mf] = _horaFinStr.split(':').map(Number);
      const finDate = new Date();
      finDate.setHours(hf, mf, 0, 0);
      claseTerminada = new Date() >= finDate;
    } else {
      // Sin horario → verificar si hay sesión activa del profesor
      const { data: sesion } = await supabase
        .from('sesiones_clase')
        .select('activa')
        .eq('grupo_id', grupoActualId)
        .eq('activa', true)
        .maybeSingle();
      claseTerminada = !sesion;
    }

    // 2b. Actualizar timer si hay hora de fin
    if (_horaFinStr && !claseTerminada) {
      actualizarTimer(_horaFinStr);
    }

    if (claseTerminada) {
      const mins = (new Date().getTime() - _inicioMonitoreo) / 60000;

      if (_tipoAsistenciaActual === 'sin_derecho') {
        document.getElementById('espera-confirmar')!.style.display = 'none';
        // Auto-confirmar asistencia sin derecho porque la clase terminó
        if (asistenciaActualId) {
          registrarEvento('clase_terminada', 'Clase terminó (sin derecho) — auto-confirmada');
          localStorage.removeItem('token_monitoreo_' + asistenciaActualId);
          await supabase
            .from('asistencia')
            .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
            .eq('id', asistenciaActualId);
          detenerKeepAliveSesion();
        }
        clearInterval(monitorInterval!);
        monitorInterval = null;
        const st = document.getElementById('monitor-estado')!;
        st.innerHTML = '⏰ <strong>Clase terminada.</strong> Asistencia registrada como ausencia.';
        st.style.background = '#ffebee';
        st.style.color = '#c62828';
      } else {
        if (!_btnConfirmarMostrado && mins >= 1) {
          _btnConfirmarMostrado = true;
          document.getElementById('btn-confirmar-asistencia')!.style.display = '';
          document.getElementById('espera-confirmar')!.style.display = 'none';
        }
        // Auto-confirmar después de 2 minutos de haber terminado la clase
        // (así el estudiante tiene tiempo de ver el botón, pero si cierra
        //  la página sin confirmar, la asistencia queda registrada igual)
        if (_btnConfirmarMostrado && asistenciaActualId) {
          let debeAutoConfirmar = false;
          if (_horaFinStr) {
            const [hf, mf] = _horaFinStr.split(':').map(Number);
            const finDate = new Date();
            finDate.setHours(hf, mf, 0, 0);
            const msDesdeFin = Date.now() - finDate.getTime();
            debeAutoConfirmar = msDesdeFin >= 2 * 60 * 1000;
          } else {
            // Sin horario: auto-confirmar en el segundo tick (5s después)
            debeAutoConfirmar = true;
          }
          if (debeAutoConfirmar) {
            await registrarEvento('asistencia_confirmada', 'Auto-confirmada — clase terminó hace 2+ min');
            localStorage.removeItem('token_monitoreo_' + asistenciaActualId);
            await supabase
              .from('asistencia')
              .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
              .eq('id', asistenciaActualId);
            detenerKeepAliveSesion();
            clearInterval(monitorInterval!);
            monitorInterval = null;
            const st = document.getElementById('monitor-estado')!;
            st.innerHTML = '⏰ <strong>Clase terminada.</strong> Asistencia confirmada automáticamente. ✅';
            st.style.background = '#e8f5e9';
            st.style.color = '#2e7d32';
            document.getElementById('btn-confirmar-asistencia')!.style.display = 'none';
            return;
          }
        }
        const st = document.getElementById('monitor-estado')!;
        st.innerHTML = '⏰ <strong>Clase terminada.</strong> Confirma tu asistencia.';
        st.style.background = '#e3f2fd';
        st.style.color = '#1565c0';
      }
    }

    // 3. Sincronizar cambios_pantalla desde BD
    if (asistenciaActualId) {
      try {
        const { data: s } = await supabase
          .from('asistencia')
          .select('cambios_pantalla')
          .eq('id', asistenciaActualId)
          .maybeSingle();
        if (s && s.cambios_pantalla !== null && s.cambios_pantalla !== cambiosContador) {
          cambiosContador = s.cambios_pantalla;
          actualizarMonitorUI();
        }
      } catch { /* ignore */ }
    }
  }, 5000);

  // Timer en tiempo real: actualizar cada 1s
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    // Acumular tiempo activo por segundo
    if (_paginaVisible) {
      tiempoActivoAcumulado += 1;
    }
    actualizarTiemposUI();

    if (!monitoreoActivo || !_horaFinStr) return;
    const ahora = new Date();
    const [hf, mf] = _horaFinStr.split(':').map(Number);
    const fin = new Date();
    fin.setHours(hf, mf, 0, 0);
    if (ahora >= fin) {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      actualizarTimer(_horaFinStr);
      return;
    }
    actualizarTimer(_horaFinStr);
  }, 1000);

  // ── Inicializar UI de tiempos ──
  actualizarTiemposUI();

  // ── Registrar inicio en bitácora ──
  registrarEvento('inicio_monitoreo', 'Inició monitoreo de asistencia');

  // Heartbeat: probar presencia activa cada 30s
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = window.setInterval(async () => {
    if (!asistenciaActualId) return;
    try {
      await supabase
        .from('asistencia')
        .update({
          ultimo_latido: new Date().toISOString()
        })
        .eq('id', asistenciaActualId);
      actualizarTiemposUI();
    } catch { /* ignore errores de heartbeat */ }
  }, 30000);

  // Token keepalive: actualizar ultimo_acceso_token cada 60s
  // Esto permite al profesor ver qué alumnos tienen sesión activa
  if (tokenInterval) clearInterval(tokenInterval);
  tokenInterval = window.setInterval(async () => {
    if (!asistenciaActualId) return;
    try {
      await supabase
        .from('asistencia')
        .update({ ultimo_acceso_token: new Date().toISOString() })
        .eq('id', asistenciaActualId);
    } catch { /* ignore */ }
  }, 60000);

  // Event listeners para cambios de pantalla
  document.addEventListener('visibilitychange', manejarVisibilidad);
  window.addEventListener('blur', manejarBlur);
  window.addEventListener('focus', manejarFocus);
  window.addEventListener('pagehide', manejarPageHide);

  // ── beforeunload: marcar cierre en localStorage (para forzar reingreso al reabrir) ──
  _manejadorBeforeUnload = () => {
    if (asistenciaActualId) {
      localStorage.setItem('monitoreo_cerrado_' + asistenciaActualId, Date.now().toString());
    }
  };
  window.addEventListener('beforeunload', _manejadorBeforeUnload);

  cargarContadorExistente();
}

// ====== DETENER MONITOREO ======
function detenerMonitoreo(): void {
  monitoreoActivo = false;
  setMonitoreoActivo(false);

  document.removeEventListener('visibilitychange', manejarVisibilidad);
  window.removeEventListener('blur', manejarBlur);
  window.removeEventListener('focus', manejarFocus);
  window.removeEventListener('pagehide', manejarPageHide);

  // Limpiar beforeunload
  if (_manejadorBeforeUnload) {
    window.removeEventListener('beforeunload', _manejadorBeforeUnload);
    _manejadorBeforeUnload = null;
  }

  // Limpiar flag de sessionStorage (pestaña cerrada)
  if (asistenciaActualId) {
    sessionStorage.removeItem('monitoreo_vivo_' + asistenciaActualId);
  }

  if (monitorChannel) {
    supabase.removeChannel(monitorChannel);
    monitorChannel = null;
  }
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (tokenInterval) {
    clearInterval(tokenInterval);
    tokenInterval = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (reingresoChannel) {
    supabase.removeChannel(reingresoChannel);
    reingresoChannel = null;
  }
  if (_reingresoPollInterval) {
    clearInterval(_reingresoPollInterval);
    _reingresoPollInterval = null;
  }
  _reingresoEjecutandose = false;
  asistenciaActualId = null;
  grupoActualId = null;
}

// ====== SINCRONIZAR CONTADOR ======
export async function sincronizarContador(): Promise<void> {
  if (!asistenciaActualId) return;
  try {
    const { data: s } = await supabase
      .from('asistencia')
      .select('cambios_pantalla, perdonada, confirmada')
      .eq('id', asistenciaActualId)
      .maybeSingle();
    if (!s) return;
    if (s.cambios_pantalla !== null && s.cambios_pantalla !== cambiosContador) {
      cambiosContador = s.cambios_pantalla;
      actualizarMonitorUI();
    }
    if (s.perdonada && !s.confirmada) {
      cambiosContador = s.cambios_pantalla || 0;
      actualizarMonitorUI();
      document.getElementById('monitor-estado')!.innerHTML = '🙏 <strong>Perdonado por el profesor.</strong> Continúa en clase.';
      document.getElementById('monitor-estado')!.style.background = '#e8f5e9';
      document.getElementById('monitor-estado')!.style.color = '#2e7d32';
    }
    mostrarToast('✅ Contador sincronizado: ' + cambiosContador + ' cambios', 'exito');
  } catch (e: any) {
    mostrarToast('Error al sincronizar: ' + e.message, 'error');
  }
}

// ====== CARGAR CONTADOR EXISTENTE ======
async function cargarContadorExistente(): Promise<void> {
  if (!asistenciaActualId) return;
  const { data } = await supabase
    .from('asistencia')
    .select('cambios_pantalla, confirmada, perdonada')
    .eq('id', asistenciaActualId)
    .maybeSingle();
  if (!data) return;
  cambiosContador = data.cambios_pantalla || 0;
  if (data.confirmada) { mostrarConfirmada(); return; }
  if (data.perdonada) {
    document.getElementById('monitor-estado')!.innerHTML = '🙏 Perdonado por el profesor.';
  }
  actualizarMonitorUI();
}

// ====== MANEJADORES DE EVENTOS ======
function manejarVisibilidad(): void {
  if (monitoreoActivo) {
    if (document.visibilityState === 'hidden') {
      const ahora = Date.now();
      if (ahora - _ultimoEventoSalida < 1000) return;
      _ultimoEventoSalida = ahora;
      _paginaVisible = false;
      // Cada ocultamiento (bloqueo, minimizar, cambiar app) = +1 cambio
      incrementarCambio();
    } else if (document.visibilityState === 'visible' && _paginaVisible === false) {
      _paginaVisible = true;
      verificarActividadTemprana();
    }
  }
}

function manejarBlur(): void {
  if (monitoreoActivo) {
    const ahora = Date.now();
    if (ahora - _ultimoEventoSalida < 1000) return;
    _ultimoEventoSalida = ahora;
    _paginaVisible = false;
    // Cada pérdida de foco (alt-tab, Win+L) = +1 cambio
    incrementarCambio();
  }
}

function manejarFocus(): void {
  if (monitoreoActivo) {
    const estabaInactivo = !_paginaVisible;
    _paginaVisible = true;
    if (estabaInactivo) verificarActividadTemprana();
  }
}

/**
 * pagehide se dispara al cerrar pestaña/navegador o navegar a otra página.
 * En móvil también ocurre al bloquear pantalla. Es best-effort porque
 * la página se está descargando; si no alcanza, no pasa nada, el contador
 * de cambios_pantalla ya se incrementó con blur/visibility.
 */
function manejarPageHide(): void {
  if (monitoreoActivo) {
    const ahora = Date.now();
    if (ahora - ultimoCambioTimestamp < 2000) return;
    registrarEvento('salida_pantalla', 'Cerró la página/navegador');
    incrementarCambio();
  }
}

// ====== INCREMENTAR CAMBIO ======
async function incrementarCambio(): Promise<void> {
  if (!asistenciaActualId || cambiosContador >= cambiosLimite) return;
  const ahora = Date.now();
  if (ahora - ultimoCambioTimestamp < 2000) return;
  if (cambioEnProgreso) return; // ya hay un incremento en curso
  ultimoCambioTimestamp = ahora;
  cambioEnProgreso = true;
  cambiosContador++;
  try {
    await supabase
      .from('asistencia')
      .update({
        cambios_pantalla: cambiosContador,
        ultimo_cambio: new Date().toISOString(),
      })
      .eq('id', asistenciaActualId);
    actualizarMonitorUI();
    if (cambiosContador >= cambiosLimite) {
      registrarEvento('limite_alcanzado', `Alcanzó el límite de ${cambiosLimite} cambios de pantalla`);
      const st = document.getElementById('monitor-estado')!;
      st.innerHTML = '⚠️ Límite alcanzado. El profesor puede perdonarte para reiniciar tu contador.';
      st.style.background = '#fff3e0';
      st.style.color = '#e65100';

      // Si ya estaba perdonado y re-excede, revocar el perdón
      // para que necesite uno nuevo (evita confirmar sin permiso)
      const { data: asis } = await supabase
        .from('asistencia')
        .select('perdonada')
        .eq('id', asistenciaActualId)
        .maybeSingle();
      if (asis?.perdonada) {
        await supabase
          .from('asistencia')
          .update({ perdonada: false, estado: 'presente' })
          .eq('id', asistenciaActualId);
        st.innerHTML = '⚠️ Límite alcanzado de nuevo. El profesor debe perdonarte otra vez.';
      }
    }
  } catch (e) {
    console.warn('⚠️ Error al incrementar cambio:', e);
  } finally {
    cambioEnProgreso = false;
  }
}

// ====== ACTUALIZAR UI DE TIEMPOS ======
function actualizarTiemposUI(): void {
  const el = document.getElementById('monitor-tiempos');
  if (!el) return;
  const activo = formatearDuracion(Math.round(tiempoActivoAcumulado));
  el.innerHTML = `
    <div style="display:flex; justify-content:center; font-size:0.85em; margin-bottom:4px;">
      <span style="color:#2e7d32;">✅ Activo: <strong>${activo}</strong></span>
    </div>`;
}

// ====== ACTUALIZAR MONITOR UI ======
function actualizarMonitorUI(): void {
  actualizarTiemposUI();
  document.getElementById('monitor-contador')!.textContent = String(cambiosContador);
  const pct = Math.min((cambiosContador / cambiosLimite) * 100, 100);
  const barra = document.getElementById('monitor-barra')!;
  barra.style.width = pct + '%';
  const icono = document.getElementById('monitor-icon')!;
  const cont = document.getElementById('monitor-contador')!;
  if (cambiosContador === 0) {
    barra.style.background = '#4caf50';
    cont.style.color = '#333';
    icono.textContent = '📱';
  } else if (cambiosContador < cambiosLimite) {
    barra.style.background = '#ff9800';
    cont.style.color = '#e65100';
    icono.textContent = '👀';
  } else {
    barra.style.background = '#f44336';
    cont.style.color = '#c62828';
    icono.textContent = '⚠️';
  }

  const hist = document.getElementById('monitor-historial')!;
  if (cambiosContador > 0) {
    let items = '';
    for (let i = 1; i <= cambiosContador; i++) items += `<div style="padding:3px 0;">🔴 Cambio #${i}</div>`;
    hist.innerHTML = `<div style="font-weight:600;color:#333;">📋 Historial:</div>${items}`;
  } else {
    hist.innerHTML = '<div style="color:#999;">Sin cambios. ✅</div>';
  }
}

// ====== INICIAR REGISTRO DE ASISTENCIA (paso consciente del alumno) ======
export async function iniciarRegistroAsistencia(): Promise<void> {
  if (!asistenciaActualId) {
    mostrarToast('⚠️ No hay una sesión activa. Escanea el QR primero.', 'warning');
    return;
  }

  // Registrar en bitácora
  await registrarEvento('inicio_monitoreo', 'Registro de asistencia iniciado voluntariamente por el alumno');

  // Ocultar sección de inicio (botón + instrucción inicial)
  const inicioSection = document.getElementById('registro-inicio-section');
  if (inicioSection) inicioSection.classList.add('hidden');

  // Mostrar confirmación + instrucción de bloqueo
  const iniciadoSection = document.getElementById('registro-iniciado-section');
  if (iniciadoSection) iniciadoSection.classList.remove('hidden');

  // Mostrar espera-confirmar a menos que sea sin_derecho
  if (_tipoAsistenciaActual !== 'sin_derecho') {
    document.getElementById('espera-confirmar')!.style.display = '';
  }

  // Actualizar estado
  const st = document.getElementById('monitor-estado');
  if (st && _tipoAsistenciaActual !== 'sin_derecho') {
    st.innerHTML = '✅ <strong>Registro iniciado.</strong> Bloquea tu teléfono ahora.';
    st.style.background = '#e8f5e9';
    st.style.color = '#2e7d32';
  }

  mostrarToast('✅ Registro iniciado. Bloquea tu teléfono.', 'exito', 3000);
}

// ====== DETECTAR ACTIVIDAD TEMPRANA (desbloqueo antes del cierre) ======
/**
 * Detecta si el alumno vuelve a estar visible (desbloquea el teléfono)
 * antes de la ventana de 5 min previa al cierre de clase, y marca
 * la actividad temprana con una advertencia visual 🟡 tanto para el
 * alumno como para el profesor (vía BD).
 */
function verificarActividadTemprana(): void {
  if (_actividadTempranaAdvertida) return;
  if (!_confirmarDesde || !asistenciaActualId) return;

  const ahora = new Date();
  if (ahora < _confirmarDesde) {
    // Volvió visible ANTES de los 5 min finales → actividad temprana
    _actividadTempranaAdvertida = true;

    // Persistir en BD para que el profesor lo vea en su panel
    supabase
      .from('asistencia')
      .update({ actividad_temprana: true })
      .eq('id', asistenciaActualId)
      .then(() => {});

    // Mostrar advertencia visual en la UI del alumno
    const advEl = document.getElementById('monitor-advertencia-temprana');
    if (advEl) advEl.classList.remove('hidden');
  }
}

// ====== CONFIRMAR ASISTENCIA ======
export async function confirmarAsistencia(): Promise<void> {
  if (!asistenciaActualId) return;

  // Verificar estado actual desde BD
  const { data: a } = await supabase
    .from('asistencia')
    .select('perdonada, cambios_pantalla, ultimo_latido')
    .eq('id', asistenciaActualId)
    .maybeSingle();

  if (!a) return;

  // Verificar presencia activa (ultimo_latido reciente)
  const latido = a.ultimo_latido ? new Date(a.ultimo_latido).getTime() : 0;
  const MIN_LATIDO_MS = 10 * 60 * 1000; // 10 min de tolerancia
  if (!latido || Date.now() - latido > MIN_LATIDO_MS) {
    mostrarToast('🚫 No se detectó tu presencia continua en clase. Contacta a tu profesor.', 'warning', 6000);
    return;
  }

  const cambiosBD = a.cambios_pantalla ?? cambiosContador;
  const limiteActual = Math.max(cambiosContador, cambiosBD);

  if (limiteActual >= cambiosLimite && !a.perdonada) {
    mostrarToast('⚠️ Has excedido el límite de cambios. El profesor debe perdonarte primero.', 'warning');
    return;
  }

  // Registrar confirmación en bitácora
  await registrarEvento('asistencia_confirmada', 'Confirmó su asistencia voluntariamente');

  // Limpiar token de monitoreo
  localStorage.removeItem('token_monitoreo_' + asistenciaActualId);
  await supabase
    .from('asistencia')
    .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
    .eq('id', asistenciaActualId);
  detenerKeepAliveSesion();
  mostrarConfirmada();
}

function mostrarConfirmada(): void {
  monitoreoActivo = false;
  setMonitoreoActivo(false);
  document.getElementById('monitor-icon')!.textContent = '✅';
  document.getElementById('monitor-estado')!.innerHTML = '🎉 <strong>¡Asistencia confirmada!</strong>';
  document.getElementById('monitor-estado')!.style.background = '#e8f5e9';
  document.getElementById('monitor-estado')!.style.color = '#2e7d32';
  const btn = document.getElementById('btn-confirmar-asistencia') as HTMLButtonElement;
  btn.textContent = '✅ Confirmada';
  btn.disabled = true;
  btn.style.opacity = '0.6';
  btn.onclick = null;
  detenerMonitoreo();
  setTimeout(() => {
    document.getElementById('monitor-view')!.classList.add('hidden');
    document.getElementById('dashboard-view')!.classList.remove('hidden');
    cargarGrupos();
  }, 2000);
}

// ====== SALIR DEL MONITOREO ======
export function salirMonitoreo(): void {
  detenerMonitoreo();
  document.getElementById('monitor-view')!.classList.add('hidden');
  document.getElementById('dashboard-view')!.classList.remove('hidden');
  cargarGrupos();
}

// ====== CONFIRMAR DESDE BANNER (CLASE TERMINADA) ======
export async function confirmarAsistenciaPendiente(asistenciaId: string): Promise<void> {
  const { data: a } = await supabase
    .from('asistencia')
    .select('id, cambios_pantalla, perdonada, ultimo_latido, grupo_id')
    .eq('id', asistenciaId)
    .eq('confirmada', false)
    .maybeSingle();
  if (!a) return;

  // Verificar presencia activa (latido reciente)
  const latido = a.ultimo_latido ? new Date(a.ultimo_latido).getTime() : 0;
  const MIN_LATIDO_MS = 10 * 60 * 1000; // 10 min de tolerancia
  if (!latido || Date.now() - latido > MIN_LATIDO_MS) {
    mostrarToast('🚫 No se detectó tu presencia continua en clase. Contacta a tu profesor.', 'warning', 6000);
    return;
  }

  const cambiosBD = a.cambios_pantalla || 0;
  if (cambiosBD >= 3 && !a.perdonada) {
    mostrarToast('⚠️ No puedes confirmar: excediste el límite de cambios sin perdón.', 'warning', 5000);
    return;
  }

  await registrarEvento('asistencia_confirmada', 'Confirmó su asistencia desde el banner de clase terminada');

  localStorage.removeItem('token_monitoreo_' + asistenciaId);
  await supabase
    .from('asistencia')
    .update({ confirmada: true, token_monitoreo: null, ultimo_acceso_token: null })
    .eq('id', asistenciaId);
  detenerKeepAliveSesion();

  const banner = document.getElementById('reanudar-banner');
  if (banner) {
    banner.innerHTML = `
      <div style="background:#e8f5e9; border:1px solid #a5d6a7; border-radius:12px; padding:14px 16px; text-align:center;">
        ✅ <strong style="color:#2e7d32;">Asistencia confirmada</strong>
      </div>`;
  }
  mostrarToast('✅ Asistencia confirmada correctamente', 'exito');
  cargarGrupos();
}

// ====== ACTUALIZAR TEMPORIZADOR ======
function actualizarTimer(horaFin: string): void {
  const el = document.getElementById('monitor-timer');
  if (!el) return;
  const [hf, mf] = horaFin.split(':').map(Number);
  const fin = new Date();
  fin.setHours(hf, mf, 0, 0);
  const diffMs = fin.getTime() - Date.now();
  if (diffMs <= 0) {
    el.textContent = '00:00';
    return;
  }
  const mins = Math.floor(diffMs / 60000);
  const segs = Math.floor((diffMs % 60000) / 1000);
  el.textContent = `${String(mins).padStart(2,'0')}:${String(segs).padStart(2,'0')}`;
}

// ====== HELPERS ======
function escHTML(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Exponer globalmente para onclick HTML
(window as any).reanudarMonitoreo = reanudarMonitoreo;
(window as any).confirmarAsistencia = confirmarAsistencia;
(window as any).sincronizarContador = sincronizarContador;
(window as any).confirmarAsistenciaPendiente = confirmarAsistenciaPendiente;
(window as any).solicitarReingreso = solicitarReingreso;
(window as any).cancelarReingreso = cancelarReingreso;
(window as any).iniciarRegistroAsistencia = iniciarRegistroAsistencia;
