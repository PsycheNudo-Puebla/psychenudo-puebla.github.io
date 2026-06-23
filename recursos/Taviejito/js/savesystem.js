const SaveSystem = {
  STORAGE_KEY: 'taviejito_save',

  autoSave() {
    gameState.progress.lastSaveTimestamp = Date.now();
    const data = JSON.stringify(gameState);
    localStorage.setItem(this.STORAGE_KEY, data);
    this.showSaveIndicator();
  },

  loadGame() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      gameState.fromJSON(data);
      return data;
    } catch(e) {
      console.error('Save corrupto:', e);
      return null;
    }
  },

  exportToFile() {
    // Al exportar JSON se registra automáticamente la visita del día
    const visitOk = gameState.registerVisit();
    if (visitOk) {
      gameState.addToHistory({ event: 'auto_visit', description: 'Visita registrada automáticamente al exportar partida' });
    }
    const data = JSON.stringify(gameState, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taviejito_${gameState.student?.id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Actualizar HUD después del registro
    if (typeof UI !== 'undefined' && UI.updateHUD) {
      UI.updateHUD();
    }
  },

  importFromFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        gameState.fromJSON(data);
        this.autoSave();
        callback(null, data);
      } catch(err) {
        callback(err, null);
      }
    };
    reader.readAsText(file);
  },

  generateSaveCode() {
    const data = JSON.stringify(gameState);
    return btoa(unescape(encodeURIComponent(data)));
  },

  loadFromCode(code) {
    try {
      const decoded = decodeURIComponent(escape(atob(code)));
      const data = JSON.parse(decoded);
      gameState.fromJSON(data);
      return data;
    } catch(e) {
      return null;
    }
  },

  showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      indicator.classList.add('saving');
      setTimeout(() => indicator.classList.remove('saving'), 800);
    }
  }
};

// SaveSystem now global
