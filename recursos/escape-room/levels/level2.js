// Superficie superior de la llama: lenguas altas y bajas que viajan (compartida por draw y colisión)
function flameSurface(fy, x, t) {
    return fy
        - 20 * Math.abs(Math.sin(x * 0.025 + t * 1.2))
        - 12 * Math.sin(x * 0.07 + t * 2.0)
        - 7 * Math.sin(x * 0.16 + t * 3.1)
        - 26 * Math.pow(Math.max(0, Math.sin(x * 0.04 + t * 0.8 + 1.7)), 2);
}

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
            floorColor: '#222a33', // Suelo slate azulado de laboratorio (frío, resalta el fuego)
            fireY: canvas.height, // El fuego empieza desde abajo
            fireSpeed: 0.2, // Velocidad reducida para dar tiempo al jugador
            doorOpen: false, // La puerta de salida se abre al resolver el puzzle
            gameOver: false,
            initialPromptShown: false,
            embers: [], // Brasas ascendentes del fuego
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
            tileY: 1, // Un espacio abajo de la puerta, para distinguirlo
            x: answerPedTileX * TILE_SIZE,
            y: MAP_OFFSET_Y + TILE_SIZE,
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

            // Brasas ascendentes
            if (Math.random() < 0.5) {
                currentLevelData.embers.push({
                    x: Math.random() * canvas.width,
                    y: currentLevelData.fireY + Math.random() * 30,
                    life: 1,
                    vy: 0.4 + Math.random() * 0.6,
                    vx: (Math.random() - 0.5) * 0.5
                });
            }
            currentLevelData.embers.forEach(e => {
                e.y -= e.vy * dt;
                e.x += e.vx * dt;
                e.life -= 0.012 * dt;
            });
            currentLevelData.embers = currentLevelData.embers.filter(e => e.life > 0);

            // Game Over si la llama toca al jugador (usa la punta local de la llama en su x)
            const flameTop = flameSurface(currentLevelData.fireY, player.x + player.w / 2, Date.now() * 0.004);
            if (player.y + player.h > flameTop) {
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

        // Rejilla tenue de laboratorio: da profundidad y separa los objetos del fondo
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= canvas.width; gx += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(gx + 0.5, MAP_OFFSET_Y); ctx.lineTo(gx + 0.5, canvas.height); ctx.stroke();
        }
        for (let gy = MAP_OFFSET_Y; gy <= canvas.height; gy += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(canvas.width, gy + 0.5); ctx.stroke();
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

        // Objeto colocado en el pedestal de respuesta (permanece visible ahí,
        // correcto o incorrecto, hasta que el jugador lo retire)
        const ansPed = currentLevelData.tileObjects.find(o => o.id === 'main_pedestal');
        if (ansPed && ansPed.placed) {
            levelLogics['atomic'].drawChem({
                x: ansPed.x,
                y: ansPed.y - 20, // Igual que los químicos sobre sus pedestales
                color: ansPed.placed.color,
                shape: ansPed.placed.shape,
                name: ansPed.placed.name
            });
            if (checkProximity(ansPed)) {
                ctx.fillStyle = NES_PALETTE.black;
                ctx.font = "18px 'Press Start 2P'";
                ctx.fillText(ansPed.placed.name, ansPed.x, ansPed.y - 30);
            }
        }

        // --- Fuego mejorado: capas de llama + resplandor + brasas ---
        const FW = canvas.width, FH = canvas.height;
        const fy = currentLevelData.fireY;
        const t = Date.now() * 0.004;
        // Lenguas vivas: cada columna es una llama con los tres colores
        // (rojo en la base -> naranja -> amarillo en la punta) y punta ondulada
        const step = 5;
        for (let x = 0; x < FW; x += step) {
            const top = flameSurface(fy, x, t);
            if (top >= FH) continue;
            const grad = ctx.createLinearGradient(0, top, 0, FH);
            grad.addColorStop(0, '#ffe23f');    // punta amarilla
            grad.addColorStop(0.28, '#ffb000');
            grad.addColorStop(0.55, '#ff8c00'); // naranja
            grad.addColorStop(1, '#d40000');    // base roja
            ctx.fillStyle = grad;
            ctx.fillRect(x, top, step + 1, FH - top);
        }

        // Resplandor en la punta de la llama (cubre las lenguas)
        const glow = ctx.createLinearGradient(0, fy - 70, 0, fy + 12);
        glow.addColorStop(0, 'rgba(255,170,60,0)');
        glow.addColorStop(1, 'rgba(255,170,60,0.32)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, fy - 70, FW, 82);

        // Brasas ascendentes
        currentLevelData.embers.forEach(e => {
            ctx.globalAlpha = Math.max(0, e.life);
            ctx.fillStyle = 'rgba(255,130,0,0.7)';
            ctx.fillRect(e.x - 1, e.y - 1, 4, 4);
            ctx.fillStyle = '#ffd23f';
            ctx.fillRect(e.x, e.y, 2, 2);
        });
        ctx.globalAlpha = 1;
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
        if (pedestalTileObj) {
            if (state.inventory) {
                if (pedestalTileObj.placed) {
                    // Ya hay un objeto en el pedestal: primero debe retirarlo
                    ui.innerHTML = "Retira primero el objeto del pedestal antes de colocar otro.";
                } else {
                    // Colocar el objeto en el pedestal (permanece visualizado ahí)
                    const obj = state.inventory;
                    pedestalTileObj.placed = { ...obj };
                    state.inventory = null;
                    if (obj.val === currentLevelData.targetValue) {
                        currentLevelData.doorOpen = true;
                        ui.innerHTML = "✅ ¡Puerta abierta! " + obj.name + " era correcto.";
                        if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, currentLevelData.prompt, true);
                    } else {
                        ui.innerHTML = "❌ " + obj.name + " no es correcto. Retíralo y devuélvelo a su sitio.";
                        flashFailure();
                        if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, currentLevelData.prompt, false);
                        currentLevelData.fireSpeed += 0.3; // Acelerar el fuego como penalización
                    }
                }
            } else if (pedestalTileObj.placed) {
                // Sin objeto en mano: recoger el que está en el pedestal para devolverlo
                state.inventory = { ...pedestalTileObj.placed };
                pedestalTileObj.placed = null;
                ui.innerHTML = "Has tomado " + state.inventory.name + ". Regrésalo a su pedestal de origen.";
            } else {
                ui.innerHTML = "El pedestal está vacío. Necesitas un objeto.";
            }
            return;
        }
    }
};