// ============================================================
// examen-data.js — Normalización de datos
// ============================================================

function normalizeExam(data) {
  let source = data || {};
  let preguntas = [];
  // Soporte para archivos que son solo una lista de preguntas (banco de preguntas)
  if (Array.isArray(source)) {
    preguntas = source;
    source = { preguntas };
  } else {
    preguntas = Array.isArray(source.preguntas) ? source.preguntas : [];
  }
  const dist = source.distribucion || {};
  const pts = source.puntos_distribucion || {};
  // Normalizar tareas
  const tareasInput = Array.isArray(source.tareas) ? source.tareas : [];
  const reglasInput = Array.isArray(source.reglas_asignacion) ? source.reglas_asignacion : [];
  return {
    titulo: source.titulo || "Examen sin título",
    tiempo_limite_minutos: Number(source.tiempo_limite_minutos || 15),
    maximo_salidas: Number(source.maximo_salidas || 3),
    puntos_distribucion: {
      opcion_multiple: Number(pts.opcion_multiple !== undefined ? pts.opcion_multiple : 1),
      vf: Number(pts.vf !== undefined ? pts.vf : 1),
      relacionar: Number(pts.relacionar !== undefined ? pts.relacionar : 1),
      abierta: Number(pts.abierta !== undefined ? pts.abierta : 1),
      matematica: Number(pts.matematica !== undefined ? pts.matematica : 1)
    },
    distribucion: {
      opcion_multiple: Number(dist.opcion_multiple !== undefined ? dist.opcion_multiple : preguntas.filter(q => q.tipo === 'opcion_multiple').length),
      vf: Number(dist.vf !== undefined ? dist.vf : preguntas.filter(q => q.tipo === 'vf').length),
      relacionar: Number(dist.relacionar !== undefined ? dist.relacionar : preguntas.filter(q => q.tipo === 'relacionar').length),
      abierta: Number(dist.abierta !== undefined ? dist.abierta : preguntas.filter(q => q.tipo === 'abierta').length),
      matematica: Number(dist.matematica !== undefined ? dist.matematica : preguntas.filter(q => q.tipo === 'matematica').length)
    },
    preguntas: preguntas.map((question, index) => normalizeQuestion(question, index)),
    tareas: tareasInput.map(t => normalizeTarea(t)),
    reglas_asignacion: reglasInput.map(r => normalizeRegla(r)),
    clave_recuperacion: source.clave_recuperacion || ""
  };
}

function normalizeQuestion(question, index) {
  const base = question || {};
  const tipo = base.tipo || "opcion_multiple";
  if (tipo === "relacionar") {
    const opciones = base.opciones && typeof base.opciones === "object" && !Array.isArray(base.opciones) ? base.opciones : {};
    return { id: base.id || `q${index + 1}`, tipo, pregunta: base.pregunta || "", opciones };
  }
  if (tipo === "opcion_multiple") {
    return { id: base.id || `q${index + 1}`, tipo, pregunta: base.pregunta || "", opciones: Array.isArray(base.opciones) ? base.opciones : [], respuesta_correcta: base.respuesta_correcta || "" };
  }
  if (tipo === "abierta") {
    return { id: base.id || `q${index + 1}`, tipo, pregunta: base.pregunta || "", respuesta_correcta: base.respuesta_correcta || "" };
  }
  if (tipo === "matematica") {
    return { id: base.id || `q${index + 1}`, tipo, pregunta: base.pregunta || "", respuesta_correcta: Number(base.respuesta_correcta || 0) };
  }
  return { id: base.id || `q${index + 1}`, tipo, pregunta: base.pregunta || "", respuesta_correcta: base.respuesta_correcta || "Verdadero" };
}

function normalizeTarea(t) {
  return {
    id: t.id || "tarea_" + Date.now(),
    nombre: t.nombre || "Tarea sin nombre",
    descripcion: t.descripcion || "",
    tipo: t.tipo || "otro",
    fecha_entrega: t.fecha_entrega || "",
    instrucciones: t.instrucciones || ""
  };
}

function normalizeRegla(r) {
  return {
    id: r.id || "regla_" + Date.now(),
    nombre: r.nombre || "Regla sin nombre",
    condiciones: Array.isArray(r.condiciones) ? r.condiciones.map(c => ({
      tipo: c.tipo || "puntaje_general",
      seccion: c.seccion || "",
      operador: c.operador || "<",
      valor: Number(c.valor || 0),
      unidad: c.unidad || "calificacion"
    })) : [],
    tareas_asignadas: Array.isArray(r.tareas_asignadas) ? r.tareas_asignadas : []
  };
}

function normalizeResultPayload(payload) {
  if (!payload || !Array.isArray(payload.questions)) return payload;
  payload.questions = payload.questions.map(q => {
    q.points = Number(q.points || 0);
    q.earnedPoints = Number(q.earnedPoints || 0);
    // Si detectamos el formato antiguo de string para relacionar, lo convertimos a objeto estructurado
    if (q.type === 'relacionar' && typeof q.studentAnswer === 'string') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = q.studentAnswer;
      const listItems = tempDiv.querySelectorAll('li');
      if (listItems.length > 0) {
        const newArray = [];
        listItems.forEach(li => {
          const text = li.textContent || "";
          const isSubCorrect = li.innerHTML.includes('✅');
          const parts = text.split('→');
          const key = (parts[0] || "").trim();
          const rest = (parts[1] || "").trim();
          let studentValue = rest.split('(Correcta:')[0].replace('✅', '').trim();
          let correctValue = isSubCorrect ? studentValue : (rest.match(/\(Correcta:\s*(.*?)\)/)?.[1] || studentValue);
          newArray.push({ key, studentValue, correctValue, isSubCorrect });
        });
        q.studentAnswer = newArray;
        q.totalPairs = newArray.length;
        q.correctCount = newArray.filter(item => item.isSubCorrect).length;
      }
    }
    // Asegurar studentAnswerDetails para relacionar (formato nuevo o convertido)
    if (q.type === 'relacionar' && !q.studentAnswerDetails) {
      if (Array.isArray(q.studentAnswer) && q.studentAnswer.length > 0) {
        q.studentAnswerDetails = q.studentAnswer;
      }
    }
    return q;
  });
  let tE = 0, tP = 0;
  payload.questions.forEach(q => { tE += q.earnedPoints; tP += q.points; });
  payload.earnedPoints = Number(tE.toFixed(2));
  payload.totalPoints = tP;
  payload.score = tP > 0 ? ((tE / tP) * 10).toFixed(1) : "0.0";
  return payload;
}

function serializeCurrentExam() {
  return {
    titulo: currentExam.titulo,
    tiempo_limite_minutos: currentExam.tiempo_limite_minutos,
    maximo_salidas: currentExam.maximo_salidas,
    puntos_distribucion: currentExam.puntos_distribucion,
    distribucion: currentExam.distribucion,
    preguntas: currentExam.preguntas,
    tareas: currentExam.tareas || [],
    reglas_asignacion: currentExam.reglas_asignacion || [],
    clave_recuperacion: currentExam.clave_recuperacion || ""
  };
}
