// ============================================================
// examen-exam.js — Aplicación del examen (timer, anti-trampas,
//                   navegación, entrega)
// ============================================================

function showHome() {
  elements.homeView.classList.remove("hidden");
  elements.applyView.classList.add("hidden");
  elements.editView.classList.add("hidden");
  elements.examSection.classList.add("hidden");
  elements.resultsView.classList.add("hidden");
  showExamStage("none");
  document.getElementById("apply-selection-area").classList.remove("hidden");
  document.getElementById("apply-header").classList.remove("hidden");
  elements.blockedSection.classList.add("hidden");
}

function showView(mode) {
  elements.homeView.classList.add("hidden");
  elements.applyView.classList.toggle("hidden", mode !== "apply");
  elements.editView.classList.toggle("hidden", mode !== "edit");
  elements.examSection.classList.add("hidden");
  elements.blockedSection.classList.add("hidden");
  elements.resultsView.classList.add("hidden");
  elements.examStatus.textContent = mode === "apply" ? "Modo aplicar" : "Modo crear/editar";
}

function showExamStage(stage) {
  const welcome = document.getElementById("exam-entry-view");
  const instructions = document.getElementById("instructions-view");
  const controls = elements.examControls;
  const isWelcome = stage === "welcome";
  const isInstructions = stage === "instructions";
  const isExam = stage === "exam";

  welcome.classList.toggle("hidden", !isWelcome);
  instructions.classList.toggle("hidden", !isInstructions);
  controls.classList.toggle("hidden", !isExam);

  if (isWelcome || isInstructions || isExam) {
    document.getElementById("apply-selection-area").classList.add("hidden");
    elements.examSection.classList.remove("hidden");
  }
}

function prepareExam() {
  const name = elements.welcomeName.value.trim();
  const id = elements.welcomeId.value.trim();
  if (!name || !id) { 
    alert("⚠️ Datos incompletos: Por favor ingresa tu Nombre y Matrícula para poder iniciar el examen.");
    updateStatus("Ingresa nombre y matrícula o grupo para iniciar.", true); 
    return; 
  }
  if (!currentExam.preguntas.length) { updateStatus("El examen no tiene preguntas. Agrega o carga uno antes de iniciar.", true); return; }
  studentData = { name, id };

  document.getElementById("apply-header").classList.add("hidden");
  elements.examSection.classList.remove("hidden");
  showExamStage("instructions");
}

function startExam() {
  isExamActive = true;
  currentPage = 0;
  antiCheatBlocked = false;
  cheatCount = 0;

  currentQuestions = buildRandomQuestions();
  renderExamQuestions();
  showExamStage("exam");

  if (elements.examTitleDisplay) elements.examTitleDisplay.textContent = currentExam.titulo;
  elements.examTimer.textContent = `Tiempo restante: ${formatTime(currentExam.tiempo_limite_minutos * 60)}`;
  elements.cheatCounter.textContent = `0 / ${currentExam.maximo_salidas}`;
  
  updateNavigation();
  startTimer();
  updateStatus(`Examen listo para ${studentData.name}.`);
  elements.blockedSection.classList.add("hidden");
}

function buildRandomQuestions() {
  const pools = {
    opcion_multiple: shuffleArray(currentExam.preguntas.filter((q) => q.tipo === "opcion_multiple")),
    vf: shuffleArray(currentExam.preguntas.filter((q) => q.tipo === "vf")),
    relacionar: shuffleArray(currentExam.preguntas.filter((q) => q.tipo === "relacionar")),
    abierta: shuffleArray(currentExam.preguntas.filter((q) => q.tipo === "abierta")),
    matematica: shuffleArray(currentExam.preguntas.filter((q) => q.tipo === "matematica"))
  };
  const selected = [];
  Object.entries(currentExam.distribucion).forEach(([type, count]) => {
    const pool = pools[type] || [];
    selected.push(...pool.slice(0, Number(count) || 0));
  });
  // Retornamos el array sin barajar al final para respetar el orden de los tipos
  return selected;
}

