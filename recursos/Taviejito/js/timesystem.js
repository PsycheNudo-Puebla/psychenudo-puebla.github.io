const TimeSystem = {
  // Tiempo real: la sincronización día/semana se maneja en gameState.synchronizeWithRealTime()

  formatTime() {
    const h = String(gameState.progress.hour).padStart(2, '0');
    const m = String(gameState.progress.minute).padStart(2, '0');
    return `${h}:${m}`;
  },

  getWeekPhase(week) {
    if (week <= 3) return 'initial';
    if (week <= 6) return 'stable';
    if (week <= 9) return 'complications';
    if (week <= 12) return 'crisis';
    if (week <= 15) return 'recovery';
    return 'final';
  }
};

// TimeSystem now global
