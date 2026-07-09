// ============================================================
// Monitoreo en vivo de alumnos durante la clase
// ============================================================
import { supabase } from '@/config/supabase';
import { profesorActual } from '@/shared/auth';
import { mostrarToast } from '@/config/toaster';
import { MonitorAlumno } from '@/types';
import { hoyLocal } from '@/shared/utils';

let monitorGrupoId: string | null = null;
let monitorPollInterval: ReturnType<typeof setTimeout> | null = null;
let monitorProfChannel: any = null;
// Rastrear qué asistencias ya notificamos con reingreso para evitar toast repetidos
const _reingresoNotificados = new Set<string>();

export function getMonitorGrupoId(): string | null { return monitorGrupoId; }

export async function reabrirMonitoreo(grupoId: string): Promise<void> {
  document.getElementById('monitoreo-panel')!.classList.remove('hidden');
  monitorGrupoId = grupoId;
  _reingresoNotificados.clear();
  await cargarAsistenciasActivas();
  iniciarPolling(grupoId);
  iniciarRealtime(grupoId);
}

async function cargarAsistenciasActivas(): Promise<void> {
  const container = document.getElementById('monitoreo-lista')!;
  if (!monitorGrupoId) return;

  const { data: asistencias } = await supabase
    .from('asistencia')
    .select('*, alumnos!inner(id, nombre, email)')
    .eq('grupo_id', monitorGrupoId)
    .eq('fecha', hoyLocal())
    .order('creado_en', { ascending: true });

  // Actualizar encabezado del monitoreo
  const { data: grupo } = await supabase
    .from('grupos')
    .select('numero_perdones, nombre, limite_ausente_min')
    .eq('id', monitorGrupoId)
    .maybeSingle();
  const maxPerdones = grupo?.numero_perdones ?? 2;

  const elNombreGrupo = document.getElementById('monitoreo-grupo-nombre');
  if (elNombreGrupo) elNombreGrupo.textContent = grupo?.nombre || '';

  const elLimiteAusente = document.getElementById('monitoreo-limite-ausente');
  if (elLimiteAusente && grupo?.limite_ausente_min !== undefined) {
    elLimiteAusente.textContent = String(grupo.limite_ausente_min);
  }

  // Quitado: perdones del header (ahora se muestra por alumno en cada tarjeta)

  if (!asistencias || asistencias.length === 0) {
    container.innerHTML = '<p class="empty-state">📭 No hay alumnos registrados hoy.</p>';
    const elCount = document.getElementById('monitoreo-alumnos-count');
    if (elCount) elCount.textContent = '0';
    return;
  }

  const elCount = document.getElementById('monitoreo-alumnos-count');
  if (elCount) elCount.textContent = String(asistencias.length);

  // Contar perdones por alumno hoy (para mostrar en cada tarjeta)
  const { data: perdonesHoy } = await supabase
    .from('asistencia')
    .select('alumno_id, perdonada')
    .eq('grupo_id', monitorGrupoId)
    .eq('fecha', hoyLocal());
  const perdonesPorAlumno: Record<string, number> = {};
  if (perdonesHoy) {
    for (const a of perdonesHoy) {
      if (a.perdonada) {
        perdonesPorAlumno[a.alumno_id] = (perdonesPorAlumno[a.alumno_id] || 0) + 1;
      }
    }
  }

  // Contar alumnos con reingreso solicitado para el badge
  const solicitantes = asistencias.filter((a: any) => a.reingreso_solicitado && !a.confirmada);
  const elSolicitantes = document.getElementById('monitoreo-reingresos-count');
  if (elSolicitantes) {
    elSolicitantes.textContent = String(solicitantes.length);
    (elSolicitantes.parentElement as HTMLElement).style.display = solicitantes.length > 0 ? '' : 'none';
  }

  // Notificar nuevos reingresos (toast)
  for (const a of asistencias) {
    if (a.reingreso_solicitado && !a.confirmada && !_reingresoNotificados.has(a.id)) {
      _reingresoNotificados.add(a.id);
      const nombre = a.alumnos?.nombre || a.alumnos?.email || 'Alumno';
      mostrarToast(`🔄 ${nombre} solicita reingreso`, 'info', 6000);
    }
  }

  const limiteAusenteMin = grupo?.limite_ausente_min ?? 5;

  container.innerHTML = asistencias.map((a: any) => {
    const nombre = a.alumnos?.nombre || a.alumnos?.email || 'Sin nombre';
    const cambios = a.cambios_pantalla || 0;
    const excedido = cambios >= 3;
    const confirmada = a.confirmada;
    const perdonada = a.perdonada;
    const reingreso = a.reingreso_solicitado;
    const tiempoAusenteSeg = a.tiempo_ausente_acumulado || 0;
    const ausenteExcedido = limiteAusenteMin > 0 && tiempoAusenteSeg >= limiteAusenteMin * 60;

    let estadoHTML: string;
    if (confirmada) {
      estadoHTML = '<span style="color:#2e7d32; font-weight:700;">✅ Confirmada</span>';
    } else if (reingreso) {
      estadoHTML = '<span style="color:#6a1b9a; font-weight:700;">🔄 Solicita reingreso</span>';
    } else if (perdonada) {
      estadoHTML = '<span style="color:#f57f17; font-weight:700;">🙏 Perdonado</span>';
    } else if (excedido) {
      estadoHTML = '<span style="color:#c62828; font-weight:700;">⚠️ Excedido</span>';
    } else {
      estadoHTML = '<span style="color:#1976d2; font-weight:500;">🔵 Pendiente</span>';
    }

    // Barra de cambios
    const ancho = Math.min((cambios / 3) * 100, 100);
    const barraColor = excedido ? '#c62828' : perdonada ? '#f57f17' : '#ff9800';

    const btnPerdonar = !perdonada && !confirmada && !reingreso
      ? `<button onclick="perdonarAlumno('${a.id}', this)" class="btn-secondary" style="font-size:0.75em; padding:4px 10px; background:#fff8e1; color:#f57f17;">🙏 Perdonar</button>`
      : '';

    const btnReingreso = reingreso
      ? `<button onclick="aprobarReingreso('${a.id}', this)" class="btn-primary" style="font-size:0.85em; padding:6px 14px; background:#6a1b9a; color:white; border:none; border-radius:8px; cursor:pointer; width:100%; font-weight:700; box-shadow:0 2px 8px rgba(106,27,154,0.3);">🔄 Aprobar reingreso</button>`
      : '';

    // Botón de bitácora siempre visible
    const btnBitacora = `<button onclick="window.mostrarBitacora('${a.id}', this)" class="btn-secondary" style="font-size:0.75em; padding:4px 10px; background:#f3e5f5; color:#7b1fa2; border:1px solid #ce93d8; border-radius:8px; cursor:pointer;">📋 Ver actividad</button>`;

    const perdonesAlumno = perdonesPorAlumno[a.alumno_id] || 0;
    const perdonesHTML = perdonesAlumno > 0
      ? `<span style="font-size:0.8em; color:#f57f17; font-weight:600;">🙏 ${perdonesAlumno}/${maxPerdones}</span>`
      : '';

    const reingresoBg = reingreso ? 'background:#f3e5f5; border:2px solid #6a1b9a;' : 'background:white; border:1px solid #eee;';
    return `
    <div style="${reingresoBg} border-radius:10px; padding:12px; margin-bottom:8px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong>👤 ${nombre} ${perdonesHTML}</strong>
        ${estadoHTML}
      </div>
      <div style="font-size:0.85em; color:#666;">
        📱 Cambios de pantalla: ${cambios}/3
        <div style="height:6px; background:#eee; border-radius:3px; margin-top:4px;">
          <div style="height:100%; width:${ancho}%; background:${barraColor}; border-radius:3px; transition:width 0.3s;"></div>
        </div>
      </div>
      ${tiempoAusenteSeg > 0
        ? `<div style="font-size:0.82em; margin-top:4px;">
            🕐 <strong>Ausente:</strong> ${formatearDuracionProf(tiempoAusenteSeg)}
            ${ausenteExcedido
              ? '<span style="color:#c62828; font-weight:600; margin-left:6px;">⚠️ Límite excedido</span>'
              : `<span style="color:#999;">(límite: ${limiteAusenteMin} min)</span>`
            }
          </div>`
        : ''}
      <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
        <div>${btnBitacora}</div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;${reingreso ? ' width:100%;' : ''}">${btnPerdonar}${btnReingreso ? ' ' + btnReingreso : ''}</div>
      </div>
    </div>`;
  }).join('');
}

