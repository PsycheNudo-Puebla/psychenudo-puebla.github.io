// Inicialización
async function init() {
  console.log('TAviejito - Iniciando...');

  const savedGame = SaveSystem.loadGame();
  if (savedGame && savedGame.patient && savedGame.patient.id) {
    EventSystem.loadEvents(savedGame.patient.id);
    console.log('Partida guardada encontrada');
  } else {
    EventSystem.loadEvents();
  }

  SpriteSystem.init();
  NavigationSystem.init();
  UI.fitConsole();

  registerNavigationActions();
  setupEventListeners();

  window.addEventListener('resize', () => UI.fitConsole());
  window.addEventListener('orientationchange', () => setTimeout(() => UI.fitConsole(), 300));

  console.log('Juego listo');
}

let pendingPatient = null;

function registerNavigationActions() {
  NavigationSystem.registerAction('press-start', () => {
    const saved = localStorage.getItem('taviejito_save');
    document.getElementById('menu-continue-btn').style.display = saved ? 'block' : 'none';
    NavigationSystem.showScreen(SCREENS.MENU);
  });

  NavigationSystem.registerAction('new-game-btn', () => {
    document.getElementById('student-name').value = '';
    document.getElementById('student-id').value = '';
    NavigationSystem.showScreen(SCREENS.LOGIN);
  });

  NavigationSystem.registerAction('register-btn', registerStudent);
  NavigationSystem.registerAction('continue-btn', loadSavedGame);
  NavigationSystem.registerAction('import-btn', importSaveFile);

  NavigationSystem.registerAction('randomize-btn', () => {
    pendingPatient = PatientSystem.selectRandomPatient();
    showPatientProfile(pendingPatient);
  });

  NavigationSystem.registerAction('start-game-btn', () => {
    if (!pendingPatient) return;
    gameState.patient = { ...pendingPatient };
    gameState.vitals = { ...pendingPatient.baselineVitals };
    gameState.medications = pendingPatient.medications.map(m => ({ ...m, taken: false }));
    gameState.diagnoses = [...pendingPatient.conditions];
    gameState.stats = { health: 80, mind: 'OK', meds: 'OK', trust: 50 };
    gameState.history = [];
      gameState.visitsThisWeek = 0;
      gameState.eventsAnsweredThisWeek = 0;
      gameState.eventsAnsweredToday = 0;
      gameState.evaluativeDoneToday = false;
      gameState.lastProcessedDay = 0;
      gameState.visitDays = [];
      gameState.lastVisitDay = null;
    gameState.progress.hour = 8;
    gameState.progress.minute = 0;
    gameState.progress.week = 1;
    gameState.progress.day = 1;
    // Fecha real de inicio
    const todayStr = new Date().toISOString().split('T')[0];
    gameState.startDate = todayStr;
    gameState.lastVisitDate = todayStr;
    gameState.lastRecordedWeek = 1;
    gameState.synchronizeWithRealTime();
    SpriteSystem.setCharacter(pendingPatient.spriteId);
    document.getElementById('hud-name').innerText = pendingPatient.name.toUpperCase();
    EventSystem.loadEvents(pendingPatient.id);
    UI.updateHUD();
    NavigationSystem.showScreen(SCREENS.MAIN);
    loadNextEvent();
    SaveSystem.autoSave();
  });

  NavigationSystem.registerAction('stat-0', () => UI.openInfoPanel('vitals'));
  NavigationSystem.registerAction('stat-1', () => UI.openInfoPanel('mind'));
  NavigationSystem.registerAction('stat-2', () => UI.openInfoPanel('meds'));
  NavigationSystem.registerAction('stat-3', () => UI.openInfoPanel('diagnosis'));
  NavigationSystem.registerAction('event-panel', () => UI.openEventModal());

  NavigationSystem.registerAction('opt-a', () => openOptionDetail(0));
  NavigationSystem.registerAction('opt-b', () => openOptionDetail(1));
  NavigationSystem.registerAction('options-nav', handleRefresh);

  // Day pill actions for login screen
  for (let d = 1; d <= 7; d++) {
    const dayId = 'day-' + d;
    NavigationSystem.registerAction(dayId, () => {
      const el = document.querySelector(`[data-nav="${dayId}"]`);
      if (el && window.toggleDay) window.toggleDay(el);
    });
  }

  NavigationSystem.registerAction('export-btn', () => SaveSystem.exportToFile());
  NavigationSystem.registerAction('pdf-btn', exportPDF);
  NavigationSystem.registerAction('back-btn', () => NavigationSystem.showScreen(SCREENS.MAIN));
  NavigationSystem.registerAction('menu-back-btn', () => NavigationSystem.showScreen(SCREENS.START));

  NavigationSystem.registerAction('closeFeedback', () => {
    const needsNext = UI.closeFeedback();
    if (needsNext) {
      gameState.awaitingFeedback = false;
      loadNextEvent();
    } else if (gameState.evaluativeDoneToday || gameState.progress.hour >= 22) {
      // Day is over — keep inline message in event panel, hide buttons
      gameState.awaitingFeedback = true;
      const nextDayName = gameState.getNextVisitingDayName();
      document.getElementById('event-description').innerText = `Intervención completada. Vuelve el ${nextDayName} para tu próxima visita.`;
      document.getElementById('option-a-btn').style.display = 'none';
      document.getElementById('option-b-btn').style.display = 'none';
      document.getElementById('options-nav').style.display = 'none';
      const menuOpts = document.querySelector('#main-screen .menu-options');
      if (menuOpts) menuOpts.style.display = 'none';
      // Mantener feedbackActive=true para que la tecla A siga yendo a closeFeedback
      gameState.feedbackActive = true;
    } else if (!gameState.currentEvent) {
      // No event loaded (e.g. non-visiting day) — keep awaitingFeedback true
      gameState.awaitingFeedback = true;
    }
  });
  NavigationSystem.registerAction('closeInfoPanel', () => {
    UI.closeInfoPanel();
  });
  NavigationSystem.registerAction('closeEventModal', UI.closeEventModal);
  NavigationSystem.registerAction('closeOptionDetail', () => {
    UI.closeOptionDetail();
    NavigationSystem.optionDetailOpen = null;
  });

  // Expose helper to register a visit from console or UI
  window.registerVisit = () => {
    if (!gameState.student) return UI.showFeedback('Registra un estudiante primero', 'ERROR', 'bad');
    gameState.registerVisit();
    UI.showFeedback('Visita registrada', 'OK', 'ok');
    UI.updateHUD();
    SaveSystem.autoSave();
  };

  window.setEvaluationInterval = (n) => {
    const val = parseInt(n, 10);
    if (isNaN(val) || val <= 0) return false;
    gameState.evalConfig.interval = val;
    return true;
  };

  window.toggleDay = (el) => {
    // Enforce exactly 3 days selected (1 evaluative event per day × 3 days = 3 events/week)
    const picker = document.getElementById('day-picker');
    const selected = picker.querySelectorAll('.day-pill.day-selected');
    const isSelected = el.classList.contains('day-selected');
    if (isSelected && selected.length <= 1) {
      // Can't deselect the last day — minimum 1 required
      return;
    }
    if (!isSelected && selected.length >= 3) {
      // Already at maximum = 3, can't select more. Deselect another first.
      return;
    }
    el.classList.toggle('day-selected');
  };

  window.getSelectedDays = () => {
    const picker = document.getElementById('day-picker');
    const selected = picker.querySelectorAll('.day-pill.day-selected');
    return Array.from(selected).map(pill => parseInt(pill.dataset.day, 10)).sort();
  };
  NavigationSystem.registerAction('chooseOption', (opt) => chooseOption(opt));
  NavigationSystem.registerAction('openSaveMenu', () => {
    UI.openSaveMenu();
    NavigationSystem.showScreen(SCREENS.SAVE);
  });
}

