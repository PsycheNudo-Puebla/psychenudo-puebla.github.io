// ============================================================
// Punto de entrada — Alumno
// ============================================================
import '@/config/supabase';
import '@/config/toaster';
import { initAlumnoAuth, handleLogin, handleRegister, handleResetPassword, handleLogout, showTab } from '@/student/auth';
import { setupUnirseGrupoForm, showUnirseGrupoModal, cerrarModalUnirse } from '@/student/dashboard';
import { confirmarAsistencia, sincronizarContador, salirMonitoreo, confirmarAsistenciaPendiente } from '@/student/monitoring';
import { iniciarEscaneo, detenerEscaneo } from '@/student/scanner';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initAlumnoAuth();
  setupUnirseGrupoForm();
});

// Exponer funciones para onclick HTML
(window as any).handleLogin = handleLogin;
(window as any).handleRegister = handleRegister;
(window as any).handleResetPassword = handleResetPassword;
(window as any).handleLogout = handleLogout;
(window as any).showTab = showTab;
(window as any).cerrarModal = cerrarModalUnirse;
(window as any).showUnirseGrupoModal = showUnirseGrupoModal;
(window as any).iniciarEscaneo = iniciarEscaneo;
(window as any).detenerEscaneo = detenerEscaneo;
(window as any).confirmarAsistencia = confirmarAsistencia;
(window as any).sincronizarContador = sincronizarContador;
(window as any).salirMonitoreo = salirMonitoreo;
(window as any).confirmarAsistenciaPendiente = confirmarAsistenciaPendiente;