export async function perdonarAlumno(asistenciaId: string, btn: HTMLButtonElement): Promise<void> {
  if (!monitorGrupoId) return;
  btn.disabled = true;
  btn.textContent = '⏳...';

  // Obtener el límite de perdones POR ALUMNO del grupo
  const { data: grupo } = await supabase
    .from('grupos')
    .select('numero_perdones')
    .eq('id', monitorGrupoId)
    .maybeSingle();
  const maxPerdones = grupo?.numero_perdones ?? 2;

  // Obtener el alumno_id de esta asistencia
  const { data: asis } = await supabase
    .from('asistencia')
    .select('alumno_id')
    .eq('id', asistenciaId)
    .maybeSingle();
  if (!asis) {
    mostrarToast('❌ No se encontró la asistencia.', 'error');
    btn.disabled = false;
    btn.textContent = '🙏 Perdonar';
    return;
  }

  // Contar cuántos perdones tiene YA este alumno hoy
  const hoy = hoyLocal();
  const { count: perdonesAlumno } = await supabase
    .from('asistencia')
    .select('*', { count: 'exact', head: true })
    .eq('alumno_id', asis.alumno_id)
    .eq('fecha', hoy)
    .eq('perdonada', true);

  const usados = perdonesAlumno ?? 0;
  if (usados >= maxPerdones) {
    mostrarToast(`❌ Este alumno ya usó sus ${maxPerdones} perdones hoy.`, 'error', 5000);
    btn.disabled = false;
    btn.textContent = '🙏 Perdonar';
    return;
  }

  const { error } = await supabase
    .from('asistencia')
    .update({ perdonada: true, estado: 'justificado', cambios_pantalla: 0 })
    .eq('id', asistenciaId);

  if (error) {
    mostrarToast('Error al perdonar: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = '🙏 Perdonar';
    return;
  }

  const restantes = maxPerdones - (usados + 1);
  mostrarToast(`✅ Perdonado (${usados + 1}/${maxPerdones} de este alumno — quedan ${restantes})`, 'exito', 4000);
  await cargarAsistenciasActivas();
}

function iniciarPolling(grupoId: string): void {
  if (monitorPollInterval) clearTimeout(monitorPollInterval);
  const poll = async () => {
    if (!monitorGrupoId) return;
    await cargarAsistenciasActivas();
    monitorPollInterval = setTimeout(poll, 3000);
  };
  monitorPollInterval = setTimeout(poll, 3000);
}

function iniciarRealtime(grupoId: string): void {
  if (monitorProfChannel) {
    supabase.removeChannel(monitorProfChannel);
  }
  monitorProfChannel = supabase
    .channel(`monitor-prof-${grupoId}`)
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'asistencia', filter: `grupo_id=eq.${grupoId}` },
      () => { cargarAsistenciasActivas(); }
    )
    .subscribe();
}

