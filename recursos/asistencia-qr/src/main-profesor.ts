// ============================================================
// Punto de entrada — Profesor
// ============================================================
import '@/config/supabase';
import '@/config/toaster';
import '../css/styles.css';
// QRCode se carga globalmente desde public/js/qrcode.min.js (script tag en HTML)

// Usamos import * as namespace para evitar tree-shaking de Vite
import * as auth from '@/professor/auth';
import * as groups from '@/professor/groups';
import * as groupsHorarios from '@/professor/groups-horarios';
import * as qr from '@/professor/qr';
import * as monitoring from '@/professor/monitoring';
import * as reports from '@/professor/reports';

// ---- Exponer funciones globales para onclick/onsubmit en HTML ----
// NOTA: Usamos (window as any)['name'] en lugar de (window as any).name
// para evitar que Vite/Rollup tree-shake las asignaciones.

const w = (window as any);

// Auth
w['handleLogin'] = auth.handleLogin;
w['handleRegister'] = auth.handleRegister;
w['handleResetPassword'] = auth.handleResetPassword;
w['handleLogout'] = auth.handleLogout;
w['showTab'] = auth.showTab;

// Inicializar sesión persistente al cargar
document.addEventListener('DOMContentLoaded', () => {
  auth.initProfesorAuth();
});

// Grupos
w['cargarGrupos'] = groups.cargarGrupos;
w['seleccionarGrupo'] = groups.seleccionarGrupo;
w['volverALista'] = groups.volverALista;
w['showCreateGroupModal'] = groups.showCreateGroupModal;
w['cerrarModal'] = groups.cerrarModal;
w['crearGrupo'] = groups.crearGrupo;
w['guardarEdicionGrupo'] = groups.guardarEdicionGrupo;
w['handleGuardarGrupo'] = groups.handleGuardarGrupo;
w['eliminarGrupo'] = groups.eliminarGrupo;
w['generarNuevoCodigo'] = groups.generarNuevoCodigo;
w['renderCrearHorariosRows'] = groups.renderCrearHorariosRows;
w['agregarHorarioFormulario'] = groups.agregarHorarioFormulario;
w['eliminarHorarioFormulario'] = groups.eliminarHorarioFormulario;
w['obtenerUbicacion'] = groups.obtenerUbicacion;

// Horarios (desde groups-horarios)
w['insertarHorario'] = groupsHorarios.insertarHorario;
w['mostrarEditarGrupo'] = groups.mostrarEditarGrupo;
w['actualizarListaHorariosCreados'] = groups.actualizarListaHorariosCreados;

// QR
w['generarQR'] = qr.generarQR;
w['cerrarQR'] = qr.cerrarQR;

// Monitoreo
w['reabrirMonitoreo'] = monitoring.reabrirMonitoreo;
w['detenerMonitoreo'] = monitoring.detenerMonitoreo;
w['cerrarMonitoreo'] = monitoring.cerrarMonitoreo;

// Reportes
w['verGrupo'] = reports.verGrupo;
w['renderVerGrupo'] = reports.renderVerGrupo;
w['editarNombreAlumno'] = reports.editarNombreAlumno;
w['guardarNombreAlumno'] = reports.guardarNombreAlumno;
w['cerrarModalEditarAlumno'] = reports.cerrarModalEditarAlumno;
w['cerrarModalVer'] = reports.cerrarModalVer;
w['exportarAsistencia'] = reports.exportarAsistencia;
w['resetearContadoresHoy'] = reports.resetearContadoresHoy;

// Forzar que Vite NO tree-shake funciones críticas
// usando referencias directas + void
void function asegurarExports(): void {
  const _mostrarEditarGrupo = groups.mostrarEditarGrupo;
  const _actualizarListaHorariosCreados = groups.actualizarListaHorariosCreados;
  const _handleGuardarGrupo = groups.handleGuardarGrupo;
  const _obtenerUbicacion = groups.obtenerUbicacion;
  Object.defineProperty(window, '__asegurados', {
    value: {
      mostrarEditarGrupo: _mostrarEditarGrupo,
      actualizarListaHorariosCreados: _actualizarListaHorariosCreados,
      handleGuardarGrupo: _handleGuardarGrupo,
      obtenerUbicacion: _obtenerUbicacion,
    },
    writable: false,
    configurable: true,
  });
}();

console.log('📚 Módulos del profesor cargados');
