const GAME_CONFIG = {
    SEMESTER_WEEKS: 18,
    REAL_SECONDS_PER_GAME_DAY: 3600,
    START_HOUR: 8,
    MAX_HEALTH: 100,
    MIN_HEALTH: 0
};

// Gameplay tuning
GAME_CONFIG.EVENTS_PER_WEEK = 3; // número de eventos evaluativos por semana (visitas obligatorias)
GAME_CONFIG.EVALUATION_INTERVAL_DEFAULT = 5; // semanas por defecto entre cortes de evaluación

const SCREENS = {
    START: 'start-screen',
    MENU: 'menu-screen',
    LOGIN: 'login-screen',
    SETUP: 'setup-screen',
    MAIN: 'main-screen',
    SAVE: 'save-screen'
};

const STAT_TYPES = {
    HEALTH: 'HEALTH',
    MIND: 'MIND',
    MEDS: 'MEDS',
    TRUST: 'TRUST'
};

const MOODS = {
    NEUTRAL: 'neutral',
    HAPPY: 'happy',
    SICK: 'sick',
    CONFUSED: 'confused',
    SAD: 'sad'
};

// Rúbrica de evaluación
const RUBRIC_DIMENSIONS = [
    { id: 'razonamiento', label: 'Razonamiento Diagnóstico Diferencial', weight: 0.30 },
    { id: 'herramientas', label: 'Selección y Aplicación de Herramientas de Evaluación', weight: 0.25 },
    { id: 'funcional', label: 'Análisis Funcional del Comportamiento', weight: 0.25 },
    { id: 'comunicacion', label: 'Comunicación Terapéutica y Recolección de Información', weight: 0.20 }
];

function getRubricLabel(value) {
    const map = { 3: 'Óptimo (+3)', 2: 'Adecuado (+2)', 1: 'Parcial (+1)', '-1': 'Contraproducente (-1)' };
    return map[value] || 'Sin valor';
}

function getDimensionLabel(dimensionId) {
    const dim = RUBRIC_DIMENSIONS.find(d => d.id === dimensionId);
    return dim ? dim.label : dimensionId;
}
