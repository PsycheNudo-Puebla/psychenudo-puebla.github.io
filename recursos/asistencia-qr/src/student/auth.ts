// ============================================================
// Autenticación del Alumno (login, registro, auto-reentrada)
// ============================================================
import { supabase, obtenerDeviceId } from '@/config/supabase';
import { mostrarToast, setLoading } from '@/config/toaster';
import type { Alumno } from '@/types';
import { verificarSesion, cerrarSesion } from '@/shared/auth';
// El módulo de monitoreo se importa dinámicamente para evitar ciclos
import { autoReanudarMonitoreo } from './monitoring';
import { cargarGrupos } from './dashboard';

// ---- Estado global del alumno ----
export let alumnoActual: Alumno | null = null;
export let monitoreoActivo = false;

// ---- Inicialización ----
export async function initAlumnoAuth(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await cargarDatosAlumno(session.user);
  }
}

// Escuchar cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  if (monitoreoActivo) return; // No interrumpir monitoreo
  if (event === 'SIGNED_IN' && session) {
    cargarDatosAlumno(session.user);
  } else if (event === 'SIGNED_OUT') {
    mostrarLogin();
  }
});

// ---- UI Helpers ----
export function showTab(tab: 'login' | 'register', eventElement?: Event): void {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (eventElement?.target) {
    (eventElement.target as HTMLElement).classList.add('active');
  } else {
    document.querySelectorAll('.tab').forEach(t => {
      const txt = t.textContent?.toLowerCase() || '';
      if ((tab === 'login' && txt.includes('iniciar')) || (tab === 'register' && txt.includes('registr'))) {
        t.classList.add('active');
      }
    });
  }
  const loginForm = document.getElementById('login-form')!;
  const registerForm = document.getElementById('register-form')!;
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }
}

export function mostrarLogin(): void {
  if (monitoreoActivo) return;
  document.getElementById('login-view')!.classList.remove('hidden');
  document.getElementById('dashboard-view')!.classList.add('hidden');
  document.getElementById('login-form')!.classList.remove('hidden');
  document.getElementById('register-form')!.classList.add('hidden');
}

// ---- Handlers ----
export async function handleLogin(e: Event): Promise<void> {
  e.preventDefault();
  setLoading('btn-login', true);
  try {
    const email = (document.getElementById('login-email') as HTMLInputElement).value;
    const password = (document.getElementById('login-password') as HTMLInputElement).value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById('login-error')!.textContent = 'Email o contraseña incorrectos';
      setLoading('btn-login', false, 'Entrar');
      return;
    }
    setLoading('btn-login', false, 'Entrar');
    await verificarYCargarAlumno(data.user);
  } catch (err: any) {
    console.error('Error en login:', err);
    document.getElementById('login-error')!.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    setLoading('btn-login', false, 'Entrar');
  }
}

export async function handleResetPassword(e: Event): Promise<void> {
  e.preventDefault();
  const email = (document.getElementById('login-email') as HTMLInputElement).value.trim();
  if (!email) {
    mostrarToast('Ingresa tu email en el campo de arriba primero.', 'warning');
    return;
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/recursos/asistencia-qr/alumno.html',
    });
    if (error) {
      mostrarToast('Error: ' + error.message, 'error');
    } else {
      mostrarToast('📧 Revisa tu email para restablecer la contraseña.', 'exito');
    }
  } catch (err: any) {
    mostrarToast('Error al enviar correo: ' + err.message, 'error');
  }
}

export async function handleRegister(e: Event): Promise<void> {
  e.preventDefault();
  setLoading('btn-register', true);
  try {
    const nombre = (document.getElementById('reg-nombre') as HTMLInputElement).value;
    const matricula = (document.getElementById('reg-matricula') as HTMLInputElement).value;
    const email = (document.getElementById('reg-email') as HTMLInputElement).value;
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;
    const deviceId = obtenerDeviceId();

    document.getElementById('register-error')!.textContent = 'Registrando...';

    // 1. Crear usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'alumno', nombre, matricula },
      },
    });

    if (authError) {
      document.getElementById('register-error')!.textContent = authError.message;
      setLoading('btn-register', false, 'Registrarme');
      return;
    }

    // 2. Guardar en tabla alumnos
    const { error: dbError } = await supabase
      .from('alumnos')
      .upsert({
        id: authData.user!.id,
        email,
        nombre,
        matricula,
        device_id: deviceId,
      }, { onConflict: 'id' });

    if (dbError) {
      console.error('Error al guardar alumno en BD:', dbError);
      mostrarToast('⚠️ Error al guardar datos extra.', 'warning');
      setLoading('btn-register', false, 'Registrarme');
      if (authData.session) {
        alumnoActual = authData.user as any;
        await cargarDatosAlumno(authData.user!, 3);
      } else {
        showTab('login');
      }
      return;
    }

    if (authData.session) {
      alumnoActual = authData.user as any;
      setLoading('btn-register', false, 'Registrarme');
      await cargarDatosAlumno(authData.user!, 3);
    } else {
      document.getElementById('register-error')!.textContent = '';
      setLoading('btn-register', false, 'Registrarme');
      mostrarToast('Registro exitoso. Revisa tu email para confirmar tu cuenta.', 'exito');
      showTab('login');
    }
  } catch (err: any) {
    console.error('Error en registro:', err);
    document.getElementById('register-error')!.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    setLoading('btn-register', false, 'Registrarme');
  }
}