function showPatientProfile(patient) {
  document.getElementById('profile-name').innerText = patient.name;
  document.getElementById('profile-age').innerText = `Edad: ${patient.age} años`;
  document.getElementById('profile-conditions').innerText = `Condiciones: ${patient.conditions.join(', ')}`;
  const personalityMap = { amable: 'Amable', gruñón: 'Gruñón', ansioso: 'Ansioso', deprimido: 'Triste' };
  document.getElementById('profile-personality').innerText = `Personalidad: ${personalityMap[patient.personality] || patient.personality}`;
}

function randomizePatient() {
  pendingPatient = PatientSystem.selectRandomPatient();
  showPatientProfile(pendingPatient);
}

function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    const handled = NavigationSystem.handleKey(e.key);
    if (handled) e.preventDefault();
  });

  document.getElementById('import-file')?.addEventListener('change', handleImport);
}

/* ============================================
   REGISTRO DE ESTUDIANTE
   ============================================ */
function registerStudent() {
  const name = document.getElementById('student-name').value.trim();
  const id = document.getElementById('student-id').value.trim();
  if (!name || !id) {
    UI.showFeedback('Por favor completa ambos campos', 'AVISO', 'bad');
    return;
  }
  // Validar exactamente 3 días de asistencia seleccionados
  const selectedDays = window.getSelectedDays();
  if (selectedDays.length !== 3) {
    UI.showFeedback('Debes seleccionar exactamente 3 días de asistencia (1 evento evaluativo por día = 3/semana)', 'AVISO', 'bad');
    return;
  }

  // Evitar registro duplicado: guardar nombre+matrícula en localStorage
  const REGISTRY_KEY = 'taviejito_registered_students';
  let registered = [];
  try {
    registered = JSON.parse(localStorage.getItem(REGISTRY_KEY)) || [];
  } catch(e) { registered = []; }
  const nameLower = name.toLowerCase().trim();
  const key = `${nameLower}|${id}`;
  const existing = registered.find(r => `${r.name.toLowerCase().trim()}|${r.id}` === key);
  if (existing) {
    UI.showFeedback(`El estudiante "${name}" ya está registrado. No se permite re-registro.`, 'ERROR', 'bad');
    return;
  }
  registered.push({ name, id, registeredAt: Date.now() });
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registered));

  gameState.student = { name, id };
  const todayStr = new Date().toISOString().split('T')[0];
  gameState.startDate = todayStr;
  gameState.progress.startTimestamp = Date.now();
  gameState.progress.lastRealTimestamp = Date.now();
  // Leer intervalo de evaluación
  const evalInput = document.getElementById('eval-interval');
  if (evalInput && parseInt(evalInput.value, 10) > 0) {
    gameState.evalConfig.interval = parseInt(evalInput.value, 10);
  }
  // Leer días de asistencia seleccionados
  gameState.attendanceSchedule = window.getSelectedDays();
  document.getElementById('student-name').value = '';
  document.getElementById('student-id').value = '';
  pendingPatient = PatientSystem.selectRandomPatient();
  showPatientProfile(pendingPatient);
  NavigationSystem.showScreen(SCREENS.SETUP);
}

