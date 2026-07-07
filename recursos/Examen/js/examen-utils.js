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

function downloadJsonFile(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