function renderExamQuestions() {
  if (!currentQuestions.length) { elements.questionsPreview.innerHTML = '<p class="muted">No hay preguntas disponibles.</p>'; return; }
  
  let html = "";
  currentQuestions.forEach((question, index) => {
    const pageIndex = Math.floor(index / questionsPerPage);
    const isHidden = pageIndex !== currentPage ? "hidden" : "";
    
    html += `<div class="question-page ${isHidden}" data-page="${pageIndex}">`;
    html += `<div class="question-panel tipo-${question.tipo}"><strong>${index + 1}. ${escapeHtml(question.pregunta || "")}</strong>`;
    
    if (question.tipo === "opcion_multiple") {
      const options = shuffleArray(question.opciones || []);
      html += `<div class="options-list">${options.map((option) => `<label class="option-row"><input type="radio" name="q_${question.id}" value="${escapeAttribute(option)}" onchange="updateProgressBar()"/><span>${escapeHtml(option)}</span></label>`).join("")}</div>`;
    } else if (question.tipo === "vf") {
      html += `<div class="options-list"><label class="option-row"><input type="radio" name="q_${question.id}" value="Verdadero" onchange="updateProgressBar()"/><span>Verdadero</span></label><label class="option-row"><input type="radio" name="q_${question.id}" value="Falso" onchange="updateProgressBar()"/><span>Falso</span></label></div>`;
    } else if (question.tipo === "relacionar") {
      const entries = Object.entries(question.opciones || {});
      html += `<div class="options-list">${entries.map(([key]) => `<label class="field"><span>${escapeHtml(key)}</span><select name="q_${question.id}_${key}" onchange="updateProgressBar()"><option value="">-- Selecciona --</option>${shuffleArray(Object.values(question.opciones || {})).map((option) => `<option value="${escapeAttribute(option)}">${escapeHtml(option)}</option>`).join("")}</select></label>`).join("")}</div>`;
    } else if (question.tipo === "abierta") {
      html += `<textarea name="q_${question.id}" placeholder="Escribe tu respuesta aquí..." oninput="updateProgressBar()"></textarea>`;
    } else if (question.tipo === "matematica") {
      html += `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label class="field">
            <span>Resultado numérico final:</span>
            <input type="number" name="q_${question.id}" placeholder="Ej. 115" oninput="updateProgressBar()" style="max-width: 200px;"/>
          </label>
          <label class="field">
            <span>Procedimiento / Desarrollo (Opcional):</span>
            <textarea name="q_${question.id}_proc" placeholder="Describe los pasos realizados para llegar al resultado..." oninput="updateProgressBar()"></textarea>
          </label>
        </div>`;
    }
    html += `</div></div>`;
  });
  elements.questionsPreview.innerHTML = html;
  renderQuestionMap();
  updateProgressBar();
}

function renderQuestionMap() {
  const map = document.getElementById("question-map");
  if (!map) return;
  map.innerHTML = currentQuestions.map((q, i) => {
    const isAnswered = isQuestionAnswered(q);
    return `<button class="map-dot ${i === currentPage ? 'active' : ''} ${isAnswered ? 'answered' : ''} tipo-${q.tipo}" 
            onclick="goToPage(${i})" title="Pregunta ${i+1}">${i+1}</button>`;
  }).join("");
}

function goToPage(index) {
  if (index >= 0 && index < currentQuestions.length) {
    currentPage = index;
    syncUIPage();
  }
}

function navigatePage(direction) {
  goToPage(currentPage + direction);
}

function syncUIPage() {
  document.querySelectorAll(".question-page").forEach(page => {
    page.classList.toggle("hidden", parseInt(page.dataset.page) !== currentPage);
  });
  updateNavigation();
  renderQuestionMap();
  const targetY = elements.examControls.getBoundingClientRect().top + window.pageYOffset - 20;
  window.scrollTo({ top: targetY, behavior: 'smooth' });
}

function updateNavigation() {
  const totalPages = Math.ceil(currentQuestions.length / questionsPerPage);
  const isLastPage = currentPage === totalPages - 1;
  
  document.getElementById("prev-question-btn").classList.toggle("hidden", currentPage === 0);
  document.getElementById("next-question-btn").classList.toggle("hidden", isLastPage);
  document.getElementById("submit-exam-btn").classList.toggle("hidden", !isLastPage);
}

function updateProgressBar() {
  if (!isExamActive) return;
  const answeredCount = currentQuestions.filter(isQuestionAnswered).length;
  const percentage = (answeredCount / currentQuestions.length) * 100;
  document.getElementById("progress-bar").style.width = `${percentage}%`;
  renderQuestionMap();
}

