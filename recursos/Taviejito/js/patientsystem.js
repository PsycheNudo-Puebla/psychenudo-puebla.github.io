const PatientSystem = {
    patientsDB: [
        {
            id: 'don_jose',
            name: 'Don José',
            age: 78,
            gender: 'M',
            conditions: ['Hipertensión', 'Diabetes tipo 2'],
            medications: [
                { name: 'Losartán 50mg', schedule: '08:00', taken: false },
                { name: 'Metformina 850mg', schedule: '14:00', taken: false }
            ],
            personality: 'amable',
            baselineVitals: {
                bloodPressure: '145/90',
                heartRate: 76,
                glucose: 140,
                temperature: 36.4,
                oxygenSat: 96
            },
            riskFactors: ['caídas', 'hipoglucemia'],
            spriteId: 'don_jose'
        },
        {
            id: 'don_pedro',
            name: 'Don Pedro',
            age: 75,
            gender: 'M',
            conditions: ['EPOC', 'Artritis reumatoide'],
            medications: [
                { name: 'Salbutamol inhalador', schedule: '08:00', taken: false },
                { name: 'Prednisona 5mg', schedule: '08:00', taken: false },
                { name: 'Ibuprofeno 400mg', schedule: '20:00', taken: false }
            ],
            personality: 'gruñón',
            baselineVitals: {
                bloodPressure: '125/80',
                heartRate: 85,
                glucose: 105,
                temperature: 36.6,
                oxygenSat: 90
            },
            riskFactors: ['disnea', 'infección respiratoria'],
            spriteId: 'don_pedro'
        },
        {
            id: 'don_miguel',
            name: 'Don Miguel',
            age: 85,
            gender: 'M',
            conditions: ['Parkinson', 'Estreñimiento crónico', 'Hipotensión ortostática'],
            medications: [
                { name: 'Levodopa/Carbidopa 250mg', schedule: '08:00', taken: false },
                { name: 'Lactulosa 15ml', schedule: '20:00', taken: false },
                { name: 'Fludrocortisona 0.1mg', schedule: '08:00', taken: false }
            ],
            personality: 'amable',
            baselineVitals: {
                bloodPressure: '110/70',
                heartRate: 72,
                glucose: 95,
                temperature: 36.1,
                oxygenSat: 95
            },
            riskFactors: ['caídas', 'fracturas', 'aspiración'],
            spriteId: 'don_miguel'
        },
        {
            id: 'dona_maria',
            name: 'Doña María',
            age: 82,
            gender: 'F',
            conditions: ['Osteoartritis', 'Insuficiencia cardíaca', 'Depresión'],
            medications: [
                { name: 'Enalapril 10mg', schedule: '08:00', taken: false },
                { name: 'Furosemida 40mg', schedule: '08:00', taken: false },
                { name: 'Sertralina 50mg', schedule: '20:00', taken: false }
            ],
            personality: 'deprimido',
            baselineVitals: {
                bloodPressure: '130/85',
                heartRate: 80,
                glucose: 100,
                temperature: 36.2,
                oxygenSat: 93
            },
            riskFactors: ['depresión', 'desnutrición', 'edema'],
            spriteId: 'dona_maria'
        },
        {
            id: 'dona_rosa',
            name: 'Doña Rosa',
            age: 80,
            gender: 'F',
            conditions: ['Demencia leve', 'Hipertensión'],
            medications: [
                { name: 'Donepezilo 5mg', schedule: '21:00', taken: false },
                { name: 'Amlodipino 5mg', schedule: '08:00', taken: false }
            ],
            personality: 'ansioso',
            baselineVitals: {
                bloodPressure: '140/88',
                heartRate: 78,
                glucose: 110,
                temperature: 36.3,
                oxygenSat: 97
            },
            riskFactors: ['confusión', 'deambulación', 'caídas'],
            spriteId: 'dona_rosa'
        },
        {
            id: 'dona_elena',
            name: 'Doña Elena',
            age: 76,
            gender: 'F',
            conditions: ['Asma', 'Rinitis alérgica', 'Migraña'],
            medications: [
                { name: 'Montelukast 10mg', schedule: '21:00', taken: false },
                { name: 'Cetirizina 10mg', schedule: '08:00', taken: false },
                { name: 'Sumatriptán 50mg', schedule: 'PRN', taken: false }
            ],
            personality: 'ansioso',
            baselineVitals: {
                bloodPressure: '120/78',
                heartRate: 76,
                glucose: 95,
                temperature: 36.5,
                oxygenSat: 96
            },
            riskFactors: ['crisis asmática', 'alergias estacionales'],
            spriteId: 'dona_elena'
        }
    ],

    selectRandomPatient() {
        const randomIndex = Math.floor(Math.random() * this.patientsDB.length);
        return { ...this.patientsDB[randomIndex] };
    },

    selectPatientById(id) {
        const patient = this.patientsDB.find(p => p.id === id);
        return patient ? { ...patient } : null;
    }
};

// PatientSystem now global
