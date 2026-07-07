// ============================================================
// examen-state.js — Estado global y referencias del DOM
// ============================================================

const defaultTemplate = {
  titulo: "Examen de ejemplo",
  tiempo_limite_minutos: 15,
  maximo_salidas: 3,
  puntos_distribucion: {
    opcion_multiple: 1,
    vf: 1,
    relacionar: 1,
    abierta: 1,
    matematica: 1
  },
  distribucion: {
    opcion_multiple: 2,
    vf: 1,
    relacionar: 1,
    abierta: 1
  },
  preguntas: [
    {
      id: "q1",
      tipo: "opcion_multiple",
      pregunta: "¿Quién desarrolló la teoría del psicoanálisis?",
      opciones: ["Sigmund Freud", "Carl Jung", "B.F. Skinner", "Jean Piaget"],
      respuesta_correcta: "Sigmund Freud"
    },
    {
      id: "q2",
      tipo: "vf",
      pregunta: "La conducta observable es el foco principal del conductismo.",
      respuesta_correcta: "Verdadero"
    },
    {
      id: "q3",
      tipo: "relacionar",
      pregunta: "Relaciona cada autor con su concepto clave.",
      opciones: {
        "Pavlov": "Condicionamiento clásico",
        "Piaget": "Desarrollo cognitivo",
        "Maslow": "Jerarquía de necesidades"
      }
    },
    {
      id: "q4",
      tipo: "abierta",
      pregunta: "Explica brevemente la diferencia entre refuerzo positivo y negativo."
    }
  ]
};

// --- Estado del examen ---
let currentExam = null;
let currentQuestions = [];
let studentData = { name: "", id: "" };
let timerInterval = null;
let timeLeft = 0;
let cheatCount = 0;
let isExamActive = false;
let currentPage = 0;
let currentEditorPage = 0;
const questionsPerPage = 1;
let currentExamFileName = "examen_local.json";
let blurTimeout = null;
let lastCheatTime = 0;
let currentDirectoryHandle = null;
let antiCheatBlocked = false;
let latestResultPayload = null;
let returnTimeout = null;
let examStartTime = null;
let focusTrackingElement = null;
let focusTrackingTimeout = null;
let eventLog = [];

// --- Referencias a elementos del DOM ---
const elements = {
  homeView: document.getElementById("home-view"),
  applyView: document.getElementById("apply-view"),
  editView: document.getElementById("edit-view"),
  examTitle: document.getElementById("exam-title"),
  examTime: document.getElementById("exam-time"),
  examExits: document.getElementById("exam-exits"),
  distOM: document.getElementById("dist-om"),
  distVF: document.getElementById("dist-vf"),
  distRel: document.getElementById("dist-rel"),
  distOpen: document.getElementById("dist-open"),
  distMat: document.getElementById("dist-mat"),
  ptsOM: document.getElementById("pts-om"),
  ptsVF: document.getElementById("pts-vf"),
  ptsRel: document.getElementById("pts-rel"),
  ptsOpen: document.getElementById("pts-open"),
  ptsMat: document.getElementById("pts-mat"),
  questionsEditor: document.getElementById("questions-editor-container"),
  loadMessage: document.getElementById("load-message"),
  editStatus: document.getElementById("edit-status"),
  examStatus: document.getElementById("exam-status-pill"),
  examSection: document.getElementById("exam-section"),
  examEntryView: document.getElementById("exam-entry-view"),
  examControls: document.getElementById("exam-controls"),
  examTitleDisplay: document.getElementById("exam-title-display"),
  examTimer: document.getElementById("exam-timer"),
  examStartDisplay: document.getElementById("exam-start-time"),
  cheatCounter: document.getElementById("cheat-counter"),
  examRecoveryKey: document.getElementById("exam-recovery-key"),
  recoveryKeyInput: document.getElementById("recovery-key-input"),
  recoverySubmitBtn: document.getElementById("recovery-submit-btn"),
  recoverySection: document.getElementById("recovery-section"),
  questionsPreview: document.getElementById("questions-preview"),
  blockedSection: document.getElementById("blocked-section"),
  blockedMessage: document.getElementById("blocked-message"),
  resultsView: document.getElementById("results-view"),
  resultsViewContent: document.getElementById("results-view-content"),
  resultsImportStatus: document.getElementById("results-import-status"),
  welcomeName: document.getElementById("welcome-name"),
  welcomeId: document.getElementById("welcome-id"),
  folderList: document.getElementById("folder-list")
};
