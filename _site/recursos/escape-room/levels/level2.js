levelLogics['atomic'] = {
    init: (levelData) => {
        // Priorizar datos del escenario si existen, de lo contrario usar la raíz
        let activeScenario = levelData;
        if (levelData.scenarios && levelData.scenarios.length > 0) {
            activeScenario = levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)];
        }

        const base = {
            ...activeScenario,
            type: levelData.type,
            title: levelData.title, // Asegurar que el título se mantenga
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [],
            fireY: canvas.height, // El fuego empieza desde abajo
            fireSpeed: 0.2, // Velocidad reducida para dar tiempo al jugador
            doorOpen: false, // La puerta de salida se abre al resolver el puzzle
            gameOver: false,
            initialPromptShown: false,
            furniture: [
                // No hay alfombra en este nivel
            ]
        };
        
        // Posición inicial del jugador segura
        player.x = 400; player.y = 200;

        // Si el JSON no tiene desafíos (como en Psicopatología), creamos uno por defecto
        const challenges = base.challenges || [{ prompt: base.pistaLibrero || "Encuentra la clave.", items: [], targetValue: base.claveCIE }];
        
        // Elegir un desafío aleatorio si hay múltiples
        const currentChallenge = challenges[Math.floor(Math.random() * challenges.length)];
        if (currentChallenge) {
            base.prompt = currentChallenge.prompt;
            base.targetValue = currentChallenge.targetValue;
        }

        // Posiciones fijas para los objetos químicos y el pedestal
        const chemPositions = [
            { x: 150, y: 200 },
            { x: 350, y: 200 },
            { x: 550, y: 200 }
        ];

        // 1. Pedestal de Respuesta (al lado de la puerta en la parte superior)
        const answerPedX = canvas.width / 2 + 20;
        const answerPedTileX = Math.floor(answerPedX / TILE_SIZE);
        base.tileObjects.push({
            id: 'main_pedestal',
            type: 'pedestal_tile',
            tileX: answerPedTileX,
            tileY: 0, // En la pared superior
            x: answerPedTileX * TILE_SIZE,
            y: MAP_OFFSET_Y,
            w: TILE_SIZE,
            h: TILE_SIZE,
            interactive: true,
            collidable: true // Asegurarse de que colisiona
        });

        // Asignar objetos químicos a posiciones aleatorias
        const itemsToProcess = currentChallenge && currentChallenge.items ? currentChallenge.items : [];
        console.log("Level 2 - Items to process:", itemsToProcess); // Debugging
        const shuffledItems = [...itemsToProcess].sort(() => 0.5 - Math.random());
        shuffledItems.forEach((item, i) => {
            const tileX = Math.floor(chemPositions[i].x / TILE_SIZE);
            const tileY = Math.floor((chemPositions[i].y - MAP_OFFSET_Y) / TILE_SIZE);
            const realX = tileX * TILE_SIZE;
            const realY = tileY * TILE_SIZE + MAP_OFFSET_Y;

            // Crear pedestal de retorno para este objeto
            base.tileObjects.push({
                id: 'return_' + i,
                type: 'pedestal_tile',
                tileX: tileX,
                tileY: tileY,
                x: realX,
                y: realY,
                w: TILE_SIZE,
                h: TILE_SIZE,
                interactive: true,
                collidable: true
            });

            base.furniture.push({
                id: 'chem', 
                pedestalId: 'return_' + i,
                name: item.name, 
                val: item.val, 
                shape: item.shape, // Nueva propiedad para la forma
                x: realX, 
                y: realY - 20, // Ajustado para que esté ARRIBA del pedestal 
                w: 32, h: 32, 
                color: item.color || NES_PALETTE.object, // Usar color del JSON o por defecto
                interactable: true,
                collidable: false // Los químicos no colisionan, solo el pedestal
            });
        });
        return base;
    },
    update: (dt) => {
        // El fuego sube
        if (!currentLevelData.doorOpen && !currentLevelData.gameOver) {
            currentLevelData.fireY -= currentLevelData.fireSpeed * dt;

            // Game Over si el fuego alcanza al jugador
            if (player.y + player.h > currentLevelData.fireY) {
                currentLevelData.gameOver = true;
                gameOver("¡El fuego te ha alcanzado!");
            }
        }

        // Mostrar el prompt inicial una vez
        if (!currentLevelData.initialPromptShown) {
            ui.innerHTML = currentLevelData.prompt;
            currentLevelData.initialPromptShown = true;
        }
    },
    drawChem: (chem) => {
        ctx.fillStyle = chem.color;
        const x = chem.x;
        const y = chem.y;

        switch (chem.shape) {
            case 'statue': // Gato de la fortuna
                ctx.fillRect(x + 8, y + 4, 4, 4); ctx.fillRect(x + 20, y + 4, 4, 4); // Orejas
                ctx.fillRect(x + 8, y + 8, 16, 12); // Cabeza
                ctx.fillRect(x + 6, y + 20, 20, 12); // Cuerpo
                ctx.fillStyle = NES_PALETTE.black;
                ctx.fillRect(x + 11, y + 12, 2, 2); ctx.fillRect(x + 19, y + 12, 2, 2); // Ojos
                break;
            case 'vase': // Florero
                ctx.fillRect(x + 10, y + 26, 12, 4); // Base
                ctx.fillRect(x + 6, y + 10, 20, 16); // Cuerpo
                ctx.fillRect(x + 12, y + 4, 8, 6);   // Cuello
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x + 10, y + 12, 4, 8);  // Brillo
                break;
            case 'trophy': // Trofeo
                ctx.fillRect(x + 6, y + 4, 20, 14);  // Copa
                ctx.fillRect(x + 2, y + 6, 4, 8);    // Asa L
                ctx.fillRect(x + 26, y + 6, 4, 8);   // Asa R
                ctx.fillRect(x + 14, y + 18, 4, 10); // Tallo
                ctx.fillRect(x + 10, y + 28, 12, 4); // Base
                break;
            default:
                ctx.fillRect(x + 4, y + 4, 24, 24);
                ctx.fill();
        }
    },
    draw: () => {
        // Si la puerta está abierta, cambiamos el tile de la pared (5) por suelo (0)
        if (currentLevelData.doorOpen && currentLevelData.map[0][12] === 5) {
            currentLevelData.map[0][12] = 0;
        }

        currentLevelData.furniture.forEach(f => {
            if (f.id === 'chem') {
                levelLogics['atomic'].drawChem(f);
                // Mostrar nombre al acercarse
                if (checkProximity(f)) {
                    ctx.fillStyle = NES_PALETTE.black;
                    ctx.font = "14px 'Press Start 2P'";
                    ctx.font = "18px 'Press Start 2P'";
                    ctx.fillText(f.name, f.x, f.y - 10);
                }
            }
            // No dibujamos el pedestal aquí, se dibuja como tileObject
        });

        // Dibujar el fuego mejorado (Dos colores: Rojo y Naranja)
        const time = Date.now() * 0.005;
        
        // Capa Roja (Fondo)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, currentLevelData.fireY);
        for(let i=0; i<=canvas.width; i+=20) {
            let flicker = Math.sin(time + i * 0.1) * 20;
            ctx.lineTo(i, currentLevelData.fireY + flicker);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();

        // Capa Naranja (Frente)
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.moveTo(0, currentLevelData.fireY + 15);
        for(let i=0; i<=canvas.width; i+=20) {
            let flicker = Math.cos(time + i * 0.1) * 15;
            ctx.lineTo(i, currentLevelData.fireY + 15 + flicker);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();
    },
    interact: () => {
        const playerCenterX = player.x + 32;
        const playerCenterY = player.y + 32;

        // 1. Lógica de salida: Detectar la puerta en tileX: 12, tileY: 0
        const doorX = 12 * 32 + 16;
        const doorY = 0 * 32 + 60 + 16;
        if (currentLevelData.doorOpen && Math.hypot(playerCenterX - doorX, playerCenterY - doorY) < 60) {
            nextLevel();
            return;
        }

        // 2. Interacción con objetos químicos (Recoger)
        const chem = currentLevelData.furniture.find(f => f.id === 'chem' && f.interactable && checkProximity(f));
        if (chem) { // Si estamos cerca de un químico
            if (!state.inventory) { // Si no llevamos nada, lo recogemos
                state.inventory = { ...chem };
                ui.innerHTML = "⭐ Has tomado: " + chem.name;
                // Quitar el químico del mapa
                currentLevelData.furniture = currentLevelData.furniture.filter(f => f !== chem);
                return;
            } else { // Si ya llevamos algo
                ui.innerHTML = "Ya llevas " + state.inventory.name + ". Regrésalo a su pedestal para cambiarlo.";
                return;
            }
        }

        // 3. Interacción con Pedestales de Retorno (Soltar)
        const returnPed = currentLevelData.tileObjects.find(o => o.id.startsWith('return_') && checkProximity(o));
        if (returnPed && state.inventory) {
            if (state.inventory.pedestalId === returnPed.id) {
                // Devolver el objeto al mapa
                currentLevelData.furniture.push({ ...state.inventory });
                ui.innerHTML = "Has regresado el " + state.inventory.name;
                state.inventory = null;
            } else {
                ui.innerHTML = "Este no es el pedestal original de este objeto.";
            }
            return;
        }

        // 4. Interacción con el pedestal de respuesta
        const pedestalTileObj = currentLevelData.tileObjects.find(o => o.id === 'main_pedestal' && o.interactive && checkProximity(o));
        if (pedestalTileObj && state.inventory) {
            if (state.inventory.val === currentLevelData.targetValue) {
                currentLevelData.doorOpen = true;
                ui.innerHTML = "✅ ¡Puerta abierta! ¡Sal rápido!";
                if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, currentLevelData.prompt, true);
                state.inventory = null;
            } else {
                ui.innerHTML = "❌ Incorrecto. El " + state.inventory.name + " vuelve a su sitio.";
                
                if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, currentLevelData.prompt, false);
                
                // Devolver automáticamente al pedestal de origen
                currentLevelData.furniture.push({ ...state.inventory });
                state.inventory = null;
                
                currentLevelData.fireSpeed += 0.3; // Acelerar el fuego como penalización
            }
            return;
        } else if (pedestalTileObj && !state.inventory) {
            ui.innerHTML = "El pedestal está vacío. Necesitas un objeto.";
            return;
        }
    }
};