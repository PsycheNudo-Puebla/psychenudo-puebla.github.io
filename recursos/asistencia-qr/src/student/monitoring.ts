// ============================================================
// Monitoreo de asistencia: detección de cambios de pantalla,
// confirmación, sincronización en tiempo real, auto-reentrada
// ============================================================
import { supabase } from '@/config/supabase';
import { mostrarToast } from '@/config/toaster';
import { getAlumnoActual, setMonitoreoActivo } from './auth';
import { cargarGrupos } from './dashboard';

// ---- Variables de monitoreo ----
export let monitoreoActivo = false;
let asistenciaActualId: string | null = null;
let grupoActualId: string | null = null;
let grupoActualNombre = '';
let cambiosContador = 0;
let cambiosLimite = 3;
let monitorChannel: any = null;
let monitorInterval: number | null = null;
let heartbeatInterval: number | null = null;
let reingresoChannel: any = null;
let cambioEnProgreso = false;
let ultimoCambioTimestamp = 0;
let _inicioMonitoreo = 0;
let _confirmarDesde: Date | null = null;
let _horaFinStr = '';
let _btnConfirmarMostrado = false;
let _tipoAsistenciaActual: string | null = null;

// ====== VERIFICAR SI LA CLASE ESTÁ EN CURSO ======
/** Devuelve true si hay sesión activa o el horario indica clase en curso */
async function verificarClaseEnCurso(grupoId: string): Promise<boolean> {
  try {
    // 1. Sesión activa del profesor
    const { data: sesion } = await supabase
      .from('sesiones_clase')
      .select('id')
      .eq('grupo_id', grupoId)
      .eq('activa', true)
      .maybeSingle();
    if (sesion) return true;

    // 2. Horario programado hoy
    const diaHoy = new Date().getDay();
    const ahora = new Date();
    const hh = ahora.getHours().toString().padStart(2,'0');
    const mm = ahora.getMinutes().toString().padStart(2,'0');
    const horaActualStr = `${hh}:${mm}`;

    const { data: horarios } = await supabase
      .from('horarios')
      .select('hora_inicio, hora_fin')
      .eq('grupo_id', grupoId)
      .eq('dia_semana', diaHoy)
      .eq('activo', true);

    if (horarios) {
      for (const h of horarios) {
        const inicio = h.hora_inicio.substring(0, 5);
        const fin = h.hora_fin.substring(0, 5);
        if (horaActualStr >= inicio && horaActualStr <= fin) return true;
      }
    }
    return false;
  } catch { return false; }
}

// ====== AUTO-REENTRADA ======

