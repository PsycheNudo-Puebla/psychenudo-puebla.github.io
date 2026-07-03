// ====== SISTEMA DE TOAST NOTIFICATIONS ======
// Reemplaza alert() por notificaciones visuales no obstructivas

function mostrarToast(mensaje, tipo = 'info', duracion = 3500) {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 380px;
            width: calc(100% - 40px);
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 14px 18px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        font-size: 0.95em;
        box-shadow: 0 6px 24px rgba(0,0,0,0.2);
        pointer-events: auto;
        animation: toastIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        word-break: break-word;
    `;

    // Iconos y colores según tipo
    const colores = {
        exito:   { bg: '#2e7d32', icon: '✅' },
        error:   { bg: '#c62828', icon: '❌' },
        warning: { bg: '#e65100', icon: '⚠️' },
        info:    { bg: '#1565c0', icon: 'ℹ️' }
    };
    const cfg = colores[tipo] || colores.info;
    toast.style.background = cfg.bg;
    toast.innerHTML = `<span style="font-size:1.2em;">${cfg.icon}</span> ${mensaje}`;

    container.appendChild(toast);

    // Auto-destruir después de la duración
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}

// ====== CONTROL DE ESTADO DE CARGA EN BOTONES ======
// Deshabilita un botón mientras se ejecuta una operación async
function setLoading(btnId, cargando, textoNormal = null) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (cargando) {
        btn._textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
        btn.innerHTML = '⏳ Cargando...';
    } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        if (textoNormal) btn.innerHTML = textoNormal;
        else if (btn._textoOriginal) btn.innerHTML = btn._textoOriginal;
    }
}

// Inyectar keyframes si no existen
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
