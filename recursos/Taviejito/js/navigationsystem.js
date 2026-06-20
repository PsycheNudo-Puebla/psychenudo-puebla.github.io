const NavigationSystem = {
  currentScreen: SCREENS.START,
  selectedIndex: 0,
  optionDetailOpen: null,
  actions: {},

  navigableElements: {
    'start-screen': ['press-start'],
    'login-screen': ['student-name', 'student-id', 'new-game-btn', 'continue-btn', 'import-btn'],
    'setup-screen': ['randomize-btn', 'start-game-btn'],
    'main-screen': ['stat-0', 'stat-1', 'stat-2', 'stat-3', 'event-panel', 'opt-a', 'opt-b', 'options-nav'],
    'save-screen': ['export-btn', 'pdf-btn', 'code-btn', 'import-btn', 'back-btn']
  },

  // Grid navigation maps for 2-column screens
  // Each entry maps currentIndex -> targetIndex for that direction
  gridNav: {
    'main-screen': {
      //  0→? 1→? 2→? 3→? 4→? 5→? 6→? 7→?
      up:    [0,  1,  0,  1,  2,  4,  5,  6],
      down:  [2,  3,  4,  4,  5,  6,  7,  7],
      left:  [0,  0,  2,  2,  4,  5,  6,  7],
      right: [1,  1,  3,  3,  4,  6,  6,  7]
    },
    'save-screen': {
      //  0→? 1→? 2→? 3→? 4→?
      up:    [0,  1,  0,  1,  4],
      down:  [2,  3,  4,  4,  4],
      left:  [0,  0,  2,  2,  4],
      right: [1,  1,  3,  3,  4]
    }
  },

  isModalOpen() {
    return document.getElementById('option-detail')?.classList.contains('active')
        || document.getElementById('event-modal')?.classList.contains('active')
        || document.getElementById('info-panel')?.classList.contains('active');
  },

  registerAction(elementId, handler) {
    this.actions[elementId] = handler;
  },

  init() {
    this.currentScreen = SCREENS.START;
    this.selectedIndex = 0;
    this.optionDetailOpen = null;
    this.updateSelection();
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
    this.currentScreen = screenId;
    this.selectedIndex = 0;
    this.updateSelection();
  },

  navigateUp() {
    if (this.isModalOpen() || gameState.feedbackActive) return;
    const elements = this.navigableElements[this.currentScreen];
    if (!elements || elements.length === 0) return;
    const grid = this.gridNav[this.currentScreen];
    if (grid) {
      this.selectedIndex = grid.up[this.selectedIndex];
      this.updateSelection();
      return;
    }
    let targetIndex = this.selectedIndex;
    do {
      targetIndex--;
      if (targetIndex < 0) { targetIndex = 0; break; }
      const elId = elements[targetIndex];
      const el = document.querySelector(`[data-nav="${elId}"]`) || document.getElementById(elId);
      if (!el || el.style.display !== 'none') break;
    } while (targetIndex > 0);
    this.selectedIndex = targetIndex;
    this.updateSelection();
  },

  navigateDown() {
    if (this.isModalOpen() || gameState.feedbackActive) return;
    const elements = this.navigableElements[this.currentScreen];
    if (!elements || elements.length === 0) return;
    const grid = this.gridNav[this.currentScreen];
    if (grid) {
      this.selectedIndex = grid.down[this.selectedIndex];
      this.updateSelection();
      return;
    }
    let targetIndex = this.selectedIndex;
    do {
      targetIndex++;
      if (targetIndex >= elements.length) { targetIndex = elements.length - 1; break; }
      const elId = elements[targetIndex];
      const el = document.querySelector(`[data-nav="${elId}"]`) || document.getElementById(elId);
      if (!el || el.style.display !== 'none') break;
    } while (targetIndex < elements.length - 1);
    this.selectedIndex = targetIndex;
    this.updateSelection();
  },

  navigateLeft() {
    if (this.isModalOpen() || gameState.feedbackActive) return;
    const elements = this.navigableElements[this.currentScreen];
    if (!elements) return;
    const grid = this.gridNav[this.currentScreen];
    if (grid) {
      this.selectedIndex = grid.left[this.selectedIndex];
      this.updateSelection();
      return;
    }
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateSelection();
    }
  },

  navigateRight() {
    if (this.isModalOpen() || gameState.feedbackActive) return;
    const elements = this.navigableElements[this.currentScreen];
    if (!elements) return;
    const grid = this.gridNav[this.currentScreen];
    if (grid) {
      this.selectedIndex = grid.right[this.selectedIndex];
      this.updateSelection();
      return;
    }
    if (this.selectedIndex < elements.length - 1) {
      this.selectedIndex++;
      this.updateSelection();
    }
  },

  select() {
    if (this.optionDetailOpen) {
      const opt = this.optionDetailOpen;
      this.optionDetailOpen = null;
      this.triggerAction('closeOptionDetail');
      this.triggerAction('chooseOption', opt);
      return;
    }
    if (gameState.feedbackActive) {
      this.triggerAction('closeFeedback');
      return;
    }
    if (document.getElementById('option-detail')?.classList.contains('active')) {
      this.optionDetailOpen = null;
      this.triggerAction('closeOptionDetail');
      return;
    }
    if (document.getElementById('event-modal')?.classList.contains('active')) {
      this.triggerAction('closeEventModal');
      return;
    }
    if (document.getElementById('info-panel')?.classList.contains('active')) {
      this.triggerAction('closeInfoPanel');
      return;
    }
    const elements = this.navigableElements[this.currentScreen];
    if (!elements) return;
    const selected = elements[this.selectedIndex];
    if (this.actions[selected]) {
      this.actions[selected]();
    }
  },

  cancel() {
    if (this.optionDetailOpen) {
      this.optionDetailOpen = null;
      this.triggerAction('closeOptionDetail');
      return;
    }
    if (document.getElementById('option-detail')?.classList.contains('active')) {
      this.optionDetailOpen = null;
      this.triggerAction('closeOptionDetail');
      return;
    }
    if (document.getElementById('event-modal')?.classList.contains('active')) {
      this.triggerAction('closeEventModal');
      return;
    }
    if (document.getElementById('info-panel')?.classList.contains('active')) {
      this.triggerAction('closeInfoPanel');
      return;
    }
    if (gameState.feedbackActive) {
      this.triggerAction('closeFeedback');
      return;
    }
    if (this.currentScreen === SCREENS.SAVE) {
      this.showScreen(SCREENS.MAIN);
    }
  },

  updateSelection() {
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    const elements = this.navigableElements[this.currentScreen];
    if (!elements) return;

    let idx = this.selectedIndex;
    const elId = elements[idx];
    const el = document.querySelector(`[data-nav="${elId}"]`) || document.getElementById(elId);
    if (!el || el.style.display === 'none') {
      for (let i = 0; i < elements.length; i++) {
        const candidateId = elements[i];
        const candidate = document.querySelector(`[data-nav="${candidateId}"]`) || document.getElementById(candidateId);
        if (candidate && candidate.style.display !== 'none') {
          idx = i;
          break;
        }
      }
      this.selectedIndex = idx;
    }

    const selected = elements[this.selectedIndex];
    const element = document.querySelector(`[data-nav="${selected}"]`) || document.getElementById(selected);
    if (element) {
      element.classList.add('selected');
      if (element.tagName === 'INPUT') {
        element.focus();
      } else {
        document.activeElement?.blur();
      }
    }
  },

  triggerAction(name, ...args) {
    if (this.actions[name]) {
      this.actions[name](...args);
    }
  },

  handleDpad(direction) {
    const btn = document.querySelector(`.dpad-${direction}`);
    if (btn) {
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 150);
    }
    const elements = this.navigableElements[this.currentScreen];
    const isOnNav = elements && elements[this.selectedIndex] === 'options-nav';
    if ((direction === 'left' || direction === 'right') && isOnNav && window.handleRefresh) {
      window.handleRefresh(direction === 'left' ? -1 : 1);
      return;
    }
    switch(direction) {
      case 'up': this.navigateUp(); break;
      case 'down': this.navigateDown(); break;
      case 'left': this.navigateLeft(); break;
      case 'right': this.navigateRight(); break;
    }
  },

  handleButton(btn) {
    const btnEl = document.getElementById(`btn-${btn.toLowerCase()}`);
    if (btnEl) {
      btnEl.classList.add('pressed');
      setTimeout(() => btnEl.classList.remove('pressed'), 150);
    }
    if (btn === 'A') {
      this.select();
    } else if (btn === 'B') {
      this.cancel();
    }
  },

  handleKey(key) {
    const isTyping = document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'text';
    switch(key) {
      case 'ArrowUp': if (!isTyping) { this.handleDpad('up'); return true; } return false;
      case 'ArrowDown': if (!isTyping) { this.handleDpad('down'); return true; } return false;
      case 'ArrowLeft': this.handleDpad('left'); return true;
      case 'ArrowRight': this.handleDpad('right'); return true;
      case 'a': case 'A': if (!isTyping) { this.handleButton('A'); return true; } return false;
      case 'Enter': this.handleButton('A'); return true;
      case 'b': case 'B': if (!isTyping) { this.handleButton('B'); return true; } return false;
      case 'Escape': this.handleButton('B'); return true;
    }
    return false;
  }
};

// NavigationSystem now global
