// ============================================================
// examen-tasks.js — Sistema de Tareas y Reglas de Asignación
//                   (Editor UI + Evaluación de reglas)
// ============================================================

// --- Editor: renderizar tareas ---
function renderTasksEditor() {
  const container = document.getElementById("tasks-editor-container");
  if (!container) return;
  
  const tareas = currentExam.tareas || [];
  
  let html = `<div class="tasks-editor-section">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: var(--primary);">📋 Tareas</h3>
      <button onclick="addTask()" class="btn-primary" style="padding: 6px 16px; font-size: 13px;">+ Agregar Tarea</button>
    </div>`;
  
  if (tareas.length === 0) {
    html += `<p class="muted" style="text-align: center; padding: 20px;">No hay tareas definidas. Crea una tarea para asignarla mediante reglas.</p>`;
  } else {
    tareas.forEach((tarea, index) => {
      html += `
        <div class="task-card" data-task-index="${index}">
          <div class="task-card-header">
            <input type="text" class="task-input-name" value="${escapeAttribute(tarea.nombre || '')}" 
                   placeholder="Nombre de la tarea" 
                   onchange="handleTaskEditorInput(${index}, 'nombre', this.value)" />
            <button class="btn-danger-small" onclick="removeTask(${index})" title="Eliminar tarea">✕</button>
          </div>
          <div class="task-card-body">
            <label>Descripción:</label>
            <textarea class="task-input-desc" rows="2" placeholder="Describe qué debe hacer el alumno..."
              onchange="handleTaskEditorInput(${index}, 'descripcion', this.value)">${escapeHtml(tarea.descripcion || '')}</textarea>
            
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <label style="flex: 1; min-width: 150px;">
                Tipo:
                <select class="task-input-tipo" onchange="handleTaskEditorInput(${index}, 'tipo', this.value)">
                  <option value="tarea" ${tarea.tipo === 'tarea' ? 'selected' : ''}>Tarea</option>
                  <option value="investigacion" ${tarea.tipo === 'investigacion' ? 'selected' : ''}>Investigación</option>
                  <option value="lectura" ${tarea.tipo === 'lectura' ? 'selected' : ''}>Lectura</option>
                  <option value="ejercicio" ${tarea.tipo === 'ejercicio' ? 'selected' : ''}>Ejercicio</option>
                  <option value="practica" ${tarea.tipo === 'practica' ? 'selected' : ''}>Práctica</option>
                  <option value="otro" ${tarea.tipo === 'otro' ? 'selected' : ''}>Otro</option>
                </select>
              </label>
              <label style="flex: 1; min-width: 150px;">
                Fecha de entrega:
                <input type="date" class="task-input-date" value="${tarea.fecha_entrega || ''}" 
                       onchange="handleTaskEditorInput(${index}, 'fecha_entrega', this.value)" />
              </label>
            </div>
            
            <label>Instrucciones adicionales:</label>
            <textarea class="task-input-inst" rows="2" placeholder="Instrucciones específicas, recursos, etc."
              onchange="handleTaskEditorInput(${index}, 'instrucciones', this.value)">${escapeHtml(tarea.instrucciones || '')}</textarea>
          </div>
        </div>`;
    });
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

function handleTaskEditorInput(index, field, value) {
  if (!currentExam.tareas) currentExam.tareas = [];
  if (!currentExam.tareas[index]) {
    currentExam.tareas[index] = { id: Date.now() + '_' + index, nombre: '', descripcion: '', tipo: 'tarea', fecha_entrega: '', instrucciones: '' };
  }
  currentExam.tareas[index][field] = value;
  setEditStatus("Tarea actualizada.");
}

function addTask() {
  if (!currentExam.tareas) currentExam.tareas = [];
  const newId = Date.now();
  currentExam.tareas.push({
    id: newId,
    nombre: "Nueva tarea",
    descripcion: "",
    tipo: "tarea",
    fecha_entrega: "",
    instrucciones: ""
  });
  renderTasksEditor();
  renderRulesEditor(); // Actualizar selectores de tareas en reglas
  setEditStatus("Tarea agregada. Personaliza los campos.");
}

function removeTask(index) {
  if (!currentExam.tareas || !currentExam.tareas[index]) return;
  if (!confirm(`¿Eliminar la tarea "${currentExam.tareas[index].nombre || 'Sin nombre'}"?`)) return;
  currentExam.tareas.splice(index, 1);
  // Limpiar referencias en reglas
  if (currentExam.reglas_asignacion) {
    currentExam.reglas_asignacion.forEach(regla => {
      if (regla.tareas_asignadas) {
        // Nota: los IDs pueden reusarse, pero es seguro limpiar
      }
    });
  }
  renderTasksEditor();
  renderRulesEditor();
  setEditStatus("Tarea eliminada.");
}

// --- Editor: renderizar reglas de asignación ---
function renderRulesEditor() {
  const container = document.getElementById("rules-editor-container");
  if (!container) return;
  
  const reglas = currentExam.reglas_asignacion || [];
  const tareasDisponibles = currentExam.tareas || [];
  
  let html = `<div class="rules-editor-section">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: var(--primary);">⚙️ Reglas de Asignación</h3>
      <button onclick="addRule()" class="btn-primary" style="padding: 6px 16px; font-size: 13px;">+ Agregar Regla</button>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">
      Las reglas determinan qué tareas se asignan según la calificación del alumno.
      Puedes crear frases como <em>"Si la calificación global es mayor o igual a 6, asignar Tarea A"</em>.
    </p>`;
  
  if (reglas.length === 0) {
    html += `<p class="muted" style="text-align: center; padding: 20px;">No hay reglas definidas. Crea una regla para asignar tareas automáticamente.</p>`;
  } else {
    reglas.forEach((regla, rIndex) => {
      const condiciones = regla.condiciones || [];
      
      html += `
        <div class="rule-card" data-rule-index="${rIndex}">
          <div class="rule-card-header">
            <input type="text" class="rule-input-name" value="${escapeAttribute(regla.nombre || '')}" 
                   placeholder="Nombre de la regla (ej. 'Aprobado')"
                   onchange="handleRuleInput(${rIndex}, 'nombre', this.value)" />
            <button class="btn-danger-small" onclick="removeRule(${rIndex})" title="Eliminar regla">✕</button>
          </div>
          
          <div class="rule-conditions-sentences">`;

      // Renderizar condiciones como oraciones en lenguaje natural
      if (condiciones.length === 0) {
        html += `<p class="muted" style="font-size: 12px; font-style: italic; margin: 8px 0;">Sin condiciones — la regla siempre se aplica.</p>`;
      } else {
        condiciones.forEach((cond, cIndex) => {
          const conjuncion = cIndex === 0 ? "SI" : "Y además";
          const tipoLabel = cond.tipo === 'seccion' 
            ? `la sección de <strong>${seccionLabel(cond.seccion)}</strong>`
            : "la calificación global";
          const operLabel = operadorLabel(cond.operador);
          const unidadLabel = cond.unidad === 'puntos' ? `puntos (máx. ${cond.valor})` : "10";
          
          html += `
            <div class="condition-sentence" data-cond-index="${cIndex}">
              <span class="cond-conjunction ${cIndex === 0 ? 'cond-si' : 'cond-y'}">${conjuncion}</span>
              <div class="cond-controls">
                <select class="cond-tipo" onchange="handleRuleConditionInput(${rIndex}, ${cIndex}, 'tipo', this.value)" title="Tipo de condición">
                  <option value="porcentaje_global" ${cond.tipo === 'porcentaje_global' ? 'selected' : ''}>calificación global</option>
                  <option value="seccion" ${cond.tipo === 'seccion' ? 'selected' : ''}>sección específica</option>
                </select>
                <span class="cond-es">es</span>
                <select class="cond-operador" onchange="handleRuleConditionInput(${rIndex}, ${cIndex}, 'operador', this.value)">
                  <option value=">=" ${cond.operador === '>=' ? 'selected' : ''}>mayor o igual a</option>
                  <option value=">" ${cond.operador === '>' ? 'selected' : ''}>mayor que</option>
                  <option value="<=" ${cond.operador === '<=' ? 'selected' : ''}>menor o igual a</option>
                  <option value="<" ${cond.operador === '<' ? 'selected' : ''}>menor que</option>
                  <option value="==" ${cond.operador === '==' ? 'selected' : ''}>igual a</option>
                </select>
                <input type="number" class="cond-valor" value="${cond.valor || 0}" min="0" max="100" step="0.5"
                       placeholder="Valor" style="width: 60px;"
                       onchange="handleRuleConditionInput(${rIndex}, ${cIndex}, 'valor', parseFloat(this.value) || 0)" />
                <select class="cond-unidad" onchange="handleRuleConditionInput(${rIndex}, ${cIndex}, 'unidad', this.value)">
                  <option value="porcentaje" ${cond.unidad === 'porcentaje' ? 'selected' : ''}>de 10</option>
                  <option value="puntos" ${cond.unidad === 'puntos' ? 'selected' : ''}>puntos</option>
                </select>
                <button class="btn-danger-small cond-remove" onclick="removeRuleCondition(${rIndex}, ${cIndex})" title="Quitar condición" style="font-size: 11px; padding: 2px 6px;">✕</button>
              </div>
              <div class="cond-seccion-group" style="display: ${cond.tipo === 'seccion' ? 'inline-flex' : 'none'}; margin-left: 32px; margin-top: 4px;">
                <select class="cond-seccion" onchange="handleRuleConditionInput(${rIndex}, ${cIndex}, 'seccion', this.value)">
                  <option value="opcion_multiple" ${cond.seccion === 'opcion_multiple' ? 'selected' : ''}>Opción Múltiple</option>
                  <option value="vf" ${cond.seccion === 'vf' ? 'selected' : ''}>Verdadero/Falso</option>
                  <option value="relacionar" ${cond.seccion === 'relacionar' ? 'selected' : ''}>Relacionar</option>
                  <option value="abierta" ${cond.seccion === 'abierta' ? 'selected' : ''}>Abierta</option>
                  <option value="matematica" ${cond.seccion === 'matematica' ? 'selected' : ''}>Matemática</option>
                </select>
              </div>
            </div>`;
        });
      }
      
      html += `
            <button class="btn-secondary-small" onclick="addRuleCondition(${rIndex})" style="margin-top: 6px; margin-left: 32px; font-size: 12px;">
              + Agregar condición (Y además)
            </button>
          </div>
          
          <div class="rule-tareas">
            <label style="font-weight: 700; font-size: 14px; color: #059669; margin-bottom: 8px; display: block; margin-top: 12px;">
              ➜ ENTONCES asignar estas tareas:
            </label>
            <div class="task-checkbox-list">`;
      
      if (tareasDisponibles.length === 0) {
        html += `<p class="muted" style="font-size: 12px;">No hay tareas disponibles. Crea tareas primero.</p>`;
      } else {
        tareasDisponibles.forEach((tarea, tIndex) => {
          const checked = (regla.tareas_asignadas || []).includes(tarea.id) ? 'checked' : '';
          html += `
            <label class="task-checkbox-item">
              <input type="checkbox" ${checked} 
                     onchange="handleRuleTareaToggle(${rIndex}, '${tarea.id}', this.checked)" />
              <span>${escapeHtml(tarea.nombre || 'Sin nombre')}</span>
            </label>`;
        });
      }
      
      html += `</div></div></div>`;
    });
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// Helper: etiqueta legible para operador
function operadorLabel(op) {
  const map = { '>=': 'mayor o igual a', '>': 'mayor que', '<=': 'menor o igual a', '<': 'menor que', '==': 'igual a' };
  return map[op] || op;
}

// Helper: etiqueta legible para sección
function seccionLabel(sec) {
  const map = { opcion_multiple: 'Opción Múltiple', vf: 'Verdadero/Falso', relacionar: 'Relacionar', abierta: 'Abierta', matematica: 'Matemática' };
  return map[sec] || sec;
}

function handleRuleInput(rIndex, field, value) {
  if (!currentExam.reglas_asignacion) currentExam.reglas_asignacion = [];
  if (!currentExam.reglas_asignacion[rIndex]) {
    currentExam.reglas_asignacion[rIndex] = { id: Date.now() + '_' + rIndex, nombre: '', condiciones: [], tareas_asignadas: [] };
  }
  currentExam.reglas_asignacion[rIndex][field] = value;
  setEditStatus("Regla actualizada.");
}

function handleRuleConditionInput(rIndex, cIndex, field, value) {
  const regla = currentExam.reglas_asignacion[rIndex];
  if (!regla) return;
  if (!regla.condiciones) regla.condiciones = [];
  if (!regla.condiciones[cIndex]) {
    regla.condiciones[cIndex] = { tipo: 'porcentaje_global', seccion: '', operador: '>=', valor: 0, unidad: 'porcentaje' };
  }
  regla.condiciones[cIndex][field] = value;
  
  // Si cambió el tipo, re-renderizar para mostrar/ocultar el selector de sección
  if (field === 'tipo') {
    renderRulesEditor();
  }
  setEditStatus("Condición actualizada.");
}

function handleRuleTareaToggle(rIndex, tareaId, checked) {
  const regla = currentExam.reglas_asignacion[rIndex];
  if (!regla) return;
  if (!regla.tareas_asignadas) regla.tareas_asignadas = [];
  if (checked) {
    if (!regla.tareas_asignadas.includes(tareaId)) {
      regla.tareas_asignadas.push(tareaId);
    }
  } else {
    regla.tareas_asignadas = regla.tareas_asignadas.filter(id => id !== tareaId);
  }
  setEditStatus("Asignación de tarea actualizada.");
}

function addRule() {
  if (!currentExam.reglas_asignacion) currentExam.reglas_asignacion = [];
  const newId = Date.now();
  currentExam.reglas_asignacion.push({
    id: newId,
    nombre: "Nueva regla",
    condiciones: [
      { tipo: 'porcentaje_global', seccion: '', operador: '>=', valor: 8, unidad: 'porcentaje' }
    ],
    tareas_asignadas: []
  });
  renderRulesEditor();
  setEditStatus("Regla agregada. Configura las condiciones y tareas.");
}

function removeRule(index) {
  if (!currentExam.reglas_asignacion || !currentExam.reglas_asignacion[index]) return;
  if (!confirm(`¿Eliminar la regla "${currentExam.reglas_asignacion[index].nombre || 'Sin nombre'}"?`)) return;
  currentExam.reglas_asignacion.splice(index, 1);
  renderRulesEditor();
  setEditStatus("Regla eliminada.");
}

function addRuleCondition(rIndex) {
  const regla = currentExam.reglas_asignacion[rIndex];
  if (!regla) return;
  if (!regla.condiciones) regla.condiciones = [];
  regla.condiciones.push({ tipo: 'porcentaje_global', seccion: '', operador: '>=', valor: 0, unidad: 'porcentaje' });
  renderRulesEditor();
  setEditStatus("Condición agregada.");
}

function removeRuleCondition(rIndex, cIndex) {
  const regla = currentExam.reglas_asignacion[rIndex];
  if (!regla || !regla.condiciones) return;
  regla.condiciones.splice(cIndex, 1);
  renderRulesEditor();
  setEditStatus("Condición eliminada.");
}

// --- Evaluación de reglas contra resultados ---
function evaluarReglasTareas(exam, resultPayload) {
  const tareasAsignadas = [];
  const reglas = exam.reglas_asignacion || [];
  const tareas = exam.tareas || [];
  
  if (reglas.length === 0 || tareas.length === 0) return tareasAsignadas;
  if (!resultPayload || !resultPayload.questions) return tareasAsignadas;
  
  // Calcular métricas disponibles para las condiciones
  const totalPoints = resultPayload.totalPoints || 1;
  const earnedPoints = resultPayload.earnedPoints || 0;
  const porcentajeGlobal = (earnedPoints / totalPoints) * 10; // Escala 0-10
  
  // Calcular puntuación por sección
  const seccionStats = {};
  resultPayload.questions.forEach(q => {
    const tipo = q.type || 'unknown';
    if (!seccionStats[tipo]) seccionStats[tipo] = { earned: 0, total: 0 };
    seccionStats[tipo].earned += q.earnedPoints || 0;
    seccionStats[tipo].total += q.points || 1;
  });
  
  // Convertir a porcentaje por sección (escala 0-10)
  const seccionPct = {};
  Object.entries(seccionStats).forEach(([tipo, stats]) => {
    seccionPct[tipo] = (stats.earned / (stats.total || 1)) * 10;
  });
  
  // Evaluar cada regla
  const tareasYaAsignadas = new Set();
  
  reglas.forEach(regla => {
    if (!regla.condiciones || regla.condiciones.length === 0) {
      // Sin condiciones → asignar siempre
      asignarTareasDeRegla(regla, tareas, tareasAsignadas, tareasYaAsignadas, regla.nombre || 'Regla sin nombre');
      return;
    }
    
    // Evaluar todas las condiciones (AND lógico)
    const cumple = regla.condiciones.every(cond => {
      let valorComparar;
      
      if (cond.tipo === 'porcentaje_global') {
        valorComparar = porcentajeGlobal;
      } else if (cond.tipo === 'seccion') {
        valorComparar = seccionPct[cond.seccion];
        if (valorComparar === undefined) return false; // No hay preguntas de esa sección
      } else {
        return false;
      }
      
      // Aplicar operador
      const valorCond = cond.valor || 0;
      switch (cond.operador) {
        case '>=': return valorComparar >= valorCond;
        case '>': return valorComparar > valorCond;
        case '<=': return valorComparar <= valorCond;
        case '<': return valorComparar < valorCond;
        case '==': return Math.abs(valorComparar - valorCond) < 0.001;
        default: return false;
      }
    });
    
    if (cumple) {
      asignarTareasDeRegla(regla, tareas, tareasAsignadas, tareasYaAsignadas, regla.nombre || 'Regla sin nombre');
    }
  });
  
  return tareasAsignadas;
}

function asignarTareasDeRegla(regla, tareas, tareasAsignadas, tareasYaAsignadas, nombreRegla) {
  (regla.tareas_asignadas || []).forEach(tareaId => {
    if (tareasYaAsignadas.has(tareaId)) return; // Evitar duplicados
    
    const tarea = tareas.find(t => String(t.id) === String(tareaId));
    if (tarea) {
      tareasYaAsignadas.add(tareaId);
      tareasAsignadas.push({
        ...tarea,
        regla_que_asigno: nombreRegla
      });
    }
  });
}
