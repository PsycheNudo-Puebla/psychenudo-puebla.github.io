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
        // Daily flow tracking
        this.eventsAnsweredToday = 0;
        this.evaluativeDoneToday = false;
        this.lastProcessedDay = 1;
        this.consultations = { vitals: 0, mind: 0, meds: 0, diagnosis: 0 };
        // Attendance and weekly tracking
        this.visitsThisWeek = 0; // número de visitas registradas esta semana
        this.eventsAnsweredThisWeek = 0; // contador de eventos contestados (limitar por semana)
        this.evalConfig = { interval: GAME_CONFIG.EVALUATION_INTERVAL_DEFAULT };
        this.lastVisitDay = null; // clave "week-day" del último registro para evitar duplicados
        this.visitDays = []; // días concretos (1-7) que se visitó esta semana
        this.attendanceSchedule = [1, 2, 3, 4, 5]; // días que el alumno se comprometió a asistir (L-V por defecto)
        // Real-time calendar tracking
        this.startDate = null; // ISO date "YYYY-MM-DD" cuando se registró el estudiante
        this.lastVisitDate = null; // ISO date "YYYY-MM-DD" del último día de visita completado
        this.lastRecordedWeek = null; // última semana procesada (para detectar cambios de semana)
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
        // En tiempo real, solo avanzamos hora/minuto dentro del mismo día, sin cambiar el día real.
        // Se capa a las 22:00 (fin de jornada).
        const maxMinute = 22 * 60;
        const currentMinutes = this.progress.hour * 60 + this.progress.minute;
        const newMinutes = Math.min(currentMinutes + hours * 60, maxMinute);
        this.progress.hour = Math.floor(newMinutes / 60);
        this.progress.minute = Math.floor(newMinutes % 60);
        this.progress.lastRealTimestamp = Date.now();
    }

    resetDailyFlags() {
        this.eventsAnsweredToday = 0;
        this.evaluativeDoneToday = false;
        this.lastProcessedDay = this.progress.day;
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

    // ─── SISTEMA DE TIEMPO REAL ────────────────────────────────────────────────
    // Sincroniza el día/semana del juego con la fecha real.
    // Debe llamarse al cargar una partida (en loadSavedGame).
    synchronizeWithRealTime() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const realDayOfWeek = now.getDay(); // 0=Dom
        const gameDay = realDayOfWeek === 0 ? 7 : realDayOfWeek; // 1=Lun...7=Dom

        // 1. Actualizar día de la semana desde la fecha real
        this.progress.day = gameDay;

        // 2. Calcular semana del semestre desde startDate
        if (this.startDate) {
            const start = new Date(this.startDate + 'T00:00:00');
            const diffMs = now.getTime() - start.getTime();
            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
            const calculatedWeek = Math.floor(diffDays / 7) + 1;
            const previousWeek = this.progress.week;
            this.progress.week = Math.max(1, Math.min(calculatedWeek, GAME_CONFIG.SEMESTER_WEEKS || 18));

            // 3. Detectar cambio de semana real → procesar fin de semana anterior
            if (this.lastRecordedWeek != null && this.progress.week > this.lastRecordedWeek) {
                this._endOfWeekProcessing();
            }
            this.lastRecordedWeek = this.progress.week;
        }

        // 4. Detectar si es un nuevo día (distinto a lastVisitDate)
        const isNewDay = !this.lastVisitDate || this.lastVisitDate !== todayStr;
        if (isNewDay) {
            // Calcular y aplicar penalizaciones por visitas perdidas desde la última visita
            if (this.lastVisitDate && this.attendanceSchedule && this.attendanceSchedule.length > 0) {
                const missed = this.calculateMissedVisits(this.lastVisitDate, todayStr);
                if (missed > 0) {
                    const trustPenalty = missed * 8;
                    const healthPenalty = missed * 3;
                    this.updateStat('trust', -trustPenalty);
                    this.updateStat('health', -healthPenalty);
                    this.addToHistory({
                        event: 'missed_visits',
                        description: `Faltaste a ${missed} día(s) programado(s) desde tu última visita. Penalización aplicada.`
                    });
                }
            }
            // Resetear banderas diarias
            this.resetDailyFlags();
            // Reiniciar hora a 8:00 para el nuevo día de visita
            this.progress.hour = GAME_CONFIG.START_HOUR;
            this.progress.minute = 0;
        }

        this.lastVisitDate = todayStr;
        this.progress.lastRealTimestamp = Date.now();
    }

    // Calcula cuántos días de visita programados han pasado entre dos fechas sin visita registrada
    calculateMissedVisits(fromDateStr, toDateStr) {
        const from = new Date(fromDateStr + 'T00:00:00');
        const to = new Date(toDateStr + 'T00:00:00');
        to.setHours(0, 0, 0, 0);
        let missed = 0;
        const current = new Date(from);
        current.setDate(current.getDate() + 1); // Empezar el día después de la última visita

        while (current < to) {
            const realDay = current.getDay(); // 0=Dom
            const gameDay = realDay === 0 ? 7 : realDay;
            if (this.attendanceSchedule && this.attendanceSchedule.includes(gameDay)) {
                missed++;
            }
            current.setDate(current.getDate() + 1);
        }
        return missed;
    }

    // Verifica si hoy (fecha real) es un día de visita según el calendario del alumno
    isTodayVisitingDay() {
        const today = new Date();
        const realDay = today.getDay();
        const gameDay = realDay === 0 ? 7 : realDay;
        return this.attendanceSchedule && this.attendanceSchedule.includes(gameDay);
    }

    // Devuelve el nombre del próximo día de visita (en español, minúscula)
    getNextVisitingDayName() {
        const dayNames = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
        if (!this.attendanceSchedule || this.attendanceSchedule.length === 0) return 'próximo día hábil';

        const today = new Date();
        const realDay = today.getDay();
        const gameDay = realDay === 0 ? 7 : realDay;

        for (let i = 1; i <= 7; i++) {
            const check = gameDay + i;
            const wrapped = check > 7 ? check - 7 : check;
            if (this.attendanceSchedule.includes(wrapped)) {
                const idx = wrapped - 1; // dayNames es 0-indexed
                return dayNames[idx] || 'próximo día hábil';
            }
        }
        return 'próximo día hábil';
    }

    addToHistory(eventData) {
        this.history.push({
            timestamp: Date.now(),
            week: this.progress.week,
            day: this.progress.day,
            ...eventData,
            statsAfter: { ...this.stats }
        });
    }

    reset() {
        const fresh = new GameState();
        Object.assign(this, fresh);
        // Asegurar que los campos de tiempo real se hereden correctamente
        this.startDate = null;
        this.lastVisitDate = null;
        this.lastRecordedWeek = null;
    }

    toJSON() {
        return {
            student: this.student,
            patient: this.patient,
            stats: this.stats,
            vitals: this.vitals,
            medications: this.medications,
            diagnoses: this.diagnoses,
            progress: this.progress,
            visitsThisWeek: this.visitsThisWeek,
            eventsAnsweredThisWeek: this.eventsAnsweredThisWeek,
            eventsAnsweredToday: this.eventsAnsweredToday,
            evaluativeDoneToday: this.evaluativeDoneToday,
            lastProcessedDay: this.lastProcessedDay,
            evalConfig: this.evalConfig,
            lastVisitDay: this.lastVisitDay,
            visitDays: this.visitDays,
            attendanceSchedule: this.attendanceSchedule,
            currentEvent: this.currentEvent,
            history: this.history,
            mood: this.mood,
            consultations: this.consultations,
            // Real-time calendar fields
            startDate: this.startDate,
            lastVisitDate: this.lastVisitDate,
            lastRecordedWeek: this.lastRecordedWeek
        };
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
        if (typeof data.eventsAnsweredToday !== 'undefined') this.eventsAnsweredToday = data.eventsAnsweredToday;
        if (typeof data.evaluativeDoneToday !== 'undefined') this.evaluativeDoneToday = data.evaluativeDoneToday;
        if (typeof data.lastProcessedDay !== 'undefined') this.lastProcessedDay = data.lastProcessedDay;
        if (data.evalConfig) this.evalConfig = data.evalConfig;
        if (typeof data.lastVisitDay !== 'undefined') this.lastVisitDay = data.lastVisitDay;
        if (data.visitDays) this.visitDays = data.visitDays;
        if (data.attendanceSchedule) this.attendanceSchedule = data.attendanceSchedule;
        // Real-time calendar fields
        if (typeof data.startDate !== 'undefined') this.startDate = data.startDate;
        if (typeof data.lastVisitDate !== 'undefined') this.lastVisitDate = data.lastVisitDate;
        if (typeof data.lastRecordedWeek !== 'undefined') this.lastRecordedWeek = data.lastRecordedWeek;
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
