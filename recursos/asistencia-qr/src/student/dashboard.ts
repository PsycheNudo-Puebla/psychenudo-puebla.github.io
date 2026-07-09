// ============================================================
// Panel del Alumno: grupos, unirse, salir, historial
// ============================================================
import { supabase } from '@/config/supabase';
import { mostrarToast } from '@/config/toaster';
import type { Grupo, GrupoAlumno, Asistencia } from '@/types';
import { formatearFechaLarga } from '@/shared/utils';
import { getAlumnoActual, monitoreoActivo } from './auth';
import { revisarAsistenciaPendiente } from './monitoring';

// ====== GRUPOS INSCRITOS ======
export async function cargarGrupos(): Promise<void> {
  const alumno = getAlumnoActual();
  if (!alumno) return;
  // Revisar si hay asistencia pendiente para banner
  revisarAsistenciaPendiente();

  const { data: inscripciones } = await supabase
    .from('grupo_alumnos')
    .select('grupo_id')
    .eq('alumno_id', alumno.id);

  const lista = document.getElementById('grupos-lista')!;

  if (!inscripciones || inscripciones.length === 0) {
    lista.innerHTML = '<p class="empty-state">No estás inscrito en ningún grupo. Usa el código de invitación de tu profesor para unirte.</p>';
    document.getElementById('asistencia-lista')!.innerHTML = '<p class="empty-state">Selecciona un grupo para ver tu historial de asistencia.</p>';
    return;
  }

  const grupoIds = inscripciones.map(i => i.grupo_id);
  const { data: grupos } = await supabase
    .from('grupos')
    .select('*')
    .in('id', grupoIds)
    .order('creado_en', { ascending: false });

  if (!grupos) {
    lista.innerHTML = '<p class="empty-state">Error al cargar grupos.</p>';
    return;
  }

  lista.innerHTML = grupos.map(grupo => `
    <div class="list-item">
      <div>
        <strong>${escHTML(grupo.nombre)}</strong>
        <br><small>${escHTML(grupo.materia || 'Sin materia')}</small>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button onclick="window.verAsistencia('${grupo.id}', '${escAttr(grupo.nombre)}')" class="btn-secondary">Ver mi asistencia</button>
        <button onclick="window.salirDeGrupo('${grupo.id}', '${escAttr(grupo.nombre)}')" class="btn-danger" style="padding:6px 10px; background:#fff0f0; color:#c62828; border:1px solid #ffcdd2; border-radius:8px; cursor:pointer; font-size:0.8em; font-weight:600;">Salir del grupo</button>
      </div>
    </div>
  `).join('');
}

// ====== UNIRSE A GRUPO ======
export function showUnirseGrupoModal(): void {
  document.getElementById('modal-unirse-grupo')!.classList.remove('hidden');
  document.getElementById('unirse-error')!.textContent = '';
  (document.getElementById('grupo-codigo') as HTMLInputElement).value = '';
}

export function cerrarModalUnirse(): void {
  document.getElementById('modal-unirse-grupo')!.classList.add('hidden');
  (document.getElementById('form-unirse-grupo') as HTMLFormElement).reset();
  document.getElementById('unirse-error')!.textContent = '';
}

export function setupUnirseGrupoForm(): void {
  const form = document.getElementById('form-unirse-grupo') as HTMLFormElement;
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codigo = (document.getElementById('grupo-codigo') as HTMLInputElement).value.trim().toUpperCase();
      if (!codigo) {
        document.getElementById('unirse-error')!.textContent = 'Ingresa un código válido.';
        return;
      }
      await unirseAGrupo(codigo);
    });
  }
}

