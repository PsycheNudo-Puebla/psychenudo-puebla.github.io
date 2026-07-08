// ============================================================
// Monitoreo en vivo de alumnos durante la clase
// ============================================================
import { supabase } from '@/config/supabase';
import { profesorActual } from '@/shared/auth';
import { mostrarToast } from '@/config/toaster';
import { MonitorAlumno } from '@/types';

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
    .eq('fecha', new Date().toISOString().split('T')[0])
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
      ${btnPerdonar || btnReingreso ? `<div style="margin-top:8px; text-align:right;">${btnPerdonar}${btnReingreso ? ' ' + btnReingreso : ''}</div>` : ''}
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
  const hoy = new Date().toISOString().split('T')[0];
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
