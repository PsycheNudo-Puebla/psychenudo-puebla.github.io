// Inicialización
async function init() {
  console.log('TAviejito - Iniciando...');

  const savedGame = SaveSystem.loadGame();
  if (savedGame && savedGame.patient && savedGame.patient.id) {
    EventSystem.loadEvents(savedGame.patient.id);
    console.log('Partida guardada encontrada');
    const daysPassed = TimeSystem.calculateTimePassed();
    if (daysPassed > 0) {
      TimeSystem.advanceTime(daysPassed);
      console.log(`Han pasado ${daysPassed} dia(s)`);
    }
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
    document.getElementById('continue-btn').style.display = saved ? 'block' : 'none';
    NavigationSystem.showScreen(SCREENS.LOGIN);
  });

  NavigationSystem.registerAction('new-game-btn', registerStudent);

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
    gameState.progress.hour = 8;
    gameState.progress.minute = 0;
    gameState.progress.week = 1;
    gameState.progress.day = 1;
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

  NavigationSystem.registerAction('export-btn', () => SaveSystem.exportToFile());
  NavigationSystem.registerAction('pdf-btn', exportPDF);
  NavigationSystem.registerAction('code-btn', showSaveCode);
  NavigationSystem.registerAction('back-btn', () => NavigationSystem.showScreen(SCREENS.MAIN));

  NavigationSystem.registerAction('closeFeedback', () => {
    const needsNext = UI.closeFeedback();
    if (needsNext) {
      gameState.awaitingFeedback = false;
      loadNextEvent();
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
  gameState.student = { name, id };
  gameState.progress.startTimestamp = Date.now();
  gameState.progress.lastRealTimestamp = Date.now();
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
  const daysPassed = TimeSystem.calculateTimePassed();
  if (daysPassed > 0) {
    TimeSystem.advanceTime(daysPassed);
    console.log(`Han pasado ${daysPassed} dia(s) en el juego`);
  }
  TimeSystem.updateRealTimestamp();
  UI.updateHUD();
  NavigationSystem.showScreen(SCREENS.MAIN);
  loadNextEvent();
  SaveSystem.showSaveIndicator();
}

/* ============================================
   SISTEMA DE EVENTOS
   ============================================ */
function loadNextEvent() {
  const hour = gameState.progress.hour;
  const event = EventSystem.getEventForCurrentSituation(gameState)
    || EventSystem.getFallbackEvent(hour, gameState);
  gameState.currentEvent = event;
  gameState.awaitingFeedback = false;
  UI.displayEvent(event);
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
    correctAnswers
  });

  gameState.advanceTime(2);

  UI.showFeedback(
    choice.feedback,
    choice.correct ? 'INTERVENCION CORRECTA' : 'INTERVENCION INCORRECTA',
    choice.correct ? 'ok' : 'bad'
  );

  UI.updateHUD();
  SaveSystem.autoSave();
  gameState.nextEventPending = true;
}