function isQuestionAnswered(q) {
  if (q.tipo === "opcion_multiple" || q.tipo === "vf") {
    return Array.from(document.getElementsByName(`q_${q.id}`)).some(r => r.checked);
  } else if (q.tipo === "relacionar") {
    const selects = Array.from(document.querySelectorAll(`select[name^="q_${q.id}_"]`));
    return selects.length > 0 && selects.every(s => s.value !== "");
  } else if (q.tipo === "abierta") {
    const txt = document.getElementsByName(`q_${q.id}`)[0];
    return txt && txt.value.trim().length > 0;
  } else if (q.tipo === "matematica") {
    const input = document.getElementsByName(`q_${q.id}`)[0];
    return input && input.value.trim().length > 0;
  }
  return false;
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = currentExam.tiempo_limite_minutos * 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimerDisplay();
    if (timeLeft <= 0) { clearInterval(timerInterval); submitExam(true); }
  }, 1000);
}

function updateTimerDisplay() {
  elements.examTimer.textContent = `Tiempo restante: ${formatTime(timeLeft)}`;
}

// --- Sistema Anti-Trampas ---
function handleVisibilityChange() {
  if (!isExamActive) return;
  if (document.visibilityState === "hidden") {
    registerCheat();
  } else {
    resetCheatBlockWithDelay();
  }
}

function handleWindowBlur() {
  if (!isExamActive) return;
  const activeElement = document.activeElement;
  const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
  if (isInputFocused) {
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }
    return;
  }
  if (returnTimeout) { clearTimeout(returnTimeout); returnTimeout = null; }
  blurTimeout = setTimeout(() => {
    registerCheat();
  }, 600); 
}

function handleWindowFocus() {
  if (!isExamActive) return;
  if (blurTimeout) {
    clearTimeout(blurTimeout);
    blurTimeout = null;
  }
  resetCheatBlockWithDelay();
}

function resetCheatBlockWithDelay() {
  if (!isExamActive) return;
  if (returnTimeout) clearTimeout(returnTimeout);
  returnTimeout = setTimeout(() => {
    if (document.hasFocus() && document.visibilityState === "visible") {
      antiCheatBlocked = false;
      returnTimeout = null;
    }
  }, 2000);
}

const antiCheatInterval = setInterval(() => {
  if (!isExamActive) return;
  if (antiCheatBlocked && document.hasFocus() && document.visibilityState === "visible" && !returnTimeout) {
    resetCheatBlockWithDelay();
  }
}, 1000);

function registerCheat() {
  const now = Date.now();
  if (!isExamActive || antiCheatBlocked || (now - lastCheatTime < 2000)) return;
  
  antiCheatBlocked = true;
  lastCheatTime = now;
  cheatCount += 1;
  elements.cheatCounter.textContent = `${cheatCount} / ${currentExam.maximo_salidas}`;
  if (cheatCount >= currentExam.maximo_salidas) {
    updateStatus("Se alcanzó el límite de salidas de pantalla. El examen se está enviando.", true);
    submitExam(true);
  } else {
    updateStatus(`Advertencia: se detectó una salida de pantalla (${cheatCount} / ${currentExam.maximo_salidas}).`, true);
  }
}