/* ============================================
   CARGAR PARTIDA GUARDADA
   ============================================ */
function loadSavedGame() {
  const data = SaveSystem.loadGame();
  if (!data) {
    UI.showFeedback('Partida guardada corrupta o no encontrada', 'ERROR', 'bad');
    return;
  }
  if (gameState.patient && gameState.patient.spriteId) {
    SpriteSystem.setCharacter(gameState.patient.spriteId);
    document.getElementById('hud-name').innerText = gameState.patient.name.toUpperCase();
  }
  // Sincronizar con tiempo real: actualiza día/semana según la fecha real
  gameState.synchronizeWithRealTime();
  UI.updateHUD();

  // Verificar si hoy es día de visita
  if (!gameState.isTodayVisitingDay()) {
    const nextDay = gameState.getNextVisitingDayName();
    gameState.awaitingFeedback = true;
    gameState.feedbackActive = true;
    // Mostrar mensaje inline en el panel de eventos
    document.getElementById('feedback-panel').classList.remove('show', 'ok', 'bad');
    document.getElementById('event-description').innerText =
      `Hoy no se encuentra la persona disponible. Tu próxima cita es el ${nextDay}.`;
    document.getElementById('option-a-btn').style.display = 'none';
    document.getElementById('option-b-btn').style.display = 'none';
    document.getElementById('options-nav').style.display = 'none';
    const menuOpts = document.querySelector('#main-screen .menu-options');
    if (menuOpts) menuOpts.style.display = 'none';
    NavigationSystem.showScreen(SCREENS.MAIN);
    SaveSystem.showSaveIndicator();
    return;
  }

  NavigationSystem.showScreen(SCREENS.MAIN);
  loadNextEvent();
  SaveSystem.showSaveIndicator();
}

/* ============================================
   SISTEMA DE EVENTOS
   ============================================ */
function loadNextEvent() {
  // Detect day change and reset daily counters
  if (gameState.progress.day !== gameState.lastProcessedDay) {
    gameState.eventsAnsweredToday = 0;
    gameState.evaluativeDoneToday = false;
    gameState.lastProcessedDay = gameState.progress.day;
  }

  // If evaluative event already answered today or past 22:00 → end of day
  if (gameState.evaluativeDoneToday || gameState.progress.hour >= 22) {
    showEndOfDay();
    return;
  }

  const weeklyQuotaRemaining = (gameState.eventsAnsweredThisWeek || 0) < (GAME_CONFIG.EVENTS_PER_WEEK || 3);

  // First event of the day is always info/fortuitous (non-evaluative)
  if (gameState.eventsAnsweredToday === 0) {
    const hour = gameState.progress.hour;
    const fallback = EventSystem.getFallbackEvent(hour, gameState);
    gameState.currentEvent = fallback;
    gameState.awaitingFeedback = false;
    UI.displayEvent(fallback);
    return;
  }

  // Second event: try evaluative if weekly quota remains
  if (weeklyQuotaRemaining) {
    const evalEvent = EventSystem.getEvaluativeEvent(gameState);
    if (evalEvent) {
      gameState.currentEvent = evalEvent;
      gameState.awaitingFeedback = false;
      UI.displayEvent(evalEvent);
      return;
    }
  }

  // No evaluative available (quota exhausted or none match) → limit to 2 info events
  if (gameState.eventsAnsweredToday < 2) {
    const hour = gameState.progress.hour;
    const fallback = EventSystem.getFallbackEvent(hour, gameState);
    gameState.currentEvent = fallback;
    gameState.awaitingFeedback = false;
    UI.displayEvent(fallback);
    return;
  }

  // Max events for today reached → end of day
  showEndOfDay();
}

/* ============================================
   FIN DEL DÍA
   ============================================ */
