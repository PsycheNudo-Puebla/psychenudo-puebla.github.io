// ============================================================
// Reportes: Vista de asistencia, edición de nombre, Excel
// ============================================================
import { supabase } from '@/config/supabase';
import { mostrarToast, setLoading } from '@/config/toaster';
import { GrupoAlumnoJoined, EstadoIcono, DIAS_CORTO } from '@/types';
import { formatearFecha, formatearFechaLarga, formatearHora, escHTML, escAttr } from '@/shared/utils';

// ---- Variable global para la vista "Ver" ----
export let verGrupoActualId: string | null = null;

// ============================================================
// VISTA DE ASISTENCIA (modal Ver Grupo)
// ============================================================
export async function verGrupo(grupoId: string): Promise<void> {
  verGrupoActualId = grupoId;

  // Info del grupo
  const { data: grupo } = await supabase
    .from('grupos')
    .select('nombre, materia')
    .eq('id', grupoId)
    .single();

  if (!grupo) { mostrarToast('Error al cargar grupo', 'error'); return; }

  (document.getElementById('ver-grupo-info') as HTMLElement).textContent =
    `📚 ${grupo.nombre}${grupo.materia ? ' — ' + grupo.materia : ''}`;
  document.getElementById('modal-ver-grupo')!.classList.remove('hidden');
  document.getElementById('ver-grupo-contenido')!.innerHTML = '<p class="empty-state">Cargando...</p>';

  // Cargar alumnos y asistencias
  const [alumnosRes, asistenciasRes] = await Promise.all([
    supabase
      .from('grupo_alumnos')
      .select('alumno_id, abandono_en, alumnos!inner(id, nombre, email, matricula)')
      .eq('grupo_id', grupoId),
    supabase
      .from('asistencia')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: false }),
  ]);

  const alumnos: GrupoAlumnoJoined[] = ((alumnosRes.data || []) as any[]).sort((a: any, b: any) => {
    const na = (a.alumnos?.nombre || a.alumnos?.email || '').toLowerCase();
    const nb = (b.alumnos?.nombre || b.alumnos?.email || '').toLowerCase();
    return na.localeCompare(nb, 'es');
  });
  const asistencias = asistenciasRes.data || [];

  // Indexar
  const asistenciasPorAlumno: Record<string, any[]> = {};
  asistencias.forEach(a => {
    if (!asistenciasPorAlumno[a.alumno_id]) asistenciasPorAlumno[a.alumno_id] = [];
    asistenciasPorAlumno[a.alumno_id].push(a);
  });

  // Fechas únicas
  const fechasSet = new Set<string>();
  asistencias.forEach(a => fechasSet.add(a.fecha));
  const todasFechas = Array.from(fechasSet).sort((a, b) => a < b ? 1 : -1);

  // Poblar dropdown
  const select = document.getElementById('ver-filtro-alumno') as HTMLSelectElement;
  select.innerHTML = '<option value="">— Todos los alumnos —</option>';
  alumnos.forEach(item => {
    const al = item.alumnos;
    select.innerHTML += `<option value="${item.alumno_id}">${al.nombre || al.email || 'Sin nombre'}</option>`;
  });

  // Resetear filtros
  (document.getElementById('ver-buscar-alumno') as HTMLInputElement).value = '';
  if (todasFechas.length > 0) {
    (document.getElementById('ver-filtro-desde') as HTMLInputElement).value = todasFechas[todasFechas.length - 1];
    (document.getElementById('ver-filtro-hasta') as HTMLInputElement).value = todasFechas[0];
  } else {
    (document.getElementById('ver-filtro-desde') as HTMLInputElement).value = '';
    (document.getElementById('ver-filtro-hasta') as HTMLInputElement).value = '';
  }

  // Guardar datos en el select
  (select as any)._alumnos = alumnos;
  (select as any)._asistenciasPorAlumno = asistenciasPorAlumno;
  (select as any)._todasAsistencias = asistencias;
  (select as any)._todasFechas = todasFechas;
  (select as any)._grupoId = grupoId;

  // Búsqueda
  const buscarInput = document.getElementById('ver-buscar-alumno') as HTMLInputElement;
  buscarInput.oninput = function () {
    const q = (this as HTMLInputElement).value.toLowerCase().trim();
    for (const opt of select.options) {
      if (opt.value === '') continue;
      opt.style.display = opt.text.toLowerCase().includes(q) ? '' : 'none';
    }
    const visibles = Array.from(select.options).filter(o => o.style.display !== 'none' && o.value !== '');
    if (visibles.length === 1) select.value = visibles[0].value;
  };

  renderVerGrupo();
}