// --- Entrega del examen ---
async function submitExam(isAuto) {
  if (!isExamActive) return;
  isExamActive = false;
  clearInterval(timerInterval);

  elements.applyView.classList.add("hidden");

  let earnedPoints = 0; let totalPossiblePoints = 0;
  const resultPayload = {
    type: "testlab_result",
    version: 1,
    examTitle: currentExam.titulo,
    studentName: studentData.name,
    studentId: studentData.id,
    date: "",
    attemptNumber: 0,
    score: "0.0",
    earnedPoints: 0,
    totalPoints: 0,
    cheatCount: 0,
    questions: []
  };

  currentQuestions.forEach((question, index) => {
    let studentAnswer = "Sin respuesta"; let isCorrect = false; let correctAnswerText = "";
    let correctCount = 0; let totalPairs = 0; let subdetails = []; let answerDetails = [];
    const questionValue = currentExam.puntos_distribucion[question.tipo] || 0;
    totalPossiblePoints += questionValue;

    if (question.tipo === "opcion_multiple" || question.tipo === "vf") {
      const radios = document.getElementsByName(`q_${question.id}`);
      const selected = Array.from(radios).find(r => r.checked);
      const rawAns = selected ? selected.value : "Sin respuesta";
      studentAnswer = escapeHtml(rawAns);
      isCorrect = String(rawAns) === String(question.respuesta_correcta);
      correctAnswerText = question.respuesta_correcta || "";
      if (isCorrect) earnedPoints += questionValue;
    } else if (question.tipo === "relacionar") {
      const entries = Object.entries(question.opciones || {});
      totalPairs = entries.length;
      correctCount = 0; subdetails = [];
      const wrongAnswers = [];
      entries.forEach(([key, correctValue]) => {
        const selects = document.getElementsByName(`q_${question.id}_${key}`);
        const select = selects[0];
        const selectedValue = select ? select.value : "";
        const subCorrect = selectedValue === correctValue;
        if (subCorrect) correctCount += 1;
        else wrongAnswers.push({ key, correctValue });
        answerDetails.push({
          key,
          studentValue: selectedValue || "Sin respuesta",
          correctValue,
          isSubCorrect: subCorrect
        });
        subdetails.push(`<li style="margin-bottom: 6px; page-break-inside: avoid;">` +
          `<span style="color: #64748b; font-weight: 700;">${escapeHtml(key)}</span> &rarr; ` +
          `<span style="color: #000000; font-weight: 800;">${escapeHtml(selectedValue || "Sin respuesta")}</span> ` +
          `${subCorrect ? '<span style="color: #16a34a; font-weight: 800;">✅</span>' : `<span style="color: #2563eb; font-weight: 700;">(Correcta: ${escapeHtml(correctValue)})</span>`}` +
        `</li>`);
      });
      const earnedRelationPoints = totalPairs > 0 ? (correctCount / totalPairs) * questionValue : 0;
      earnedPoints += earnedRelationPoints;
      studentAnswer = `<div style="page-break-inside: avoid;"><div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Aciertos: ${correctCount}/${totalPairs}</div><ul style="margin: 0; padding-left: 20px; list-style-type: disc; page-break-inside: avoid;">${subdetails.join("")}</ul></div>`;
      isCorrect = correctCount === totalPairs ? true : (correctCount > 0 ? null : false);
      correctAnswerText = wrongAnswers.length > 0
        ? wrongAnswers.map(({ key, correctValue }) => `${key} → ${correctValue}`).join("\n")
        : "Todas las respuestas fueron correctas.";
    } else if (question.tipo === "abierta") {
      const textareas = document.getElementsByName(`q_${question.id}`);
      const textarea = textareas[0];
      const rawValue = textarea ? (textarea.value.trim() || "Sin respuesta") : "Sin respuesta";
      studentAnswer = escapeHtml(rawValue).replace(/\n/g, "<br>");
      const expectedAnswer = question.respuesta_correcta || "Sin guía de respuesta cargada.";
      isCorrect = null; correctAnswerText = expectedAnswer;
    } else if (question.tipo === "matematica") {
      const input = document.getElementsByName(`q_${question.id}`)[0];
      const procInput = document.getElementsByName(`q_${question.id}_proc`)[0];
      const numVal = input ? (input.value.trim() || "Sin valor") : "Sin valor";
      const procVal = procInput ? (procInput.value.trim() || "Sin procedimiento") : "Sin procedimiento";
      studentAnswer = `<div style="page-break-inside: avoid;"><b>Resultado:</b> ${escapeHtml(numVal)}<br><b>Procedimiento:</b><br><i style="font-size: 12px; color: #475569;">${escapeHtml(procVal).replace(/\n/g, "<br>")}</i></div>`;
      const studentNum = parseFloat(numVal);
      const correctNum = parseFloat(question.respuesta_correcta);
      isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) < 0.0001;
      correctAnswerText = question.respuesta_correcta || "";
      if (isCorrect) earnedPoints += questionValue;
    }

    const isPartialRelation = question.tipo === "relacionar" && isCorrect === null;
    let badge = "⏳ Pendiente"; if (isCorrect === true) badge = "✅ Correcto"; else if (isCorrect === false) badge = "❌ Incorrecto"; else if (isPartialRelation) badge = "🟡 Parcial";

    const earnedQuestionPoints = question.tipo === "relacionar"
      ? (questionValue > 0 && typeof isCorrect === "boolean"
        ? (isCorrect ? questionValue : 0)
        : (isCorrect === null ? (questionValue * (correctCount / Math.max(1, totalPairs || 1))) : 0))
      : (isCorrect === true ? questionValue : 0);

    resultPayload.questions.push({
      index: index + 1,
      question: question.pregunta || "",
      type: question.tipo,
      points: questionValue,
      earnedPoints: earnedQuestionPoints,
      studentAnswer: studentAnswer,
      correctAnswer: correctAnswerText,
      status: badge,
      isCorrect: isCorrect === true ? true : (isCorrect === false ? false : null),
      partial: isPartialRelation,
      correctCount: typeof correctCount === "number" ? correctCount : null,
      totalPairs: typeof totalPairs === "number" ? totalPairs : null,
      studentAnswerDetails: question.tipo === "relacionar" ? answerDetails : undefined
    });
  });

  const finalGrade = totalPossiblePoints > 0 ? ((earnedPoints / totalPossiblePoints) * 10).toFixed(1) : "0.0";
  resultPayload.score = finalGrade;
  resultPayload.earnedPoints = earnedPoints;
  resultPayload.totalPoints = totalPossiblePoints;
  resultPayload.cheatCount = cheatCount;

  const attempts = JSON.parse(localStorage.getItem(`exam_attempts_${currentExam.titulo}`) || "[]");
  const attemptNumber = attempts.length + 1;
  const now = new Date();
  const dateString = now.toLocaleDateString("es-MX") + " " + now.toLocaleTimeString("es-MX");
  resultPayload.date = dateString;
  resultPayload.attemptNumber = attemptNumber;
  attempts.push({ date: dateString, score: finalGrade });
  localStorage.setItem(`exam_attempts_${currentExam.titulo}`, JSON.stringify(attempts));

  // --- Evaluar reglas de tareas ---
  resultPayload.tareas_asignadas = evaluarReglasTareas(currentExam, resultPayload);

  latestResultPayload = resultPayload;

  const reportHtml = buildPrintableReport(resultPayload);
  document.getElementById("print-area").innerHTML = reportHtml;
  document.getElementById("pdf-content").innerHTML = reportHtml;
  showBlockedScreen(
    isAuto
      ? "El examen se cerró automáticamente por tiempo o por exceso de salidas de pantalla."
      : "El examen fue finalizado correctamente. El comprobante PDF se descargó automáticamente.",
    reportHtml
  );
  await exportToPdf(`${studentData.name.replace(/\s+/g, "_") || "estudiante"}_resultado.pdf`);
}