function showEndOfDay() {
  gameState.awaitingFeedback = true;
  gameState.nextEventPending = false;
  // Registrar la fecha de la visita completada
  gameState.lastVisitDate = new Date().toISOString().split('T')[0];
  const nextDayName = gameState.getNextVisitingDayName();
  const dayNum = gameState.progress.day;

  // Ocultar overlay de feedback si estuviera visible
  document.getElementById('feedback-panel').classList.remove('show', 'ok', 'bad');

  // Mostrar mensaje en el panel de eventos (inline, no overlay)
  document.getElementById('event-description').innerText =
    `Has completado la intervención de hoy. Vuelve el ${nextDayName} para tu próxima visita.`;

  // Asegurar que el panel de eventos esté visible
  const eventPanel = document.querySelector('.event-panel');
  if (eventPanel) {
    eventPanel.style.display = '';
    eventPanel.style.height = '';
    eventPanel.style.overflow = '';
    eventPanel.style.marginBottom = '';
  }

  // Ocultar botones de opciones y su contenedor
  document.getElementById('option-a-btn').style.display = 'none';
  document.getElementById('option-b-btn').style.display = 'none';
  document.getElementById('options-nav').style.display = 'none';
  const menuOpts = document.querySelector('#main-screen .menu-options');
  if (menuOpts) menuOpts.style.display = 'none';

  // feedbackActive = true para que la tecla A dispare closeFeedback
  gameState.feedbackActive = true;

  UI.updateHUD();
}

/* ============================================
   ELEGIR OPCION
   ============================================ */
function chooseOption(choice) {
  if (!gameState.currentEvent || gameState.awaitingFeedback || !choice) return;
  gameState.awaitingFeedback = true;

  if (choice.modifiers) {
    Object.keys(choice.modifiers).forEach(stat => {
      gameState.updateStat(stat, choice.modifiers[stat]);
    });
  }

  if (choice.icon) {
    UI.showFloatingIcon(choice.icon);
  }

  UI.updateMood(choice.correct);

  const correctAnswers = gameState.currentEvent.options
    .filter(o => o.correct)
    .map(o => o.text);
  gameState.addToHistory({
    eventId: gameState.currentEvent.id,
    description: gameState.currentEvent.description,
    category: gameState.currentEvent.category,
    option: choice.text,
    correct: choice.correct,
    correctAnswers,
    rubricDimension: choice.rubricDimension || null,
    rubricValue: choice.rubricValue != null ? choice.rubricValue : null
  });

  // incrementar contador de eventos respondidos hoy (todos los eventos cuentan)
  gameState.eventsAnsweredToday = (gameState.eventsAnsweredToday || 0) + 1;
  // Detectar si es evaluativo ANTES de advanceTime (que podría cruzar medianoche y resetear banderas)
  const wasEvaluative = gameState.currentEvent && !(gameState.currentEvent.id || '').startsWith('fallback_');

  gameState.advanceTime(2);

  // responder un evento evaluativo se considera una visita (no cuentan los fallback)
  if (wasEvaluative) {
    gameState.eventsAnsweredThisWeek = (gameState.eventsAnsweredThisWeek || 0) + 1;
    gameState.visitsThisWeek = (gameState.visitsThisWeek || 0) + 1;
    // Marcar el día como completado (evaluativo ya respondido) DESPUÉS de advanceTime
    gameState.evaluativeDoneToday = true;
    // Registrar la fecha real de la visita completada
    const todayStr = new Date().toISOString().split('T')[0];
    if (gameState.lastVisitDate !== todayStr) {
      gameState.lastVisitDate = todayStr;
    }
  }

  // Determinar nivel de rúbrica para el título del feedback
  let feedbackTitle, feedbackSeverity;
  if (choice.rubricValue != null) {
    const LEVEL_MAP = { 3: 'ÓPTIMO', 2: 'ADECUADO', 1: 'PARCIAL', '-1': 'CONTRAPRODUCENTE' };
    const level = LEVEL_MAP[choice.rubricValue] || '';
    const dimLabel = getDimensionLabel(choice.rubricDimension) || '';
    feedbackTitle = `${level} — ${dimLabel}`;
    feedbackSeverity = choice.rubricValue >= 2 ? 'ok' : 'bad';
  } else {
    feedbackTitle = choice.correct ? 'INTERVENCIÓN CORRECTA' : 'INTERVENCIÓN INCORRECTA';
    feedbackSeverity = choice.correct ? 'ok' : 'bad';
  }
  UI.showFeedback(choice.feedback, feedbackTitle, feedbackSeverity);

  UI.updateHUD();
  SaveSystem.autoSave();
  gameState.nextEventPending = true;
}

function openOptionDetail(visibleIndex) {
  if (!gameState.currentEvent || gameState.awaitingFeedback) return;
  const visibleOptions = EventSystem.getVisibleOptions();
  const option = visibleOptions[visibleIndex];
  if (!option) return;
  NavigationSystem.optionDetailOpen = option;
  UI.openOptionDetail(visibleIndex);
}

function handleRefresh(direction) {
  if (gameState.feedbackActive || gameState.awaitingFeedback) return;
  if (EventSystem.refreshOptions(direction)) {
    UI.displayEvent(gameState.currentEvent);
    NavigationSystem.updateSelection();
  }
}