// ====== MOSTRAR BITÁCORA DE ACTIVIDAD (modal overlay) ======
let _bitacoraAsistenciaId: string | null = null;

export async function mostrarBitacora(asistenciaId: string, _btn: HTMLElement): Promise<void> {
  _bitacoraAsistenciaId = asistenciaId;

  const modal = document.getElementById('modal-bitacora');
  const infoEl = document.getElementById('bitacora-alumno-info');
  const contentEl = document.getElementById('bitacora-contenido');
  if (!modal || !infoEl || !contentEl) return;

  // Mostrar modal con carga
  modal.classList.remove('hidden');
  infoEl.textContent = 'Cargando...';
  contentEl.innerHTML = '<p class="empty-state">⏳ Cargando actividad...</p>';

  // Obtener el nombre del alumno desde el DOM de la lista de monitoreo
  // Buscar en el card que contiene el botón
  let nombreAlumno = 'Alumno';
  try {
    const card = _btn.closest('div[style*="background:white"]');
    if (card) {
      const strongEl = card.querySelector('strong');
      if (strongEl) nombreAlumno = strongEl.textContent?.replace('👤 ', '') || nombreAlumno;
    }
  } catch { /* ignorar */ }

  try {
    const { data: eventos, error } = await supabase
      .from('bitacora_actividad')
      .select('tipo, detalle, registrada_en')
      .eq('asistencia_id', asistenciaId)
      .order('registrada_en', { ascending: false })
      .limit(50);

    if (error) throw error;

    infoEl.textContent = `👤 ${nombreAlumno} — ${eventos?.length || 0} eventos registrados`;

    if (!eventos || eventos.length === 0) {
      contentEl.innerHTML = '<div style="text-align:center; color:#999; padding:16px; font-size:0.9em;">📭 Sin actividad registrada.</div>';
      return;
    }

    // Calcular estadísticas de ausencias
    let totalAusenciaSeg = 0;
    for (const e of eventos) {
      if (e.tipo === 'salida_pantalla' && e.detalle) {
        const matchMins = e.detalle.match(/Ausente (\d+)m(?:\s+(\d+)s)?/);
        const matchSegs = e.detalle.match(/Ausente (\d+)s(?!\d)/);
        if (matchMins) {
          totalAusenciaSeg += parseInt(matchMins[1]) * 60 + (parseInt(matchMins[2]) || 0);
        } else if (matchSegs) {
          totalAusenciaSeg += parseInt(matchSegs[1]);
        }
      }
    }

    function iconoParaTipo(t: string): string {
      switch (t) {
        case 'inicio_monitoreo': return '🟢';
        case 'salida_pantalla': return '🔴';
        case 'regreso_pantalla': return '🟡';
        case 'limite_alcanzado': return '⚠️';
        case 'perdonado': return '🙏';
        case 'reingreso_solicitado': return '🔄';
        case 'reingreso_aprobado': return '✅';
        case 'asistencia_confirmada': return '🎉';
        case 'clase_terminada': return '⏰';
        default: return '📌';
      }
    }

    function textoParaTipo(t: string): string {
      switch (t) {
        case 'inicio_monitoreo': return 'Inicio';
        case 'salida_pantalla': return '⚠ Salió de clase';
        case 'regreso_pantalla': return '↩ Regresó';
        case 'limite_alcanzado': return '🚫 Límite alcanzado';
        case 'perdonado': return '🙏 Perdonado';
        case 'reingreso_solicitado': return '🔄 Solicitó reingreso';
        case 'reingreso_aprobado': return '✅ Reingreso aprobado';
        case 'asistencia_confirmada': return '🎉 Confirmó asistencia';
        case 'clase_terminada': return '⏰ Clase terminó';
        default: return t;
      }
    }

    const totalAusenciaTexto = totalAusenciaSeg > 0
      ? ` · Ausente total: ~${Math.round(totalAusenciaSeg / 60)} min`
      : '';

    // Determinar si el alumno está actualmente ausente
    const ultimoEvento = eventos[0];
    const estaAusente = ultimoEvento?.tipo === 'salida_pantalla' && ultimoEvento?.detalle && !ultimoEvento.detalle.includes('Ausente');
    const alertaAusente = estaAusente
      ? `<div style="background:#ffebee; color:#c62828; padding:6px 10px; border-radius:6px; font-size:0.82rem; font-weight:600; margin-bottom:6px;">🔴 Alumno actualmente ausente de la ventana de monitoreo</div>`
      : '';

    const eventosHtml = eventos.map((e: any) => {
      const icono = iconoParaTipo(e.tipo);
      const texto = textoParaTipo(e.tipo);
      const hora = e.registrada_en
        ? new Date(e.registrada_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';

      let detalleHtml = '';
      let duracionHtml = '';
      if (e.detalle) {
        const matchDur = e.detalle.match(/— Ausente (.+)$/);
        if (matchDur) {
          duracionHtml = `<span style="font-weight:600; color:#c62828; margin-left:4px;">⌛ ${escHtml(matchDur[1])}</span>`;
          detalleHtml = `<span style="color:#888; font-size:0.85em;">${escHtml(e.detalle.replace(/ — Ausente .+$/, ''))}</span>`;
        } else {
          detalleHtml = `<span style="color:#888; font-size:0.85em;">${escHtml(e.detalle)}</span>`;
        }
      }

      const color = e.tipo === 'salida_pantalla' ? '#c62828'
        : e.tipo === 'limite_alcanzado' ? '#e65100'
        : e.tipo === 'regreso_pantalla' || e.tipo === 'reingreso_aprobado' || e.tipo === 'perdonado' ? '#2e7d32'
        : e.tipo === 'asistencia_confirmada' ? '#1565c0'
        : '#555';
      return `<div style="display:flex; align-items:center; gap:6px; padding:5px 0; font-size:0.82rem; border-bottom:1px solid #f5f5f5;">
        <span>${icono}</span>
        <span style="font-family:monospace; color:#999; white-space:nowrap; min-width:70px;">${hora}</span>
        <span style="color:${color}; font-weight:500; min-width:100px;">${texto}</span>
        ${duracionHtml}
        ${detalleHtml ? `<span style="margin-left:auto;">${detalleHtml}</span>` : ''}
      </div>`;
    }).join('');

    contentEl.innerHTML = `
      <div style="font-size:0.82rem; color:#666; margin-bottom:6px; font-weight:600;">
        📋 Actividad (${eventos.length} eventos${totalAusenciaTexto})
      </div>
      ${alertaAusente}
      <div style="max-height:320px; overflow-y:auto; border:1px solid #f0f0f0; border-radius:6px; padding:4px 8px; background:#fafafa;">
        ${eventosHtml}
      </div>`;
  } catch (e: any) {
    contentEl.innerHTML = `<div style="text-align:center; color:#c62828; padding:16px; font-size:0.9em;">❌ Error al cargar bitácora: ${escHtml(e.message)}</div>`;
  }
}

export function cerrarBitacora(): void {
  const modal = document.getElementById('modal-bitacora');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/** Escape HTML para evitar XSS */
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Formatea segundos a texto amigable para el profesor */
function formatearDuracionProf(segundos: number): string {
  const mins = Math.floor(segundos / 60);
  const segs = segundos % 60;
  if (mins === 0) return `${segs}s`;
  return segs > 0 ? `${mins}m ${segs}s` : `${mins}m`;
}

// ====== APROBAR REINGRESO ======
export async function aprobarReingreso(asistenciaId: string, btn: HTMLButtonElement): Promise<void> {
  btn.disabled = true;
  btn.textContent = '⏳...';

  const { error } = await supabase
    .from('asistencia')
    .update({
      reingreso_solicitado: false,
      ultimo_latido: new Date().toISOString(),
    })
    .eq('id', asistenciaId);

  if (error) {
    mostrarToast('Error al aprobar reingreso: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = '✅ Aprobar reingreso';
    return;
  }

  mostrarToast('✅ Reingreso aprobado — el alumno volverá al monitoreo.', 'exito', 4000);
  _reingresoNotificados.delete(asistenciaId);
  await cargarAsistenciasActivas();
}

export function detenerMonitoreo(): void {
  if (monitorPollInterval) { clearTimeout(monitorPollInterval); monitorPollInterval = null; }
  if (monitorProfChannel) { supabase.removeChannel(monitorProfChannel); monitorProfChannel = null; }
  monitorGrupoId = null;
  _reingresoNotificados.clear();
}

// Alias para onclick en HTML
export const cerrarMonitoreo = detenerMonitoreo;

// ====== EDITAR LÍMITE DE AUSENCIA POR GRUPO ======
(window as any).editarLimiteAusente = function editarLimiteAusente(): void {
  const span = document.getElementById('monitoreo-limite-ausente');
  if (!span || !monitorGrupoId) return;
  const valorActual = parseInt(span.textContent || '5');
  span.innerHTML = `<input id="input-limite-ausente" type="number" min="1" max="60" value="${valorActual}" style="width:50px; text-align:center; font-size:0.9em; padding:2px 4px; border:1px solid #667eea; border-radius:4px;">`;
  const input = document.getElementById('input-limite-ausente') as HTMLInputElement;
  input?.focus();
  input?.select();

  const guardar = async () => {
    let nuevoValor = parseInt(input?.value || '5');
    if (nuevoValor < 1) nuevoValor = 1;
    if (nuevoValor > 60) nuevoValor = 60;
    const { error } = await supabase
      .from('grupos')
      .update({ limite_ausente_min: nuevoValor })
      .eq('id', monitorGrupoId);
    if (error) {
      mostrarToast('❌ Error al guardar: ' + error.message, 'error');
    } else {
      mostrarToast(`✅ Límite de ausencia actualizado a ${nuevoValor} min`, 'exito', 3000);
      span.textContent = String(nuevoValor);
    }
  };

  const onSave = async () => { await guardar(); };
  const onCancel = () => { span.textContent = String(valorActual); };

  input?.addEventListener('blur', onSave);
  input?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { input?.blur(); }
    if (e.key === 'Escape') { onCancel(); }
  });
};
