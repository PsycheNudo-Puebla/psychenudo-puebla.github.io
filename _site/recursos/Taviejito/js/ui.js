const UI = {
  displayEvent(event) {
    if (!event) return;
    document.getElementById('event-description').innerText = event.description;

    const visibleOptions = EventSystem.getVisibleOptions();
    const totalPages = EventSystem.getTotalPages();
    const labels = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < 2; i++) {
      const btn = document.getElementById(`option-${['a','b'][i]}-btn`);
      const text = document.getElementById(`option-${['a','b'][i]}-text`);
      const key = btn?.querySelector('.key');
      if (btn) {
        if (i < visibleOptions.length) {
          btn.style.display = '';
          const realIndex = EventSystem.optionPage * EventSystem.optionsPerPage + i;
          if (key) key.innerText = labels[realIndex] || '?';
          text.innerText = visibleOptions[i].text;
          btn.disabled = false;
        } else {
          btn.style.display = 'none';
        }
      }
    }

    const nav = document.getElementById('options-nav');
    if (nav) {
      if (totalPages > 1) {
        nav.style.display = '';
        document.getElementById('options-nav-text').innerText = `${EventSystem.optionPage + 1}/${totalPages}`;
      } else {
        nav.style.display = 'none';
      }
    }

    document.getElementById('feedback-panel').classList.remove('show', 'ok', 'bad');
  },

  showFeedback(message, title = 'AVISO', severity = 'bad') {
    const panel = document.getElementById('feedback-panel');
    const eventPanel = document.querySelector('.event-panel');
    const menuOpts = document.querySelector('.menu-options');

    gameState.feedbackActive = true;

    if (eventPanel) {
      eventPanel.style.display = 'none';
      eventPanel.style.height = '0';
      eventPanel.style.overflow = 'hidden';
      eventPanel.style.marginBottom = '0';
    }
    if (menuOpts) {
      menuOpts.style.display = 'none';
      menuOpts.style.height = '0';
      menuOpts.style.overflow = 'hidden';
      menuOpts.style.marginTop = '0';
    }

    panel.classList.remove('ok', 'bad');
    panel.classList.add('show', severity === 'ok' ? 'ok' : 'bad');
    document.getElementById('feedback-title').innerText = title;
    document.getElementById('feedback-text').innerText = message;

    const hint = document.createElement('div');
    hint.className = 'feedback-hint';
    hint.innerText = 'PRESIONA A PARA CONTINUAR';
    panel.querySelectorAll('.feedback-hint').forEach(h => h.remove());
    panel.appendChild(hint);
  },

  closeFeedback() {
    const panel = document.getElementById('feedback-panel');
    const eventPanel = document.querySelector('.event-panel');
    const menuOpts = document.querySelector('.menu-options');

    panel.classList.remove('show', 'ok', 'bad');
    if (eventPanel) {
      eventPanel.style.display = '';
      eventPanel.style.height = '';
      eventPanel.style.overflow = '';
      eventPanel.style.marginBottom = '';
    }
    if (menuOpts) {
      menuOpts.style.display = '';
      menuOpts.style.height = '';
      menuOpts.style.overflow = '';
      menuOpts.style.marginTop = '';
    }

    gameState.feedbackActive = false;

    if (gameState.nextEventPending) {
      gameState.nextEventPending = false;
      gameState.awaitingFeedback = false;
      return true;
    }
    return false;
  },

  openEventModal() {
    if (!gameState.currentEvent) return;
    document.getElementById('event-modal-title').innerText = 'EVENTO COMPLETO';
    document.getElementById('event-modal-text').innerText = gameState.currentEvent.description.replace(/"/g, '');
    document.getElementById('event-modal').classList.add('active');
  },

  closeEventModal() {
    document.getElementById('event-modal').classList.remove('active');
  },

  openOptionDetail(visibleIndex) {
    if (!gameState.currentEvent) return;
    const visibleOptions = EventSystem.getVisibleOptions();
    const choice = visibleOptions[visibleIndex];
    if (!choice) return;
    const labels = ['A', 'B', 'C', 'D'];
    const eventDesc = gameState.currentEvent.description.replace(/"/g, '');
    // Usar índice absoluto para mostrar la letra correcta (C/D en página 2)
    const absoluteIndex = EventSystem.optionPage * EventSystem.optionsPerPage + visibleIndex;
    document.getElementById('option-detail-title').innerText = `OPCION ${labels[absoluteIndex] || '?'}`;
    document.getElementById('option-detail-context').innerText = eventDesc.length > 80 ? eventDesc.substring(0, 80) + '...' : eventDesc;
    document.getElementById('option-detail-text').innerText = choice.text;
    document.getElementById('option-detail').classList.add('active');
  },

  closeOptionDetail() {
    document.getElementById('option-detail').classList.remove('active');
  },

  showFloatingIcon(icon) {
    const container = document.getElementById('sprite-container');
    const iconEl = document.createElement('div');
    iconEl.className = 'floating-icon';
    iconEl.innerText = icon;
    container.appendChild(iconEl);
    setTimeout(() => iconEl.remove(), 2000);
  },

  updateMood(correct) {
    const container = document.getElementById('sprite-container');
    container.classList.remove('walking-left', 'walking-right');

    if (correct) {
      gameState.mood = 'happy';
      container.classList.add('walking-right');
      SpriteSystem.render('main-character', 'happy');
      setTimeout(() => {
        container.classList.remove('walking-right');
        SpriteSystem.render('main-character', 'happy');
      }, 1200);
    } else {
      gameState.mood = gameState.stats.health < 50 ? 'sick' : 'sad';
      container.classList.add('walking-left');
      SpriteSystem.render('main-character', gameState.mood);
      setTimeout(() => {
        container.classList.remove('walking-left');
        SpriteSystem.render('main-character', gameState.mood);
      }, 1200);
    }
    setTimeout(() => {
      gameState.mood = 'neutral';
      container.classList.remove('walking-left', 'walking-right');
      SpriteSystem.render('main-character', 'neutral');
    }, 8000);
  },

  updateHUD() {
    document.getElementById('stat-health').innerText = gameState.stats.health;
    document.getElementById('bar-health').style.width = gameState.stats.health + '%';
    document.getElementById('stat-mind').innerText = gameState.stats.mind;
    document.getElementById('stat-meds').innerText = gameState.stats.meds;
    const trustEl = document.getElementById('stat-trust');
    if (trustEl) {
      trustEl.innerText = gameState.stats.trust;
    }
    document.getElementById('hud-week').innerText = String(gameState.progress.week).padStart(2, '0');
    document.getElementById('hud-day').innerText = String(gameState.progress.day).padStart(2, '0');
    document.getElementById('hud-time').innerText = TimeSystem.formatTime();
        const visitsEl = document.getElementById('hud-visits');
        if (visitsEl) {
          const done = gameState.visitsThisWeek || 0;
          const total = GAME_CONFIG.EVENTS_PER_WEEK || 3;
          visitsEl.innerText = `🩺${done}/${total}`;
        }
  },

  openInfoPanel(type) {
    const panel = document.getElementById('info-panel');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');
    let html = '';
    switch(type) {
      case 'vitals':
        title.innerText = 'SIGNOS VITALES';
        html = `
          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-item-label">PRESION ARTERIAL</div>
                <div class="info-item-value">${gameState.vitals.bloodPressure} mmHg</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">FRECUENCIA CARDIACA</div>
                <div class="info-item-value">${gameState.vitals.heartRate} lpm</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">GLUCOSA</div>
                <div class="info-item-value">${gameState.vitals.glucose} mg/dL</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">TEMPERATURA</div>
                <div class="info-item-value">${gameState.vitals.temperature}°C</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">SATURACION O2</div>
                <div class="info-item-value">${gameState.vitals.oxygenSat}%</div>
              </div>
            </div>
          </div>`;
        break;
      case 'mind':
        title.innerText = 'ESTADO MENTAL';
        html = `
          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-item-label">ESTADO ACTUAL</div>
                <div class="info-item-value">${gameState.stats.mind}</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">CONFIANZA</div>
                <div class="info-item-value"><span id="stat-trust">${gameState.stats.trust}</span>%</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">ORIENTACION</div>
                <div class="info-item-value">NORMAL</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">MEMORIA</div>
                <div class="info-item-value">CONSERVADA</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">ANIMO</div>
                <div class="info-item-value">${gameState.mood.toUpperCase()}</div>
              </div>
            </div>
          </div>`;
        break;
      case 'meds':
        title.innerText = 'MEDICAMENTOS';
        html = `
          <div class="info-section">
            <div class="info-grid">
              ${gameState.medications.map(med => `
                <div class="info-item">
                  <div class="info-item-label">${med.name}</div>
                  <div class="info-item-value">${med.schedule} ${med.taken ? 'V' : 'X'}</div>
                </div>`).join('')}
            </div>
          </div>`;
        break;
      case 'diagnosis':
        title.innerText = 'DIAGNOSTICOS';
        html = `
          <div class="info-section">
            <div class="info-grid">
              ${gameState.diagnoses.map(dx => `
                <div class="info-item">
                  <div class="info-item-value">${dx}</div>
                </div>`).join('')}
            </div>
          </div>`;
        break;
    }
    if (gameState.consultations && type in gameState.consultations) {
      gameState.consultations[type]++;
    }
    content.innerHTML = html;
    panel.classList.add('active');
  },

  closeInfoPanel() {
    document.getElementById('info-panel').classList.remove('active');
    this.fitConsole();
  },

  openSaveMenu() {
    if (!gameState.student) {
      window.goToLogin();
      return;
    }
    document.getElementById('save-student').innerText = gameState.student.name;
    document.getElementById('save-patient').innerText = gameState.patient?.name || '-';
    document.getElementById('save-progress').innerText =
      `SEM ${String(gameState.progress.week).padStart(2,'0')} / DIA ${String(gameState.progress.day).padStart(2,'0')}`;
    const required = GAME_CONFIG.EVENTS_PER_WEEK || 3;
    document.getElementById('save-visits').innerText =
      `${gameState.visitsThisWeek || 0}/${required}`;
    document.getElementById('save-timestamp').innerText =
      gameState.progress.lastSaveTimestamp
        ? new Date(gameState.progress.lastSaveTimestamp).toLocaleString('es-MX')
        : 'NUNCA';
    document.getElementById('save-code-box').classList.remove('show');
  },

  fitConsole() {
    const consoleEl = document.querySelector('.handheld-console');
    if (!consoleEl) return;
    consoleEl.style.transform = '';
    const rect = consoleEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const scaleX = (vw - margin) / rect.width;
    const scaleY = (vh - margin) / rect.height;
    const scale = Math.min(scaleX, scaleY, 0.98);
    consoleEl.style.transformOrigin = 'center center';
    consoleEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
};

// UI now global
