// ============================================================
// Sistema de Toasts y control de carga de botones
// ============================================================

type TipoToast = 'exito' | 'error' | 'warning' | 'info';

interface ToastConfig {
  icon: string;
  bg: string;
  color: string;
}

const TOAST_CONFIGS: Record<TipoToast, ToastConfig> = {
  exito:  { icon: '✅', bg: '#e8f5e9', color: '#2e7d32' },
  error:  { icon: '❌', bg: '#ffebee', color: '#c62828' },
  warning: { icon: '⚠️', bg: '#fff3e0', color: '#e65100' },
  info:   { icon: 'ℹ️', bg: '#e3f2fd', color: '#1565c0' },
};

export function mostrarToast(
  mensaje: string,
  tipo: TipoToast = 'info',
  duracion: number = 3500
): void {
  const cfg = TOAST_CONFIGS[tipo];
  let container = document.getElementById('toast-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      display: flex; flex-direction: column; gap: 10px; max-width: 400px;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${cfg.bg}; color: ${cfg.color}; padding: 14px 20px;
    border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    font-weight: 500; font-size: 0.95em;
    animation: toastIn 0.3s ease forwards;
    border-left: 4px solid ${cfg.color};
    display: flex; align-items: center; gap: 10px;
  `;
  toast.innerHTML = `<span style="font-size:1.2em;">${cfg.icon}</span> ${mensaje}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duracion);
}

// ============================================================
// Control de estado de carga en botones
// ============================================================
export function setLoading(
  btnId: string,
  cargando: boolean,
  textoNormal: string | null = null
): void {
  const btn = document.getElementById(btnId) as HTMLButtonElement | null;
  if (!btn) return;

  if (cargando) {
    (btn as any)._textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'wait';
    btn.innerHTML = '⏳ Cargando...';
  } else {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    if (textoNormal) {
      btn.innerHTML = textoNormal;
    } else if ((btn as any)._textoOriginal) {
      btn.innerHTML = (btn as any)._textoOriginal;
    }
  }
}

// ============================================================
// Inyectar keyframes de animación (una sola vez)
// ============================================================
if (!document.getElementById('toast-keyframes')) {
  const style = document.createElement('style');
  style.id = 'toast-keyframes';
  style.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(100px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(100px); }
    }
  `;
  document.head.appendChild(style);
}
