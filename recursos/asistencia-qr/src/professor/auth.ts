// ============================================================
// Autenticación del Profesor (login, registro, UI)
// ============================================================
import { supabase } from '@/config/supabase';
import { mostrarToast, setLoading } from '@/config/toaster';
import { iniciarSesion, cerrarSesion, profesorActual } from '@/shared/auth';
import { cargarGrupos } from './groups';
import { detenerAutoScheduler } from './qr';

// ---- Estado ----
export let estaIniciandoSesion = false;

// ---- HANDLERS DE LOGIN / REGISTRO ----
export async function handleLogin(e: Event): Promise<void> {
  e.preventDefault();
  estaIniciandoSesion = true;
  setLoading('btn-login', true);
  try {
    const email = (document.getElementById('login-email') as HTMLInputElement).value;
    const password = (document.getElementById('login-password') as HTMLInputElement).value;

    const resultado = await iniciarSesion(email, password, 'profesor');
    if (!resultado.success) {
      (document.getElementById('login-error') as HTMLElement).textContent = resultado.error || 'Email o contraseña incorrectos';
      setLoading('btn-login', false, 'Entrar');
      return;
    }
    setLoading('btn-login', false, 'Entrar');

    // Mostrar dashboard
    if (profesorActual) {
      (document.getElementById('profesor-nombre') as HTMLElement).textContent = `Hola, ${profesorActual.nombre}`;
      document.getElementById('login-view')!.classList.add('hidden');
      document.getElementById('dashboard-view')!.classList.remove('hidden');
      cargarGrupos();
    }
  } catch (err: any) {
    console.error('Error en login:', err);
    (document.getElementById('login-error') as HTMLElement).textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    setLoading('btn-login', false, 'Entrar');
  } finally {
    estaIniciandoSesion = false;
  }
}

export async function handleResetPassword(e: Event): Promise<void> {
  e.preventDefault();
  const email = ((document.getElementById('login-email') as HTMLInputElement).value || '').trim();
  if (!email) {
    mostrarToast('Ingresa tu email en el campo de arriba primero.', 'warning');
    return;
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/recursos/asistencia-qr/profesor.html',
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
    const email = (document.getElementById('reg-email') as HTMLInputElement).value;
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'profesor', nombre } },
    });

    if (authError) {
      (document.getElementById('register-error') as HTMLElement).textContent = authError.message;
      setLoading('btn-register', false, 'Registrarme');
      return;
    }

    // Guardar en tabla profesores
    const { error: dbError } = await supabase
      .from('profesores')
      .upsert({
        id: authData.user!.id,
        email,
        nombre,
      }, { onConflict: 'id' });

    if (dbError) {
      console.error('Error al guardar profesor:', dbError);
      mostrarToast('⚠️ Registro creado, pero hubo un problema al guardar datos extra.', 'warning');
      setLoading('btn-register', false, 'Registrarme');
      showTab('register');
      return;
    }

    setLoading('btn-register', false, 'Registrarme');
    mostrarToast('Registro exitoso. Ya puedes iniciar sesión.', 'exito');
    showTab('login');
  } catch (err: any) {
    console.error('Error en registro:', err);
    (document.getElementById('register-error') as HTMLElement).textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    setLoading('btn-register', false, 'Registrarme');
  }
}

export async function handleLogout(): Promise<void> {
  try {
    await cerrarSesion('profesor');
  } catch (e) {
    console.warn('Error al cerrar sesión:', e);
  }
  detenerAutoScheduler();
  mostrarLogin();
}

// ---- UI Helper ----
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
  document.getElementById('login-view')!.classList.remove('hidden');
  document.getElementById('dashboard-view')!.classList.add('hidden');
  document.getElementById('login-form')!.classList.remove('hidden');
  document.getElementById('register-form')!.classList.add('hidden');
}
