const NavigationSystem = {
  currentScreen: SCREENS.START,
  selectedIndex: 0,
  optionDetailOpen: null,
  actions: {},

  navigableElements: {
    'start-screen': ['press-start'],
    'menu-screen': ['new-game-btn', 'continue-btn', 'import-btn', 'menu-back-btn'],
    'login-screen': ['student-name', 'student-id', 'eval-interval', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-7', 'register-btn', 'import-btn'],
    'setup-screen': ['randomize-btn', 'start-game-btn'],
    'main-screen': ['stat-0', 'stat-1', 'stat-2', 'stat-3', 'event-panel', 'opt-a', 'opt-b', 'options-nav'],
    'save-screen': ['export-btn', 'pdf-btn', 'import-btn', 'back-btn'],
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
      //  0→? 1→? 2→? 3→?
      up:    [0,  1,  0,  3],
      down:  [2,  3,  3,  3],
      left:  [0,  0,  2,  2],
      right: [1,  1,  3,  3]
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
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.scrollTop = 0; // Reiniciar scroll al cambiar de pantalla
    });
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
      const screenEl = document.getElementById(this.currentScreen);
      const el = screenEl?.querySelector(`[data-nav="${elId}"]`) || document.getElementById(elId);
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
      const screenEl = document.getElementById(this.currentScreen);
      const el = screenEl?.querySelector(`[data-nav="${elId}"]`) || document.getElementById(elId);
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
    const screenEl = document.getElementById(this.currentScreen);
    const el = screenEl?.querySelector(`[data-nav="${elId}"]`) || document.getElementById(elId);
    if (!el || el.style.display === 'none') {
      for (let i = 0; i < elements.length; i++) {
        const candidateId = elements[i];
        const candidate = screenEl?.querySelector(`[data-nav="${candidateId}"]`) || document.getElementById(candidateId);
        if (candidate && candidate.style.display !== 'none') {
          idx = i;
          break;
        }
      }
      this.selectedIndex = idx;
    }

    const selected = elements[this.selectedIndex];
    const screenEl2 = document.getElementById(this.currentScreen);
    const element = screenEl2?.querySelector(`[data-nav="${selected}"]`) || document.getElementById(selected);
    if (element) {
      element.classList.add('selected');
      // Asegurar que el elemento esté visible dentro del LCD
      // Usamos offsetTop/clientHeight que son relativos al contenedor scrollable
      const screen = document.getElementById(this.currentScreen);
      if (screen) {
        const elTop = element.offsetTop;
        const elBottom = elTop + element.offsetHeight;
        const viewTop = screen.scrollTop;
        const viewBottom = viewTop + screen.clientHeight;
        if (elBottom > viewBottom) {
          screen.scrollTop = elBottom - screen.clientHeight + 8;
        } else if (elTop < viewTop) {
          screen.scrollTop = elTop - 8;
        }
      }
      if (element.tagName === 'INPUT') {
        element.focus({ preventScroll: true });
      } else {
        // Dar foco programático a elementos no-input para mantener cadena de teclado viva
        if (element.tabIndex < 0) element.setAttribute('tabindex', '-1');
        element.focus({ preventScroll: true });
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
    const isTyping = document.activeElement?.tagName === 'INPUT'
      && ['text','number'].includes(document.activeElement.type)
      && this.currentScreen === 'main-screen';
    switch(key) {
      case 'ArrowUp': if (!isTyping) { this.handleDpad('up'); return true; } return false;
      case 'ArrowDown': if (!isTyping) { this.handleDpad('down'); return true; } return false;
      case 'ArrowLeft': if (!isTyping) { this.handleDpad('left'); return true; } return false;
      case 'ArrowRight': if (!isTyping) { this.handleDpad('right'); return true; } return false;
      case 'a': case 'A': if (!isTyping) { this.handleButton('A'); return true; } return false;
      case 'Enter': this.handleButton('A'); return true;
      case 'b': case 'B': if (!isTyping) { this.handleButton('B'); return true; } return false;
      case 'Escape': this.handleButton('B'); return true;
    }
    return false;
  }
};

// NavigationSystem now global
