// ============================================================
// Gestión de grupos (CRUD + horarios)
// ============================================================
import { supabase } from '@/config/supabase';
import { profesorActual, verificarSesion } from '@/shared/auth';
import { mostrarToast, setLoading } from '@/config/toaster';
import { Grupo, Horario, HorarioFormulario, DIAS_SEMANA } from '@/types';
import { generarCodigo } from '@/shared/utils';
import { insertarHorario } from './groups-horarios';
import { exportarAsistencia, verGrupo } from './reports';
import { autoAbrirQRIfClaseActiva, iniciarAutoQrChecker } from './qr';

// ---- Variable global de grupos ----
export let grupoSeleccionadoId: string | null = null;
export let horariosFormularioCrear: HorarioFormulario[] = [];

// ---- Cargar lista de grupos ----
export async function cargarGrupos(): Promise<void> {
  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .eq('profesor_id', profesorActual!.id)
    .order('creado_en', { ascending: false });

  const lista = document.getElementById('grupos-lista');
  if (!lista) return;

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<p class="empty-state">No tienes grupos aún. Crea uno para empezar.</p>';
    return;
  }

  // Asignar códigos a grupos que no tengan
  for (const grupo of data) {
    if (!grupo.codigo_unico) {
      const nuevo = generarCodigo(6);
      await supabase.from('grupos').update({ codigo_unico: nuevo }).eq('id', grupo.id);
      grupo.codigo_unico = nuevo;
    }
  }

  lista.innerHTML = data.map(g => `
    <div class="list-item" style="flex-direction:column; align-items:stretch; gap:8px; cursor:pointer;" onclick="seleccionarGrupo('${g.id}')">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="flex:1;">
          <strong style="font-size:1.15em; color:#333;">${g.nombre}</strong>
          <br><small style="color:#888;">${g.materia || 'Sin materia'} · Límite: ${g.limite_salidas} salidas · ${g.numero_perdones} perdones/alumno · 🟣 Reingreso: ${g.ventana_reingreso_min === 0 ? '0 (siempre pedir permiso)' : (g.ventana_reingreso_min ?? 2) + 'min'}</small>
        </div>
        <div class="list-item-actions" style="flex-shrink:0; gap:4px;" onclick="event.stopPropagation();">
          <button onclick="mostrarEditarGrupo('${g.id}')" class="btn-secondary" title="Editar grupo y horarios">✏️</button>
          <button onclick="eliminarGrupo('${g.id}')" class="btn-danger" title="Eliminar grupo">🗑️</button>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <div style="background:#f5f7ff; border-radius:8px; padding:6px 12px; font-size:0.8em; font-family:monospace; letter-spacing:2px; color:#667eea; display:flex; align-items:center; gap:6px;">
          🔑 ${g.codigo_unico || '---'}
          <span onclick="event.stopPropagation(); copiarCodigo('${g.codigo_unico}')" style="cursor:pointer; color:#999; font-size:1.1em;" title="Copiar código">📋</span>
        </div>
        <div id="grupo-horario-resumen-${g.id}" style="flex:1; font-size:0.8em; color:#888; display:flex; align-items:center;">
          Cargando horarios...
        </div>
      </div>
    </div>
  `).join('');

  data.forEach(g => cargarResumenHorarios(g.id));
  // Auto-abrir QR si es hora de clase
  autoAbrirQRIfClaseActiva();
}

