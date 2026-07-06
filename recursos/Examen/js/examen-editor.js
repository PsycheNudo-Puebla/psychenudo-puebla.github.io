// ============================================================
// examen-editor.js — Modo crear/editar examen
// ============================================================

function populateEditor() {
  elements.examTitle.value = currentExam.titulo || "";
  elements.examTime.value = currentExam.tiempo_limite_minutos || 15;
  elements.examExits.value = currentExam.maximo_salidas || 3;
  elements.distOM.value = currentExam.distribucion.opcion_multiple || 0;
  elements.distVF.value = currentExam.distribucion.vf || 0;
  elements.distRel.value = currentExam.distribucion.relacionar || 0;
  elements.distOpen.value = currentExam.distribucion.abierta || 0;
  elements.distMat.value = currentExam.distribucion.matematica || 0;
  elements.ptsOM.value = currentExam.puntos_distribucion.opcion_multiple || 1;
  elements.ptsVF.value = currentExam.puntos_distribucion.vf || 1;
  elements.ptsRel.value = currentExam.puntos_distribucion.relacionar || 1;
  elements.ptsOpen.value = currentExam.puntos_distribucion.abierta || 1;
  elements.ptsMat.value = currentExam.puntos_distribucion.matematica || 1;
  elements.examTitleDisplay.textContent = currentExam.titulo || "Examen";
  renderQuestionsEditor();
  renderTasksEditor();
  renderRulesEditor();
  currentEditorPage = 0;
  syncEditorUIPage();
}

function renderQuestionsEditor() {
  const typeLabels = {
    opcion_multiple: { label: "OPCIÓN MÚLTIPLE", color: "#4f46e5" },
    vf: { label: "VERDADERO/FALSO", color: "#06b6d4" },
    relacionar: { label: "RELACIONAR", color: "#8b5cf6" },
    abierta: { label: "ABIERTA", color: "#f59e0b" },
    matematica: { label: "MATEMÁTICA", color: "#10b981" }
  };

  const editorContainer = document.getElementById("questions-editor-container");
  if (!editorContainer) return;

  if (!currentExam.preguntas.length) {
    editorContainer.innerHTML = '<p class="muted">Aún no hay preguntas. Agrega una para comenzar.</p>';
    document.getElementById("editor-question-map").innerHTML = '';
    updateEditorNavigation();
    return;
  }

  const question = currentExam.preguntas[currentEditorPage];
  const index = currentEditorPage;
  const tipo = question.tipo || "opcion_multiple";
  let extra = "";
  if (tipo === "opcion_multiple") {
    extra = `
      <label class="field">
        <span>Opciones (una por línea)</span>
        <textarea data-field="opciones" data-index="${index}">${(question.opciones || []).join("\n")}</textarea>
      </label>
      <label class="field">
        <span>Respuesta correcta</span>
        <input data-field="respuesta_correcta" data-index="${index}" value="${escapeAttribute(question.respuesta_correcta || "")}" />
      </label>`;
  } else if (tipo === "vf") {
    extra = `
      <label class="field">
        <span>Respuesta correcta</span>
        <select data-field="respuesta_correcta" data-index="${index}">
          <option value="Verdadero" ${question.respuesta_correcta === "Verdadero" ? "selected" : ""}>Verdadero</option>
          <option value="Falso" ${question.respuesta_correcta === "Falso" ? "selected" : ""}>Falso</option>
        </select>
      </label>`;
  } else if (tipo === "relacionar") {
    const relaciones = Object.entries(question.opciones || {}).map(([key, value]) => `${key}=${value}`).join("\n");
    extra = `
      <label class="field">
        <span>Relaciones (clave=valor, una por línea)</span>
        <textarea data-field="relaciones" data-index="${index}">${relaciones}</textarea>
      </label>`;
  } else if (tipo === "abierta") {
    extra = `
      <label class="field">
        <span>Respuesta esperada / Guía de calificación</span>
        <textarea data-field="respuesta_correcta" data-index="${index}">${escapeAttribute(question.respuesta_correcta || "")}</textarea>
      </label>`;
  } else if (tipo === "matematica") {
    extra = `
      <label class="field">
        <span>Respuesta correcta (numérica)</span>
        <input type="number" data-field="respuesta_correcta" data-index="${index}" value="${escapeAttribute(question.respuesta_correcta || 0)}" />
      </label>`;
  }
  editorContainer.innerHTML = `
    <article class="question-card" style="border-left: 5px solid ${typeLabels[tipo].color}">
      <div class="q-top">
        <div style="font-weight: 800; font-size: 0.75rem; color: ${typeLabels[tipo].color}">${typeLabels[tipo].label} #${index + 1}</div>
        <button type="button" class="ghost danger" data-action="remove-question" data-index="${index}">Eliminar</button>
      </div>
      <label class="field">
        <span>Texto de la pregunta</span>
        <textarea data-field="pregunta" data-index="${index}">${escapeAttribute(question.pregunta || "")}</textarea>
      </label>
      <label class="field">
        <span>Tipo</span>
        <select data-field="tipo" data-index="${index}">
          <option value="opcion_multiple" ${tipo === "opcion_multiple" ? "selected" : ""}>Opción múltiple</option>
          <option value="vf" ${tipo === "vf" ? "selected" : ""}>Verdadero/Falso</option>
          <option value="relacionar" ${tipo === "relacionar" ? "selected" : ""}>Relacionar</option>
          <option value="abierta" ${tipo === "abierta" ? "selected" : ""}>Abierta</option>
          <option value="matematica" ${tipo === "matematica" ? "selected" : ""}>Matemática</option>
        </select>
      </label>
      ${extra}
    </article>`;
  updateEditorNavigation();
  renderEditorQuestionMap();
}

