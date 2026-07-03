// ============================================================
// tipos compartidos para el sistema de Asistencia QR
// ============================================================

// ---- Auth ----
export interface Profesor {
  id: string;
  email: string;
  nombre: string;
  device_id?: string;
  sesion_token?: string;
  creado_en?: string;
}

export interface Alumno {
  id: string;
  email: string;
  nombre: string;
  matricula?: string;
  device_id?: string;
  creado_en?: string;
}

// ---- Grupos ----
export interface Grupo {
  id: string;
  profesor_id: string;
  nombre: string;
  materia?: string;
  limite_salidas: number;
  numero_perdones: number;
  codigo_unico: string;
  latitud?: number;
  longitud?: number;
  radio_metros?: number;
  creado_en?: string;
}

export interface GrupoAlumno {
  alumno_id: string;
  grupo_id: string;
  abandono_en?: string;
  alumnos?: Alumno;
}

export interface Horario {
  id: string;
  grupo_id: string;
  dia_semana: number; // 0=Dom … 6=Sáb
  hora_inicio: string; // HH:mm
  hora_fin: string;
  activo: boolean;
  puntual_minutos: number;
  retardo_minutos: number;
  latitud?: number;
  longitud?: number;
  radio_metros?: number;
  creado_en?: string;
}

// ---- Sesiones / Asistencia ----
export interface SesionClase {
  id: string;
  grupo_id: string;
  profesor_id: string;
  codigo_sesion: string;
  activa: boolean;
  creado_en?: string;
}

export interface Asistencia {
  id: string;
  alumno_id: string;
  grupo_id: string;
  fecha: string;
  estado: 'presente' | 'ausente' | 'justificado';
  tipo_asistencia?: 'presente' | 'retardo' | 'sin_derecho';
  sesion_codigo?: string;
  cambios_pantalla: number;
  confirmada: boolean;
  perdonada: boolean;
  creado_en?: string;
}

export interface LogSalida {
  id: string;
  asistencia_id: string;
  tipo: 'blur' | 'visibility' | 'otro';
  duracion_segundos?: number;
  creado_en?: string;
}

export interface Perdon {
  id: string;
  asistencia_id: string;
  profesor_id: string;
  razon: string;
  otorgado_en?: string;
}

// ---- Estado de UI ----
export interface EstadoIcono {
  icono: string;
  texto: string;
  bg: string;
  color: string;
}

export interface HorarioFormulario {
  dia: number;
  inicio: string;
  fin: string;
  puntual: number;
  retardo: number;
  latitud?: number | null;
  longitud?: number | null;
  radio_metros?: number | null;
}

// ---- Respuestas de Supabase con JOIN ----
export interface GrupoAlumnoJoined {
  alumno_id: string;
  abandono_en: string | null;
  alumnos: Pick<Alumno, 'id' | 'nombre' | 'email' | 'matricula'>;
}

// ---- Monitor ----
export interface MonitorAlumno {
  alumno_id: string;
  nombre: string;
  email: string;
  cambios_pantalla: number;
  confirmada: boolean;
  perdonada: boolean;
  fecha: string;
  creado_en: string;
  asistencia_id: string;
}

// ---- CONSTANTES ----
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
