const TimeSystem = {
  calculateTimePassed() {
    if (!gameState.progress.lastRealTimestamp) return 0;
    const now = Date.now();
    const elapsed = (now - gameState.progress.lastRealTimestamp) / 1000;
    return Math.floor(elapsed / GAME_CONFIG.REAL_SECONDS_PER_GAME_DAY);
  },

  advanceTime(gameDays) {
    for (let i = 0; i < gameDays; i++) {
      gameState.advanceTime(24);
    }
  },

  updateRealTimestamp() {
    gameState.progress.lastRealTimestamp = Date.now();
  },

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