export async function handleLogout(): Promise<void> {
  // Detener escaneo si está activo
  const { html5QrCode, escaneando, detenerEscaneo } = await import('./scanner');
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch { /* ignore */ }
    detenerEscaneo();
  }
  await cerrarSesion('alumno');
  mostrarLogin();
}

// ---- Verificación de alumno ----
async function verificarYCargarAlumno(user: any): Promise<void> {
  const deviceId = obtenerDeviceId();
  let { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const esPlaceholder = data && (data.nombre === 'Usuario Nuevo' || data.matricula === 'SIN_MATRICULA');

  if (error || !data || esPlaceholder) {
    const nombre = user.user_metadata?.nombre || data?.nombre || user.email?.split('@')[0] || 'Alumno';
    const matricula = user.user_metadata?.matricula || data?.matricula || 'SIN_MATRICULA';

    const { error: upsertError } = await supabase
      .from('alumnos')
      .upsert({ id: user.id, email: user.email || '', nombre, matricula, device_id: deviceId }, { onConflict: 'id' });

    if (upsertError) {
      document.getElementById('login-error')!.textContent = 'Error al cargar perfil. Contacta al administrador.';
      console.error('Error upsert alumnos:', upsertError);
      return;
    }
    data = { id: user.id, email: user.email || '', nombre, matricula, device_id: deviceId };
  }

  // Sincronizar device_id
  try {
    if (data.device_id !== deviceId) {
      console.warn('⚠️ Device ID cambiado. Se actualiza al nuevo dispositivo.');
      document.getElementById('login-error')!.textContent = '⚠️ Se detectó un cambio de dispositivo. Se ha actualizado el registro.';
      (document.getElementById('login-error')!).style.color = '#e65100';
      await supabase.from('alumnos').update({ device_id: deviceId }).eq('id', user.id);
    } else if (!data.device_id) {
      await supabase.from('alumnos').update({ device_id: deviceId }).eq('id', user.id);
    }
  } catch (e) {
    console.warn('⚠️ No se pudo actualizar device_id:', e);
  }

  alumnoActual = data;
  document.getElementById('alumno-nombre')!.textContent = `Hola, ${data.nombre}`;

  // Auto-reentrada a monitoreo
  if (await autoReanudarMonitoreo(alumnoActual!.id)) return;

  document.getElementById('login-view')!.classList.add('hidden');
  document.getElementById('dashboard-view')!.classList.remove('hidden');
  cargarGrupos();
}

export async function cargarDatosAlumno(user: any, intentos = 0): Promise<void> {
  const deviceId = obtenerDeviceId();
  let data: any, error: any;

  for (let i = 0; i <= intentos; i++) {
    const resultado = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    data = resultado.data;
    error = resultado.error;
    if (data) break;
    if (i < intentos) await new Promise(r => setTimeout(r, 500));
  }

  const esPlaceholder = data && (data.nombre === 'Usuario Nuevo' || data.matricula === 'SIN_MATRICULA');

  if (error || !data || esPlaceholder) {
    const nombre = user.user_metadata?.nombre || data?.nombre || user.email?.split('@')[0] || 'Alumno';
    const matricula = user.user_metadata?.matricula || data?.matricula || 'SIN_MATRICULA';
    const { error: upsertError } = await supabase
      .from('alumnos')
      .upsert({ id: user.id, email: user.email || '', nombre, matricula, device_id: deviceId }, { onConflict: 'id' });
    if (upsertError) {
      console.error('Error upsert en cargarDatosAlumno:', upsertError);
      document.getElementById('login-error')!.textContent = 'Error al cargar perfil. Contacta al administrador.';
      return;
    }
    data = { id: user.id, email: user.email || '', nombre, matricula, device_id: deviceId };
  }

  try {
    if (data.device_id !== deviceId) {
      console.warn('⚠️ Device ID cambiado. Se actualiza al nuevo dispositivo.');
      await supabase.from('alumnos').update({ device_id: deviceId }).eq('id', user.id);
    }
  } catch (e) {
    console.warn('⚠️ No se pudo actualizar device_id:', e);
  }

  alumnoActual = data;
  document.getElementById('alumno-nombre')!.textContent = `Hola, ${data.nombre}`;

  if (await autoReanudarMonitoreo(alumnoActual!.id)) return;

  document.getElementById('login-view')!.classList.add('hidden');
  document.getElementById('dashboard-view')!.classList.remove('hidden');
  cargarGrupos();
}

// Exponer alumnoActual para otros módulos
export function getAlumnoActual(): Alumno | null {
  return alumnoActual;
}

export function setMonitoreoActivo(activo: boolean): void {
  monitoreoActivo = activo;
}