export function renderVerGrupo(): void {
  const select = document.getElementById('ver-filtro-alumno') as HTMLSelectElement;
  const filtroAlumnoId = select.value;
  const buscarTexto = ((document.getElementById('ver-buscar-alumno') as HTMLInputElement).value || '').toLowerCase().trim();
  const filtroDesde = (document.getElementById('ver-filtro-desde') as HTMLInputElement).value;
  const filtroHasta = (document.getElementById('ver-filtro-hasta') as HTMLInputElement).value;

  const alumnos: GrupoAlumnoJoined[] = (select as any)._alumnos || [];
  const asistenciasPorAlumno: Record<string, any[]> = (select as any)._asistenciasPorAlumno || {};
  const todasAsistencias: any[] = (select as any)._todasAsistencias || [];
  const todasFechas: string[] = (select as any)._todasFechas || [];
  const container = document.getElementById('ver-grupo-contenido')!;

  // Filtros de fecha
  let fechas = todasFechas;
  if (filtroDesde) fechas = fechas.filter(f => f >= filtroDesde);
  if (filtroHasta) fechas = fechas.filter(f => f <= filtroHasta);

  let alumnosFiltrados = alumnos;
  if (buscarTexto && !filtroAlumnoId) {
    alumnosFiltrados = alumnos.filter(item => {
      const nombre = (item.alumnos?.nombre || item.alumnos?.email || '').toLowerCase();
      return nombre.includes(buscarTexto);
    });
  }

  // ---- Helpers ----
  function estadoIcono(a: any): EstadoIcono {
    if (!a) return { icono: '—', texto: 'Sin registro', bg: '#fafafa', color: '#ccc' };
    if (a.perdonada || a.estado === 'justificado') return { icono: '🟡', texto: 'Justificado', bg: '#fff8e1', color: '#f57f17' };
    if (a.tipo_asistencia === 'sin_derecho') return { icono: '📱', texto: 'SD', bg: '#f3e5f5', color: '#7b1fa2' };
    if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') return { icono: '⚠️', texto: 'Retardo', bg: '#fff3e0', color: '#e65100' };
    if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3) {
      return { icono: '📱', texto: 'SD', bg: '#f3e5f5', color: '#7b1fa2' };
    }
    if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente')) return { icono: '✅', texto: 'Presente', bg: '#e8f5e9', color: '#2e7d32' };
    if (a.estado === 'ausente') return { icono: '❌', texto: 'Ausente', bg: '#ffebee', color: '#c62828' };
    return { icono: '❓', texto: a.estado || '?', bg: '#f5f5f5', color: '#666' };
  }

  function filtrarAsistencias(lista: any[]) {
    if (!filtroDesde && !filtroHasta) return lista;
    return lista.filter(a => {
      if (filtroDesde && a.fecha < filtroDesde) return false;
      if (filtroHasta && a.fecha > filtroHasta) return false;
      return true;
    });
  }

  function esSD(a: any) {
    return a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3;
  }

  // Totales
  const asistenciasFiltradas = filtrarAsistencias(todasAsistencias);
  const totalP = asistenciasFiltradas.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo' && !esSD(a) && !a.perdonada).length;
  const totalR = asistenciasFiltradas.filter(a => a.tipo_asistencia === 'retardo' && !a.perdonada).length;
  const totalA = asistenciasFiltradas.filter(a => (a.estado === 'ausente' || esSD(a)) && !a.perdonada).length;
  const totalJ = asistenciasFiltradas.filter(a => a.estado === 'justificado' || a.perdonada).length;
  const totalPant = asistenciasFiltradas.reduce((s, a) => s + (a.cambios_pantalla || 0), 0);

  let html = `
    <div class="stats-container" style="margin-bottom:14px; flex-wrap:wrap;">
      <div class="stat-box" style="background:#e8f5e9; flex:1; min-width:70px;">
        <strong style="color:#2e7d32;">${totalP}</strong><small>✅ Presentes</small>
      </div>
      <div class="stat-box" style="background:#fff3e0; flex:1; min-width:70px;">
        <strong style="color:#e65100;">${totalR}</strong><small>⚠️ Retardos</small>
      </div>
      <div class="stat-box" style="background:#ffebee; flex:1; min-width:70px;">
        <strong style="color:#c62828;">${totalA}</strong><small>❌ Ausencias</small>
      </div>
      <div class="stat-box" style="background:#fff8e1; flex:1; min-width:70px;">
        <strong style="color:#f57f17;">${totalJ}</strong><small>🟡 Justificadas</small>
      </div>
      <div class="stat-box" style="background:#f3e5f5; flex:1; min-width:70px;">
        <strong style="color:#7b1fa2;">${totalPant}</strong><small>📱 Pantalla</small>
      </div>
    </div>
    <div style="text-align:right; margin-bottom:12px;">
      <button onclick="resetearContadoresHoy()" class="btn-secondary" style="font-size:0.8em; padding:6px 14px; background:#fff3e0; color:#e65100; border:1px solid #ffe0b2;">
        🔄 Resetear contadores de pantalla (hoy)
      </button>
    </div>`;

  if (fechas.length === 0) {
    html += '<p class="empty-state">📅 No hay asistencias en el rango de fechas seleccionado.</p>';
    container.innerHTML = html;
    return;
  }

  if (filtroAlumnoId === '' && !buscarTexto) {
    // ---- VISTA: Todos los alumnos (tabla compacta) ----
    if (alumnosFiltrados.length === 0) {
      html += '<p class="empty-state">No hay alumnos inscritos.</p>';
    } else {
      html += '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; font-size:0.75em;">'
        + '<span style="background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:12px;">✅ Presente</span>'
        + '<span style="background:#fff3e0; color:#e65100; padding:2px 8px; border-radius:12px;">⚠️ Retardo</span>'
        + '<span style="background:#ffebee; color:#c62828; padding:2px 8px; border-radius:12px;">❌ Ausente</span>'
        + '<span style="background:#fff8e1; color:#f57f17; padding:2px 8px; border-radius:12px;">🟡 Justificado</span>'
        + '<span style="background:#f3e5f5; color:#7b1fa2; padding:2px 8px; border-radius:12px;">📱 SD</span>'
        + (fechas.length > 7 ? `<span style="color:#999;"> (${fechas.length} sesiones)</span>` : '')
        + '</div>';

      html += '<div style="overflow-x:auto; max-height:400px; overflow-y:auto;">'
        + '<table style="width:100%; border-collapse:collapse; font-size:0.8em;">'
        + '<thead><tr style="background:#1a1a2e; color:white; position:sticky; top:0; z-index:2;">'
        + '<th style="padding:8px 6px; text-align:left; min-width:140px; position:sticky; left:0; background:#1a1a2e; z-index:3;">Alumno</th>';

      fechas.forEach(f => {
        const partes = formatearFecha(f).split(' ');
        html += `<th style="padding:8px 4px; text-align:center; font-size:0.7em; font-weight:400; line-height:1.3; min-width:50px;">${partes[0]}<br>${partes[1]}</th>`;
      });

      html += '<th style="padding:8px 4px; text-align:center; background:#2e7d32;">✅</th>'
        + '<th style="padding:8px 4px; text-align:center; background:#e65100;">⚠️</th>'
        + '<th style="padding:8px 4px; text-align:center; background:#c62828;">❌</th>'
        + '<th style="padding:8px 4px; text-align:center; background:#f57f17;">🟡</th>'
        + '<th style="padding:8px 4px; text-align:center; background:#7b1fa2;">📱</th>'
        + '<th style="padding:8px 4px; text-align:center; background:#1a1a2e;">%</th>'
        + '</tr></thead><tbody>';

      for (const item of alumnosFiltrados) {
        const al = item.alumnos;
        const list = asistenciasPorAlumno[item.alumno_id] || [];
        const listF = filtrarAsistencias(list);
        const p = listF.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo' && !esSD(a)).length;
        const r = listF.filter(a => a.tipo_asistencia === 'retardo').length;
        const au = listF.filter(a => a.estado === 'ausente' || esSD(a)).length;
        const j = listF.filter(a => a.estado === 'justificado').length;
        const pant = listF.reduce((s, a) => s + (a.cambios_pantalla || 0), 0);
        const total = p + r + au + j;
        const pct = total > 0 ? Math.round(((p + r) / total) * 100) : 0;
        const colorPct = pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828';

        let nombreHtml = al.nombre || al.email || 'Sin nombre';
        if (item.abandono_en) nombreHtml += ' <span style="color:#999; font-size:0.75em;">🚪 Abandonó</span>';
        const btnEdit = `<button onclick="event.stopPropagation(); editarNombreAlumno('${item.alumno_id}', '${escAttr(al.nombre || '')}', '${escAttr(al.email || '')}', '${escAttr(al.matricula || '')}')" style="background:none; border:none; cursor:pointer; font-size:0.85em; padding:2px 6px; border-radius:4px; color:#667eea;" title="Editar nombre">✏️</button>`;

        html += `<tr style="border-bottom:1px solid #f0f0f0;">`
          + `<td style="padding:6px 6px; font-weight:600; position:sticky; left:0; background:white; z-index:1;">${nombreHtml} ${btnEdit}</td>`;

        for (const fecha of fechas) {
          const a = list.find(x => x.fecha === fecha);
          if (a) {
            const ei = estadoIcono(a);
            let horaMini = '';
            try {
              if (a.creado_en) {
                const d = new Date(a.creado_en);
                if (!isNaN(d.getTime())) {
                  horaMini = `<br><span style="font-size:0.65em; font-weight:400;">${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}</span>`;
                }
              }
            } catch {}
            html += `<td style="padding:2px 2px; text-align:center; background:${ei.bg}; color:${ei.color}; border-radius:3px; font-size:0.8em; font-weight:600;">${ei.icono}${horaMini}</td>`;
          } else {
            html += `<td style="padding:4px 2px; text-align:center; color:#ddd; font-size:0.7em;">—</td>`;
          }
        }

        html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#2e7d32; background:#f0faf0;">${p}</td>`
          + `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#e65100; background:#fff8f0;">${r}</td>`
          + `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#c62828; background:#fff0f0;">${au}</td>`
          + `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#f57f17; background:#fffef0;">${j}</td>`
          + `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#7b1fa2; background:#faf0ff;">${pant}</td>`
          + `<td style="padding:6px 4px; text-align:center; font-weight:700; color:${colorPct};">${pct}%</td>`
          + `</tr>`;
      }
      html += '</tbody></table></div>';
    }
  } else {
    // ---- VISTA: Alumno específico ----
    let alumnosMostrar: GrupoAlumnoJoined[] = [];
    if (filtroAlumnoId) {
      const found = alumnos.find(item => item.alumno_id === filtroAlumnoId);
      if (found) alumnosMostrar = [found];
    } else if (buscarTexto) {
      alumnosMostrar = alumnosFiltrados;
    }

    if (alumnosMostrar.length === 0) {
      html += '<p class="empty-state">Selecciona un alumno para ver su detalle.</p>';
    } else {
      for (const item of alumnosMostrar) {
        const al = item.alumnos;
        const list = asistenciasPorAlumno[item.alumno_id] || [];
        const listF = filtrarAsistencias(list);
        const p = listF.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo' && !esSD(a)).length;
        const r = listF.filter(a => a.tipo_asistencia === 'retardo').length;
        const au = listF.filter(a => a.estado === 'ausente' || esSD(a)).length;
        const j = listF.filter(a => a.estado === 'justificado').length;
        const pant = listF.reduce((s, a) => s + (a.cambios_pantalla || 0), 0);
        const total = p + r + au + j;
        const pct = total > 0 ? Math.round(((p + r) / total) * 100) : 0;

        html += `
        <div style="background:white; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:#1a1a2e;">👤 ${al.nombre || al.email || 'Sin nombre'}
              <button onclick="editarNombreAlumno('${item.alumno_id}', '${escAttr(al.nombre || '')}', '${escAttr(al.email || '')}', '${escAttr(al.matricula || '')}')" style="background:none; border:none; cursor:pointer; font-size:0.75em; padding:2px 6px; border-radius:4px; color:#667eea; vertical-align:middle;" title="Editar nombre">✏️</button>
            </h4>
            <span style="font-size:1.2em; font-weight:700; color:${pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828'};">${pct}%</span>
          </div>
          ${item.abandono_en ? '<div style="background:#fff0f0; border:1px solid #ffcdd2; border-radius:8px; padding:8px 12px; margin-bottom:10px; color:#c62828; font-size:0.85em;">🚪 Este alumno abandonó el grupo.</div>' : ''}
          <div class="stats-container" style="margin-bottom:10px;">
            <div class="stat-box" style="background:#e8f5e9; flex:1;"><strong style="color:#2e7d32;">${p}</strong><small>✅ Presentes</small></div>
            <div class="stat-box" style="background:#fff3e0; flex:1;"><strong style="color:#e65100;">${r}</strong><small>⚠️ Retardos</small></div>
            <div class="stat-box" style="background:#ffebee; flex:1;"><strong style="color:#c62828;">${au}</strong><small>❌ Ausencias</small></div>
            <div class="stat-box" style="background:#fff8e1; flex:1;"><strong style="color:#f57f17;">${j}</strong><small>🟡 Justificadas</small></div>
            <div class="stat-box" style="background:#f3e5f5; flex:1;"><strong style="color:#7b1fa2;">${pant}</strong><small>📱 Pantalla</small></div>
          </div>
          <div style="max-height:400px; overflow-y:auto;">
            ${listF.length === 0
              ? '<p class="empty-state">Sin registros en este rango.</p>'
              : listF.sort((a: any, b: any) => a.fecha < b.fecha ? 1 : -1).map((a: any) => {
                  const ei = estadoIcono(a);
                  const fechaStr = formatearFechaLarga(a.fecha);
                  const horaStr = a.creado_en ? ' 🕐 ' + formatearHora(a.creado_en) + ' hs' : '';
                  let cambiosHTML = '';
                  if (a.cambios_pantalla && a.cambios_pantalla > 0) {
                    const ancho = Math.min((a.cambios_pantalla / 3) * 100, 100);
                    cambiosHTML = `<div style="margin-top:4px; font-size:0.75em; color:#888;">
                      📱 Cambios de pantalla:
                      <div style="height:4px; background:#eee; border-radius:2px; margin-top:2px;">
                        <div style="height:100%; width:${ancho}%; background:${ancho >= 100 ? '#c62828' : '#ff9800'}; border-radius:2px;"></div>
                      </div>
                      <span style="color:${ancho >= 100 ? '#c62828' : '#ff9800'};">${a.cambios_pantalla}/3</span>
                    </div>`;
                  }
                  return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #f0f0f0; background:${ei.bg}; border-radius:8px; margin-bottom:4px;">
                    <div><div style="font-weight:600; color:#333;">${fechaStr}${horaStr}</div>${cambiosHTML}</div>
                    <span style="font-weight:700; color:${ei.color}; font-size:1.1em; white-space:nowrap;">${ei.icono} ${ei.texto}</span>
                  </div>`;
                }).join('')}
          </div>
        </div>`;
      }
    }
  }

  container.innerHTML = html;
}

// ============================================================
// EDICIÓN DE NOMBRE DE ALUMNO
// ============================================================
export function editarNombreAlumno(alumnoId: string, nombreActual: string, email: string, matricula: string): void {
  console.log('✏️ editarNombreAlumno llamado:', { alumnoId, nombreActual, email, matricula });
  (document.getElementById('editar-alumno-id') as HTMLInputElement).value = alumnoId;
  (document.getElementById('editar-alumno-nombre') as HTMLInputElement).value = nombreActual;
  (document.getElementById('editar-alumno-email') as HTMLElement).textContent = email || '—';
  (document.getElementById('editar-alumno-matricula') as HTMLElement).textContent = matricula || '—';
  (document.getElementById('editar-alumno-error') as HTMLElement).textContent = '';
  document.getElementById('modal-editar-alumno')!.classList.remove('hidden');
  (document.getElementById('editar-alumno-nombre') as HTMLInputElement).focus();
}

export async function guardarNombreAlumno(e: Event): Promise<void> {
  e.preventDefault();
  const alumnoId = (document.getElementById('editar-alumno-id') as HTMLInputElement).value;
  const nuevoNombre = (document.getElementById('editar-alumno-nombre') as HTMLInputElement).value.trim();
  const errorEl = document.getElementById('editar-alumno-error') as HTMLElement;

  if (!nuevoNombre) { errorEl.textContent = 'El nombre no puede estar vacío.'; return; }

  setLoading('btn-guardar-nombre-alumno', true);

  try {
    const { error } = await supabase
      .from('alumnos')
      .update({ nombre: nuevoNombre })
      .eq('id', alumnoId);

    if (error) {
      if (error.message?.includes('infinite recursion')) {
        errorEl.textContent = '⚠️ Error de recursión RLS. Ejecuta el SQL actualizado (ver consola).';
        console.error('❌ SQL necesario:\n' + obtenerSQLProfesorUpdate());
      } else if (error.message?.includes('row-level security') || error.code === 'PGRST106') {
        errorEl.textContent = '⚠️ Sin permiso. Ejecuta el SQL actualizado (ver consola).';
        console.error('❌ SQL necesario:\n' + obtenerSQLProfesorUpdate());
      } else {
        errorEl.textContent = 'Error al guardar: ' + error.message;
      }
      setLoading('btn-guardar-nombre-alumno', false, '💾 Guardar cambios');
      return;
    }

    console.log('✅ Nombre actualizado en BD. Aplicando cambio en la UI...');
    cerrarModalEditarAlumno();

    // Parchear caché local
    if (verGrupoActualId) {
      const select = document.getElementById('ver-filtro-alumno') as HTMLSelectElement;
      const alumnosCache: GrupoAlumnoJoined[] = (select as any)._alumnos;
      if (alumnosCache) {
        alumnosCache.forEach(item => {
          if (item.alumno_id === alumnoId && item.alumnos) item.alumnos.nombre = nuevoNombre;
        });
        // Reconstruir dropdown
        const pv = select.value;
        select.innerHTML = '<option value="">— Todos los alumnos —</option>';
        alumnosCache.sort((a, b) => (a.alumnos?.nombre || '').localeCompare(b.alumnos?.nombre || '', 'es'));
        alumnosCache.forEach(item => {
          const al = item.alumnos;
          select.innerHTML += `<option value="${item.alumno_id}">${al.nombre || al.email || 'Sin nombre'}</option>`;
        });
        select.value = pv;
      }
    }

    renderVerGrupo();
  } catch (err: any) {
    errorEl.textContent = 'Error de conexión: ' + err.message;
    setLoading('btn-guardar-nombre-alumno', false, '💾 Guardar cambios');
  }
}

export function cerrarModalEditarAlumno(): void {
  document.getElementById('modal-editar-alumno')!.classList.add('hidden');
  (document.getElementById('editar-alumno-error') as HTMLElement).textContent = '';
  setLoading('btn-guardar-nombre-alumno', false, '💾 Guardar cambios');
}

export function cerrarModalVer(): void {
  document.getElementById('modal-ver-grupo')!.classList.add('hidden');
  verGrupoActualId = null;
}

// SQL helper
function obtenerSQLProfesorUpdate(): string {
  return `-- Crear función SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.profesor_puede_editar_alumno(p_alumno_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grupo_alumnos ga
    JOIN public.grupos g ON g.id = ga.grupo_id
    WHERE ga.alumno_id = p_alumno_id AND g.profesor_id = auth.uid()
  );