/* ============================================
   GUARDADO / EXPORTACION
   ============================================ */
function importSaveFile() {
  document.getElementById('import-file')?.click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  SaveSystem.importFromFile(file, (err, data) => {
    if (err) {
      UI.showFeedback('Archivo invalido: ' + err.message, 'ERROR', 'bad');
      return;
    }
    UI.updateHUD();
    if (gameState.patient) {
      EventSystem.loadEvents(gameState.patient.id);
      if (gameState.patient.spriteId) {
        SpriteSystem.setCharacter(gameState.patient.spriteId);
      }
    }
    if (gameState.currentEvent) {
      EventSystem.currentEvent = gameState.currentEvent;
      EventSystem.optionPage = 0;
      UI.displayEvent(gameState.currentEvent);
    }
    NavigationSystem.showScreen(SCREENS.MAIN);
    UI.showFeedback('Partida importada correctamente', 'EXITO', 'ok');
  });
  event.target.value = '';
}

function showSaveCode() {
  const code = SaveSystem.generateSaveCode();
  const box = document.getElementById('save-code-box');
  if (!box) return;
  box.innerText = code;
  box.classList.add('show');
  const range = document.createRange();
  range.selectNodeContents(box);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/* ============================================
   RELOJ EN TIEMPO REAL
   ============================================ */
let gameTimeAccumulator = 0;

function updateRealTimeClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeEl = document.getElementById('hud-real-time');
  if (timeEl) timeEl.innerText = `${hh}:${mm}`;
}

setInterval(() => {
  const mainScreen = document.getElementById('main-screen');
  if (mainScreen?.classList.contains('active')) {
    // Actualizar hora real del sistema
    updateRealTimeClock();

    // 3600 real seg = 1 día juego = 1440 min juego → 1 real seg = 0.4 min juego
    gameTimeAccumulator += (24 * 60) / GAME_CONFIG.REAL_SECONDS_PER_GAME_DAY;

    if (gameTimeAccumulator >= 1) {
      const minutesToAdd = Math.floor(gameTimeAccumulator);
      gameTimeAccumulator -= minutesToAdd;

      // No avanzar más allá de las 22:00
      const maxMinute = 22 * 60;
      const currentMinutes = gameState.progress.hour * 60 + gameState.progress.minute;
      const newMinutes = Math.min(currentMinutes + minutesToAdd, maxMinute);

      gameState.progress.hour = Math.floor(newMinutes / 60);
      gameState.progress.minute = Math.floor(newMinutes % 60);

      if (newMinutes >= maxMinute) {
        gameTimeAccumulator = 0;
      }

      UI.updateHUD();
    }
  } else {
    gameTimeAccumulator = 0;
    // Seguir actualizando la hora real aunque no esté en main-screen
    updateRealTimeClock();
  }
}, 1000);

/* ============================================
   EXPORTAR FUNCIONES PARA onclick EN HTML
   ============================================ */
