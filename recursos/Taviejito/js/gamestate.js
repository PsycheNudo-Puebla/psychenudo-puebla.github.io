class GameState {
    constructor() {
        this.student = null;
        this.patient = null;
        this.stats = {
            health: 80,
            mind: 'OK',
            meds: 'OK',
            trust: 50
        };
        this.vitals = {
            bloodPressure: '120/80',
            heartRate: 72,
            glucose: 95,
            temperature: 36.5,
            oxygenSat: 98
        };
        this.medications = [
            { name: 'Losartán 50mg', schedule: '8:00', taken: true },
            { name: 'Metformina 850mg', schedule: '14:00', taken: false },
            { name: 'Aspirina 100mg', schedule: '20:00', taken: false }
        ];
        this.diagnoses = [
            'Hipertensión arterial',
            'Diabetes tipo 2',
            'Osteoartritis'
        ];
        this.progress = {
            week: 1,
            day: 1,
            hour: GAME_CONFIG.START_HOUR,
            minute: 0,
            startTimestamp: null,
            lastSaveTimestamp: null,
            lastRealTimestamp: null
        };
        this.currentEvent = null;
        this.history = [];
        this.awaitingFeedback = false;
        this.mood = MOODS.NEUTRAL;
        this.infoPanelOpen = false;
        this.feedbackActive = false;
        this.nextEventPending = false;
        this.consultations = { vitals: 0, mind: 0, meds: 0, diagnosis: 0 };
        // Attendance and weekly tracking
        this.visitsThisWeek = 0; // número de visitas registradas esta semana
        this.eventsAnsweredThisWeek = 0; // contador de eventos contestados (limitar por semana)
        this.evalConfig = { interval: GAME_CONFIG.EVALUATION_INTERVAL_DEFAULT };
        this.lastVisitDay = null; // clave "week-day" del último registro para evitar duplicados
        this.visitDays = []; // días concretos (1-7) que se visitó esta semana
        this.attendanceSchedule = [1, 2, 3, 4, 5]; // días que el alumno se comprometió a asistir (L-V por defecto)
    }

    updateStat(statName, value) {
        if (statName === 'health') {
            this.stats.health = Math.max(GAME_CONFIG.MIN_HEALTH, Math.min(GAME_CONFIG.MAX_HEALTH,
                this.stats.health + (value || 0)));
        } else if (statName === 'trust') {
            this.stats.trust = Math.max(0, Math.min(100,
                this.stats.trust + (value || 0)));
        } else if (statName === 'mind') {
            this.stats.mind = value || this.stats.mind;
        } else if (statName === 'meds') {
            this.stats.meds = value || this.stats.meds;
        }
    }

    advanceTime(hours) {
        const totalMinutes = this.progress.hour * 60 + this.progress.minute + hours * 60;
        const days = Math.floor(totalMinutes / (24 * 60));
        let remainingMinutes = totalMinutes % (24 * 60);

        this.progress.hour = Math.floor(remainingMinutes / 60);
        this.progress.minute = remainingMinutes % 60;

        for (let i = 0; i < days; i++) {
            this.progress.day++;
            if (this.progress.day > 7) {
                this.progress.day = 1;
                this.progress.week++;
                // end of week processing: check attendance and reset weekly counters
                this._endOfWeekProcessing();
            }
        }

        this.progress.lastRealTimestamp = Date.now();
    }

    // Registrar que el estudiante realizó la visita/actividad evaluativa (asistencia)
    // Devuelve true si se registró, false si ya había visita este mismo día
    registerVisit() {
        const todayKey = `${this.progress.week}-${this.progress.day}`;
        if (this.lastVisitDay === todayKey) {
            return false; // ya registrado hoy
        }
        this.lastVisitDay = todayKey;
        this.visitsThisWeek = (this.visitsThisWeek || 0) + 1;
        // track which specific day numbers had visits
        if (!this.visitDays.includes(this.progress.day)) {
            this.visitDays.push(this.progress.day);
        }
        // small trust boost for attending
        this.updateStat('trust', 5);
        this.addToHistory({ event: 'visit_registered', description: `Visita registrada (sem ${this.progress.week} / día ${this.progress.day})` });
        return true;
    }

    // Called when a week finishes to apply penalties for missed visits and reset counters
    _endOfWeekProcessing() {
        const schedule = this.attendanceSchedule || [1,2,3,4,5];
        const visitDays = this.visitDays || [];
        // Count missed days: scheduled days that were NOT visited
        const missed = schedule.filter(d => !visitDays.includes(d)).length;
        if (missed > 0) {
            // apply penalty per missed visit: reduce trust and health slightly
            const trustPenalty = missed * 8;
            const healthPenalty = missed * 3;
            this.updateStat('trust', -trustPenalty);
            this.updateStat('health', -healthPenalty);
            this.addToHistory({ event: 'missed_visits', description: `Faltaste a ${missed} día(s) programado(s). Penalización aplicada.` });
        } else if (schedule.length > 0) {
            this.addToHistory({ event: 'attendance_ok', description: `Asistencia completa esta semana (${visitDays.length}/${schedule.length} días).` });
        }
        // reset weekly counters
        this.visitsThisWeek = 0;
        this.eventsAnsweredThisWeek = 0;
        this.lastVisitDay = null;
        this.visitDays = [];
        // trigger evaluation cut if needed
        if (this.progress.week % (this.evalConfig.interval || GAME_CONFIG.EVALUATION_INTERVAL_DEFAULT) === 0) {
            this.addToHistory({ event: 'evaluation_cut', description: `Corte de evaluación semana ${this.progress.week}` });
        }
    }

    addToHistory(eventData) {
        this.history.push({
            timestamp: Date.now(),
            ...eventData,
            statsAfter: { ...this.stats }
        });
    }

    reset() {
        Object.assign(this, new GameState());
    }

    toJSON() {
        return JSON.stringify({
            student: this.student,
            patient: this.patient,
            stats: this.stats,
            vitals: this.vitals,
            medications: this.medications,
            diagnoses: this.diagnoses,
            progress: this.progress,
            visitsThisWeek: this.visitsThisWeek,
            eventsAnsweredThisWeek: this.eventsAnsweredThisWeek,
            evalConfig: this.evalConfig,
            lastVisitDay: this.lastVisitDay,
            visitDays: this.visitDays,
            attendanceSchedule: this.attendanceSchedule,
            currentEvent: this.currentEvent,
            history: this.history,
            mood: this.mood,
            consultations: this.consultations
        });
    }

    fromJSON(data) {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        if (data.student) this.student = data.student;
        if (data.patient) this.patient = data.patient;
        if (data.stats) Object.assign(this.stats, data.stats);
        if (data.vitals) Object.assign(this.vitals, data.vitals);
        if (data.medications) this.medications = data.medications;
        if (data.diagnoses) this.diagnoses = data.diagnoses;
        if (data.progress) Object.assign(this.progress, data.progress);
        if (data.currentEvent) this.currentEvent = data.currentEvent;
        if (data.history) this.history = data.history;
        if (data.mood) this.mood = data.mood;
        if (typeof data.visitsThisWeek !== 'undefined') this.visitsThisWeek = data.visitsThisWeek;
        if (typeof data.eventsAnsweredThisWeek !== 'undefined') this.eventsAnsweredThisWeek = data.eventsAnsweredThisWeek;
        if (data.evalConfig) this.evalConfig = data.evalConfig;
        if (typeof data.lastVisitDay !== 'undefined') this.lastVisitDay = data.lastVisitDay;
        if (data.visitDays) this.visitDays = data.visitDays;
        if (data.attendanceSchedule) this.attendanceSchedule = data.attendanceSchedule;
    }

    get week() { return this.progress.week; }
    get day() { return this.progress.day; }
    get hour() { return this.progress.hour; }
    get health() { return this.stats.health; }
    get trust() { return this.stats.trust; }
    get mind() { return this.stats.mind; }
    get meds() { return this.stats.meds; }
}

const gameState = new GameState();
