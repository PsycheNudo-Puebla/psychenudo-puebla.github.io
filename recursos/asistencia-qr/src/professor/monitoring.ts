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

  if (!asistencias || asistencias.length === 0) {
    container.innerHTML = '<p class="empty-state">📭 No hay alumnos registrados hoy.</p>';
    return;
  }

  const { data: grupo } = await supabase
    .from('grupos')
    .select('numero_perdones, nombre')
    .eq('id', monitorGrupoId)
    .maybeSingle();
  const maxPerdones = grupo?.numero_perdones ?? 2;

  container.innerHTML = asistencias.map((a: any) => {
    const nombre = a.alumnos?.nombre || a.alumnos?.email || 'Sin nombre';
    const cambios = a.cambios_pantalla || 0;
    const excedido = cambios >= 3;
    const confirmada = a.confirmada;
    const perdonada = a.perdonada;

    let estadoHTML: string;
    if (confirmada) {
      estadoHTML = '<span style="color:#2e7d32; font-weight:700;">✅ Confirmada</span>';
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

    const btnPerdonar = !perdonada && !confirmada
      ? `<button onclick="perdonarAlumno('${a.id}', this)" class="btn-secondary" style="font-size:0.75em; padding:4px 10px; background:#fff8e1; color:#f57f17;">🙏 Perdonar</button>`
      : '';

    return `
    <div style="background:white; border-radius:10px; padding:12px; margin-bottom:8px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
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
      ${btnPerdonar ? `<div style="margin-top:8px; text-align:right;">${btnPerdonar}</div>` : ''}
    </div>`;
  }).join('');
}

export async function perdonarAlumno(asistenciaId: string, btn: HTMLButtonElement): Promise<void> {
  if (!monitorGrupoId) return;
  btn.disabled = true;
  btn.textContent = '⏳...';

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

  mostrarToast('✅ Alumno perdonado', 'exito');
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

export function detenerMonitoreo(): void {
  if (monitorPollInterval) { clearTimeout(monitorPollInterval); monitorPollInterval = null; }
  if (monitorProfChannel) { supabase.removeChannel(monitorProfChannel); monitorProfChannel = null; }
  monitorGrupoId = null;
}

// Alias para onclick en HTML
export const cerrarMonitoreo = detenerMonitoreo;
