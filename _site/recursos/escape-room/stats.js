/** SISTEMA DE ESTADÍSTICAS GLOBAL **/
window.gameStats = {
    startTime: 0,
    totalHits: 0,
    totalAttempts: 0,
    levelStats: {}, // Registro por índice de nivel: { attempts: 0, hits: 0, time: 0, questions: [] }

    initLevel: function(levelIndex) {
        if (!this.levelStats[levelIndex]) {
            this.levelStats[levelIndex] = { attempts: 0, hits: 0, time: 0, startTime: Date.now(), questions: [], movesMade: 0, wrongChoices: 0 };
        } else {
            this.levelStats[levelIndex].startTime = Date.now();
        }
        console.log(`[STATS] Sincronizando Nivel ${levelIndex + 1}.`);
    },

    recordHit: function(levelIndex) {
        if (!this.levelStats[levelIndex]) this.initLevel(levelIndex);
        this.levelStats[levelIndex].hits++;
        this.levelStats[levelIndex].attempts++;
        this.totalHits++;
        this.totalAttempts++;
    },

    recordQuestion: function(levelIndex, text, isCorrect) {
        if (!this.levelStats[levelIndex]) this.initLevel(levelIndex);
        this.levelStats[levelIndex].questions.push({
            text: text,
            correct: isCorrect
        });
        this.levelStats[levelIndex].attempts++;
        this.totalAttempts++;
        if (isCorrect) {
            this.levelStats[levelIndex].hits++;
            this.totalHits++;
        } else {
            this.levelStats[levelIndex].wrongChoices++;
        }
    },

    recordMove: function(levelIndex) {
        if (!this.levelStats[levelIndex]) this.initLevel(levelIndex);
        this.levelStats[levelIndex].movesMade++;
    },

    recordLevelComplete: function(levelIndex) {
        if (this.levelStats[levelIndex]) {
            const duration = (Date.now() - this.levelStats[levelIndex].startTime) / 1000;
            this.levelStats[levelIndex].time += duration;
            console.log(`[STATS] Nivel ${levelIndex + 1} completado en ${duration.toFixed(2)}s`);
        }
    },

    getSummary: function() {
        let summary = `--- RESUMEN DE PARTIDA ---\n`;
        summary += `Aciertos Totales: ${this.totalHits}\n`;
        summary += `Intentos Totales: ${this.totalAttempts}\n`;
        Object.keys(this.levelStats).forEach(idx => {
            const s = this.levelStats[idx];
            summary += `Nivel ${parseInt(idx)+1}: ${s.attempts} intentos, ${s.hits} aciertos, ${s.time.toFixed(1)}s\n`;
        });
        return summary;
    },

    resetGlobal: function() {
        this.totalHits = 0;
        this.totalAttempts = 0;
        this.levelStats = {};
        this.startTime = Date.now();
    }
};