const EventSystem = {
    events: [],
    currentEvent: null,
    optionPage: 0,
    optionsPerPage: 2,
    pendingSelection: null,

    loadEvents(patientId) {
        const general = [
            {
                id: 'gen_001', category: 'psicologia',
                description: 'El paciente se siente triste y sin ganas de hacer nada. La medicación para el dolor podría estar contribuyendo a su estado de ánimo.',
                patientConditions: [], timeOfDay: 'afternoon', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Evaluar escala de depresión geriátrica y revisar efectos secundarios de sus medicamentos', correct: true, feedback: 'CORRECTO. Muchos fármacos (betabloqueantes, benzodiacepinas, corticoides) causan síntomas depresivos. Evaluar ambas dimensiones es clave.', modifiers: { health: 5, trust: 10 }, icon: '💚' },
                    { text: 'Animarle a distraerse con actividades recreativas', correct: false, feedback: 'INCOMPLETO. La distracción ayuda, pero sin evaluar causa farmacológica ni estado emocional profundo, el alivio es temporal.', modifiers: { trust: 5 }, icon: '⚠️' },
                    { text: 'Indicar que es normal sentirse triste a su edad y seguir rutina', correct: false, feedback: 'ERROR. La tristeza persistente NO es normal en el envejecimiento. Puede indicar depresión mayor tratable.', modifiers: { trust: -10, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Administrar antidepresivo de forma inmediata sin evaluación', correct: false, feedback: 'ERROR. Iniciar antidepresivos sin evaluar interacciones con sus otros medicamentos puede tener graves riesgos.', modifiers: { health: -8, trust: -10, mind: 'DEPRESIÓN' }, icon: '💔' }
                ]
            },
            {
                id: 'gen_002', category: 'psicologia',
                description: 'El paciente está irritable y responde con groserías. Notas que no ha tomado su medicación para la presión arterial.',
                patientConditions: [], timeOfDay: 'morning', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Mantener la calma, preguntar por qué no tomó la medicación y explorar su malestar emocional', correct: true, feedback: 'CORRECTO. La irritabilidad puede ser síntoma de hipertensión no controlada, ansiedad o efecto adverso. Abordar la causa y no la conducta.', modifiers: { health: 5, trust: 15 }, icon: '💚' },
                    { text: 'Llamarle la atención por su mal comportamiento', correct: false, feedback: 'ERROR. Confrontar incrementa la ansiedad y daña la relación terapéutica. La conducta es una forma de comunicación.', modifiers: { trust: -15, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Administrar su antihipertensivo sin más preguntas', correct: false, feedback: 'INCOMPLETO. Tratar solo el síntoma físico sin abordar el trasfondo emocional pierde la oportunidad de cuidado integral.', modifiers: { health: 3, trust: -5 }, icon: '⚠️' },
                    { text: 'Medir su presión arterial antes de decidir qué hacer', correct: false, feedback: 'INCOMPLETO. Medir la PA es correcto, pero sin explorar el malestar emocional subyacente se pierde la visión integral del paciente.', modifiers: { health: 3, trust: 3 }, icon: '🔍' }
                ]
            },
            {
                id: 'gen_003', category: 'psicologia',
                description: 'El paciente no quiere comer. Dice que la comida "sabe raro" y que prefiere no probarla. Está tomando antibióticos.',
                patientConditions: [], timeOfDay: 'afternoon', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Revisar efectos secundarios de antibióticos (disgeusia) y ofrecer alternativas alimenticias', correct: true, feedback: 'CORRECTO. Muchos fármacos alteran el gusto. La inapetencia prolongada lleva a desnutrición y deterioro funcional.', modifiers: { health: 10, trust: 10 }, icon: '💚' },
                    { text: 'Insistir en que debe comer aunque no le guste', correct: false, feedback: 'ERROR. Forzar la alimentación genera rechazo y puede provocar atragantamiento. La causa puede ser médica, no obstinación.', modifiers: { health: -5, trust: -15, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Preguntar qué alimentos le gustaría y preparar algo especial', correct: false, feedback: 'BUENA INTENCIÓN pero incompleto. Aborda el síntoma sin investigar la causa farmacológica subyacente.', modifiers: { trust: 8, health: 3 }, icon: '⚠️' },
                    { text: 'Ofrecer un batido nutricional como complemento mientras pasa el efecto del antibiótico', correct: false, feedback: 'AYUDA PARCIAL. El batido aporta nutrientes pero no resuelve la disgeusia. Abordar la causa farmacológica sigue siendo prioritario.', modifiers: { health: 3, trust: 5 }, icon: '🥤' }
                ]
            },
            {
                id: 'gen_004', category: 'social',
                description: 'El paciente menciona que su familia no lo visita y se siente abandonado. Tiene diagnóstico de diabetes y a veces olvida su insulina.',
                patientConditions: [], timeOfDay: 'evening', weeks: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Explorar sentimientos de abandono, contactar a la familia y revisar red de apoyo', correct: true, feedback: 'CORRECTO. El aislamiento social acelera el deterioro cognitivo. La falta de apoyo también afecta la adherencia a tratamientos como la insulina.', modifiers: { trust: 20, mind: 'OK' }, icon: '💚' },
                    { text: 'Decirle que la familia tiene sus propias vidas y debe entenderlo', correct: false, feedback: 'ERROR. Minimizar el abandono profundiza la soledad y la depresión. El adulto mayor necesita vínculos significativos.', modifiers: { trust: -20, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Ofrecerse a acompañarlo un rato para que se sienta mejor', correct: false, feedback: 'BUENA ACCIÓN pero insuficiente. La solución debe ser sostenible e involucrar a la red familiar, no solo al personal.', modifiers: { trust: 8, mind: 'OK' }, icon: '⚠️' },
                    { text: 'Contactar a la familia para informarles que debe visitarlo más seguido', correct: false, feedback: 'CONFRONTATIVO. Exigir visitas puede tensionar la relación familiar. Es mejor explorar las barreras que impiden las visitas.', modifiers: { trust: -10 }, icon: '📞' }
                ]
            },
            {
                id: 'gen_005', category: 'psicologia',
                description: 'El paciente está muy ansioso, caminando de un lado a otro. Revisa repetidamente sus pertenencias. Su frecuencia cardíaca está elevada.',
                patientConditions: ['Ansiedad'], timeOfDay: 'evening', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Hablar con voz calmada, preguntar qué le preocupa y verificar si tomó su medicación ansiolítica', correct: true, feedback: 'CORRECTO. La ansiedad en adultos mayores suele estar infradiagnosticada. La taquicardia puede ser por ansiedad o efecto adverso.', modifiers: { mind: 'OK', trust: 15, health: 5 }, icon: '💚' },
                    { text: 'Sujetarlo suavemente para que se calme', correct: false, feedback: 'ERROR. La sujeción aumenta la angustia y puede ser traumática. Siempre preferir abordaje verbal.', modifiers: { trust: -20, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Administrar un ansiolítico sin evaluación previa', correct: false, feedback: 'ERROR. Medicar sin explorar la causa puede enmascarar un problema mayor como dolor, hipoglucemia o síndrome de abstinencia.', modifiers: { health: -5, trust: -10 }, icon: '⚠️' },
                    { text: 'Llevarlo a un lugar tranquilo y ofrecerle agua', correct: false, feedback: 'UTIL pero incompleto. El entorno tranquilo ayuda, pero se necesita evaluar la causa raíz de la ansiedad.', modifiers: { mind: 'OK', trust: 5 }, icon: '🔍' }
                ]
            },
            {
                id: 'gen_006', category: 'psicologia',
                description: 'El paciente repite las mismas preguntas una y otra vez. Su hija comenta que "siempre fue muy olvidadizo" pero nota que ha empeorado.',
                patientConditions: [], timeOfDay: 'morning', weeks: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Realizar evaluación cognitiva breve (MMSE) y revisar si toma anticolinérgicos que afectan la memoria', correct: true, feedback: 'CORRECTO. El deterioro cognitivo puede ser por demencia o por fármacos anticolinérgicos (comunes en adultos mayores). Distinguir es crucial.', modifiers: { health: 5, trust: 15, mind: 'OK' }, icon: '💚' },
                    { text: 'Tranquilizar a la hija diciendo que es normal a su edad', correct: false, feedback: 'ERROR. El olvido patológico NO es normal. Normalizar retrasa el diagnóstico de demencia tratable o reversible.', modifiers: { trust: -10, mind: 'CONFUSO' }, icon: '💔' },
                    { text: 'Responder con paciencia cada vez que repite la pregunta', correct: false, feedback: 'BUENA ACTITUD pero insuficiente. La paciencia es importante, pero sin evaluación no se determina si es progresivo ni su causa.', modifiers: { trust: 5 }, icon: '⚠️' },
                    { text: 'Animar al paciente a hacer ejercicios de memoria diariamente', correct: false, feedback: 'INSUFICIENTE. Los ejercicios cognitivos ayudan pero no reemplazan la evaluación diagnóstica ni la revisión de medicamentos anticolinérgicos.', modifiers: { trust: 3, mind: 'OK' }, icon: '🧩' }
                ]
            },
            {
                id: 'gen_007', category: 'medicina',
                description: 'El paciente tiene dolor de cabeza intenso y visión borrosa. PA: 165/100 mmHg.',
                patientConditions: ['Hipertensión'], timeOfDay: 'morning', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                requiresCheck: ['vitals'],
                options: [
                    { text: 'Administrar antihipertensivo de rescate, mantener reposo y reevaluar en 30 minutos', correct: true, feedback: 'CORRECTO. Cefalea + PA elevada + visión borrosa = emergencia hipertensiva. El manejo oportuno previene daño a órgano blanco.', modifiers: { health: 10, trust: 10 }, icon: '💚' },
                    { text: 'Dar analgésico y recomendar descanso', correct: false, feedback: 'ERROR. La cefalea es síntoma de la crisis hipertensiva, no la causa. El analgésico no trata la PA elevada.', modifiers: { health: -15, trust: -5 }, icon: '💔' },
                    { text: 'Llamar al médico de guardia para reportar valores', correct: true, feedback: 'CORRECTO también. Ante duda, escalar el caso es siempre una opción válida y segura.', modifiers: { health: 5, trust: 10 }, icon: '💚' },
                    { text: 'Aplicar compresas frías y bajar las luces de la habitación para aliviar el dolor', correct: false, feedback: 'INSUFICIENTE. Las medidas de confort no tratan una emergencia hipertensiva. Se requiere intervención farmacológica urgente.', modifiers: { health: -10, trust: -5 }, icon: '⚠️' }
                ]
            },
            {
                id: 'gen_008', category: 'psicologia',
                description: 'El paciente se muestra apático y desinteresado. Antes disfrutaba de la jardinería pero ahora ni siquiera mira por la ventana.',
                patientConditions: ['Depresión'], timeOfDay: 'afternoon', weeks: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Evaluar anhedonia con escala específica, revisar medicación y ofrecer actividad adaptada', correct: true, feedback: 'CORRECTO. La anhedonia es síntoma cardinal de depresión. La falta de interés también puede ser por fármacos o dolor crónico.', modifiers: { mind: 'OK', trust: 15, health: 5 }, icon: '💚' },
                    { text: 'Respetar su espacio y no forzarlo a actividades', correct: false, feedback: 'INCOMPLETO. Respetar está bien pero la pasividad terapéutica puede cronificar la depresión. Hay que intervenir activamente.', modifiers: { trust: 5 }, icon: '⚠️' },
                    { text: 'Anotar en su expediente que está "desmotivado" sin acción', correct: false, feedback: 'ERROR. Documentar sin intervenir es omisión de cuidado. La depresión geriátrica tiene alta mortalidad si no se trata.', modifiers: { trust: -5, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Organizar una salida grupal al jardín con otros residentes', correct: false, feedback: 'INSUFICIENTE. La actividad grupal puede ser beneficiosa pero sin evaluar la depresión ni la medicación, se pierde la oportunidad de tratar la causa raíz.', modifiers: { trust: 5, mind: 'OK' }, icon: '🌿' }
                ]
            }
        ];

        const don_jose = [
            { id: 'j_psico_01', category: 'psicologia', description: 'Don José se siente inútil porque ya no puede hacer las cosas que hacía antes. Su presión está controlada pero su autoestima está por el suelo.', patientConditions: ['Hipertensión', 'Diabetes tipo 2'], requiresCheck: ['vitals', 'mind'], timeOfDay: 'afternoon', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Validar su sentir, recordarle lo que SÍ puede hacer y proponer actividades adaptadas a sus capacidades', correct: true, feedback: 'CORRECTO. La pérdida de rol es un duelo. La terapia de reminiscencia y actividades significativas mejoran autoestima y adherencia al tratamiento.', modifiers: { mind: 'OK', trust: 20, health: 5 }, icon: '💚' },
                    { text: 'Decirle que debe aceptar su nueva condición', correct: false, feedback: 'ERROR. "Aceptar" sin proceso de duelo es invalidante. El adulto mayor necesita apoyo para reconstruir su identidad.', modifiers: { trust: -15, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Enfocarse solo en controlar sus signos vitales', correct: false, feedback: 'INCOMPLETO. El cuidado integral incluye salud mental. Ignorar el aspecto emocional afecta la adherencia al tratamiento médico.', modifiers: { health: 3, trust: -5 }, icon: '⚠️' },
                    { text: 'Asignarle tareas simples dentro de sus capacidades actuales para darle propósito', correct: false, feedback: 'INCOMPLETO. Asignar tareas sin validar primero su sentir puede percibirse como desinterés por su sufrimiento emocional.', modifiers: { trust: 3, mind: 'OK' }, icon: '🌱' }
                ]
            },
            { id: 'j_med_01', category: 'medicina', description: 'Don José olvidó si tomó su metformina. Está confundido y preocupado por su glucosa.', patientConditions: ['Diabetes tipo 2'], requiresCheck: ['meds'], timeOfDay: 'morning', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Revisar pastillero, verificar glucemia capilar y educar sobre sistema de recordatorio', correct: true, feedback: 'CORRECTO. La confusión sobre medicación es frecuente. Sistemas de pastillero y alarma mejoran adherencia y reducen ansiedad.', modifiers: { health: 5, trust: 15, mind: 'OK' }, icon: '💚' },
                    { text: 'Decirle que se salte la dosis por esta vez', correct: false, feedback: 'ERROR. Saltar dosis de metformina puede descompensar la glucosa. Siempre verificar antes de decidir.', modifiers: { health: -10, trust: -5 }, icon: '⚠️' },
                    { text: 'Reñirle por no llevar control de sus pastillas', correct: false, feedback: 'ERROR. Los regaños generan vergüenza y el paciente ocultará futuros olvidos, empeorando la adherencia.', modifiers: { trust: -20, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Administrar la metformina y ajustar la próxima dosis para compensar', correct: false, feedback: 'ERROR. Nunca duplicar ni ajustar dosis sin certeza. Si ya la tomó, otra dosis puede causar hipoglucemia severa.', modifiers: { health: -15, trust: -10 }, icon: '💔' }
                ]
            },
            { id: 'j_psico_02', category: 'psicologia', description: 'Don José está irritable y acusó a otro residente de esconder sus pertenencias. Su glucosa está en 190 mg/dL.', patientConditions: ['Diabetes tipo 2', 'Hipertensión'], requiresCheck: ['vitals', 'mind'], timeOfDay: 'afternoon', weeks: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Mantener la calma, ayudarle a buscar sus cosas y verificar si la hiperglucemia está afectando su estado de ánimo', correct: true, feedback: 'CORRECTO. La hiperglucemia causa irritabilidad y confusión. Abordar la glucemia puede resolver el síntoma conductual.', modifiers: { health: 8, trust: 15, mind: 'OK' }, icon: '💚' },
                    { text: 'Exigirle que se disculpe con el otro residente', correct: false, feedback: 'ERROR. Exigir disculpas cuando hay un componente médico involucrado es contraproducente. Tratar la causa primero.', modifiers: { trust: -15, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Alejar al otro residente para evitar conflicto', correct: false, feedback: 'SOLUCIÓN TEMPORAL. Separarlos evita el conflicto inmediato pero no aborda la hiperglucemia subyacente ni la paranoia.', modifiers: { health: -5 }, icon: '⚠️' },
                    { text: 'Aplicar técnica de contención verbal sin abordar la glucosa', correct: false, feedback: 'INCOMPLETO. La contención verbal ayuda pero la hiperglucemia de 190 mg/dL puede estar contribuyendo a su irritabilidad.', modifiers: { trust: 3, health: 3 }, icon: '🔍' }
                ]
            }
        ];

        const don_pedro = [
            { id: 'p_psico_01', category: 'psicologia', description: 'Don Pedro se niega a usar su oxígeno porque dice que "lo hace ver enfermo". Le preocupa lo que su familia piense.', patientConditions: ['EPOC'], requiresCheck: ['vitals', 'mind'], timeOfDay: 'morning', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Validar su preocupación por la imagen, explicar beneficios del oxígeno y mostrarle dispositivos discretos', correct: true, feedback: 'CORRECTO. La adherencia al oxígeno mejora cuando el paciente participa en la elección del dispositivo. La imagen corporal importa.', modifiers: { trust: 20, health: 10, mind: 'OK' }, icon: '💚' },
                    { text: 'Insistir en que debe usarlo sin discusión', correct: false, feedback: 'ERROR. Imponer tratamientos sin validar emociones genera resistencia pasiva. El paciente lo usará a escondidas o no lo usará.', modifiers: { trust: -15, health: -5, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Llamar a la familia y pedirles que le digan que lo use', correct: false, feedback: 'INCOMPLETO. Involucrar a la familia puede ayudar, pero evadir la conversación directa con el paciente daña la alianza terapéutica.', modifiers: { trust: -5 }, icon: '⚠️' },
                    { text: 'Reducir el flujo de oxígeno para hacerlo más cómodo y que lo acepte', correct: false, feedback: 'ERROR. Reducir el oxígeno sin criterio médico puede comprometer su saturación. Mejor educar y negociar el uso.', modifiers: { health: -10, trust: -5 }, icon: '⚠️' }
                ]
            },
            { id: 'p_med_01', category: 'medicina', description: 'Don Pedro tiene saturación de 85% y está agitado. Dice que siente que se ahoga.', patientConditions: ['EPOC'], requiresCheck: ['vitals'], timeOfDay: 'evening', weeks: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Administrar oxígeno a 2-3 L/min, sentarlo en Fowler y solicitar evaluación médica urgente', correct: true, feedback: 'CORRECTO. SatO2 <88% con agitación = emergencia. La posición Fowler optimiza la mecánica ventilatoria.', modifiers: { health: 15, trust: 15 }, icon: '💚' },
                    { text: 'Aumentar el oxígeno al máximo disponible', correct: false, feedback: 'ERROR. En EPOC, oxígeno en exceso puede suprimir el impulso respiratorio. Debe administrarse a la menor concentración efectiva.', modifiers: { health: -10 }, icon: '💔' },
                    { text: 'Darle una bolsa de papel para que respire', correct: false, feedback: 'ERROR GRAVE. La respiración con bolsa de papel en EPOC puede empeorar la hipoxia. Es un mito peligroso.', modifiers: { health: -25, trust: -20 }, icon: '💔' },
                    { text: 'Tranquilizarlo verbalmente y medir saturación de nuevo en 5 min', correct: false, feedback: 'INCOMPLETO. La agitación verbal sin oxígeno no resuelve la hipoxia. Requiere intervención inmediata.', modifiers: { trust: 3, health: -5 }, icon: '⚠️' }
                ]
            },
            { id: 'p_psico_02', category: 'psicologia', description: 'Don Pedro está somnoliento y confundido. Su hija dice que ha perdido interés en sus terapias respiratorias.', patientConditions: ['EPOC', 'Artritis reumatoide'], requiresCheck: ['vitals', 'meds'], timeOfDay: 'afternoon', weeks: [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Evaluar si la somnolencia es por hipoxia crónica, efecto de corticoides o depresión respiratoria', correct: true, feedback: 'CORRECTO. La somnolencia en EPOC puede ser por retención de CO2, efecto adverso de corticoides o depresión. La apatía puede ser depresión secundaria.', modifiers: { health: 10, trust: 10, mind: 'OK' }, icon: '💚' },
                    { text: 'Despertarlo y animarlo a hacer sus ejercicios respiratorios', correct: false, feedback: 'ERROR. Forzar actividad cuando hay somnolencia puede ser peligroso. Primero descartar hipoxia o hipercapnia.', modifiers: { health: -10, trust: -5 }, icon: '⚠️' },
                    { text: 'Asumir que está deprimido y referir a psicología', correct: false, feedback: 'INCOMPLETO. Derivar es correcto, pero sin descartar causa orgánica (hipoxia, fármacos) se puede pasar por alto una emergencia médica.', modifiers: { mind: 'OK', trust: 5 }, icon: '🔍' },
                    { text: 'Suspender temporalmente los corticoides por sospecha de efecto adverso', correct: false, feedback: 'ERROR. Suspender medicación sin orden médica es peligroso. Los corticoides no se suspenden abruptamente.', modifiers: { health: -15, trust: -15 }, icon: '💔' }
                ]
            }
        ];

        const don_miguel = [
            { id: 'm_psico_01', category: 'psicologia', description: 'Don Miguel está frustrado porque su Parkinson le impide comer solo. Derrama la comida y se siente avergonzado.', patientConditions: ['Parkinson'], requiresCheck: ['mind'], timeOfDay: 'afternoon', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Normalizar su frustración, ofrecer cubiertos adaptados y asistir discretamente durante la comida', correct: true, feedback: 'CORRECTO. Preservar la dignidad durante la alimentación es prioritario. Las adaptaciones y asistencia respetuosa mejoran autoestima y nutrición.', modifiers: { trust: 20, mind: 'OK', health: 5 }, icon: '💚' },
                    { text: 'Darle de comer para evitar que derrame', correct: false, feedback: 'ERROR. La sobreasistencia acelera la dependencia funcional. El paciente pierde autonomía y autoestima.', modifiers: { trust: -15, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Decirle que no se preocupe, que ya lo limpiarán', correct: false, feedback: 'INVALIDANTE. Minimizar su sentir no alivia la vergüenza. La dignidad del paciente debe ser prioridad.', modifiers: { trust: -10, mind: 'TRISTE' }, icon: '💔' },
                    { text: 'Evaluar si la medicación antiparkinsoniana está en hora óptima', correct: true, feedback: 'CORRECTO también. Los temblores empeoran cuando la medicación está al final de su efecto. Programar comidas en horas "on" es clave.', modifiers: { health: 8, trust: 10 }, icon: '💚' }
                ]
            },
            { id: 'm_med_01', category: 'medicina', description: 'Don Miguel tiene rigidez severa y no puede levantarse de la silla. Su próxima dosis de Levodopa es en 4 horas.', patientConditions: ['Parkinson'], requiresCheck: ['meds'], timeOfDay: 'morning', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Verificar hora de última dosis, contactar al médico para ajuste y ayudarlo a movilizarse suavemente', correct: true, feedback: 'CORRECTO. El fenómeno "fin de dosis" es común en Parkinson. Ajustar horarios mejora la función motora y previene caídas.', modifiers: { health: 10, trust: 15 }, icon: '💚' },
                    { text: 'Esperar a la siguiente dosis programada sin intervenir', correct: false, feedback: 'ERROR. 4 horas de rigidez severa aumenta riesgo de caídas, contracturas y dolor. Reportar al médico es necesario.', modifiers: { health: -10, trust: -10 }, icon: '⚠️' },
                    { text: 'Forzarlo a levantarse para que no pierda movilidad', correct: false, feedback: 'ERROR GRAVE. Forzar la movilización con rigidez severa puede causar fracturas o lesiones musculares.', modifiers: { health: -20, trust: -20 }, icon: '💔' },
                    { text: 'Administrar la Levodopa ahora y adelantar la dosis', correct: false, feedback: 'ERROR. Adelantar dosis sin orden médica puede causar discinesias o efectos adversos. Contactar al médico es lo correcto.', modifiers: { health: -10, trust: -10 }, icon: '💔' }
                ]
            },
            { id: 'm_psico_02', category: 'psicologia', description: 'Don Miguel llora y dice que es una carga para todos. Su hija dejó de visitarlo porque "no soporta verlo así".', patientConditions: ['Parkinson', 'Estreñimiento crónico'], requiresCheck: ['mind'], timeOfDay: 'evening', weeks: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Sentarse a su lado, validar su dolor y ofrecer contacto con trabajadora social para apoyo familiar', correct: true, feedback: 'CORRECTO. El sentimiento de carga es factor de riesgo suicida en Parkinson. La intervención familiar es parte del tratamiento.', modifiers: { mind: 'OK', trust: 25 }, icon: '💚' },
                    { text: 'Decirle que su hija lo ama aunque no venga', correct: false, feedback: 'ERROR. Justificar el abandono invalida su dolor real. Necesita apoyo, no excusas.', modifiers: { trust: -15, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Derivar a psicología y registrar en expediente', correct: false, feedback: 'INCOMPLETO. Derivar es necesario pero el primer contacto terapéutico debe ser usted. La derivación fría se siente como rechazo.', modifiers: { mind: 'OK', trust: 5 }, icon: '🔍' },
                    { text: 'Sugerirle que llame a su hija para invitarla a visitarlo', correct: false, feedback: 'INSUFICIENTE. Que el paciente gestione el contacto familiar puede ser positivo, pero sin intervención profesional la dinámica familiar dañada no se repara sola.', modifiers: { trust: 3, mind: 'OK' }, icon: '📞' }
                ]
            },
            { id: 'm_med_02', category: 'medicina', description: 'Don Miguel lleva 5 días sin evacuar. Tiene dolor abdominal y está muy inquieto.', patientConditions: ['Parkinson', 'Estreñimiento crónico'], requiresCheck: ['meds', 'vitals'], timeOfDay: 'afternoon', weeks: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Evaluar impacto del estreñimiento en su estado de ánimo, revisar hidratación y administrar laxante con autorización médica', correct: true, feedback: 'CORRECTO. El estreñimiento en Parkinson afecta significativamente la calidad de vida. El dolor abdominal aumenta la irritabilidad y la confusión.', modifiers: { health: 10, trust: 15, mind: 'OK' }, icon: '💚' },
                    { text: 'Solicitar una radiografía abdominal de inmediato', correct: false, feedback: 'SOBREDIAGNÓSTICO. Sin signos de obstrucción, la radiografía no es de primera línea. El manejo conservador debe intentarse primero.', modifiers: { health: -3 }, icon: '⚠️' },
                    { text: 'Indicar que aumente la fibra en la próxima comida', correct: false, feedback: 'INSUFICIENTE. 5 días sin evacuar con dolor requiere intervención más allá de fibra dietética. Evaluar impacto emocional también.', modifiers: { health: -5, trust: -5 }, icon: '⚠️' },
                    { text: 'Masajear suavemente el abdomen para estimular el movimiento intestinal', correct: false, feedback: 'AYUDA COMPLEMENTARIA. El masaje puede aliviar temporalmente pero no resuelve el estreñimiento crónico del Parkinson sin intervención farmacológica.', modifiers: { health: 2, trust: 5 }, icon: '🤲' }
                ]
            }
        ];

        const dona_maria = [
            { id: 'ma_psico_01', category: 'psicologia', description: 'Doña María no deja de llorar. Dice que su vida ya no tiene sentido desde que enviudó. Su presión está elevada (150/95).', patientConditions: ['Insuficiencia cardíaca', 'Depresión'], requiresCheck: ['vitals', 'mind'], timeOfDay: 'evening', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Validar su duelo, evaluar riesgo suicida y explicar que el estrés emocional eleva la presión', correct: true, feedback: 'CORRECTO. El duelo complicado en adultos mayores requiere intervención. El estrés emocional eleva catecolaminas y descompensa la insuficiencia cardíaca.', modifiers: { mind: 'OK', trust: 20, health: 8 }, icon: '💚' },
                    { text: 'Administrar antihipertensivo y dejarla sola para que procese su duelo', correct: false, feedback: 'ERROR. Dejarla sola con ideación de muerte es peligroso. El riesgo suicida en viudez reciente es alto.', modifiers: { health: 5, trust: -10, mind: 'DEPRESIÓN' }, icon: '💔' },
                    { text: 'Distraerla con actividades grupales para que no piense en eso', correct: false, feedback: 'INCOMPLETO. La distracción no procesa el duelo. La evitación emocional retrasa la elaboración de la pérdida.', modifiers: { mind: 'TRISTE', trust: 5 }, icon: '⚠️' },
                    { text: 'Referir a psicología y monitorear presión cada hora', correct: true, feedback: 'CORRECTO también. Abordaje interdisciplinario: salud mental + monitoreo cardiovascular.', modifiers: { health: 5, trust: 10, mind: 'OK' }, icon: '💚' }
                ]
            },
            { id: 'ma_med_01', category: 'medicina', description: 'Doña María tiene los tobillos muy hinchados y ha ganado 2 kg en 3 días. Le cuesta respirar al acostarse.', patientConditions: ['Insuficiencia cardíaca'], requiresCheck: ['vitals'], timeOfDay: 'morning', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Evaluar signos de descompensación, restringir líquidos, administrar diurético y elevar extremidades', correct: true, feedback: 'CORRECTO. Aumento de peso + edema + disnea = signos de insuficiencia cardíaca descompensada. Manejo inmediato.', modifiers: { health: 15, trust: 10 }, icon: '💚' },
                    { text: 'Indicarle que camine para activar la circulación', correct: false, feedback: 'ERROR. El ejercicio en IC descompensada empeora la disnea y puede precipitar una crisis.', modifiers: { health: -20, trust: -10 }, icon: '💔' },
                    { text: 'Reducir la ingesta de sal en las comidas', correct: false, feedback: 'INSUFICIENTE. La restricción de sal ayuda a largo plazo pero no resuelve la descompensación aguda con edema y disnea.', modifiers: { health: -5 }, icon: '⚠️' },
                    { text: 'Colocar a la paciente en posición Fowler y monitorizar saturación', correct: false, feedback: 'INCOMPLETO. La posición Fowler es correcta pero sin administrar diurético ni restringir líquidos, la descompensación cardíaca no se resuelve.', modifiers: { health: 3, trust: 5 }, icon: '🔍' }
                ]
            },
            { id: 'ma_psico_02', category: 'psicologia', description: 'Doña María no quiere tomar su diurético porque "la hace ir al baño cada rato". Prefiere sentirse hinchada a tener accidentes.', patientConditions: ['Insuficiencia cardíaca', 'Depresión'], requiresCheck: ['meds', 'mind'], timeOfDay: 'morning', weeks: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Explicar la importancia del diurético para su corazón y planear horarios que no interrumpan su descanso', correct: true, feedback: 'CORRECTO. La negociación del tratamiento respetando las necesidades del paciente mejora la adherencia. La incontinencia es una preocupación real y válida.', modifiers: { trust: 20, health: 8, mind: 'OK' }, icon: '💚' },
                    { text: 'Decirle que es preferible a estar hospitalizada de nuevo', correct: false, feedback: 'ERROR. Usar el miedo como motivación daña la relación terapéutica. Mejor educar con empatía.', modifiers: { trust: -10, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Aceptar su decisión y suspender el diurético', correct: false, feedback: 'ERROR. Sin el diurético, la insuficiencia cardíaca se descompensará. Buscar alternativas, no rendirse.', modifiers: { health: -15, trust: 5 }, icon: '💔' },
                    { text: 'Ofrecer pañales o adaptaciones para mayor comodidad', correct: true, feedback: 'CREATIVO y correcto. Resolver la barrera práctica (incontinencia) permite mantener el tratamiento cardíaco necesario.', modifiers: { trust: 15, health: 10 }, icon: '💚' }
                ]
            }
        ];

        const dona_rosa = [
            { id: 'r_psico_01', category: 'psicologia', description: 'Doña Rosa está agitada, no reconoce su habitación y quiere "irse a su casa". Tiene los ojos vidriosos.', patientConditions: ['Demencia leve', 'Hipertensión'], requiresCheck: ['mind', 'vitals'], timeOfDay: 'evening', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Validar su deseo de "irse a casa", redirigir con calma y verificar si el síndrome confusional es por hipertensión o infección', correct: true, feedback: 'CORRECTO. El "querer irse a casa" en demencia expresa necesidad de seguridad. El síndrome confusional agudo puede ser por HTA, infección o efectos adversos.', modifiers: { mind: 'OK', trust: 20, health: 8 }, icon: '💚' },
                    { text: 'Decirle claramente que esta es su casa ahora', correct: false, feedback: 'ERROR. La confrontación directa en demencia aumenta la angustia. La realidad del paciente es su verdad.', modifiers: { trust: -15, mind: 'CONFUSO' }, icon: '💔' },
                    { text: 'Sujetarla para que no deambule', correct: false, feedback: 'ERROR GRAVE. La sujeción en demencia es traumática y contraproducente. Siempre agotar estrategias verbales y ambientales primero.', modifiers: { trust: -25, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Llevarla a un lugar tranquilo y ofrecerle una taza de té', correct: true, feedback: 'ESTRATEGIA VÁLIDA. La reducción de estímulos y el ritual reconfortante ayudan a orientar en crisis de demencia.', modifiers: { mind: 'OK', trust: 10 }, icon: '💚' }
                ]
            },
            { id: 'r_psico_02', category: 'psicologia', description: 'Doña Rosa escondió sus medicamentos porque dice que "la quieren envenenar". No ha tomado su antihipertensivo en 2 días.', patientConditions: ['Demencia leve', 'Hipertensión'], requiresCheck: ['meds', 'mind'], timeOfDay: 'morning', weeks: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'No confrontar la idea, buscar los medicamentos juntos y administrarlos en otro momento', correct: true, feedback: 'CORRECTO. El delirio de persecución en demencia no se discute. Redirigir y buscar ventana de cooperación es la estrategia indicada.', modifiers: { trust: 15, health: 5, mind: 'OK' }, icon: '💚' },
                    { text: 'Explicarle detalladamente que son para su presión', correct: false, feedback: 'ERROR. Razonar con ideas delirantes no funciona. La lógica no penetra el delirio y la insistencia aumenta la desconfianza.', modifiers: { trust: -10, mind: 'CONFUSO' }, icon: '🌀' },
                    { text: 'Triturar la medicación y darla en la comida', correct: false, feedback: 'ERROR. Administrar medicación sin consentimiento viola la autonomía del paciente. Además, triturar altera la absorción de algunos fármacos.', modifiers: { health: -5, trust: -20 }, icon: '💔' },
                    { text: 'Reportar al médico y explorar alternativa de presentación líquida', correct: true, feedback: 'CORRECTO. Adaptar la presentación del medicamento puede resolver la resistencia. Buscar alternativas creativas es parte del cuidado.', modifiers: { health: 8, trust: 10 }, icon: '💚' }
                ]
            },
            { id: 'r_med_01', category: 'medicina', description: 'Doña Rosa tiene PA 175/105. Está más confusa de lo habitual y no responde a estímulos verbales.', patientConditions: ['Demencia leve', 'Hipertensión'], requiresCheck: ['vitals'], timeOfDay: 'morning', weeks: [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Administrar antihipertensivo sublingual, monitorear cada 15 min y evaluar nivel de conciencia', correct: true, feedback: 'CORRECTO. PA >170 + confusión aguda = emergencia hipertensiva con afectación neurológica. Manejo inmediato.', modifiers: { health: 15, trust: 10 }, icon: '💚' },
                    { text: 'Esperar a que se calme para tomarle la presión de nuevo', correct: false, feedback: 'ERROR. La confusión aguda con PA muy elevada puede indicar encefalopatía hipertensiva. No esperar.', modifiers: { health: -25, trust: -10 }, icon: '💔' },
                    { text: 'Administrar su antihipertensivo oral habitual', correct: false, feedback: 'INSUFICIENTE. La vía oral tiene absorción lenta en crisis. Se requiere vía sublingual o intravenosa para acción rápida.', modifiers: { health: -5 }, icon: '⚠️' },
                    { text: 'Realizar un ECG para descartar afectación cardíaca por la crisis hipertensiva', correct: false, feedback: 'INSUFICIENTE. El ECG es útil pero no urgente. Lo prioritario es bajar la PA. La confusión aguda indica posible encefalopatía hipertensiva.', modifiers: { health: -3, trust: 3 }, icon: '📊' }
                ]
            }
        ];

        const dona_elena = [
            { id: 'e_psico_01', category: 'psicologia', description: 'Doña Elena está angustiada porque no puede respirar bien. Siente miedo de ahogarse mientras duerme. Su saturación es 91%.', patientConditions: ['Asma', 'Migraña'], requiresCheck: ['vitals', 'mind'], timeOfDay: 'evening', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Sentarla erguida, administrar broncodilatador y abordar el miedo a la disnea con técnicas de respiración', correct: true, feedback: 'CORRECTO. El miedo a la disnea crea un ciclo de ansiedad que empeora la respiración. Abordar ambas dimensiones rompe el ciclo.', modifiers: { health: 10, trust: 15, mind: 'OK' }, icon: '💚' },
                    { text: 'Administrar oxígeno y decirle que no se preocupe', correct: false, feedback: 'INCOMPLETO. El oxígeno ayuda pero sin abordar el componente emocional, la ansiedad por disnea recurrirá.', modifiers: { health: 5, trust: 5, mind: 'ANSIEDAD' }, icon: '⚠️' },
                    { text: 'Indicar que está exagerando, que su saturación no está tan baja', correct: false, feedback: 'ERROR GRAVE. Invalidar la percepción del paciente daña la confianza. La disnea es subjetiva y debe ser respetada.', modifiers: { trust: -20, mind: 'ANSIEDAD' }, icon: '💔' },
                    { text: 'Enseñarle la técnica de respiración con labios fruncidos', correct: true, feedback: 'CORRECTO también. La técnica de labios fruncidos da control al paciente sobre su respiración y reduce la ansiedad.', modifiers: { health: 5, trust: 10, mind: 'OK' }, icon: '💚' }
                ]
            },
            { id: 'e_psico_02', category: 'psicologia', description: 'Doña Elena se aísla en su habitación y no quiere participar en actividades. Dice que "todos la miran feo" por sus moretones.', patientConditions: ['Asma'], requiresCheck: ['mind'], timeOfDay: 'afternoon', weeks: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Explorar sentimientos de vergüenza, validar su experiencia y fomentar integración gradual', correct: true, feedback: 'CORRECTO. La percepción de estigma afecta la autoestima y la participación social. La integración gradual respeta sus tiempos.', modifiers: { mind: 'OK', trust: 20 }, icon: '💚' },
                    { text: 'Organizar una actividad grupal para integrarla', correct: false, feedback: 'BIEN INTENCIONADO pero forzar la socialización puede ser contraproducente si no se aborda primero la vergüenza.', modifiers: { trust: -5, mind: 'ANSIEDAD' }, icon: '⚠️' },
                    { text: 'Decirle que nadie la mira y que está exagerando', correct: false, feedback: 'ERROR. Invalidar su percepción daña la confianza. La vergüenza es real aunque la causa no sea objetiva.', modifiers: { trust: -15, mind: 'TRISTE' }, icon: '💔' },
                    { text: 'Ofrecer maquillaje o crema para cubrir los moretones si le da vergüenza', correct: false, feedback: 'INCOMPLETO. Ayudar con la apariencia alivia el síntoma superficial pero no aborda el trastorno de base que causa los moretones ni el aislamiento social.', modifiers: { trust: 8, mind: 'OK' }, icon: '🎨' }
                ]
            },
            { id: 'e_med_01', category: 'medicina', description: 'Doña Elena tiene crisis de migraña con aura visual. No puede abrir los ojos por la luz. Su presión está elevada por el dolor.', patientConditions: ['Migraña', 'Asma'], requiresCheck: ['vitals'], timeOfDay: 'afternoon', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Llevarla a ambiente oscuro y silencioso, administrar triptán y monitorear PA', correct: true, feedback: 'CORRECTO. La migraña con aura requiere triptán específico. El ambiente sensorial reducido es parte del tratamiento. La PA elevada puede ser reactiva al dolor.', modifiers: { health: 10, trust: 15 }, icon: '💚' },
                    { text: 'Darle AINE y esperar a que pase', correct: false, feedback: 'INSUFICIENTE. La migraña con aura severa no responde bien a AINE solos. Se requiere triptán para abortar la crisis.', modifiers: { health: -5, trust: -5 }, icon: '⚠️' },
                    { text: 'Indicar que respire profundo y se relaje', correct: false, feedback: 'ERROR. La migraña no se resuelve con relajación. Es un trastorno neurovascular que requiere tratamiento específico.', modifiers: { trust: -10 }, icon: '💔' },
                    { text: 'Aplicar compresa fría en la frente y masaje suave en sienes', correct: false, feedback: 'AYUDA COMPLEMENTARIA. Las medidas físicas alivian el malestar pero no abortan la crisis migrañosa con aura. Se necesita triptán.', modifiers: { health: 2, trust: 5 }, icon: '🧊' }
                ]
            },
            { id: 'e_psico_03', category: 'psicologia', description: 'Doña Elena dice que ya no quiere usar su inhalador porque "no sirve para nada". Antes lo usaba 4 veces al día, ahora solo 1.', patientConditions: ['Asma'], requiresCheck: ['meds', 'mind'], timeOfDay: 'morning', weeks: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
                options: [
                    { text: 'Revisar técnica de inhalación, preguntar por efectos secundarios y explorar si hay síntomas depresivos', correct: true, feedback: 'CORRECTO. La baja adherencia al inhalador puede ser por técnica incorrecta, efectos adversos o depresión. Evaluar las tres.', modifiers: { health: 10, trust: 20, mind: 'OK' }, icon: '💚' },
                    { text: 'Reforzar la importancia del inhalador y pedirle que lo use', correct: false, feedback: 'INSUFICIENTE. Reforzar sin explorar causas no resuelve la barrera de fondo. La educación sin indagación es incompleta.', modifiers: { trust: 3 }, icon: '⚠️' },
                    { text: 'Anotar que no es adherente y reportar al médico', correct: false, feedback: 'INCOMPLETO. Documentar sin intervenir no mejora la adherencia. La relación terapéutica es la herramienta más poderosa.', modifiers: { trust: -5, health: -5 }, icon: '⚠️' },
                    { text: 'Cambiar a un inhalador de dosis medida con espaciador para mejor administración', correct: false, feedback: 'INCOMPLETO. Cambiar el dispositivo puede ayudar pero sin explorar la causa de la baja adherencia se puede repetir el problema.', modifiers: { health: 5, trust: 5 }, icon: '💨' }
                ]
            }
        ];

        const patientEvents = { don_jose, don_pedro, don_miguel, dona_maria, dona_rosa, dona_elena };
        this.events = [...general, ...(patientEvents[patientId] || [])];
        this._enrichWithRubric();
    },

    getEventForCurrentSituation(gameState) {
        const week = gameState.progress.week;
        const hour = gameState.progress.hour;
        const patient = gameState.patient;
        this.optionPage = 0;
        // If student already answered the maximum number of evaluative events this week,
        // return a non-evaluative fallback (captura de información / signos) to avoid extra evaluative questions.
        const maxEvents = GAME_CONFIG.EVENTS_PER_WEEK || 3;
        if ((gameState.eventsAnsweredThisWeek || 0) >= maxEvents) {
            return this.getFallbackEvent(hour, gameState);
        }
        const applicableEvents = this.events.filter(event => {
            const weekMatch = event.weeks && event.weeks.includes(week);
            const timeMatch = this.checkTimeOfDay(event, hour);
            const conditionMatch = this.checkConditions(event, patient);
            const notAlreadyUsed = !gameState.history.find(h => h.eventId === event.id);
            return weekMatch && timeMatch && conditionMatch && notAlreadyUsed;
        });

        if (applicableEvents.length === 0) return this.getFallbackEvent(hour, gameState);

        const randomIndex = Math.floor(Math.random() * applicableEvents.length);
        this.currentEvent = applicableEvents[randomIndex];
        return this.currentEvent;
    },

    // Returns ONLY evaluative events (non-fallback), or null if none available
    // Used by the daily flow to show evaluative events after info events
    getEvaluativeEvent(gameState) {
        const week = gameState.progress.week;
        const hour = gameState.progress.hour;
        const patient = gameState.patient;
        this.optionPage = 0;

        const maxEvents = GAME_CONFIG.EVENTS_PER_WEEK || 3;
        if ((gameState.eventsAnsweredThisWeek || 0) >= maxEvents) {
            return null; // weekly evaluative quota exhausted
        }

        const applicableEvents = this.events.filter(event => {
            const weekMatch = event.weeks && event.weeks.includes(week);
            const timeMatch = this.checkTimeOfDay(event, hour);
            const conditionMatch = this.checkConditions(event, patient);
            const notAlreadyUsed = !gameState.history.find(h => h.eventId === event.id);
            return weekMatch && timeMatch && conditionMatch && notAlreadyUsed;
        });

        if (applicableEvents.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * applicableEvents.length);
        this.currentEvent = applicableEvents[randomIndex];
        return this.currentEvent;
    },

    getVisibleOptions() {
        if (!this.currentEvent || !this.currentEvent.options) return [];
        const start = this.optionPage * this.optionsPerPage;
        return this.currentEvent.options.slice(start, start + this.optionsPerPage);
    },

    getTotalPages() {
        if (!this.currentEvent || !this.currentEvent.options) return 1;
        return Math.ceil(this.currentEvent.options.length / this.optionsPerPage);
    },

    refreshOptions(direction = 1) {
        const totalPages = this.getTotalPages();
        if (totalPages <= 1) return false;
        this.optionPage = (this.optionPage + direction + totalPages) % totalPages;
        return true;
    },

    checkTimeOfDay(event, hour) {
        if (!event.timeOfDay) return true;
        switch (event.timeOfDay) {
            case 'morning': return hour >= 6 && hour < 12;
            case 'afternoon': return hour >= 12 && hour < 18;
            case 'evening': return hour >= 18 || hour < 6;
            default: return true;
        }
    },

    checkConditions(event, patient) {
        if (!event.patientConditions || event.patientConditions.length === 0) return true;
        if (!patient || !patient.conditions) return true;
        return event.patientConditions.some(cond =>
            patient.conditions.some(pc =>
                pc.toLowerCase().includes(cond.toLowerCase()) ||
                cond.toLowerCase().includes(pc.toLowerCase())
            )
        );
    },

    getFallbackEvent(hour, gameState) {
        const fallbacks = [
            { id: 'fallback_01', category: 'general', description: 'Todo está en calma. El paciente descansa plácidamente.',
                options: [
                    { text: 'Aprovechar para revisar el expediente clínico y planificar cuidados', correct: true, feedback: 'Bien. La documentación y planificación anticipada son parte fundamental del cuidado de calidad.', modifiers: { health: 0, trust: 5 }, icon: '📋' },
                    { text: 'Ir a preparar la siguiente medicación con calma', correct: true, feedback: 'Correcto. La preparación anticipada reduce errores de medicación.', modifiers: { health: 0, trust: 5 }, icon: '💊' },
                    { text: 'Descansar un momento porque todo está tranquilo', correct: false, feedback: 'El turno siempre tiene tareas pendientes. Aprovechar la calma para trabajo administrativo.', modifiers: { health: 0, trust: -5 }, icon: '😴' },
                    { text: 'Hacer una ronda de supervisión a otros pacientes mientras está todo en orden', correct: true, feedback: 'Excelente. Aprovechar los momentos de calma para supervisar al resto de pacientes es una práctica preventiva.', modifiers: { health: 3, trust: 5 }, icon: '👀' }
                ]
            },
            { id: 'fallback_02', category: 'general', description: 'El paciente solicita atención por molestia leve en una extremidad.',
                options: [
                    { text: 'Evaluar el nivel de dolor con escala numérica y explorar la extremidad', correct: true, feedback: 'Buena evaluación clínica. Documentar siempre la intensidad y características del dolor.', modifiers: { health: 5, trust: 10 }, icon: '🔍' },
                    { text: 'Preguntar si quiere analgésico y administrarlo', correct: false, feedback: 'Es importante evaluar antes de medicar. El dolor puede tener causa que requiera otro abordaje.', modifiers: { health: -3, trust: -3 }, icon: '💊' },
                    { text: 'Anotar en el reporte para el próximo turno', correct: false, feedback: 'Diferir la atención del dolor sin evaluar puede dejar pasar un problema tratable.', modifiers: { health: -5, trust: -5 }, icon: '📝' },
                    { text: 'Aplicar calor local en la extremidad y observar la respuesta', correct: false, feedback: 'INCOMPLETO. El calor local alivia pero no reemplaza una evaluación estructurada del dolor. Diagnosticar antes de tratar.', modifiers: { health: 2, trust: 3 }, icon: '🌡️' }
                ]
            },
            { id: 'fallback_03', category: 'general', description: 'La enfermera jefe solicita revisar los signos vitales del turno anterior.',
                options: [
                    { text: 'Buscar el registro, revisar tendencias y reportar hallazgos', correct: true, feedback: 'Excelente. La comunicación efectiva entre turnos y el análisis de tendencias es vital para detectar deterioros.', modifiers: { health: 5, trust: 10 }, icon: '📊' },
                    { text: 'Indicar que no hay novedad y continuar', correct: false, feedback: 'La falta de reporte estructurado puede omitir signos tempranos de deterioro.', modifiers: { health: -5, trust: -10 }, icon: '📝' },
                    { text: 'Revisar solo los valores anormales', correct: false, feedback: 'Los valores normales también dan información sobre estabilidad. Revisión integral siempre.', modifiers: { health: -3, trust: -5 }, icon: '⚠️' },
                    { text: 'Tomar los signos vitales de nuevo para verificar cambios recientes', correct: true, feedback: 'Correcto. Verificar personalmente los signos vitales permite detectar cambios que pudieron pasar desapercibidos en el reporte.', modifiers: { health: 5, trust: 8 }, icon: '🩺' }
                ]
            },
            { id: 'fallback_04', category: 'psicologia', description: 'Un familiar del paciente llega preocupado y pregunta por su estado. El paciente tiene diagnóstico de depresión.',
                options: [
                    { text: 'Brindar información clara y empática, validando la preocupación familiar', correct: true, feedback: 'La comunicación con la familia es terapéutica. Reduce la ansiedad del familiar y mejora la red de apoyo del paciente.', modifiers: { health: 0, trust: 15 }, icon: '👨‍👩‍👧' },
                    { text: 'Decir que no se puede dar información sin autorización del paciente', correct: false, feedback: 'Aunque hay límites legales, la empatía y orientación básica siempre son posibles sin violar confidencialidad.', modifiers: { trust: -10 }, icon: '🚫' },
                    { text: 'Sugerir al familiar que hable con el psicólogo del hogar', correct: false, feedback: 'Derivar sin dar información básica se percibe como desinterés. Primero escuchar, luego orientar.', modifiers: { trust: -5 }, icon: '🔀' },
                    { text: 'Invitar al familiar a pasar un momento con el paciente para que lo vea tranquilo', correct: true, feedback: 'Excelente. Permitir que el familiar observe directamente el estado del paciente reduce su ansiedad y fortalece la confianza en el cuidado.', modifiers: { trust: 15, mind: 'OK' }, icon: '🤗' }
                ]
            },
            { id: 'fallback_05', category: 'general', description: 'Se detecta que el equipo de oxígeno presenta una alerta menor de mantenimiento.',
                options: [
                    { text: 'Verificar la conexión, revisar el equipo y documentar la alerta', correct: true, feedback: 'Prevención es mejor que cura. El mantenimiento preventivo del equipo salva vidas.', modifiers: { health: 5, trust: 5 }, icon: '⚠️' },
                    { text: 'Ignorar la alerta si el paciente está estable', correct: false, feedback: 'Nunca ignorar alertas del equipo. Una alerta menor puede ser síntoma de un problema mayor.', modifiers: { health: -10, trust: -5 }, icon: '🔧' },
                    { text: 'Solicitar cambio de equipo de inmediato', correct: false, feedback: 'Puede ser una respuesta excesiva si la alerta es menor y el equipo funciona correctamente. Evaluar primero.', modifiers: { health: 0, trust: -3 }, icon: '📞' },
                    { text: 'Comprobar el manual de mantenimiento del equipo para solucionar la alerta', correct: false, feedback: 'INSUFICIENTE. Revisar el manual está bien pero si el equipo requiere mantenimiento mayor, debe reportarse. No asumir que puede resolverlo solo.', modifiers: { health: 3, trust: 3 }, icon: '📖' }
                ]
            },
            { id: 'fallback_06', category: 'psicologia', description: 'El paciente está inquieto y no puede dormir. Pide compañía.',
                options: [
                    { text: 'Sentarse con él, ofrecer un té y conversar sobre sus preocupaciones', correct: true, feedback: 'La presencia terapéutica es una intervención poderosa. El insomnio en adultos mayores suele tener componente emocional.', modifiers: { trust: 15, mind: 'OK', health: 3 }, icon: '💚' },
                    { text: 'Administrar somnífero de su medicación', correct: false, feedback: 'La medicación para dormir en adultos mayores aumenta riesgo de caídas y dependencia. Preferir abordaje no farmacológico.', modifiers: { health: -5, trust: 3 }, icon: '⚠️' },
                    { text: 'Decirle que intente dormir, que tiene que descansar', correct: false, feedback: 'La indicación sin apoyo no resuelve la causa de la inquietud. El acompañamiento es más efectivo.', modifiers: { trust: -5 }, icon: '😴' },
                    { text: 'Leerle un cuento o poner música suave para ayudarle a relajarse', correct: true, feedback: 'Excelente. Las intervenciones no farmacológicas como la música o la lectura tienen efecto calmante comprobado en adultos mayores con insomnio.', modifiers: { trust: 12, mind: 'OK', health: 3 }, icon: '📖' }
                ]
            }
        ];

        const available = fallbacks.filter(f => !gameState.history.find(h => h.eventId === f.id));
        this.currentEvent = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : fallbacks[Math.floor(Math.random() * fallbacks.length)];
        this.optionPage = 0;
        return this.currentEvent;
    },

    reset() {
        this.events = [];
        this.currentEvent = null;
        this.optionPage = 0;
        this.pendingSelection = null;
    },

    // Mapa de rúbrica: [dimensión, valor] para cada opción de cada evento
    RUBRIC_MAP: {
        'gen_001': [['razonamiento',3], ['comunicacion',1], ['comunicacion',-1], ['razonamiento',-1]],
        'gen_002': [['comunicacion',3], ['comunicacion',-1], ['razonamiento',1], ['razonamiento',2]],
        'gen_003': [['razonamiento',3], ['comunicacion',-1], ['comunicacion',2], ['herramientas',1]],
        'gen_004': [['funcional',3], ['comunicacion',-1], ['comunicacion',2], ['comunicacion',1]],
        'gen_005': [['razonamiento',3], ['comunicacion',-1], ['razonamiento',-1], ['funcional',2]],
        'gen_006': [['herramientas',3], ['comunicacion',-1], ['comunicacion',2], ['herramientas',1]],
        'gen_007': [['razonamiento',3], ['razonamiento',-1], ['comunicacion',2], ['herramientas',1]],
        'gen_008': [['herramientas',3], ['funcional',1], ['funcional',-1], ['funcional',2]],
        'j_psico_01': [['comunicacion',3], ['comunicacion',-1], ['razonamiento',1], ['funcional',2]],
        'j_med_01': [['herramientas',3], ['razonamiento',-1], ['comunicacion',-1], ['razonamiento',-1]],
        'j_psico_02': [['razonamiento',3], ['comunicacion',-1], ['funcional',1], ['funcional',2]],
        'p_psico_01': [['comunicacion',3], ['comunicacion',-1], ['comunicacion',1], ['razonamiento',-1]],
        'p_med_01': [['razonamiento',3], ['razonamiento',-1], ['razonamiento',-1], ['comunicacion',1]],
        'p_psico_02': [['razonamiento',3], ['razonamiento',-1], ['funcional',1], ['razonamiento',-1]],
        'm_psico_01': [['herramientas',3], ['funcional',-1], ['comunicacion',-1], ['razonamiento',2]],
        'm_med_01': [['razonamiento',3], ['razonamiento',-1], ['razonamiento',-1], ['razonamiento',-1]],
        'm_psico_02': [['comunicacion',3], ['comunicacion',-1], ['herramientas',2], ['funcional',1]],
        'm_med_02': [['razonamiento',3], ['herramientas',1], ['herramientas',1], ['funcional',2]],
        'ma_psico_01': [['comunicacion',3], ['razonamiento',-1], ['funcional',1], ['herramientas',2]],
        'ma_med_01': [['razonamiento',3], ['razonamiento',-1], ['herramientas',1], ['razonamiento',2]],
        'ma_psico_02': [['comunicacion',3], ['comunicacion',-1], ['razonamiento',-1], ['herramientas',2]],
        'r_psico_01': [['razonamiento',3], ['comunicacion',-1], ['comunicacion',-1], ['funcional',2]],
        'r_psico_02': [['funcional',3], ['comunicacion',-1], ['comunicacion',-1], ['herramientas',2]],
        'r_med_01': [['razonamiento',3], ['razonamiento',-1], ['herramientas',1], ['herramientas',1]],
        'e_psico_01': [['razonamiento',3], ['comunicacion',1], ['comunicacion',-1], ['herramientas',2]],
        'e_psico_02': [['comunicacion',3], ['funcional',1], ['comunicacion',-1], ['herramientas',2]],
        'e_med_01': [['razonamiento',3], ['herramientas',1], ['comunicacion',-1], ['herramientas',2]],
        'e_psico_03': [['herramientas',3], ['comunicacion',1], ['funcional',-1], ['herramientas',2]],
        'fallback_01': [['herramientas',2], ['herramientas',2], ['funcional',-1], ['comunicacion',3]],
        'fallback_02': [['herramientas',3], ['razonamiento',-1], ['comunicacion',-1], ['herramientas',1]],
        'fallback_03': [['herramientas',3], ['comunicacion',-1], ['herramientas',1], ['herramientas',2]],
        'fallback_04': [['comunicacion',3], ['comunicacion',-1], ['comunicacion',1], ['comunicacion',2]],
        'fallback_05': [['razonamiento',3], ['razonamiento',-1], ['herramientas',1], ['herramientas',2]],
        'fallback_06': [['comunicacion',3], ['razonamiento',-1], ['comunicacion',-1], ['herramientas',2]]
    },

    _enrichWithRubric() {
        this.events.forEach(event => {
            const entry = this.RUBRIC_MAP[event.id];
            if (entry) {
                event.options.forEach((opt, idx) => {
                    if (entry[idx]) {
                        opt.rubricDimension = entry[idx][0];
                        opt.rubricValue = entry[idx][1];
                    }
                });
            } else {
                this._autoAssignRubric(event);
            }
        });
    },

    _autoAssignRubric(event) {
        event.options.forEach(opt => {
            if (event.category === 'medicina') {
                opt.rubricDimension = 'razonamiento';
            } else {
                opt.rubricDimension = 'funcional';
            }
            if (opt.correct) {
                opt.rubricValue = opt.text.length > 80 ? 3 : 2;
            } else {
                const harmful = ['ERROR', 'GRAVE', 'peligroso', 'invalidante', 'iatrogenia'];
                opt.rubricValue = harmful.some(k => opt.feedback?.includes(k)) ? -1 : 1;
            }
        });
    }
};