async function cargarResumenHorarios(grupoId: string): Promise<void> {
  const container = document.getElementById(`grupo-horario-resumen-${grupoId}`);
  if (!container) return;
  try {
    const { data } = await supabase
      .from('horarios')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('dia_semana', { ascending: true });

    if (!data || data.length === 0) {
      container.innerHTML = `<span style="color:#999;">⏰ Sin horarios configurados</span>`;
      return;
    }
    const diasCorto = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const agrupados: Record<number, Horario[]> = {};
    data.forEach(h => {
      if (!agrupados[h.dia_semana]) agrupados[h.dia_semana] = [];
      agrupados[h.dia_semana].push(h);
    });
    let html = '<div style="display:flex; flex-wrap:wrap; gap:4px;">';
    for (let d = 0; d <= 6; d++) {
      if (agrupados[d]) {
        const hrs = agrupados[d]
          .map(h => `${h.hora_inicio.substring(0, 5)}-${h.hora_fin.substring(0, 5)}`)
          .join(', ');
        html += `<span style="background:#e8edf5; padding:2px 8px; border-radius:8px; font-size:0.85em;">
          <strong>${diasCorto[d]}</strong> ${hrs}
        </span>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
  } catch {
    container.innerHTML = `<span style="color:#999;">⏰ Sin horarios</span>`;
  }
}

// ---- SELECCIONAR GRUPO (navegación master-detail) ----
export function seleccionarGrupo(grupoId: string): void {
  grupoSeleccionadoId = grupoId;
  document.getElementById('grupos-list-view')!.classList.add('hidden');
  document.getElementById('grupo-detalle-view')!.classList.remove('hidden');
  renderDetalleGrupo(grupoId);
}

export function volverALista(): void {
  grupoSeleccionadoId = null;
  document.getElementById('grupo-detalle-view')!.classList.add('hidden');
  document.getElementById('grupos-list-view')!.classList.remove('hidden');
  // Ocultar monitoreo
  document.getElementById('monitoreo-panel')!.classList.add('hidden');
  // Limpiar si hay monitor activo
  const monitoreo = (window as any).monitoreoModule;
  if (monitoreo?.detenerMonitoreo) monitoreo.detenerMonitoreo();
  monitorGrupoId = null;
  cargarGrupos();
}

export let monitorGrupoId: string | null = null;

export async function renderDetalleGrupo(grupoId: string): Promise<void> {
  const { data: grupo } = await supabase
    .from('grupos')
    .select('*')
    .eq('id', grupoId)
    .maybeSingle();

  if (!grupo) { volverALista(); return; }

  (document.getElementById('detalle-grupo-nombre') as HTMLElement).textContent = grupo.nombre;
  (document.getElementById('detalle-grupo-materia') as HTMLElement).textContent = grupo.materia || 'Sin materia';
  (document.getElementById('detalle-grupo-codigo') as HTMLElement).textContent = grupo.codigo_unico || '---';

  cargarDetalleHorarios(grupoId);
  // Vincular botones (usar funciones globales expuestas en window para evitar tree-shaking)
  document.getElementById('detalle-btn-qr')!.onclick = () => {
    const fn = (window as any)['generarQR'];
    if (fn) fn(grupoId, grupo.nombre);
  };
  document.getElementById('detalle-btn-monitoreo')!.onclick = () => {
    const fn = (window as any)['reabrirMonitoreo'];
    if (fn) fn(grupoId);
  };
  document.getElementById('detalle-btn-exportar')!.onclick = () => exportarAsistencia(grupoId, grupo.nombre);
  document.getElementById('detalle-btn-ver')!.onclick = () => verGrupo(grupoId);
  document.getElementById('detalle-btn-editar')!.onclick = () => mostrarEditarGrupo(grupoId);
}

async function cargarDetalleHorarios(grupoId: string): Promise<void> {
  const container = document.getElementById('detalle-grupo-horarios');
  if (!container) return;
  try {
    const { data } = await supabase
      .from('horarios')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('dia_semana', { ascending: true });
    if (!data || data.length === 0) {
      container.innerHTML = `<span style="color:#999;">⏰ Sin horarios configurados</span>`;
      return;
    }
    const diasCorto = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const agrupados: Record<number, Horario[]> = {};
    data.forEach(h => {
      if (!agrupados[h.dia_semana]) agrupados[h.dia_semana] = [];
      agrupados[h.dia_semana].push(h);
    });
    let html = '<strong style="font-size:0.85em;">📅 Horarios:</strong> ';
    for (let d = 0; d <= 6; d++) {
      if (agrupados[d]) {
        const hrs = agrupados[d]
          .map(h => `${h.hora_inicio.substring(0, 5)}-${h.hora_fin.substring(0, 5)}`)
          .join(', ');
        html += `<span style="background:#e8edf5; padding:2px 8px; border-radius:8px; font-size:0.85em; margin:2px;">
          <strong>${diasCorto[d]}</strong> ${hrs}
        </span>`;
      }
    }
    container.innerHTML = html;
  } catch {
    container.innerHTML = `<span style="color:#999;">⏰ Sin horarios</span>`;
  }
}

// ---- CREAR GRUPO ----
export async function crearGrupo(
  nombre: string, materia: string, limite: number, perdones: number, codigoUnico: string, ventanaReingreso: number, limiteAusenteMin: number
): Promise<boolean> {
  if (!(await verificarSesion())) return false;
  try {
    const { data: grupo, error } = await supabase
      .from('grupos')
      .insert({
        profesor_id: profesorActual!.id,
        nombre, materia,
        limite_salidas: limite || 3,
        numero_perdones: perdones || 2,
        ventana_reingreso_min: isNaN(ventanaReingreso) ? 2 : ventanaReingreso,
        limite_ausente_min: limiteAusenteMin || 5,
        codigo_unico: codigoUnico,
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    let errores = 0;
    for (const h of horariosFormularioCrear) {
      const err = await insertarHorario({
        grupo_id: grupo.id,
        dia_semana: h.dia,
        hora_inicio: h.inicio,
        hora_fin: h.fin,
        puntual_minutos: h.puntual,
        retardo_minutos: h.retardo,
        latitud: h.latitud || null,
        longitud: h.longitud || null,
        radio_metros: h.radio_metros || 50,
      });
      if (err) errores++;
    }

    if (errores > 0) mostrarToast('⚠️ Grupo creado pero algunos horarios no se guardaron.', 'warning');
    mostrarToast(`✅ Grupo "${nombre}" creado correctamente.`, 'exito');
    cargarGrupos();
    return true;
  } catch (err: any) {
    mostrarToast('Error al crear grupo: ' + (err.message || err), 'error');
    return false;
  }
}

// ---- EDITAR GRUPO ----
export async function mostrarEditarGrupo(grupoId: string): Promise<void> {
  const { data: grupo } = await supabase
    .from('grupos')
    .select('*')
    .eq('id', grupoId)
    .maybeSingle();
  if (!grupo) { mostrarToast('Error al cargar grupo', 'error'); return; }

  const { data: horariosExistentes } = await supabase
    .from('horarios')
    .select('*')
    .eq('grupo_id', grupoId);

  (document.getElementById('grupo-nombre') as HTMLInputElement).value = grupo.nombre || '';
  (document.getElementById('grupo-materia') as HTMLInputElement).value = grupo.materia || '';
  (document.getElementById('grupo-limite') as HTMLInputElement).value = String(grupo.limite_salidas || 3);
  (document.getElementById('grupo-perdones') as HTMLInputElement).value = String(grupo.numero_perdones || 2);
  (document.getElementById('grupo-ausencia-max') as HTMLInputElement).value = String(grupo.limite_ausente_min ?? 5);
  (document.getElementById('grupo-ventana-reingreso') as HTMLInputElement).value = String(grupo.ventana_reingreso_min ?? 2);
  (document.getElementById('grupo-codigo') as HTMLInputElement).value = grupo.codigo_unico || '';

  // Reset horarios
  renderCrearHorariosRows();
  horariosFormularioCrear = (horariosExistentes || []).map(h => ({
    dia: h.dia_semana,
    inicio: h.hora_inicio.substring(0, 5),
    fin: h.hora_fin.substring(0, 5),
    puntual: h.puntual_minutos || 10,
    retardo: h.retardo_minutos || 20,
    latitud: h.latitud || null,
    longitud: h.longitud || null,
    radio_metros: h.radio_metros || 50,
  }));
  actualizarListaHorariosCreados();

  const form = document.getElementById('form-crear-grupo') as HTMLFormElement;
  form.dataset.editando = grupoId;
  const titulo = document.querySelector('#modal-crear-grupo h2')!;
  titulo.textContent = '✏️ Editar grupo';
  document.getElementById('btn-guardar-grupo')!.textContent = '💾 Guardar cambios';
  document.getElementById('modal-crear-grupo')!.classList.remove('hidden');
}

export async function guardarEdicionGrupo(
  id: string, nombre: string, materia: string, limite: number, perdones: number, codigoUnico: string, ventanaReingreso: number, limiteAusenteMin: number
): Promise<boolean> {
  if (!(await verificarSesion())) return false;
  try {
    await supabase
      .from('grupos')
      .update({ nombre, materia, limite_salidas: limite, numero_perdones: perdones, codigo_unico: codigoUnico, ventana_reingreso_min: ventanaReingreso, limite_ausente_min: limiteAusenteMin })
      .eq('id', id);

    // Reemplazar horarios
    await supabase.from('horarios').delete().eq('grupo_id', id);
    let errores = 0;
    for (const h of horariosFormularioCrear) {
      const err = await insertarHorario({
        grupo_id: id,
        dia_semana: h.dia,
        hora_inicio: h.inicio,
        hora_fin: h.fin,
        puntual_minutos: h.puntual,
        retardo_minutos: h.retardo,
        latitud: h.latitud || null,
        longitud: h.longitud || null,
        radio_metros: h.radio_metros || 50,
      });
      if (err) errores++;
    }

    const form = document.getElementById('form-crear-grupo') as HTMLFormElement;
    delete form.dataset.editando;
    (document.querySelector('#modal-crear-grupo h2')!).textContent = '📚 Crear nuevo grupo';
    if (errores > 0) mostrarToast('⚠️ Grupo actualizado pero algunos horarios no se guardaron.', 'warning');

    cargarGrupos();
    if (grupoSeleccionadoId === id) renderDetalleGrupo(id);
    return true;
  } catch (err: any) {
    mostrarToast('Error al actualizar: ' + (err.message || err), 'error');
    return false;
  }
}

// ---- ELIMINAR GRUPO ----
export async function eliminarGrupo(id: string): Promise<void> {
  if (!confirm('¿Eliminar este grupo? Se perderán todos los datos relacionados.')) return;
  if (!(await verificarSesion())) return;

  // Limpiar tablas relacionadas manualmente
  const ignorar = (c: string) => ['PGRST116', '42501', '23503'].includes(c);
  const tablasRelacionadas: [string, string][] = [
    ['horarios', 'grupo_id'],
    ['sesiones_clase', 'grupo_id'],
    ['asistencia', 'grupo_id'],
    ['grupo_alumnos', 'grupo_id'],
  ];
  for (const [tabla, col] of tablasRelacionadas) {
    const q: any = supabase.from(tabla as any).delete();
    const { error } = await q.eq(col as any, id);
    if (error && !ignorar(error.code)) console.warn(`Error al limpiar ${tabla}:`, error.message);
  }

  const { error } = await supabase.from('grupos').delete().eq('id', id).eq('profesor_id', profesorActual!.id);
  if (error) {
    mostrarToast('Error al eliminar grupo. Revisa la consola.', 'error');
    console.error(error);
    return;
  }
  cargarGrupos();
  if (grupoSeleccionadoId === id) volverALista();
}

// ---- HORARIOS (formulario dinámico) ----
export function showCreateGroupModal(): void {
  document.getElementById('modal-crear-grupo')!.classList.remove('hidden');
  generarNuevoCodigo();
  renderCrearHorariosRows();
}

export function cerrarModal(): void {
  document.getElementById('modal-crear-grupo')!.classList.add('hidden');
  (document.getElementById('form-crear-grupo') as HTMLFormElement).reset();
  const form = document.getElementById('form-crear-grupo') as HTMLFormElement;
  delete form.dataset.editando;
  (document.querySelector('#modal-crear-grupo h2')!).textContent = '📚 Crear nuevo grupo';
  (document.getElementById('btn-guardar-grupo')!).textContent = '✅ Crear grupo';
}

// ---- MANEJAR SUBMIT del formulario de grupo (crear o editar) ----
export async function handleGuardarGrupo(e: Event): Promise<boolean> {
  e.preventDefault();
  const form = document.getElementById('form-crear-grupo') as HTMLFormElement;
  const editando = form.dataset.editando;
  const nombre = (document.getElementById('grupo-nombre') as HTMLInputElement).value.trim();
  const materia = (document.getElementById('grupo-materia') as HTMLInputElement).value.trim();
  const limite = parseInt((document.getElementById('grupo-limite') as HTMLInputElement).value) || 3;
  const perdones = parseInt((document.getElementById('grupo-perdones') as HTMLInputElement).value) || 2;
  const rawVentana = parseInt((document.getElementById('grupo-ventana-reingreso') as HTMLInputElement).value);
  const ventanaReingreso = isNaN(rawVentana) ? 2 : rawVentana;
  const limiteAusenteMin = parseInt((document.getElementById('grupo-ausencia-max') as HTMLInputElement).value) || 5;
  const codigo = (document.getElementById('grupo-codigo') as HTMLInputElement).value.trim();

  if (!nombre) {
    mostrarToast('⚠️ El nombre del grupo es obligatorio.', 'warning');
    return false;
  }

  let exito: boolean;
  if (editando) {
    exito = await guardarEdicionGrupo(editando, nombre, materia, limite, perdones, codigo, ventanaReingreso, limiteAusenteMin);
  } else {
    exito = await crearGrupo(nombre, materia, limite, perdones, codigo, ventanaReingreso, limiteAusenteMin);
  }

  if (exito) cerrarModal();
  return false;
}

export function generarNuevoCodigo(): void {
  (document.getElementById('grupo-codigo') as HTMLInputElement).value = generarCodigo(6);
}

export function renderCrearHorariosRows(): void {
  horariosFormularioCrear = [];
  actualizarListaHorariosCreados();
}

export function actualizarListaHorariosCreados(): void {
  const lista = document.getElementById('lista-horarios-creados');
  if (!lista) return;
  if (horariosFormularioCrear.length === 0) {
    lista.innerHTML = '<span style="color:#999; font-size:0.9em; padding:8px;">No hay horarios agregados.</span>';
    return;
  }
  const diasCorto = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  lista.innerHTML = horariosFormularioCrear.map((h, i) => `
    <div class="horario-chip">
      <span class="chip-dia">${diasCorto[h.dia]}</span>
      <span class="chip-rango">${h.inicio.substring(0, 5)} → ${h.fin.substring(0, 5)}</span>
      <span class="chip-tolerancias">🟢${h.puntual}min 🟡${h.retardo}min</span>
      ${h.latitud && h.longitud ? '<span class="chip-gps" title="📍 GPS configurado">📍</span>' : ''}
      <button onclick="eliminarHorarioFormulario(${i})" class="chip-eliminar">✕</button>
    </div>
  `).join('');
}

export function agregarHorarioFormulario(): void {
  const dia = parseInt((document.getElementById('nuevo-horario-dia') as HTMLSelectElement).value);
  const inicio = leerHoraInput('nuevo-horario-inicio');
  const fin = leerHoraInput('nuevo-horario-fin');
  const puntual = parseInt((document.getElementById('nuevo-horario-puntual') as HTMLInputElement).value) || 10;
  const retardo = parseInt((document.getElementById('nuevo-horario-retardo') as HTMLInputElement).value) || 20;

  if (!inicio || !fin) { mostrarToast('Ingresa horas válidas.', 'warning'); return; }
  if (inicio >= fin) { mostrarToast('⚠️ Inicio debe ser menor que fin.', 'warning'); return; }

  const lat = parseFloat((document.getElementById('nuevo-horario-lat') as HTMLInputElement).value) || null;
  const lng = parseFloat((document.getElementById('nuevo-horario-lng') as HTMLInputElement).value) || null;
  const radio = parseInt((document.getElementById('nuevo-horario-radio') as HTMLInputElement).value) || 50;

  horariosFormularioCrear.push({ dia, inicio, fin, puntual, retardo, latitud: lat, longitud: lng, radio_metros: radio });
  actualizarListaHorariosCreados();
  (document.getElementById('nuevo-horario-inicio') as HTMLInputElement).value = '';
  (document.getElementById('nuevo-horario-fin') as HTMLInputElement).value = '';
}

export function eliminarHorarioFormulario(index: number): void {
  horariosFormularioCrear.splice(index, 1);
  actualizarListaHorariosCreados();
}

function leerHoraInput(id: string): string | null {
  const val = (document.getElementById(id) as HTMLInputElement).value;
  if (!val) return null;
  const partes = val.split(':').map(Number);
  if (partes.length !== 2 || isNaN(partes[0]) || isNaN(partes[1])) return null;
  if (partes[0] < 0 || partes[0] > 23 || partes[1] < 0 || partes[1] > 59) return null;
  return val;
}

// ---- OBTENER UBICACIÓN GPS (Geolocation API) ----
export function obtenerUbicacion(): void {
  if (!navigator.geolocation) {
    mostrarToast('⚠️ Tu navegador no soporta geolocalización.', 'error');
    return;
  }
  const btn = document.querySelector('button[onclick*="obtenerUbicacion"]') as HTMLButtonElement;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Obteniendo ubicación...'; }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latInput = document.getElementById('nuevo-horario-lat') as HTMLInputElement;
      const lngInput = document.getElementById('nuevo-horario-lng') as HTMLInputElement;
      latInput.value = pos.coords.latitude.toFixed(6);
      lngInput.value = pos.coords.longitude.toFixed(6);
      if (btn) { btn.disabled = false; btn.innerHTML = '📍 Obtener mi ubicación actual'; }
      mostrarToast('✅ Ubicación obtenida correctamente.', 'exito');
    },
    (err) => {
      if (btn) { btn.disabled = false; btn.innerHTML = '📍 Obtener mi ubicación actual'; }
      switch (err.code) {
        case err.PERMISSION_DENIED:
          mostrarToast('⚠️ Permiso denegado. Activa la ubicación en tu navegador.', 'error');
          break;
        case err.POSITION_UNAVAILABLE:
          mostrarToast('⚠️ No se pudo obtener la ubicación. Intenta de nuevo.', 'error');
          break;
        case err.TIMEOUT:
          mostrarToast('⚠️ La solicitud de ubicación tardó demasiado. Intenta de nuevo.', 'error');
          break;
        default:
          mostrarToast('⚠️ Error al obtener ubicación: ' + err.message, 'error');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}
