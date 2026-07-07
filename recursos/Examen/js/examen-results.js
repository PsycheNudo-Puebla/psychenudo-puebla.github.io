// ============================================================
// examen-results.js — Importación, visualización y edición
//                     de resultados
// ============================================================

function renderImportedResults(resultPayload) {
  const container = elements.resultsViewContent;
  container.innerHTML = "";

  const { examTitle, studentName, studentId, date, attemptNumber, score, earnedPoints, totalPoints, cheatCount, questions, tareas_asignadas } = resultPayload;
  const displayScore = score || (totalPoints > 0 ? ((earnedPoints / totalPoints) * 10).toFixed(1) : "0.0");

  let html = `
    <div class="results-header">
      <h2>${escapeHtml(examTitle)} — Resultados</h2>
      <p><strong>Estudiante:</strong> ${escapeHtml(studentName)} | <strong>ID:</strong> ${escapeHtml(studentId)}</p>
      <p><strong>Fecha:</strong> ${date} | <strong>Intento:</strong> #${attemptNumber}</p>
      <p><strong>Salidas de pantalla:</strong> ${cheatCount}</p>
      <div class="results-summary">
        <div class="result-stat primary">
          <span class="num">${displayScore}</span>
          <span class="label">Calificación /10</span>
        </div>
        <div class="result-stat">
          <span class="num">${earnedPoints}/${totalPoints}</span>
          <span class="label">Puntaje</span>
        </div>
      </div>
    </div>`;

  // Mostrar tareas asignadas si existen
  if (tareas_asignadas && tareas_asignadas.length > 0) {
    html += `
      <div class="results-section">
        <h3>📋 Tareas Asignadas</h3>
        <div class="tasks-assigned-list">
          ${tareas_asignadas.map(t => `
            <div class="task-assigned-card">
              <div class="task-assigned-name">${escapeHtml(t.nombre)}</div>
              ${t.fecha_entrega ? `<div class="task-assigned-date">📅 ${escapeHtml(t.fecha_entrega)}</div>` : ''}
              <div class="task-assigned-desc">${escapeHtml(t.descripcion || '')}</div>
              ${t.instrucciones ? `<div class="task-assigned-inst">📝 ${escapeHtml(t.instrucciones)}</div>` : ''}
              ${t.regla_que_asigno ? `<div class="task-assigned-rule">Asignada por: ${escapeHtml(t.regla_que_asigno)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  // Listado de preguntas con campos editables de calificación
  html += `<div class="results-section"><h3>Preguntas</h3>`;
  
  questions.forEach((q, index) => {
    const statusColor = q.status.includes("✅") ? "var(--success)" : q.status.includes("❌") ? "var(--danger)" : "var(--warning)";
    html += `
      <div class="result-question" data-index="${index}">
        <div class="result-q-header">
          <span>Pregunta ${index + 1} (${q.points || 0} pts) — <span style="color:${statusColor}">${q.status}</span></span>
          <span class="result-q-type">${q.type}</span>
        </div>
        <div class="result-q-text">${escapeHtml(q.question || "")}</div>
        <div class="result-q-answer">
          <label>Respuesta del alumno:</label>
          <div>${q.studentAnswer || "Sin respuesta"}</div>
        </div>
        ${q.type !== "relacionar" ? `
        <div class="result-q-correct">
          <label>Respuesta correcta / Guía:</label>
          <div>${escapeHtml(String(q.correctAnswer || ""))}</div>
        </div>` : ""}
        <div class="result-q-grade">
          <label>Puntos obtenidos:</label>
          <input type="number" class="grade-input" value="${q.earnedPoints ?? 0}" min="0" step="0.5" data-index="${index}" />
          <span> / ${q.points || 0}</span>
        </div>
      </div>`;
  });

  html += `</div>`;
  html += `
    <div class="results-actions">
      <button onclick="saveManualGrades()" class="btn-primary">💾 Guardar calificaciones editadas</button>
      <button onclick="exportUpdatedPdf()" class="btn-secondary">📥 Exportar PDF actualizado</button>
    </div>`;

  container.innerHTML = html;
  // Ocultar las demás vistas y mostrar solo resultados
  elements.homeView.classList.add("hidden");
  elements.applyView.classList.add("hidden");
  elements.editView.classList.add("hidden");
  elements.resultsView.classList.remove("hidden");
}

function updateQuestionGrade(index, newPoints) {
  const q = latestResultPayload.questions[index];
  if (!q) return;
  const oldEarned = q.earnedPoints || 0;
  q.earnedPoints = parseFloat(newPoints) || 0;
  latestResultPayload.earnedPoints += (q.earnedPoints - oldEarned);
  if (latestResultPayload.totalPoints > 0) {
    latestResultPayload.score = ((latestResultPayload.earnedPoints / latestResultPayload.totalPoints) * 10).toFixed(1);
  }
  elements.globalScoreDisplay.textContent = latestResultPayload.score;
  if (elements.resultsScoreDisplay) {
    elements.resultsScoreDisplay.textContent = `${latestResultPayload.earnedPoints} / ${latestResultPayload.totalPoints}`;
  }
}

async function saveManualGrades() {
  const inputs = document.querySelectorAll(".grade-input");
  inputs.forEach(input => {
    const index = parseInt(input.dataset.index);
    const newVal = input.value;
    if (!isNaN(index) && newVal !== "") {
      latestResultPayload.questions[index].earnedPoints = parseFloat(newVal) || 0;
    }
  });
  // Recalcular total
  let total = 0;
  latestResultPayload.questions.forEach(q => { total += q.earnedPoints || 0; });
  latestResultPayload.earnedPoints = total;
  if (latestResultPayload.totalPoints > 0) {
    latestResultPayload.score = ((total / latestResultPayload.totalPoints) * 10).toFixed(1);
  }

  // Re-evaluar reglas de tareas si los datos del examen están disponibles en el payload
  const examData = construirExamDesdePayload(latestResultPayload);
  if (examData) {
    latestResultPayload.tareas_asignadas = evaluarReglasTareas(examData, latestResultPayload);
  }

  // Esperar a que el usuario cierre el modal antes de re-renderizar
  await showModalAlert("El total y las tareas asignadas se han recalculado.", "Calificaciones guardadas", "✅");
  renderImportedResults(latestResultPayload);
}

/**
 * Reconstruye un objeto exam (con tareas y reglas) a partir del payload de resultados.
 * Esto permite re-evaluar las reglas de asignación cuando se modifican las calificaciones.
 */
function construirExamDesdePayload(payload) {
  if (!payload) return null;
  const tareas = payload.examTareas;
  const reglas = payload.examReglasAsignacion;
  if (!Array.isArray(tareas) || !Array.isArray(reglas)) return null;
  if (tareas.length === 0 && reglas.length === 0) return null;
  return { tareas, reglas_asignacion: reglas };
}

function exportUpdatedPdf() {
  if (!latestResultPayload) return;
  saveManualGrades();
  const filename = `${latestResultPayload.studentName.replace(/\s+/g, "_")}_resultado_actualizado.pdf`;
  exportToPdf(filename);
}
