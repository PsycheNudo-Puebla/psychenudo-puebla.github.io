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

export function getMonitorGrupoId(): string | null { return monitorGrupoId; }

export async function reabrirMonitoreo(grupoId: string): Promise<void> {
  document.getElementById('monitoreo-panel')!.classList.remove('hidden');
  monitorGrupoId = grupoId;
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
    .select('numero_perdones, nombre')
    .eq('id', monitorGrupoId)
    .maybeSingle();
  const maxPerdones = grupo?.numero_perdones ?? 2;

  const elNombreGrupo = document.getElementById('monitoreo-grupo-nombre');
  if (elNombreGrupo) elNombreGrupo.textContent = grupo?.nombre || '';

  const elLimite = document.getElementById('monitoreo-perdones-max');
  if (elLimite) elLimite.textContent = String(maxPerdones);

  const elUsados = document.getElementById('monitoreo-perdones-usados');
  if (elUsados) elUsados.textContent = String(0);

  if (!asistencias || asistencias.length === 0) {
    container.innerHTML = '<p class="empty-state">📭 No hay alumnos registrados hoy.</p>';
    const elCount = document.getElementById('monitoreo-alumnos-count');
    if (elCount) elCount.textContent = '0';
    return;
  }

  const elCount = document.getElementById('monitoreo-alumnos-count');
  if (elCount) elCount.textContent = String(asistencias.length);

  // Contar perdones usados hoy (sumar perdonadas)
  const perdonesUsados = asistencias.filter((a: any) => a.perdonada).length;
  const elUsados2 = document.getElementById('monitoreo-perdones-usados');
  if (elUsados2) elUsados2.textContent = String(perdonesUsados);

  // Contar alumnos con reingreso solicitado para el badge
  const solicitantes = asistencias.filter((a: any) => a.reingreso_solicitado && !a.confirmada);
  const elSolicitantes = document.getElementById('monitoreo-reingresos-count');
  if (elSolicitantes) {
    elSolicitantes.textContent = String(solicitantes.length);
    (elSolicitantes.parentElement as HTMLElement).style.display = solicitantes.length > 0 ? '' : 'none';
  }

  container.innerHTML = asistencias.map((a: any) => {
    const nombre = a.alumnos?.nombre || a.alumnos?.email || 'Sin nombre';
    const cambios = a.cambios_pantalla || 0;
    const excedido = cambios >= 3;
    const confirmada = a.confirmada;
    const perdonada = a.perdonada;
    const reingreso = a.reingreso_solicitado;

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
      ? `<button onclick="aprobarReingreso('${a.id}', this)" class="btn-primary" style="font-size:0.75em; padding:4px 10px; background:#6a1b9a; color:white; border:none; border-radius:8px; cursor:pointer;">✅ Aprobar reingreso</button>`
      : '';

    // Botón de bitácora siempre visible
    const btnBitacora = `<button onclick="window.mostrarBitacora('${a.id}', this)" class="btn-secondary" style="font-size:0.75em; padding:4px 10px; background:#f3e5f5; color:#7b1fa2; border:1px solid #ce93d8; border-radius:8px; cursor:pointer;">📋 Ver actividad</button>`;

    return `
    <div style="background:white; border-radius:10px; padding:12px; margin-bottom:8px; box-shadow:0 1px 4px rgba(0,0,0,0.06);${reingreso ? 'border-left:4px solid #6a1b9a;' : ''}">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong>👤 ${nombre}</strong>
        ${estadoHTML}
      </div>
      <div style="font-size:0.85em; color:#666;">
        📱 Cambios de pantalla: ${cambios}/3
        <div style="height:6px; background:#eee; border-radius:3px; margin-top:4px;">
          <div style="height:100%; width:${ancho}%; background:${barraColor}; border-radius:3px; transition:width 0.3s;"></div>
        </div>
      </div>
      <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
        <div>${btnBitacora}</div>
        <div>${btnPerdonar}${btnReingreso ? ' ' + btnReingreso : ''}</div>
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

// ====== MOSTRAR BITÁCORA DE ACTIVIDAD ======
export async function mostrarBitacora(asistenciaId: string, btnContainer: HTMLElement): Promise<void> {
  // Buscar si ya hay un contenedor de bitácora abierto
  const existingContainer = document.getElementById('bitacora-' + asistenciaId);
  if (existingContainer) {
    // Toggle: si ya está visible, ocultarlo
    if (existingContainer.style.display === 'none') {
      existingContainer.style.display = '';
      btnContainer.textContent = '📋 Ocultar actividad';
    } else {
      existingContainer.style.display = 'none';
      btnContainer.textContent = '📋 Ver actividad';
    }
    return;
  }

  // Crear contenedor de bitácora
  const container = document.createElement('div');
  container.id = 'bitacora-' + asistenciaId;
  container.style.marginTop = '8px';
  container.style.borderTop = '1px solid #eee';
  container.style.paddingTop = '8px';
  container.innerHTML = '<div style="text-align:center; color:#999; padding:8px;">⏳ Cargando actividad...</div>';

  // Insertar después del botón
  const parentDiv = btnContainer.closest('div')?.parentElement;
  if (parentDiv) {
    parentDiv.appendChild(container);
  }

  btnContainer.textContent = '📋 Ocultar actividad';

  // Obtener eventos de la bitácora
  try {
    const { data: eventos, error } = await supabase
      .from('bitacora_actividad')
      .select('tipo, detalle, registrada_en')
      .eq('asistencia_id', asistenciaId)
      .order('registrada_en', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!eventos || eventos.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:#999; padding:8px; font-size:0.85em;">📭 Sin actividad registrada.</div>';
      return;
    }

    // Calcular estadísticas de ausencias
    let totalAusenciaSeg = 0;
    let salidasSinRegreso = 0;
    for (const e of eventos) {
      if (e.tipo === 'salida_pantalla' && e.detalle) {
        const matchMins = e.detalle.match(/Ausente (\d+)m(?:\s+(\d+)s)?/);
        const matchSegs = e.detalle.match(/Ausente (\d+)s(?!\d)/);
        if (matchMins) {
          totalAusenciaSeg += parseInt(matchMins[1]) * 60 + (parseInt(matchMins[2]) || 0);
        } else if (matchSegs) {
          totalAusenciaSeg += parseInt(matchSegs[1]);
        } else if (!e.detalle.includes('Ausente')) {
          salidasSinRegreso++;
        }
      }
    }

    // Mapa de tipos a iconos
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

    // Texto legible para cada tipo
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

    // Formatear duración total
    const totalAusenciaTexto = totalAusenciaSeg > 0
      ? ` · Ausente total: ~${Math.round(totalAusenciaSeg / 60)} min`
      : '';

    const eventosHtml = eventos.map((e: any) => {
      const icono = iconoParaTipo(e.tipo);
      const texto = textoParaTipo(e.tipo);
      const hora = e.registrada_en
        ? new Date(e.registrada_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';

      // Extraer duración del detalle si existe
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

    // Determinar si el alumno está actualmente ausente (último evento fue salida sin regreso)
    const ultimoEvento = eventos[0]; // El más reciente por ORDER DESC
    const estaAusente = ultimoEvento?.tipo === 'salida_pantalla' && ultimoEvento?.detalle && !ultimoEvento.detalle.includes('Ausente');
    const alertaAusente = estaAusente
      ? `<div style="background:#ffebee; color:#c62828; padding:6px 10px; border-radius:6px; font-size:0.82rem; font-weight:600; margin-bottom:6px;">🔴 Alumno actualmente ausente de la ventana de monitoreo</div>`
      : '';

    container.innerHTML = `
      <div style="font-size:0.78rem; color:#666; margin-bottom:4px; font-weight:600;">
        📋 Bitácora de actividad (${eventos.length} eventos${totalAusenciaTexto})
      </div>
      ${alertaAusente}
      <div style="max-height:280px; overflow-y:auto; border:1px solid #f0f0f0; border-radius:6px; padding:4px 8px; background:#fafafa;">
        ${eventosHtml}
      </div>`;
  } catch (e: any) {
    container.innerHTML = `<div style="text-align:center; color:#c62828; padding:8px; font-size:0.85em;">❌ Error al cargar bitácora: ${escHtml(e.message)}</div>`;
  }
}

/** Escape HTML para evitar XSS */
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  await cargarAsistenciasActivas();
}

export function detenerMonitoreo(): void {
  if (monitorPollInterval) { clearTimeout(monitorPollInterval); monitorPollInterval = null; }
  if (monitorProfChannel) { supabase.removeChannel(monitorProfChannel); monitorProfChannel = null; }
  monitorGrupoId = null;
}

// Alias para onclick en HTML
export const cerrarMonitoreo = detenerMonitoreo;
