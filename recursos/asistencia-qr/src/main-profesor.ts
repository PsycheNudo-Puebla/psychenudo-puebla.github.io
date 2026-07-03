// ============================================================
// Punto de entrada — Profesor
// ============================================================
import '@/config/supabase';
import '@/config/toaster';
// QRCode se carga globalmente desde public/js/qrcode.min.js (script tag en HTML)
import '@/professor/groups';
import '@/professor/groups-horarios';
import '@/professor/qr';
import '@/professor/monitoring';
import '@/professor/reports';
import {
  handleLogin, handleRegister, handleResetPassword, handleLogout, showTab,
} from '@/professor/auth';
import {
  cargarGrupos, seleccionarGrupo, volverALista, showCreateGroupModal, cerrarModal,
  crearGrupo, guardarEdicionGrupo, eliminarGrupo, renderCrearHorariosRows,
  agregarHorarioFormulario, eliminarHorarioFormulario, generarNuevoCodigo,
} from '@/professor/groups';
import { insertarHorario } from '@/professor/groups-horarios';
import { generarQR, cerrarQR } from '@/professor/qr';
import { reabrirMonitoreo, detenerMonitoreo, cerrarMonitoreo } from '@/professor/monitoring';
import {
  verGrupo, renderVerGrupo, editarNombreAlumno, guardarNombreAlumno,
  cerrarModalEditarAlumno, cerrarModalVer, exportarAsistencia, resetearContadoresHoy,
} from '@/professor/reports';

// ---- Exponer funciones globales para onclick/onsubmit en HTML ----
// Auth
(window as any).handleLogin = handleLogin;
(window as any).handleRegister = handleRegister;
(window as any).handleResetPassword = handleResetPassword;
(window as any).handleLogout = handleLogout;
(window as any).showTab = showTab;

// Grupos
(window as any).cargarGrupos = cargarGrupos;
(window as any).seleccionarGrupo = seleccionarGrupo;
(window as any).volverALista = volverALista;
(window as any).showCreateGroupModal = showCreateGroupModal;
(window as any).cerrarModal = cerrarModal;
(window as any).crearGrupo = crearGrupo;
(window as any).guardarEdicionGrupo = guardarEdicionGrupo;
(window as any).eliminarGrupo = eliminarGrupo;
(window as any).generarNuevoCodigo = generarNuevoCodigo;
(window as any).renderCrearHorariosRows = renderCrearHorariosRows;
(window as any).agregarHorarioFormulario = agregarHorarioFormulario;
(window as any).eliminarHorarioFormulario = eliminarHorarioFormulario;

// Horarios
(window as any).insertarHorario = insertarHorario;

// QR
(window as any).generarQR = generarQR;
(window as any).cerrarQR = cerrarQR;

// Monitoreo
(window as any).reabrirMonitoreo = reabrirMonitoreo;
(window as any).detenerMonitoreo = detenerMonitoreo;
(window as any).cerrarMonitoreo = cerrarMonitoreo;

// Reportes
(window as any).verGrupo = verGrupo;
(window as any).renderVerGrupo = renderVerGrupo;
(window as any).editarNombreAlumno = editarNombreAlumno;
(window as any).guardarNombreAlumno = guardarNombreAlumno;
(window as any).cerrarModalEditarAlumno = cerrarModalEditarAlumno;
(window as any).cerrarModalVer = cerrarModalVer;
(window as any).exportarAsistencia = exportarAsistencia;
(window as any).resetearContadoresHoy = resetearContadoresHoy;

console.log('📚 Módulos del profesor cargados');
