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