export async function autoReanudarMonitoreo(userId: string): Promise<boolean> {
  if (monitoreoActivo) return true;
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const { data: pendiente } = await supabase
      .from('asistencia')
      .select('id, grupo_id, tipo_asistencia, ultimo_latido')
      .eq('alumno_id', userId)
      .eq('fecha', hoy)
      .eq('confirmada', false)
      .maybeSingle();

    if (!pendiente) return false;

    const { data: grupo } = await supabase
      .from('grupos')
      .select('nombre, limite_salidas, ventana_reingreso_min')
      .eq('id', pendiente.grupo_id)
      .maybeSingle();
    if (!grupo) return false;

    const claseEnCurso = await verificarClaseEnCurso(pendiente.grupo_id);

    if (!claseEnCurso) {
      // Clase terminada — si es sin_derecho, auto-confirmar y salir
      if (pendiente.tipo_asistencia === 'sin_derecho') {
        await supabase
          .from('asistencia')
          .update({ confirmada: true })
          .eq('id', pendiente.id);
        return false;
      }
      // Guardamos vars para que revisarAsistenciaPendiente muestre banner
      (window as any)._pendienteAsistenciaId = pendiente.id;
      (window as any)._pendienteGrupoId = pendiente.grupo_id;
      (window as any)._pendienteGrupoNombre = grupo.nombre;
      (window as any)._pendienteLimite = grupo.limite_salidas ?? 3;
      (window as any)._pendienteUltimoLatido = pendiente.ultimo_latido;
      return false;
    }

    // Clase en curso. Verificar si el alumno estuvo ausente poco tiempo
    const ventanaMin = grupo.ventana_reingreso_min ?? 2;
    const ventanaMs = ventanaMin * 60 * 1000;
    const ahora = Date.now();
    const ultimoLatido = pendiente.ultimo_latido
      ? new Date(pendiente.ultimo_latido).getTime()
      : 0;
    const tiempoAusente = ultimoLatido > 0 ? ahora - ultimoLatido : Infinity;

    if (tiempoAusente <= ventanaMs) {
      // Reciente → auto-reanudar
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
    const hoy = new Date().toISOString().split('T')[0];
    const { data: asistenciaPendiente } = await supabase
      .from('asistencia')
      .select('id, grupo_id, cambios_pantalla, sesion_codigo, ultimo_latido')
      .eq('alumno_id', alumno.id)
      .eq('fecha', hoy)
      .eq('confirmada', false)
      .maybeSingle();

    if (!asistenciaPendiente) return;

    const { data: grupo } = await supabase
      .from('grupos')
      .select('nombre, limite_salidas, ventana_reingreso_min')
      .eq('id', asistenciaPendiente.grupo_id)
      .maybeSingle();
    if (!grupo) return;

    const limite = grupo.limite_salidas ?? 3;
    const cambiosActuales = asistenciaPendiente.cambios_pantalla || 0;
    const ventanaMin = grupo.ventana_reingreso_min ?? 2;

    (window as any)._pendienteAsistenciaId = asistenciaPendiente.id;
    (window as any)._pendienteGrupoId = asistenciaPendiente.grupo_id;
    (window as any)._pendienteGrupoNombre = grupo.nombre;
    (window as any)._pendienteLimite = limite;
    (window as any)._pendienteUltimoLatido = asistenciaPendiente.ultimo_latido;
    (window as any)._pendienteVentanaMin = ventanaMin;
    (window as any)._pendienteCambios = cambiosActuales;

    const claseEnCurso = await verificarClaseEnCurso(asistenciaPendiente.grupo_id);
    const w = window as any;
    w._pendienteClaseEnCurso = claseEnCurso;

    if (!claseEnCurso) {
      // ── CLASE TERMINADA ──
      // Solo mostrar confirmar si hubo latido reciente (presencia comprobable)
      const ultimoLatido = asistenciaPendiente.ultimo_latido
        ? new Date(asistenciaPendiente.ultimo_latido).getTime()
        : 0;
      const tienePresencia = ultimoLatido > 0;

      if (tienePresencia) {
        banner.innerHTML = `
          <div style="background:#e3f2fd; border:1px solid #90caf9; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="font-size:1.5em;">⏰</div>
            <div style="flex:1; min-width:150px;">
              <strong style="color:#1565c0;">Clase terminada</strong>
              <br><small style="color:#666;">${escHTML(grupo.nombre)} — Confirma tu asistencia pendiente</small>
            </div>
            <button onclick="window.confirmarAsistenciaPendiente('${asistenciaPendiente.id}')" class="btn-primary" style="background:#1565c0; white-space:nowrap; font-size:0.9em;">✅ Confirmar asistencia</button>
          </div>`;
      } else {
        banner.innerHTML = `
          <div style="background:#ffebee; border:1px solid #ef9a9a; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="font-size:1.5em;">🚫</div>
            <div style="flex:1; min-width:150px;">
              <strong style="color:#c62828;">No se detectó tu presencia</strong>
              <br><small style="color:#666;">No tienes actividad registrada. Contacta a tu profesor.</small>
            </div>
          </div>`;
      }
    } else if (asistenciaPendiente.ultimo_latido &&
        Date.now() - new Date(asistenciaPendiente.ultimo_latido).getTime() <= ventanaMin * 60 * 1000) {
      // ── CLASE EN CURSO Y LATIDO RECIENTE → auto-reanudar directo
      // Esto no debería ocurrir porque autoReanudarMonitoreo ya lo maneja,
      // pero si llegó aquí igual, lo resolvemos
      try {
        reanudarMonitoreo();
      } catch { /* ignore */ }
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

  try {
    await supabase
      .from('asistencia')
      .update({ reingreso_solicitado: true })
      .eq('id', asistenciaId);

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

    // Escuchar en tiempo real la aprobación del profesor
    if (reingresoChannel) supabase.removeChannel(reingresoChannel);
    reingresoChannel = supabase
      .channel('reingreso-' + asistenciaId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'asistencia', filter: `id=eq.${asistenciaId}` },
        (payload: any) => {
          // Profesor aprobó: reingreso_solicitado=false y ultimo_latido actualizado
          if (!payload.new.reingreso_solicitado && payload.new.ultimo_latido) {
            if (reingresoChannel) supabase.removeChannel(reingresoChannel);
            reingresoChannel = null;
            // Reanudar monitoreo
            const grupoId = w._pendienteGrupoId;
            const grupoNombre = w._pendienteGrupoNombre;
            const limite = w._pendienteLimite ?? 3;
            if (grupoId && grupoNombre) {
              document.getElementById('login-view')!.classList.add('hidden');
              document.getElementById('dashboard-view')!.classList.add('hidden');
              iniciarMonitoreo(asistenciaId, grupoId, grupoNombre, limite);
            }
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Error al solicitar reingreso:', e);
    mostrarToast('Error al solicitar reingreso', 'error');
  }
}

export function cancelarReingreso(): void {
  if (reingresoChannel) {
    supabase.removeChannel(reingresoChannel);
    reingresoChannel = null;
  }
  // Volver al banner anterior recargando
  revisarAsistenciaPendiente();
}

export function reanudarMonitoreo(): void {
  const w = window as any;
  if (w._pendienteAsistenciaId) {
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
  document.getElementById('espera-confirmar')!.style.display = '';
  // El botón salir-monitoreo fue eliminado — el estudiante no debe poder salir
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
      clearInterval(monitorInterval!);
      monitorInterval = null;
      const mins = (new Date().getTime() - _inicioMonitoreo) / 60000;

      if (_tipoAsistenciaActual === 'sin_derecho') {
        document.getElementById('espera-confirmar')!.style.display = 'none';
        // Auto-confirmar asistencia sin derecho porque la clase terminó
        if (asistenciaActualId) {
          await supabase
            .from('asistencia')
            .update({ confirmada: true })
            .eq('id', asistenciaActualId);
        }
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

  // Heartbeat: probar presencia activa cada 30s
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = window.setInterval(async () => {
    if (!asistenciaActualId) return;
    try {
      await supabase
        .from('asistencia')
        .update({ ultimo_latido: new Date().toISOString() })
        .eq('id', asistenciaActualId);
    } catch { /* ignore errores de heartbeat */ }
  }, 30000);

  // Event listeners para cambios de pantalla
  document.addEventListener('visibilitychange', manejarVisibilidad);
  window.addEventListener('blur', manejarBlur);

  cargarContadorExistente();
}

// ====== DETENER MONITOREO ======
function detenerMonitoreo(): void {
  monitoreoActivo = false;
  setMonitoreoActivo(false);
  document.removeEventListener('visibilitychange', manejarVisibilidad);
  window.removeEventListener('blur', manejarBlur);
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
  if (reingresoChannel) {
    supabase.removeChannel(reingresoChannel);
    reingresoChannel = null;
  }
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
  if (document.visibilityState === 'hidden' && monitoreoActivo && !cambioEnProgreso) {
    const ahora = Date.now();
    if (ahora - ultimoCambioTimestamp < 2000) return;
    incrementarCambio();
  }
}

function manejarBlur(): void {
  if (monitoreoActivo && !cambioEnProgreso) {
    const ahora = Date.now();
    if (ahora - ultimoCambioTimestamp < 2000) return;
    incrementarCambio();
  }
}

// ====== INCREMENTAR CAMBIO ======
async function incrementarCambio(): Promise<void> {
  if (!asistenciaActualId || cambiosContador >= cambiosLimite) return;
  const ahora = Date.now();
  if (ahora - ultimoCambioTimestamp < 2000) return;
  ultimoCambioTimestamp = ahora;
  cambioEnProgreso = true;
  cambiosContador++;
  await supabase
    .from('asistencia')
    .update({
      cambios_pantalla: cambiosContador,
      ultimo_cambio: new Date().toISOString(),
    })
    .eq('id', asistenciaActualId);
  actualizarMonitorUI();
  cambioEnProgreso = false;
  if (cambiosContador >= cambiosLimite) {
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
}

// ====== ACTUALIZAR UI ======
function actualizarMonitorUI(): void {
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

  await supabase
    .from('asistencia')
    .update({ confirmada: true })
    .eq('id', asistenciaActualId);
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
    .select('id, cambios_pantalla, perdonada, ultimo_latido')
    .eq('id', asistenciaId)
    .eq('confirmada', false)
    .maybeSingle();
  if (!a) return;

  // Verificar presencia activa
  const latido = a.ultimo_latido ? new Date(a.ultimo_latido).getTime() : 0;
  if (!latido) {
    mostrarToast('🚫 No se detectó tu presencia en clase. Contacta a tu profesor.', 'warning', 6000);
    return;
  }

  const cambiosBD = a.cambios_pantalla || 0;
  if (cambiosBD >= 3 && !a.perdonada) {
    mostrarToast('⚠️ No puedes confirmar: excediste el límite de cambios sin perdón.', 'warning', 5000);
    return;
  }

  await supabase
    .from('asistencia')
    .update({ confirmada: true })
    .eq('id', asistenciaId);

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