$$ LANGUAGE sql;

DROP POLICY IF EXISTS "profesores_update_alumnos" ON public.alumnos;
CREATE POLICY "profesores_update_alumnos" ON public.alumnos
  FOR UPDATE USING (public.profesor_puede_editar_alumno(id));`;
}

// ============================================================
// EXPORTAR A EXCEL (.xls)
// ============================================================
export async function exportarAsistencia(grupoId: string, grupoNombre: string): Promise<void> {
  const btn = document.getElementById('detalle-btn-exportar');
  if (btn) btn.textContent = '⏳...';

  try {
    const { data: alumnos } = await supabase
      .from('grupo_alumnos')
      .select('alumno_id, alumnos!inner(id, nombre, email)')
      .eq('grupo_id', grupoId);
    if (!alumnos || alumnos.length === 0) { mostrarToast('No hay alumnos.', 'warning'); if (btn) btn.textContent = '📊'; return; }

    const { data: fechasData } = await supabase
      .from('asistencia')
      .select('fecha')
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: true });
    const fechasSet = new Set<string>();
    if (fechasData) fechasData.forEach(a => fechasSet.add(a.fecha));
    if (fechasSet.size === 0) { mostrarToast('Sin registros.', 'warning'); if (btn) btn.textContent = '📊'; return; }
    const fechas = Array.from(fechasSet);

    const { data: asistencias } = await supabase
      .from('asistencia')
      .select('*')
      .eq('grupo_id', grupoId);
    const asistenciaMap: Record<string, any> = {};
    if (asistencias) asistencias.forEach(a => { asistenciaMap[`${a.alumno_id}|${a.fecha}`] = a; });

    function escXML(s: string) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function fmtFecha(f: string) {
      const d = new Date(f + 'T12:00:00');
      return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    function getEstadoCelda(a: any) {
      if (!a) return { texto: '—', estilo: 'SinReg' };
      if (a.tipo_asistencia === 'sin_derecho') return { texto: 'SD', estilo: 'SinDer' };
      if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') return { texto: 'Retardo', estilo: 'Retardo' };
      if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3) return { texto: 'SD', estilo: 'SinDer' };
      if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente')) return { texto: 'Presente', estilo: 'Presente' };
      if (a.estado === 'ausente') return { texto: 'Ausente', estilo: 'Ausente' };
      if (a.estado === 'justificado') return { texto: 'Justificado', estilo: 'Justif' };
      return { texto: a.estado || '?', estilo: 'SinReg' };
    }
    function fmtHora(a: any) {
      if (!a?.creado_en) return '';
      try { const d = new Date(a.creado_en); if (isNaN(d.getTime())) return ''; return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }
      catch { return ''; }
    }
    function esSDExcel(a: any) { return a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3; }

    // Construir XML
    let xls = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n'
      + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';

    // Styles
    const estilos = [
      { id: 'Titulo', font: 'Bold="1" Size="16" Color="#1a1a2e"' },
      { id: 'Header', font: 'Bold="1" Size="10" Color="#FFFFFF"', interior: '#1a1a2e' },
      { id: 'Presente', font: 'Color="#2e7d32" Bold="1"', interior: '#e8f5e9' },
      { id: 'Retardo', font: 'Color="#e65100" Bold="1"', interior: '#fff3e0' },
      { id: 'Ausente', font: 'Color="#c62828" Bold="1"', interior: '#ffebee' },
      { id: 'SinDer', font: 'Color="#7b1fa2" Bold="1"', interior: '#f3e5f5' },
      { id: 'Justif', font: 'Color="#f57f17" Bold="1"', interior: '#fff8e1' },
      { id: 'SinReg', font: 'Color="#cccccc"', interior: '#fafafa' },
    ];

    xls += '<Styles>\n';
    estilos.forEach(s => {
      xls += `<Style ss:ID="${s.id}"><Font ${s.font}/>`;
      if (s.interior) xls += `<Interior ss:Color="${s.interior}" ss:Pattern="Solid"/>`;
      xls += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n';
    });
    xls += '</Styles>\n';

    xls += '<Worksheet ss:Name="Asistencias">\n<Table>\n';
    xls += '<Column ss:AutoFitWidth="1" ss:Width="220"/>';
    fechas.forEach(() => { xls += '<Column ss:AutoFitWidth="1" ss:Width="120"/>'; });
    xls += '<Column ss:AutoFitWidth="1" ss:Width="70"/>';
    xls += '<Column ss:AutoFitWidth="1" ss:Width="65"/>';
    xls += '<Column ss:AutoFitWidth="1" ss:Width="65"/>';
    xls += '<Column ss:AutoFitWidth="1" ss:Width="75"/>';
    xls += '<Column ss:AutoFitWidth="1" ss:Width="65"/>\n';

    xls += `<Row><Cell ss:StyleID="Titulo" ss:MergeAcross="${fechas.length + 4}"><Data ss:Type="String">📊 Reporte — ${escXML(grupoNombre)}</Data></Cell></Row>\n`;
    xls += `<Row><Cell ss:StyleID="Titulo" ss:MergeAcross="${fechas.length + 4}"><Data ss:Type="String">${fechas.length} sesiones · ${alumnos.length} alumnos · ${new Date().toLocaleString('es-MX')}</Data></Cell></Row>\n`;
    xls += '<Row></Row>\n';

    xls += '<Row>\n<Cell ss:StyleID="Header"><Data ss:Type="String">Alumno</Data></Cell>\n';
    fechas.forEach(f => { xls += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escXML(fmtFecha(f))}</Data></Cell>\n`; });
    ['✅ Presentes', '⚠️ Retardos', '❌ Ausencias', '🟡 Justificadas', '📱 Pantalla'].forEach(t => {
      xls += `<Cell ss:StyleID="Header"><Data ss:Type="String">${t}</Data></Cell>\n`;
    });
    xls += '</Row>\n';

    for (const item of alumnos) {
      const al = (item as any).alumnos;
      const nombre = al.nombre || al.email || 'Sin nombre';
      xls += '<Row>\n';
      xls += `<Cell ss:StyleID="Titulo"><Data ss:Type="String">${escXML(nombre)}</Data></Cell>\n`;
      let cP = 0, cR = 0, cA = 0, cJ = 0, cPant = 0;
      for (const fecha of fechas) {
        const key = `${item.alumno_id}|${fecha}`;
        const a = asistenciaMap[key];
        const est = getEstadoCelda(a);
        let texto = est.texto;
        if (a?.creado_en && texto !== '—') {
          const h = fmtHora(a);
          if (h) texto += ` (${h} hs)`;
        }
        xls += `<Cell ss:StyleID="${est.estilo}"><Data ss:Type="String">${escXML(texto)}</Data></Cell>\n`;
        if (a) {
          if (a.tipo_asistencia === 'sin_derecho') { cA++; cPant += a.cambios_pantalla || 0; }
          else if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') { cR++; cPant += a.cambios_pantalla || 0; }
          else if (esSDExcel(a)) { cA++; cPant += a.cambios_pantalla || 0; }
          else if (a.estado === 'presente') { cP++; cPant += a.cambios_pantalla || 0; }
          else if (a.estado === 'ausente') { cA++; cPant += a.cambios_pantalla || 0; }
          else if (a.estado === 'justificado') { cJ++; }
        }
      }
      xls += `<Cell ss:StyleID="Presente"><Data ss:Type="Number">${cP}</Data></Cell>\n`;
      xls += `<Cell ss:StyleID="Retardo"><Data ss:Type="Number">${cR}</Data></Cell>\n`;
      xls += `<Cell ss:StyleID="Ausente"><Data ss:Type="Number">${cA}</Data></Cell>\n`;
      xls += `<Cell ss:StyleID="Justif"><Data ss:Type="Number">${cJ}</Data></Cell>\n`;
      xls += `<Cell ss:StyleID="SinDer"><Data ss:Type="Number">${cPant}</Data></Cell>\n`;
      xls += '</Row>\n';
    }

    xls += '</Table>\n</Worksheet>\n</Workbook>';

    const blob = new Blob([xls], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencias_${grupoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (btn) btn.textContent = '📊';
    mostrarToast(`✅ Excel generado: ${fechas.length} sesiones, ${alumnos.length} alumnos`, 'exito');
  } catch (err: any) {
    console.error('Error exportando:', err);
    mostrarToast('Error al exportar: ' + err.message, 'error');
    if (btn) btn.textContent = '📊';
  }
}

// ============================================================
// RESETEAR CONTADORES DE PANTALLA (hoy)
// ============================================================
export async function resetearContadoresHoy(): Promise<void> {
  // Detectar grupo desde el modal o monitor
  let grupoId = verGrupoActualId;

  if (!grupoId) {
    const monModule = (window as any).monitoreoModule;
    grupoId = monModule?.getMonitorGrupoId?.() || null;
  }
  if (!grupoId) { mostrarToast('No hay grupo activo.', 'warning'); return; }

  const hoy = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('asistencia')
    .update({ cambios_pantalla: 0 })
    .eq('grupo_id', grupoId)
    .eq('fecha', hoy);

  if (error) { mostrarToast('Error: ' + error.message, 'error'); return; }
  mostrarToast('✅ Contadores reseteados para hoy.', 'exito');
  renderVerGrupo();
}
