// ============================================================
// examen-main.js — Inicialización y enlace de eventos
// ============================================================

function init() {
  loadDefaultExamFiles();

  // === Navegación principal ===
  document.getElementById("go-apply-btn").addEventListener("click", () => showView("apply"));
  document.getElementById("go-edit-btn").addEventListener("click", () => showView("edit"));
  document.getElementById("back-home-from-apply").addEventListener("click", showHome);
  document.getElementById("back-home-from-edit").addEventListener("click", showHome);

  // === Carga de examen (modo aplicar) ===
  document.getElementById("load-exam-btn").addEventListener("click", () => {
    const fileInput = document.getElementById("exam-file-input");
    const file = fileInput.files[0];
    if (!file) {
      updateStatus("Selecciona un archivo JSON antes de cargarlo.", true);
      return;
    }
    loadExamFile(file, true);
  });

  // === Importar resultados ===
  document.getElementById("import-results-btn").addEventListener("click", () => {
    document.getElementById("results-file-input").click();
  });
  document.getElementById("results-file-input").addEventListener("change", handleImportedResultsSelection);
  document.getElementById("close-results-view-btn").addEventListener("click", () => {
    elements.resultsView.classList.add("hidden");
    showHome();
  });

  // === Carga de examen (modo editar) ===
  document.getElementById("load-for-edit-btn").addEventListener("click", () => {
    const fileInput = document.getElementById("edit-file-input");
    const file = fileInput.files[0];
    if (!file) {
      setEditStatus("Selecciona un archivo JSON antes de cargarlo para editar.", true);
      return;
    }
    loadExamFile(file, false);
  });

  // === Explorar carpeta ===
  document.getElementById("open-folder-btn").addEventListener("click", openFolderAndListExams);
  document.getElementById("folder-file-input").addEventListener("change", handleFolderFilesSelection);

  // === Descargas ===
  document.getElementById("download-template-btn").addEventListener("click", downloadTemplate);
  document.getElementById("download-current-btn").addEventListener("click", downloadCurrentExam);

  // === Flujo de aplicación de examen ===
  document.getElementById("continue-to-exam-btn").addEventListener("click", prepareExam);
  document.getElementById("confirm-start-btn").addEventListener("click", startExam);
  document.getElementById("submit-exam-btn").addEventListener("click", () => {
    if (confirm("¿Estás seguro de que deseas finalizar el examen?")) submitExam(false);
  });
  document.getElementById("reset-exam-btn").addEventListener("click", resetExam);
  document.getElementById("download-results-json-btn").addEventListener("click", downloadLatestResultJson);

  // === Navegación de preguntas ===
  document.getElementById("next-question-btn").addEventListener("click", () => navigatePage(1));
  document.getElementById("prev-question-btn").addEventListener("click", () => navigatePage(-1));

  // === Navegación del editor ===
  document.getElementById("next-editor-btn").addEventListener("click", () => navigateEditorPage(1));
  document.getElementById("prev-editor-btn").addEventListener("click", () => navigateEditorPage(-1));

  // === Sincronización de metadatos del editor ===
  [elements.examTitle, elements.examTime, elements.examExits,
   elements.distOM, elements.distVF, elements.distRel, elements.distOpen, elements.distMat,
   elements.ptsOM, elements.ptsVF, elements.ptsRel, elements.ptsOpen, elements.ptsMat
  ].forEach((field) => field.addEventListener("input", syncMetadata));

  // === Editor de preguntas (input/change/click) ===
  elements.questionsEditor.addEventListener("input", handleQuestionEditorInput);
  elements.questionsEditor.addEventListener("change", handleQuestionEditorInput);
  elements.questionsEditor.addEventListener("click", handleQuestionEditorClick);

  // === Anti-trampas ===
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("focus", handleWindowFocus);
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  window.addEventListener("beforeunload", (event) => {
    if (isExamActive) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  updateStatus("Inicio — Carga un examen para empezar.");
}

window.onload = init;
