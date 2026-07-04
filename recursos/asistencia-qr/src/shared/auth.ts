// ============================================================
// Módulo compartido de autenticación
// ============================================================
import { supabase, obtenerDeviceId, obtenerDeviceIdViejo, guardarDeviceIdViejo, limpiarDeviceIdViejo } from '@/config/supabase';
import { Profesor, Alumno } from '@/types';
import { mostrarToast } from '@/config/toaster';

// ---- Sesión actual ----
export let profesorActual: Profesor | null = null;
export let alumnoActual: Alumno | null = null;

type Rol = 'profesor' | 'alumno';

// ---- INICIAR SESIÓN ----
export async function iniciarSesion(
  email: string,
  password: string,
  rol: Rol
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { success: false, error: error?.message || 'Credenciales inválidas' };
  }

  const userId = data.user.id;

  if (rol === 'profesor') {
    const { data: perfil } = await supabase
      .from('profesores')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!perfil) {
      await supabase.auth.signOut();
      return { success: false, error: 'No hay un profesor con esta cuenta.' };
    }

    profesorActual = perfil;

    // Verificar device ID
    const deviceActual = obtenerDeviceId();
    if (perfil.device_id && perfil.device_id !== deviceActual) {
      guardarDeviceIdViejo(perfil.device_id);
    }

    // Actualizar device_id si cambió
    if (perfil.device_id !== deviceActual) {
      await supabase.from('profesores').update({ device_id: deviceActual }).eq('id', userId);
    }
  } else {
    // Alumno
    const { data: perfil } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!perfil) {
      await supabase.auth.signOut();
      return { success: false, error: 'No hay un alumno con esta cuenta.' };
    }

    alumnoActual = perfil;

    // Verificar device ID
    const deviceActual = obtenerDeviceId();
    const deviceViejo = obtenerDeviceIdViejo();

    if (perfil.device_id && perfil.device_id !== deviceActual && perfil.device_id !== deviceViejo) {
      mostrarToast(
        '⚠️ Esta cuenta ya está asociada a otro dispositivo. Si es tu cuenta, inicia sesión desde el dispositivo original.',
        'warning', 6000
      );
    }

    // Actualizar device_id
    if (perfil.device_id !== deviceActual) {
      await supabase.from('alumnos').update({ device_id: deviceActual }).eq('id', userId);
      limpiarDeviceIdViejo();
    }
  }

  return { success: true };
}

// ---- REGISTRAR ----
export async function registrar(
  email: string,
  password: string,
  nombre: string,
  rol: Rol,
  matricula?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: 'No se pudo crear el usuario.' };

  const userId = data.user.id;
  const deviceId = obtenerDeviceId();

  if (rol === 'profesor') {
    const { error: insertError } = await supabase.from('profesores').insert({
      id: userId,
      email,
      nombre,
      device_id: deviceId,
    });
    if (insertError) {
      await supabase.auth.signOut();
      return { success: false, error: insertError.message };
    }
  } else {
    const { error: insertError } = await supabase.from('alumnos').insert({
      id: userId,
      email,
      nombre,
      matricula: matricula || null,
      device_id: deviceId,
    });
    if (insertError) {
      await supabase.auth.signOut();
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}

// ---- CERRAR SESIÓN ----
export async function cerrarSesion(rol: Rol): Promise<void> {
  await supabase.auth.signOut();
  if (rol === 'profesor') profesorActual = null;
  else alumnoActual = null;
}

// ---- RESTABLECER CONTRASEÑA ----
export async function restablecerPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/cambiar-password.html',
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---- RESTAURAR SESIÓN PROFESOR (al recargar página) ----  
export async function restaurarSesionProfesor(userId: string): Promise<boolean> {
  const { data: perfil } = await supabase
    .from('profesores')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!perfil) return false;
  profesorActual = perfil;
  return true;
}

// ---- RESTAURAR SESIÓN ALUMNO (al recargar página) ----
export async function restaurarSesionAlumno(userId: string): Promise<boolean> {
  const { data: perfil } = await supabase
    .from('alumnos')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!perfil) return false;
  alumnoActual = perfil;
  return true;
}

// ---- VERIFICAR SESIÓN ACTIVA (para operaciones críticas) ----
export async function verificarSesion(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    mostrarToast('⚠️ Tu sesión expiró. Recarga la página y vuelve a iniciar sesión.', 'error');
    return false;
  }
  return true;
}
