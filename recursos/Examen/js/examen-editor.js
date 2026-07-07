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
  const validation = validateCurrentQuestion(question);
  let extra = "";
  if (tipo === "opcion_multiple") {
    const opts = question.opciones || [];
    extra = `
      <div class="options-visual-list" data-field="options-visual" data-index="${index}">
        ${opts.map((opt, oi) => `
          <div class="option-visual-row">
            <input type="text" value="${escapeAttribute(opt)}" 
                   data-action="edit-option" data-index="${index}" data-opt-index="${oi}" 
                   onchange="handleOptionEdit(${index}, ${oi}, this.value)" placeholder="Opción ${oi + 1}"/>
            <button type="button" class="btn-remove-opt" data-action="remove-option" data-index="${index}" data-opt-index="${oi}" ${opts.length <= 1 ? 'disabled style="opacity:0.3"' : ''}>✕</button>
          </div>
        `).join('')}
        <button type="button" class="btn-add-option" data-action="add-option" data-index="${index}">+ Agregar opción</button>
      </div>
      <label class="field">
        <span>Respuesta correcta</span>
        <select data-field="respuesta_correcta" data-index="${index}">
          <option value="">-- Selecciona --</option>
          ${opts.map(o => `<option value="${escapeAttribute(o)}" ${question.respuesta_correcta === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
        </select>
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
    <article class="question-card${validation.hasWarning ? ' validation-warning' : ''}" style="border-left: 5px solid ${typeLabels[tipo].color}">
      <div class="q-top">
        <div style="font-weight: 800; font-size: 0.75rem; color: ${typeLabels[tipo].color}">${typeLabels[tipo].label} #${index + 1}</div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="reorder-btns">
            <button type="button" class="btn-reorder" onclick="moveQuestionUp(${index})" ${index === 0 ? 'disabled' : ''} title="Mover arriba">↑</button>
            <button type="button" class="btn-reorder" onclick="moveQuestionDown(${index})" ${index === currentExam.preguntas.length - 1 ? 'disabled' : ''} title="Mover abajo">↓</button>
          </span>
          <button type="button" class="ghost danger" data-action="remove-question" data-index="${index}">Eliminar</button>
        </div>
      </div>
      ${validation.hasWarning ? `<div class="validation-msg">⚠️ ${validation.message}</div>` : ""}
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

async function handleQuestionEditorClick(event) {
  const action = event.target.dataset.action;
  const index = Number(event.target.dataset.index);
  if (Number.isNaN(index)) return;
  
  if (action === "remove-question") {
    const confirmed = await showModalConfirm("¿Estás seguro de que deseas eliminar esta pregunta?", "Eliminar pregunta");
    if (!confirmed) return;
    currentExam.preguntas.splice(index, 1);
    if (currentEditorPage >= currentExam.preguntas.length && currentEditorPage > 0) {
      currentEditorPage--;
    }
    syncEditorUIPage();
    updateStatus("Pregunta eliminada.");
    setEditStatus("Pregunta eliminada.");
  } else if (action === "add-option") {
    addOptionToQuestion(index);
  } else if (action === "remove-option") {
    const optIndex = Number(event.target.dataset.optIndex);
    if (!Number.isNaN(optIndex)) removeOptionFromQuestion(index, optIndex);
  }
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

// ===== Validación visual de preguntas =====
function validateCurrentQuestion(question) {
  const result = { hasWarning: false, message: "" };
  if (!question.pregunta || question.pregunta.trim() === "" || question.pregunta === "Nueva pregunta") {
    result.hasWarning = true;
    result.message = "Falta escribir el texto de la pregunta.";
  } else if (question.tipo === "opcion_multiple") {
    const opts = question.opciones || [];
    if (opts.length < 2) {
      result.hasWarning = true;
      result.message = "Agrega al menos 2 opciones de respuesta.";
    } else if (!question.respuesta_correcta || question.respuesta_correcta.trim() === "") {
      result.hasWarning = true;
      result.message = "Selecciona la respuesta correcta.";
    }
  } else if (question.tipo === "relacionar") {
    const pairs = Object.entries(question.opciones || {});
    if (pairs.length < 2) {
      result.hasWarning = true;
      result.message = "Agrega al menos 2 pares clave=valor para relacionar.";
    }
  } else if (question.tipo === "matematica") {
    if (question.respuesta_correcta === undefined || question.respuesta_correcta === null || question.respuesta_correcta === "") {
      result.hasWarning = true;
      result.message = "Falta la respuesta numérica correcta.";
    }
  }
  return result;
}

// ===== Reordenar preguntas =====
function moveQuestionUp(index) {
  if (index <= 0) return;
  [currentExam.preguntas[index - 1], currentExam.preguntas[index]] = [currentExam.preguntas[index], currentExam.preguntas[index - 1]];
  currentEditorPage = index - 1;
  syncEditorUIPage();
  setEditStatus("Pregunta movida hacia arriba.");
}

function moveQuestionDown(index) {
  if (index >= currentExam.preguntas.length - 1) return;
  [currentExam.preguntas[index], currentExam.preguntas[index + 1]] = [currentExam.preguntas[index + 1], currentExam.preguntas[index]];
  currentEditorPage = index + 1;
  syncEditorUIPage();
  setEditStatus("Pregunta movida hacia abajo.");
}

// ===== Opciones visuales (opción múltiple) =====
function handleOptionEdit(qIndex, optIndex, value) {
  const question = currentExam.preguntas[qIndex];
  if (!question || !question.opciones) return;
  question.opciones[optIndex] = value;
  // Sincronizar respuesta correcta si coincide
  if (question.respuesta_correcta) {
    // Si la opción renombrada era la correcta, actualizarla
  }
  setEditStatus("Opción actualizada.");
}

function addOptionToQuestion(qIndex) {
  const question = currentExam.preguntas[qIndex];
  if (!question) return;
  if (!question.opciones) question.opciones = [];
  question.opciones.push(`Opción ${question.opciones.length + 1}`);
  renderQuestionsEditor();
  setEditStatus("Opción agregada.");
}

function removeOptionFromQuestion(qIndex, optIndex) {
  const question = currentExam.preguntas[qIndex];
  if (!question || !question.opciones || question.opciones.length <= 1) return;
  const removed = question.opciones[optIndex];
  question.opciones.splice(optIndex, 1);
  // Si la opción eliminada era la respuesta correcta, limpiarla
  if (question.respuesta_correcta === removed) {
    question.respuesta_correcta = "";
  } else if (question.respuesta_correcta) {
    // Ajustar si las opciones se reorganizaron
  }
  renderQuestionsEditor();
  setEditStatus("Opción eliminada.");
}

// ===== Vista previa del examen =====
function previewExam() {
  const overlay = document.createElement("div");
  overlay.className = "preview-overlay";
  overlay.id = "preview-overlay";
  
  let html = `<div class="preview-modal">
    <button class="close-preview" onclick="closePreview()">✕</button>
    <h2>👁️ Vista previa: ${escapeHtml(currentExam.titulo || "Examen sin título")}</h2>
    <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 16px;">
      ${currentExam.preguntas.length} preguntas | 
      ${currentExam.tiempo_limite_minutos || 15} min | 
      Máx. ${currentExam.maximo_salidas || 3} salidas
    </p>`;
  
  if (currentExam.preguntas.length === 0) {
    html += `<div class="preview-warning-empty">Aún no hay preguntas en el banco.</div>`;
  } else {
    currentExam.preguntas.forEach((q, i) => {
      const tipoLabels = { opcion_multiple: "Opción Múltiple", vf: "Verdadero/Falso", relacionar: "Relacionar", abierta: "Abierta", matematica: "Matemática" };
      const colores = { opcion_multiple: "#4f46e5", vf: "#06b6d4", relacionar: "#8b5cf6", abierta: "#f59e0b", matematica: "#10b981" };
      html += `<div class="preview-question">
        <div class="pq-tipo" style="color:${colores[q.tipo] || '#64748b'}">${tipoLabels[q.tipo] || q.tipo}</div>
        <div class="pq-texto">${i + 1}. ${escapeHtml(q.pregunta || "")}</div>`;
      if (q.tipo === "opcion_multiple" && q.opciones) {
        html += `<div class="pq-opciones">${q.opciones.map(o => `• ${escapeHtml(o)}`).join("<br>")}</div>`;
        if (q.respuesta_correcta) html += `<div style="font-size:0.8rem;color:#059669;margin-top:4px;">✅ Correcta: ${escapeHtml(q.respuesta_correcta)}</div>`;
      } else if (q.tipo === "vf") {
        html += `<div class="pq-opciones">• Verdadero<br>• Falso</div>`;
        if (q.respuesta_correcta) html += `<div style="font-size:0.8rem;color:#059669;margin-top:4px;">✅ Correcta: ${escapeHtml(q.respuesta_correcta)}</div>`;
      } else if (q.tipo === "relacionar" && q.opciones) {
        const pairs = Object.entries(q.opciones);
        html += `<div class="pq-opciones">${pairs.map(([k, v]) => `${escapeHtml(k)} → ${escapeHtml(v)}`).join("<br>")}</div>`;
      } else if (q.tipo === "abierta") {
        html += `<div class="pq-opciones" style="font-style:italic;">(Respuesta abierta — revisión manual)</div>`;
      } else if (q.tipo === "matematica") {
        html += `<div class="pq-opciones">Respuesta numérica${q.respuesta_correcta !== undefined ? `: ${q.respuesta_correcta}` : ""}</div>`;
      }
      html += `</div>`;
    });
  }
  
  html += `<div style="text-align:center;margin-top:16px;">
    <button class="btn-primary" onclick="closePreview()" style="padding:8px 24px;">Cerrar vista previa</button>
  </div></div>`;
  
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function closePreview() {
  const overlay = document.getElementById("preview-overlay");
  if (overlay) overlay.remove();
}