async function unirseAGrupo(codigo: string): Promise<void> {
  const alumno = getAlumnoActual();
  if (!alumno) return;
  const errorDiv = document.getElementById('unirse-error')!;

  const { data: grupo } = await supabase
    .from('grupos')
    .select('*')
    .eq('codigo_unico', codigo)
    .maybeSingle();

  if (!grupo) {
    errorDiv.textContent = 'Código inválido. Verifica con tu profesor.';
    return;
  }

  const { data: existente } = await supabase
    .from('grupo_alumnos')
    .select('*')
    .eq('alumno_id', alumno.id)
    .eq('grupo_id', grupo.id)
    .maybeSingle();

  if (existente) {
    if (existente.abandono_en) {
      const { error: rejoinError } = await supabase
        .from('grupo_alumnos')
        .update({ abandono_en: null })
        .eq('id', existente.id);
      if (rejoinError) {
        errorDiv.textContent = 'Error al reactivar inscripción: ' + rejoinError.message;
        return;
      }
      mostrarToast(`✅ Has vuelto al grupo: ${grupo.nombre}`, 'exito');
      cerrarModalUnirse();
      cargarGrupos();
      return;
    }
    errorDiv.textContent = 'Ya estás inscrito en este grupo.';
    return;
  }

  const { error: insError } = await supabase
    .from('grupo_alumnos')
    .insert({ alumno_id: alumno.id, grupo_id: grupo.id });

  if (insError) {
    errorDiv.textContent = 'Error al unirte al grupo: ' + insError.message;
    return;
  }

  mostrarToast(`✅ Te has unido al grupo: ${grupo.nombre}`, 'exito');
  cerrarModalUnirse();
  cargarGrupos();
}

// ====== SALIR DE GRUPO ======
export async function salirDeGrupo(grupoId: string, grupoNombre: string): Promise<void> {
  const alumno = getAlumnoActual();
  if (!alumno) return;

  const confirmacion = confirm(
    `¿Salir del grupo "${grupoNombre}"?\n\n` +
    `⚠️ Tus registros de asistencia anteriores se conservarán.\n` +
    `❌ No podrás escanear el QR a menos que el profesor te reinscriba.\n\n` +
    `¿Estás seguro de que deseas salir?`
  );
  if (!confirmacion) return;

  try {
    const { data: inscripcion } = await supabase
      .from('grupo_alumnos')
      .select('id, abandono_en')
      .eq('alumno_id', alumno.id)
      .eq('grupo_id', grupoId)
      .maybeSingle();

    if (!inscripcion) {
      mostrarToast('Error al buscar tu inscripción.', 'error');
      return;
    }

    const { error: updateError } = await supabase
      .from('grupo_alumnos')
      .update({ abandono_en: new Date().toISOString() })
      .eq('id', inscripcion.id);

    if (updateError) {
      console.warn('UPDATE falló, intentando DELETE fallback:', updateError.message);
      const { error: delError } = await supabase
        .from('grupo_alumnos')
        .delete()
        .eq('id', inscripcion.id);
      if (delError) throw new Error('DELETE también falló: ' + delError.message);
    }

    mostrarToast(`✅ Has salido del grupo "${grupoNombre}". Tus registros se conservan.`, 'exito');
    cargarGrupos();
    document.getElementById('asistencia-lista')!.innerHTML = '<p class="empty-state">Selecciona un grupo para ver tu historial de asistencia.</p>';
  } catch (err: any) {
    mostrarToast('Error al salir del grupo: ' + (err.message || 'desconocido'), 'error');
  }
}

