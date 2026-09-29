// ============================================================
// examen-utils.js — Funciones de utilería
// ============================================================

function updateStatus(message, isError = false) {
  elements.loadMessage.textContent = message;
  elements.loadMessage.classList.toggle("error", isError);
  elements.examStatus.textContent = currentExam?.titulo || "Inicio";
}

function setEditStatus(message, isError = false) {
  elements.editStatus.textContent = message;
  elements.editStatus.classList.toggle("error", isError);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function isSafariLikeBrowser() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh|Mac OS X/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua));
}

function cleanHtmlForPdf(text) {
  if (!text) return "";
  return String(text).replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, " * ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&rarr;/g, " -> ")
    .trim();
}

// ============================================================
// DESCARGAS ROBUSTAS (funciona en iPhone y navegadores Android
// que bloquean descargas automáticas o bloqueadas por antivirus)
// ============================================================

function triggerFileDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) link.remove();
    URL.revokeObjectURL(url);
  }, 8000);
}

function downloadTextFile(filename, content, mime = "application/json") {
  const text = (typeof content === "string") ? content : JSON.stringify(content, null, 2);
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  triggerFileDownload(filename, blob);
  return text;
}

function downloadJsonFile(payload, filename) {
  return downloadTextFile(filename, payload, "application/json");
}

// Respaldo para cuando el navegador no permite descargar (algunos Android
// con antivirus, navegadores embebidos o descargas desde blob URLs).
function showCopyFallbackPanel(containerId, content, filename) {
  const host = document.getElementById(containerId);
  if (!host) return;
  const existing = document.getElementById("copy-fallback-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "copy-fallback-panel";
  panel.style.cssText = "margin-top: 14px; padding: 14px; border: 1px dashed #94a3b8; border-radius: 10px; background: #f8fafc; text-align: left;";
  panel.innerHTML = `
    <p style="margin: 0 0 8px; font-size: 0.85rem; color: #334155;">
      1. Copia el contenido con el botón.<br>
      2. Abre el Bloc de notas y pégalo.<br>
      3. Guárdalo como <strong>${escapeHtml(filename)}</strong> (tipo: Todos los archivos).<br>
      4. Envíalo al docente: la app también lee archivos con extensión .txt
    </p>
    <textarea readonly style="width: 100%; min-height: 120px; font-family: monospace; font-size: 0.7rem; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box;"></textarea>
    <div class="inline-actions" style="margin-top: 10px;">
      <button class="copy-fallback-btn" type="button">Copiar contenido</button>
      <button class="copy-fallback-close secondary" type="button">Cerrar</button>
    </div>
    <p class="copy-fallback-status status" style="margin-top: 8px;"></p>`;
  host.appendChild(panel);

  const textarea = panel.querySelector("textarea");
  textarea.value = content;
  const status = panel.querySelector(".copy-fallback-status");

  const copy = async () => {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, content.length);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        document.execCommand("copy");
      }
      status.textContent = "Contenido copiado. Ya puedes pegarlo en un archivo de texto.";
    } catch (e) {
      try {
        document.execCommand("copy");
        status.textContent = "Contenido copiado. Ya puedes pegarlo en un archivo de texto.";
      } catch (e2) {
        status.textContent = "No se pudo copiar automáticamente: selecciona el texto y cópialo a mano.";
      }
    }
  };
  panel.querySelector(".copy-fallback-btn").addEventListener("click", copy);
  panel.querySelector(".copy-fallback-close").addEventListener("click", () => panel.remove());
  copy();
}

// Acepta JSON puro o texto que rodee al JSON (por ejemplo, copiado
// desde Bloc de notas y guardado con extensión .txt).
function parseResultText(text) {
  // Algunos editores guardan con BOM o con texto extra alrededor del JSON
  const clean = String(text).replace(/^\uFEFF/, "").trim();
  const attempts = [clean, clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1)];
  for (const candidate of attempts) {
    if (!candidate || !candidate.trim()) continue;
    try { return JSON.parse(candidate); } catch (e) { /* intentar siguiente */ }
  }
  throw new Error("El archivo no contiene un resultado JSON válido.");
}

// ============================================================
// MODALES PERSONALIZADOS
// ============================================================
let modalResolve = null;

function showModalAlert(message, title = "TestLab Pro", icon = "ℹ️") {
  return new Promise((resolve) => {
    document.getElementById("modal-icon").textContent = icon;
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;
    document.getElementById("modal-confirm-btn").classList.remove("hidden");
    document.getElementById("modal-cancel-btn").classList.add("hidden");
    document.getElementById("modal-overlay").classList.remove("hidden");
    modalResolve = (val) => { resolve(val); modalResolve = null; };
  });
}

function showModalConfirm(message, title = "Confirmar", icon = "❓") {
  return new Promise((resolve) => {
    document.getElementById("modal-icon").textContent = icon;
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;
    document.getElementById("modal-confirm-btn").classList.remove("hidden");
    document.getElementById("modal-cancel-btn").classList.remove("hidden");
    document.getElementById("modal-overlay").classList.remove("hidden");
    modalResolve = (val) => { resolve(val); modalResolve = null; };
  });
}

function closeModal(value) {
  document.getElementById("modal-overlay").classList.add("hidden");
  if (modalResolve) {
    modalResolve(value);
    modalResolve = null;
  }
}

function closeModalOnBackdrop(event) {
  if (event.target === event.currentTarget && modalResolve) {
    // Si hay botón cancelar visible (modo confirm), cerrar = false
    const cancelBtn = document.getElementById("modal-cancel-btn");
    if (!cancelBtn.classList.contains("hidden")) {
      closeModal(false);
    } else {
      closeModal(true);
    }
  }
}

// ============================================================
// TOGGLE DE TEMA (oscuro/suave)
// ============================================================
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("theme-toggle-btn");
  const isDark = body.classList.toggle("theme-dark");
  btn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("testlab-theme", isDark ? "dark" : "light");
}

function loadThemePreference() {
  const saved = localStorage.getItem("testlab-theme");
  if (saved === "dark") {
    document.body.classList.add("theme-dark");
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.textContent = "☀️";
  }
}