window.goToMenu = () => {
  const saved = localStorage.getItem('taviejito_save');
  document.getElementById('menu-continue-btn').style.display = saved ? 'block' : 'none';
  NavigationSystem.showScreen(SCREENS.MENU);
};
window.goToRegistration = () => {
  document.getElementById('student-name').value = '';
  document.getElementById('student-id').value = '';
  NavigationSystem.showScreen(SCREENS.LOGIN);
};
window.registerStudent = registerStudent;
window.loadSavedGame = loadSavedGame;
window.importSaveFile = importSaveFile;
window.handleImport = handleImport;
window.startGame = () => {
  if (!pendingPatient) return;
  gameState.patient = { ...pendingPatient };
  gameState.vitals = { ...pendingPatient.baselineVitals };
  gameState.medications = pendingPatient.medications.map(m => ({ ...m, taken: false }));
  gameState.diagnoses = [...pendingPatient.conditions];
  gameState.stats = { health: 80, mind: 'OK', meds: 'OK', trust: 50 };
  gameState.history = [];
  gameState.visitsThisWeek = 0;
  gameState.eventsAnsweredThisWeek = 0;
  gameState.eventsAnsweredToday = 0;
  gameState.evaluativeDoneToday = false;
  gameState.lastProcessedDay = 0;
  gameState.visitDays = [];
  gameState.lastVisitDay = null;
  gameState.progress.hour = 8;
  gameState.progress.minute = 0;
  gameState.progress.week = 1;
  gameState.progress.day = 1;
  // Fecha real de inicio
  const todayStr = new Date().toISOString().split('T')[0];
  gameState.startDate = todayStr;
  gameState.lastVisitDate = todayStr;
  gameState.lastRecordedWeek = 1;
  gameState.synchronizeWithRealTime();
  SpriteSystem.setCharacter(pendingPatient.spriteId);
  document.getElementById('hud-name').innerText = pendingPatient.name.toUpperCase();
  EventSystem.loadEvents(pendingPatient.id);
  UI.updateHUD();
  NavigationSystem.showScreen(SCREENS.MAIN);
  loadNextEvent();
  SaveSystem.autoSave();
};
window.randomizePatient = randomizePatient;
window.openInfoPanel = (type) => UI.openInfoPanel(type);
window.openEventModal = () => {
  if (!gameState.currentEvent) return;
  UI.openEventModal();
};
window.chooseOption = chooseOption;
window.handleRefresh = handleRefresh;
window.handleDpad = (direction) => NavigationSystem.handleDpad(direction);
window.handlePhysicalButton = (btn) => NavigationSystem.handleButton(btn);
window.openSaveMenu = () => {
  if (!gameState.student) {
    window.goToLogin();
    return;
  }
  UI.openSaveMenu();
  NavigationSystem.showScreen(SCREENS.SAVE);
};
function exportPDF() {
  if (!gameState.student) return;

  const correctas = gameState.history.filter(h => h.correct).length;
  const incorrectas = gameState.history.length - correctas;
  const consultas = gameState.consultations || { vitals: 0, mind: 0, meds: 0, diagnosis: 0 };
  const segundos = gameState.progress.startTimestamp
    ? Math.floor((Date.now() - gameState.progress.startTimestamp) / 1000)
    : 0;
  const hrs = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  const seg = segundos % 60;
  const evalInterval = gameState.evalConfig?.interval || GAME_CONFIG.EVALUATION_INTERVAL_DEFAULT;

  // ---- DETERMINAR PERÍODO DE EVALUACIÓN ACTUAL ----
  const currentWeek = gameState.progress.week;
  // Distribución dinámica de periodos:
  // Los primeros (fullPeriods-1) periodos tienen 'evalInterval' semanas,
  // el último periodo absorbe las semanas restantes
  const totalWeeks = GAME_CONFIG.SEMESTER_WEEKS || 16;
  const fullPeriods = Math.floor(totalWeeks / evalInterval);
  const lastPeriodStart = (fullPeriods - 1) * evalInterval + 1;
  const periodNum = currentWeek >= lastPeriodStart ? fullPeriods : Math.ceil(currentWeek / evalInterval);
  const periodStart = periodNum < fullPeriods ? (periodNum - 1) * evalInterval + 1 : lastPeriodStart;
  const periodEnd = periodNum < fullPeriods ? periodNum * evalInterval : totalWeeks;

  // ---- CÁLCULO DE RÚBRICA (SOLO EVENTOS DEL PERÍODO ACTUAL) ----
  const rubricData = { dimensions: {}, totalEvaluative: 0 };
  const evaluativeHistory = gameState.history.filter(h =>
    h.rubricDimension && h.rubricValue != null &&
    !(h.eventId || '').startsWith('fallback_') &&
    h.week >= periodStart && h.week <= periodEnd
  );

  RUBRIC_DIMENSIONS.forEach(d => {
    rubricData.dimensions[d.id] = {
      label: d.label, weight: d.weight, values: [], count: 0, sum: 0, avg: 0, score3: 0
    };
  });

  evaluativeHistory.forEach(h => {
    const dim = h.rubricDimension;
    if (rubricData.dimensions[dim]) {
      rubricData.dimensions[dim].values.push(h.rubricValue);
      rubricData.dimensions[dim].count++;
      rubricData.dimensions[dim].sum += h.rubricValue;
      rubricData.totalEvaluative++;
    }
  });

  let weightedSum = 0;
  let activeWeightTotal = 0;
  RUBRIC_DIMENSIONS.forEach(d => {
    const ds = rubricData.dimensions[d.id];
    if (ds.count > 0) {
      ds.avg = Math.round((ds.sum / ds.count) * 100) / 100;
      weightedSum += ds.avg * d.weight;
      activeWeightTotal += d.weight;
    }
  });

  // Renormalizar: si faltan dimensiones, escalar el promedio al rango completo [-1, 3]
  const normalizedAvg = activeWeightTotal > 0 ? weightedSum / activeWeightTotal : 0;
  // Mapear [-1, 3] -> [0, 10]
  const base10Raw = ((normalizedAvg + 1) / 4) * 10;
  const base10Score = Math.round(base10Raw * 10) / 10;
  const finalScore = Math.max(0, Math.min(10, base10Score));
  const scoreColor = finalScore >= 8 ? '#1a6b1a' : finalScore >= 6 ? '#856404' : '#b31a1a';

  // Tabla de rúbrica: cuerpo
  const rubricBody = [];
  const dimColor = (value) => value >= 2.5 ? '#d4edda' : value >= 1.5 ? '#fff3cd' : '#f8d7da';
  RUBRIC_DIMENSIONS.forEach(d => {
    const ds = rubricData.dimensions[d.id];
    const avgText = ds.count > 0 ? ds.avg.toFixed(2) : '—';
    const countText = ds.count > 0 ? `${ds.count}` : '0';
    const weightedContrib = ds.count > 0 ? (ds.avg * d.weight).toFixed(2) : '—';
    rubricBody.push([
      { text: d.label, fontSize: 8, bold: true },
      { text: `${(d.weight * 100).toFixed(0)}%`, alignment: 'center', fontSize: 8 },
      { text: countText, alignment: 'center', fontSize: 8 },
      { text: avgText, alignment: 'center', fontSize: 8, bold: true,
        color: ds.count > 0 ? (ds.avg >= 2.5 ? '#1a6b1a' : ds.avg >= 1.5 ? '#856404' : '#b31a1a') : '#999',
        fillColor: ds.count > 0 ? dimColor(ds.avg) : '#f5f5f5' },
      { text: weightedContrib, alignment: 'center', fontSize: 8,
        color: ds.count > 0 ? '#306230' : '#999' }
    ]);
  });
  // Fila de total
  rubricBody.push([
    { text: 'CALIFICACIÓN FINAL', fontSize: 10, bold: true, color: '#306230', colSpan: 4,
      alignment: 'right', margin: [0, 6, 4, 6] },
    {}, {}, {},
    { text: `${finalScore.toFixed(1)} / 10`, fontSize: 12, bold: true, alignment: 'center',
      color: scoreColor, margin: [0, 6, 0, 6],
      fillColor: finalScore >= 8 ? '#d4edda' : finalScore >= 6 ? '#fff3cd' : '#f8d7da' }
  ]);

  // ---- HISTORIAL ----
  const historyBody = gameState.history.map((h, i) => {
    const correctText = (h.correctAnswers && h.correctAnswers.length > 0)
      ? h.correctAnswers.join(' | ')
      : '(no disponible)';
    const rubricLabel = h.rubricValue != null ? getRubricLabel(h.rubricValue) : '';
    const dimLabel = h.rubricDimension
      ? (RUBRIC_DIMENSIONS.find(d => d.id === h.rubricDimension)?.label || h.rubricDimension)
      : '';
    return [
      { text: ` ${i + 1} `, alignment: 'center', color: '#306230', bold: true, fontSize: 8 },
      { text: h.description || '-', fontSize: 7, color: '#333' },
      { text: h.option || '-', fontSize: 7, color: h.correct ? '#1a6b1a' : '#b31a1a', bold: true },
      { text: h.correct ? 'SI' : 'NO', alignment: 'center', fontSize: 7,
        color: h.correct ? '#1a6b1a' : '#b31a1a', bold: true },
      { text: dimLabel ? `${dimLabel.substring(0, 30)}…` : '-', fontSize: 6.5, color: '#555' },
      { text: rubricLabel, alignment: 'center', fontSize: 7,
        color: h.rubricValue >= 2 ? '#1a6b1a' : h.rubricValue >= 1 ? '#856404' : '#b31a1a',
        bold: h.rubricValue != null }
    ];
  });

  const docDef = {
    pageSize: 'LETTER',
    pageMargins: [20, 25, 20, 25],
    content: [
      { text: 'TAviejito - Reporte de Partida', style: 'title', alignment: 'center' },
      { text: 'Simulador de Cuidado del Adulto Mayor', style: 'subtitle', alignment: 'center' },
      { text: '\n' },

      { text: 'DATOS GENERALES', style: 'sectionTitle' },
      { text: [
        { text: 'Estudiante: ', bold: true }, gameState.student.name,
        { text: '   |   Matrícula: ', bold: true }, gameState.student.id
      ], style: 'body' },
      { text: [
        { text: 'Paciente: ', bold: true }, gameState.patient?.name || '-',
        { text: `   |   Edad: `, bold: true }, `${gameState.patient?.age || '-'} años`
      ], style: 'body' },
      { text: [
        { text: 'Condiciones: ', bold: true }, (gameState.diagnoses || []).join(', ') || '-'
      ], style: 'body' },
      { text: [
        { text: 'Intervalo de evaluación: ', bold: true },
        `cada ${evalInterval} semana(s)   |   Período actual: semanas ${periodStart}-${periodEnd}   |   Intervenciones/semana: 3`
      ], style: 'body' },
      { text: '\n' },

      { text: 'PROGRESO Y TIEMPO', style: 'sectionTitle' },
      { text: [
        { text: 'Tiempo jugado: ', bold: true },
        `${hrs}h ${min.toString().padStart(2,'0')}m ${seg.toString().padStart(2,'0')}s`,
        { text: '   |   Progreso: ', bold: true }, `Semana ${gameState.progress.week} / Día ${gameState.progress.day}`
      ], style: 'body' },
      { text: '\n' },

      { text: 'ESTADÍSTICAS', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { text: `Salud\n${gameState.stats.health}%`, alignment: 'center', style: 'statBox',
              fillColor: gameState.stats.health > 60 ? '#d4edda' : '#f8d7da' },
            { text: `Confianza\n${gameState.stats.trust}%`, alignment: 'center', style: 'statBox',
              fillColor: gameState.stats.trust > 50 ? '#d4edda' : '#f8d7da' },
            { text: `Mente\n${gameState.stats.mind}`, alignment: 'center', style: 'statBox',
              fillColor: gameState.stats.mind === 'OK' ? '#d4edda' : '#fff3cd' },
            { text: `Meds\n${gameState.stats.meds}`, alignment: 'center', style: 'statBox',
              fillColor: gameState.stats.meds === 'OK' ? '#d4edda' : '#fff3cd' }
          ]]
        }
      },
      { text: '\n' },

      { text: 'CONSULTAS DE INFORMACIÓN', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { text: `Signos\nVitales\n${consultas.vitals}`, alignment: 'center', style: 'statBox',
              fillColor: '#e8f4f8' },
            { text: `Estado\nMental\n${consultas.mind}`, alignment: 'center', style: 'statBox',
              fillColor: '#e8f4f8' },
            { text: `Medica-\nmentos\n${consultas.meds}`, alignment: 'center', style: 'statBox',
              fillColor: '#e8f4f8' },
            { text: `Diagnós-\nticos\n${consultas.diagnosis}`, alignment: 'center', style: 'statBox',
              fillColor: '#e8f4f8' }
          ]]
        }
      },
      { text: '\n' },

      { text: 'DESEMPEÑO', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { text: `Total\n${gameState.history.length}`, alignment: 'center', style: 'statBox',
              fillColor: '#e2e3e5' },
            { text: `Correctas\n${correctas}`, alignment: 'center', style: 'statBox',
              fillColor: '#d4edda' },
            { text: `Incorrectas\n${incorrectas}`, alignment: 'center', style: 'statBox',
              fillColor: '#f8d7da' },
            { text: `Evaluativas\n${rubricData.totalEvaluative}`, alignment: 'center', style: 'statBox',
              fillColor: '#cce5ff' }
          ]]
        }
      },
      { text: '\n' },

      // ---- RÚBRICA DE EVALUACIÓN ----
      { text: 'RÚBRICA DE EVALUACIÓN', style: 'sectionTitle' },
      { text: `Intervalo de evaluación: cada ${evalInterval} semanas  |  Período evaluado: semanas ${periodStart}-${periodEnd}  |  Intervenciones evaluativas por semana: 3`,
        style: 'body', italics: true, margin: [0, 0, 0, 6] },
      {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Dimensión', style: 'tableHeader' },
              { text: 'Peso', style: 'tableHeader', alignment: 'center' },
              { text: 'Eventos', style: 'tableHeader', alignment: 'center' },
              { text: 'Promedio', style: 'tableHeader', alignment: 'center' },
              { text: 'Ponderado', style: 'tableHeader', alignment: 'center' }
            ],
            ...rubricBody
          ]
        }
      },
      { text: '\n' },

      { text: 'LEYENDA DE VALORES', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { text: 'Óptimo (+3)', alignment: 'center', fontSize: 8, bold: true,
              color: '#1a6b1a', fillColor: '#d4edda', margin: [2, 4, 2, 4] },
            { text: 'Adecuado (+2)', alignment: 'center', fontSize: 8, bold: true,
              color: '#856404', fillColor: '#fff3cd', margin: [2, 4, 2, 4] },
            { text: 'Parcial (+1)', alignment: 'center', fontSize: 8, bold: true,
              color: '#856404', fillColor: '#fff3cd', margin: [2, 4, 2, 4] },
            { text: 'Contraproducente (-1)', alignment: 'center', fontSize: 8, bold: true,
              color: '#b31a1a', fillColor: '#f8d7da', margin: [2, 4, 2, 4] }
          ]]
        }
      },
      { text: '\n' },

      { text: `HISTORIAL DE EVENTOS (${gameState.history.length})`, style: 'sectionTitle' },
      {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*', 'auto', '*', 'auto'],
          body: [
            [
              { text: '#', style: 'tableHeader', alignment: 'center' },
              { text: 'Evento', style: 'tableHeader' },
              { text: 'Tu respuesta', style: 'tableHeader' },
              { text: 'Correcta', style: 'tableHeader', alignment: 'center' },
              { text: 'Dimensión', style: 'tableHeader' },
              { text: 'Valor', style: 'tableHeader', alignment: 'center' }
            ],
            ...historyBody
          ]
        }
      }
    ],
    styles: {
      title: { fontSize: 16, bold: true, color: '#306230', margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: '#558b2f', margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 11, bold: true, color: '#306230', margin: [0, 10, 0, 3],
        decoration: 'underline' },
      body: { fontSize: 9, lineHeight: 1.3, margin: [0, 1, 0, 1] },
      statBox: { fontSize: 8, bold: true, margin: [3, 5, 3, 5] },
      tableHeader: { fontSize: 7, bold: true, color: '#fff', fillColor: '#306230',
        margin: [2, 3, 2, 3] }
    },
    defaultStyle: { font: 'Roboto', fontSize: 8 }
  };

  pdfMake.createPdf(docDef).download(`TAviejito_${gameState.student.name}_${Date.now()}.pdf`);
}

window.exportSaveFile = () => SaveSystem.exportToFile();
window.exportPDF = exportPDF;
window.showSaveCode = showSaveCode;
window.showScreen = (id) => NavigationSystem.showScreen(id);

init();