// ====== VER ASISTENCIA ======
export async function verAsistencia(grupoId: string, grupoNombre: string): Promise<void> {
  const alumno = getAlumnoActual();
  if (!alumno) return;
  const contenedor = document.getElementById('asistencia-lista')!;
  contenedor.innerHTML = '<p class="empty-state">Cargando asistencia...</p>';

  // 1. Todas las asistencias con JOIN a grupos
  const { data: todasAsistencias } = await supabase
    .from('asistencia')
    .select('*, grupos!inner(id, nombre)')
    .eq('alumno_id', alumno.id)
    .order('fecha', { ascending: false });

  if (!todasAsistencias || todasAsistencias.length === 0) {
    contenedor.innerHTML = `
      <h3 style="margin-bottom: 10px; color: #667eea;">${escHTML(grupoNombre)}</h3>
      <p class="empty-state">Aún no tienes registros de asistencia en ningún grupo.</p>
    `;
    return;
  }

  // 2. Asistencias de este grupo
  const asistencias = todasAsistencias.filter(a => a.grupo_id === grupoId);

  // 3. Totales globales
  const totalGlobal = todasAsistencias.length;
  const presentesGlobal = todasAsistencias.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
  const retardosGlobal = todasAsistencias.filter(a => a.tipo_asistencia === 'retardo').length;
  const ausentesGlobal = todasAsistencias.filter(a => a.estado === 'ausente').length;
  const justificadasGlobal = todasAsistencias.filter(a => a.estado === 'justificado').length;
  const pctAsistenciaGlobal = totalGlobal > 0 ? Math.round((presentesGlobal / totalGlobal) * 100) : 0;
  const pctAusenciaGlobal = totalGlobal > 0 ? Math.round((ausentesGlobal / totalGlobal) * 100) : 0;

  let alertaGlobal = '';
  if (pctAusenciaGlobal > 20) {
    alertaGlobal = `<div style="margin:10px 0; padding:10px 14px; background:#ffebee; border-left:4px solid #c62828; border-radius:8px; color:#c62828; font-weight:500;">⚠️ Llevas <strong>${ausentesGlobal} ausencias</strong> en total (${pctAusenciaGlobal}%). ¡Ponte al corriente!</div>`;
  } else if (pctAusenciaGlobal > 10) {
    alertaGlobal = `<div style="margin:10px 0; padding:10px 14px; background:#fff3e0; border-left:4px solid #e65100; border-radius:8px; color:#e65100; font-weight:500;">⚠️ Ya tienes <strong>${ausentesGlobal} ausencias</strong> en total (${pctAusenciaGlobal}%). Cuida tu asistencia.</div>`;
  }

  // 4. Totales del grupo
  const presentes = asistencias.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
  const retardos = asistencias.filter(a => a.tipo_asistencia === 'retardo').length;
  const ausentes = asistencias.filter(a => a.estado === 'ausente').length;
  const justificadas = asistencias.filter(a => a.estado === 'justificado').length;

  // 5. Resumen por grupos
  const gruposMap: Record<string, { nombre: string; total: number; ausentes: number }> = {};
  todasAsistencias.forEach(a => {
    const gId = a.grupo_id;
    const gNom = (a as any).grupos?.nombre || 'Grupo';
    if (!gruposMap[gId]) gruposMap[gId] = { nombre: gNom, total: 0, ausentes: 0 };
    gruposMap[gId].total++;
    if (a.estado === 'ausente') gruposMap[gId].ausentes++;
  });

  let htmlResumenGrupos = '';
  for (const gId in gruposMap) {
    const g = gruposMap[gId];
    const pctAus = g.total > 0 ? Math.round((g.ausentes / g.total) * 100) : 0;
    const colorBar = pctAus > 20 ? '#c62828' : pctAus > 10 ? '#e65100' : '#2e7d32';
    htmlResumenGrupos += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f0f0f0; font-size:0.9em;">
        <span>📚 ${escHTML(g.nombre)}</span>
        <span>${g.total} clases • <span style="color:${colorBar}; font-weight:600;">${g.ausentes} ausencias</span> (${pctAus}%)</span>
      </div>`;
  }

  contenedor.innerHTML = `
    <div style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border-radius:16px; padding:20px; margin-bottom:20px;">
      <h3 style="margin:0 0 4px 0; color:white;">📊 Resumen General</h3>
      <div style="opacity:0.85; font-size:0.9em; margin-bottom:14px;">Total de clases: <strong>${totalGlobal}</strong></div>
      <div class="stats-container">
        <div class="stat-box" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3);">
          <strong style="color:#a5d6a7; font-size:1.3em;">${presentesGlobal}</strong><small style="color:rgba(255,255,255,0.9);">✅ Presentes</small>
        </div>
        <div class="stat-box" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3);">
          <strong style="color:#ffcc80; font-size:1.3em;">${retardosGlobal}</strong><small style="color:rgba(255,255,255,0.9);">⚠️ Retardos</small>
        </div>
        <div class="stat-box" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3);">
          <strong style="color:#ef9a9a; font-size:1.3em;">${ausentesGlobal}</strong><small style="color:rgba(255,255,255,0.9);">❌ Ausencias</small>
        </div>
        <div class="stat-box" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3);">
          <strong style="color:#fff59d; font-size:1.3em;">${justificadasGlobal}</strong><small style="color:rgba(255,255,255,0.9);">🟡 Justificadas</small>
        </div>
      </div>
      <div style="margin-top:12px; background:rgba(255,255,255,0.15); border-radius:8px; padding:10px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85em; margin-bottom:4px;">
          <span>Asistencia total</span><span style="font-weight:600;">${pctAsistenciaGlobal}%</span>
        </div>
        <div style="height:8px; background:rgba(255,255,255,0.2); border-radius:4px; overflow:hidden;">
          <div style="height:100%; width:${pctAsistenciaGlobal}%; background:linear-gradient(90deg,#66bb6a,#a5d6a7); border-radius:4px; transition:width 0.5s;"></div>
        </div>
      </div>
    </div>
    ${alertaGlobal}
    <div style="background:#f8f9ff; border-radius:12px; padding:14px; margin-bottom:16px;">
      <h4 style="margin:0 0 8px 0; color:#555; font-size:0.95em;">📋 Resumen por grupo</h4>
      ${htmlResumenGrupos}
    </div>
    <h4 style="margin:16px 0 10px 0; color:#667eea;">📋 Detalle: ${escHTML(grupoNombre)}</h4>
    ${asistencias.length === 0 ? '<p class="empty-state">Sin registros en este grupo.</p>' : `
    <div class="stats-container" style="margin-bottom:12px;">
      <div class="stat-box" style="background:#e8f5e9;"><strong style="color:#2e7d32;">${presentes}</strong><small>Presentes</small></div>
      <div class="stat-box" style="background:#fff3e0;"><strong style="color:#e65100;">${retardos}</strong><small>Retardos</small></div>
      <div class="stat-box" style="background:#ffebee;"><strong style="color:#c62828;">${ausentes}</strong><small>Ausentes</small></div>
      <div class="stat-box" style="background:#fff8e1;"><strong style="color:#f57f17;">${justificadas}</strong><small>Justificadas</small></div>
    </div>
    <div style="max-height:300px; overflow-y:auto;">
      ${asistencias.map(a => {
        let icono = '✅ Presente';
        let color = '#2e7d32';
        if (a.tipo_asistencia === 'sin_derecho') { icono = '❌ Llegó tarde (sin derecho)'; color = '#c62828'; }
        else if (a.tipo_asistencia === 'retardo') { icono = '⚠️ Retardo'; color = '#e65100'; }
        else if (a.estado === 'ausente') { icono = '❌ Ausente'; color = '#c62828'; }
        else if (a.estado === 'justificado') { icono = '🟡 Justificado'; color = '#f57f17'; }
        return `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
          <span>${formatearFechaLarga(a.fecha)}</span>
          <span style="font-weight:600; color:${color};">${icono}</span>
        </div>`;
      }).join('')}
    </div>
    `}
  `;
}

// ====== HELPERS ======
function escHTML(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Exponer funciones globalmente para onclick HTML
(window as any).verAsistencia = verAsistencia;
(window as any).salirDeGrupo = salirDeGrupo;
(window as any).showUnirseGrupoModal = showUnirseGrupoModal;
(window as any).cerrarModal = cerrarModalUnirse;