function openOptionDetail(visibleIndex) {
  if (!gameState.currentEvent) return;
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
setInterval(() => {
  const mainScreen = document.getElementById('main-screen');
  if (mainScreen?.classList.contains('active')) {
    const timeEl = document.getElementById('hud-time');
    if (timeEl) timeEl.innerText = TimeSystem.formatTime();
  }
}, 60000);

/* ============================================
   EXPORTAR FUNCIONES PARA onclick EN HTML
   ============================================ */
window.goToLogin = () => {
  const saved = localStorage.getItem('taviejito_save');
  document.getElementById('continue-btn').style.display = saved ? 'block' : 'none';
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
  gameState.progress.hour = 8;
  gameState.progress.minute = 0;
  gameState.progress.week = 1;
  gameState.progress.day = 1;
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

  const historyBody = gameState.history.map((h, i) => {
    const correctText = (h.correctAnswers && h.correctAnswers.length > 0)
      ? h.correctAnswers.join(' | ')
      : '(no disponible)';
    return [
      { text: ` ${i + 1} `, alignment: 'center', color: '#306230', bold: true, fontSize: 9 },
      { text: h.description || '-', fontSize: 8, color: '#333' },
      { text: h.option || '-', fontSize: 8, color: h.correct ? '#1a6b1a' : '#b31a1a', bold: true },
      { text: h.correct ? 'SI' : 'NO', alignment: 'center', fontSize: 8,
        color: h.correct ? '#1a6b1a' : '#b31a1a', bold: true },
      { text: correctText, fontSize: 8, color: '#1a6b1a' }
    ];
  });

  const docDef = {
    pageSize: 'LETTER',
    pageMargins: [25, 30, 25, 30],
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
      { text: '\n' },

      { text: 'PROGRESO Y TIEMPO', style: 'sectionTitle' },
      { text: [
        { text: 'Tiempo jugado: ', bold: true }, `${hrs}h ${min.toString().padStart(2,'0')}m ${seg.toString().padStart(2,'0')}s`,
        { text: '   |   Progreso: ', bold: true }, `Semana ${gameState.progress.week} / Día ${gameState.progress.day}`
      ], style: 'body' },
      { text: '\n' },

      { text: 'ESTADÍSTICAS', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              { text: `Salud\n${gameState.stats.health}%`, alignment: 'center', style: 'statBox',
                fillColor: gameState.stats.health > 60 ? '#d4edda' : '#f8d7da' },
              { text: `Confianza\n${gameState.stats.trust}%`, alignment: 'center', style: 'statBox',
                fillColor: gameState.stats.trust > 50 ? '#d4edda' : '#f8d7da' },
              { text: `Mente\n${gameState.stats.mind}`, alignment: 'center', style: 'statBox',
                fillColor: gameState.stats.mind === 'OK' ? '#d4edda' : '#fff3cd' },
              { text: `Meds\n${gameState.stats.meds}`, alignment: 'center', style: 'statBox',
                fillColor: gameState.stats.meds === 'OK' ? '#d4edda' : '#fff3cd' }
            ]
          ]
        }
      },
      { text: '\n' },

      { text: 'CONSULTAS DE INFORMACIÓN', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { text: `Signos\nVitales\n${consultas.vitals}`, alignment: 'center', style: 'statBox', fillColor: '#e8f4f8' },
            { text: `Estado\nMental\n${consultas.mind}`, alignment: 'center', style: 'statBox', fillColor: '#e8f4f8' },
            { text: `Medica-\nmentos\n${consultas.meds}`, alignment: 'center', style: 'statBox', fillColor: '#e8f4f8' },
            { text: `Diagnós-\nticos\n${consultas.diagnosis}`, alignment: 'center', style: 'statBox', fillColor: '#e8f4f8' }
          ]]
        }
      },
      { text: '\n' },

      { text: 'DESEMPEÑO', style: 'sectionTitle' },
      {
        layout: 'noBorders',
        table: {
          widths: ['33%', '33%', '33%'],
          body: [[
            { text: `Total\n${gameState.history.length}`, alignment: 'center', style: 'statBox', fillColor: '#e2e3e5' },
            { text: `Correctas\n${correctas}`, alignment: 'center', style: 'statBox', fillColor: '#d4edda' },
            { text: `Incorrectas\n${incorrectas}`, alignment: 'center', style: 'statBox', fillColor: '#f8d7da' }
          ]]
        }
      },
      { text: '\n' },

      { text: `HISTORIAL DE EVENTOS (${gameState.history.length})`, style: 'sectionTitle' },
      {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*', 'auto', '*'],
          body: [
            [
              { text: '#', style: 'tableHeader', alignment: 'center' },
              { text: 'Evento', style: 'tableHeader' },
              { text: 'Tu respuesta', style: 'tableHeader' },
              { text: 'Correcta', style: 'tableHeader', alignment: 'center' },
              { text: 'Respuesta correcta', style: 'tableHeader' }
            ],
            ...historyBody
          ]
        }
      }
    ],
    styles: {
      title: { fontSize: 18, bold: true, color: '#306230', margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 11, color: '#558b2f', margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 12, bold: true, color: '#306230', margin: [0, 12, 0, 4],
        decoration: 'underline' },
      body: { fontSize: 10, lineHeight: 1.4, margin: [0, 1, 0, 1] },
      statBox: { fontSize: 9, bold: true, margin: [4, 6, 4, 6] },
      tableHeader: { fontSize: 8, bold: true, color: '#fff', fillColor: '#306230',
        margin: [3, 4, 3, 4] }
    },
    defaultStyle: { font: 'Roboto', fontSize: 9 }
  };

  pdfMake.createPdf(docDef).download(`TAviejito_${gameState.student.name}_${Date.now()}.pdf`);
}

window.exportSaveFile = () => SaveSystem.exportToFile();
window.exportPDF = exportPDF;
window.showSaveCode = showSaveCode;
window.showScreen = (id) => NavigationSystem.showScreen(id);

init();