function renderEditorQuestionMap() {
  const map = document.getElementById("editor-question-map");
  if (!map) return;
  map.innerHTML = currentExam.preguntas.map((q, i) => {
    return `<button class="map-dot ${i === currentEditorPage ? 'active' : ''} tipo-${q.tipo} answered" 
            onclick="goToEditorPage(${i})" title="Pregunta ${i+1}">${i+1}</button>`;
  }).join("");
}

function goToEditorPage(index) {
  if (index >= 0 && index < currentExam.preguntas.length) {
    currentEditorPage = index;
    syncEditorUIPage();
  }
}

function navigateEditorPage(direction) {
  goToEditorPage(currentEditorPage + direction);
}

function syncEditorUIPage() {
  renderQuestionsEditor();
  updateEditorNavigation();
  renderEditorQuestionMap();
}

function updateEditorNavigation() {
  const totalQuestions = currentExam.preguntas.length;
  document.getElementById("prev-editor-btn").classList.toggle("hidden", currentEditorPage === 0 || totalQuestions === 0);
  document.getElementById("next-editor-btn").classList.toggle("hidden", currentEditorPage === totalQuestions - 1 || totalQuestions === 0);
}

function syncMetadata() {
  currentExam.titulo = elements.examTitle.value.trim() || "Examen sin título";
  currentExam.tiempo_limite_minutos = Number(elements.examTime.value || 15);
  currentExam.maximo_salidas = Number(elements.examExits.value || 3);
  currentExam.puntos_distribucion = {
    opcion_multiple: Number(elements.ptsOM.value || 0),
    vf: Number(elements.ptsVF.value || 0),
    relacionar: Number(elements.ptsRel.value || 0),
    abierta: Number(elements.ptsOpen.value || 0),
    matematica: Number(elements.ptsMat.value || 0)
  };
  currentExam.distribucion = {
    opcion_multiple: Number(elements.distOM.value || 0),
    vf: Number(elements.distVF.value || 0),
    relacionar: Number(elements.distRel.value || 0),
    abierta: Number(elements.distOpen.value || 0),
    matematica: Number(elements.distMat.value || 0)
  };
  elements.examTitleDisplay.textContent = currentExam.titulo;
  updateStatus("Cambios guardados en la configuración del examen.");
  setEditStatus("Cambios guardados en la configuración del examen.");
}

function handleQuestionEditorInput(event) {
  const target = event.target;
  const field = target.dataset.field;
  const index = Number(target.dataset.index);
  if (!field || Number.isNaN(index)) return;
  const question = currentExam.preguntas[index];
  if (!question) return;
  if (field === "pregunta") {
    question.pregunta = target.value;
  } else if (field === "tipo") {
    question.tipo = target.value;
    if (question.tipo === "opcion_multiple") { question.opciones = question.opciones || []; question.respuesta_correcta = question.respuesta_correcta || ""; }
    else if (question.tipo === "vf") { question.respuesta_correcta = question.respuesta_correcta || "Verdadero"; question.opciones = undefined; }
    else if (question.tipo === "relacionar") { question.opciones = question.opciones && typeof question.opciones === "object" && !Array.isArray(question.opciones) ? question.opciones : {}; }
    else if (question.tipo === "abierta") { delete question.opciones; question.respuesta_correcta = question.respuesta_correcta || ""; }
    renderQuestionsEditor();
  } else if (field === "respuesta_correcta") {
    if (question.tipo === "matematica") question.respuesta_correcta = Number(target.value);
    else question.respuesta_correcta = target.value;
  } else if (field === "opciones") {
    question.opciones = target.value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  } else if (field === "relaciones") {
    const map = {};
    target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) map[key.trim()] = rest.join("=").trim();
    });
    question.opciones = map;
  }
  updateStatus("Pregunta actualizada.");
  setEditStatus("Pregunta actualizada.");
}

function handleQuestionEditorClick(event) {
  if (event.target.dataset.action !== "remove-question") return;
  const index = Number(event.target.dataset.index);
  if (Number.isNaN(index)) return;
  if (!confirm("¿Estás seguro de que deseas eliminar esta pregunta?")) return;
  currentExam.preguntas.splice(index, 1);
  if (currentEditorPage >= currentExam.preguntas.length && currentEditorPage > 0) {
    currentEditorPage--;
  }
  syncEditorUIPage();
  updateStatus("Pregunta eliminada.");
  setEditStatus("Pregunta eliminada.");
}

function addQuestion(tipo = "opcion_multiple") {
  const base = { id: `q${Date.now()}`, tipo, pregunta: "Nueva pregunta" };
  if (tipo === "opcion_multiple") { 
    base.opciones = ["Opción A", "Opción B", "Opción C"]; base.respuesta_correcta = "Opción A"; 
  } else if (tipo === "vf") { 
    base.respuesta_correcta = "Verdadero"; 
  } else if (tipo === "relacionar") { 
    base.opciones = { "Elemento 1": "Valor 1" }; 
  } else if (tipo === "abierta") {
    base.respuesta_correcta = "";
  } else if (tipo === "matematica") { 
    base.respuesta_correcta = 0; 
  }
  currentExam.preguntas.push(base);
  currentEditorPage = currentExam.preguntas.length - 1;
  syncEditorUIPage();
  updateStatus("Se añadió una nueva pregunta al banco.");
  setEditStatus("Se añadió una nueva pregunta al banco.");
}