function showBlockedScreen(message, reportHtml = "") {
  elements.examControls.classList.add("hidden");
  elements.blockedSection.classList.remove("hidden");
  
  let content = `<p>${message}</p>`;
  if (latestResultPayload) {
    content += `<div style="margin: 20px 0; text-align: center;">
                  <button id="manual-pdf-btn" style="background: var(--primary); color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                    📥 Descargar Comprobante PDF
                  </button>
                </div>`;
  }

  if (reportHtml) {
    content += `<div class="visual-report-preview" style="margin-top: 30px; border-top: 2px solid var(--border); padding-top: 20px; overflow-x: auto;">
                  <h3 style="text-align: center; color: var(--primary); margin-bottom: 20px;">Resumen de tu Evaluación</h3>
                  ${reportHtml}
                </div>`;
  }

  elements.blockedMessage.innerHTML = content;

  const btn = document.getElementById("manual-pdf-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      const filename = `${studentData.name.replace(/\s+/g, "_") || "estudiante"}_resultado.pdf`;
      exportToPdf(filename);
    });
  }

  elements.examSection.classList.remove("hidden");
}

function resetExam() {
  elements.welcomeName.value = "";
  elements.welcomeId.value = "";
  elements.blockedSection.classList.add("hidden");
  elements.questionsPreview.innerHTML = "";
  showHome();
  updateStatus("Listo para un nuevo intento.");
  clearInterval(timerInterval);
  isExamActive = false;
  cheatCount = 0;
  antiCheatBlocked = false;
}
