(window.levelLogics = window.levelLogics || {})['bridge'] = {
    init: (levelData) => {
        const activeScenario = (levelData.scenarios && levelData.scenarios.length > 0)
            ? levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)]
            : levelData;

        const base = {
            ...activeScenario,
            // Carga de activos visuales
            images: {
                bridge: new Image(),
                boardV: new Image(),
                boardF: new Image()
            },
            // Mapa ampliado a 17 filas para cubrir 600px. Columnas 10-14 despejadas para el puente.
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [
                { id: "exit", type: "door", tileX: 12, tileY: 0, interactive: true }
            ],
            steps: [],
            falling: false,
            fallProgress: 0
        };

        base.images.bridge.src = 'assets/puente.png';
        base.images.boardV.src = 'assets/puentev.png';
        base.images.boardF.src = 'assets/puentef.png';

        // REINICIO DE ESTADO DEL JUGADOR
        player.w = 64; 
        player.h = 64;
        player.moving = false;
        player.direction = "up";
        base.boardVisible = true;
        base.shakeOffset = 0;
        base.originalPlayerSize = { w: 64, h: 64 };

        const qList = levelData.questions || [];
        const startY = 400; // Posición de inicio segura (por encima del cuadro de diálogo)
        const stepHeight = 64; // Altura de cada fila

        qList.forEach((q, i) => {
            base.steps.push({
                ...q,
                // Colocamos las preguntas en filas alternas (i*2 + 1)
                // Q0 = 336, Q1 = 208, Q2 = 80
                y: startY - (i * 2 + 1) * stepHeight, 
                resolved: false
            });
        });

        player.x = 400 - 32;
        player.y = startY; 

        return base;
    },
    update: () => {
        const data = currentLevelData;
        if (data.falling) {
            data.fallProgress += 0.02;
            
            // Fase 1: Temblor de la tabla (primeros 20% del progreso)
            if (data.fallProgress < 0.2) {
                data.shakeOffset = (Math.random() - 0.5) * 10;
            } else {
                // Fase 2: La tabla desaparece y el jugador cae/se reduce
                data.boardVisible = false;
                player.y += 5; 
                player.w *= 0.96; // Reducción de tamaño
                player.h *= 0.96;
            }

            if (data.fallProgress >= 1) {
                gameOver("¡Has caído al vacío! La respuesta era incorrecta.");
            }
            return;
        }

        const playerFeetY = player.y + player.h;
        const playerMidX = player.x + player.w / 2;

        // Detectar si el jugador pisa una línea de respuesta
        data.steps.forEach(s => {
            // Solo evaluamos caída si la pregunta NO ha sido resuelta
            if (!s.resolved && playerFeetY > s.y + 15 && playerFeetY < s.y + 45) {
                // Izquierda = Verdadero (V), Derecha = Falso (F)
                const choice = playerMidX < 400 ? 'V' : 'F';
                if (choice === s.correct) {
                    s.resolved = true;
                    // Al resolver, restauramos visibilidad por si acaso
                    data.boardVisible = true;
                    ui.innerHTML = "✅ ¡Correcto! Avanza al siguiente escalón.";
                } else {
                    data.falling = true;
                    player.moving = false; // Bloquear movimiento al caer
                }
            }
        });

        // Actualizar prompt de la pregunta actual
        const nextQ = data.steps.find(s => !s.resolved);
        if (nextQ) {
            ui.innerHTML = `[V] <--- PREGUNTA: ${nextQ.prompt} ---> [F]`;
        } else {
            ui.innerHTML = "🏆 ¡Has superado el puente! La salida está abierta.";
        }
    },
    draw: () => {
        const data = currentLevelData;

        // 1. Dibujar el abismo y el marco (Igual que drawCommonRoom en main.js)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar el muro superior para consistencia visual
        ctx.fillStyle = NES_PALETTE.wallDark; ctx.fillRect(0, 0, canvas.width, 60);
        ctx.fillStyle = NES_PALETTE.wall; ctx.fillRect(0, 45, canvas.width, 15);
        
        // Borde de la pantalla
        ctx.strokeStyle = NES_PALETTE.black; ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

        // 2. Dibujar el puente alternando filas
        ctx.imageSmoothingEnabled = false;
        if (data.images.bridge.complete) {
            for (let y = 16; y <= 528; y += 64) {
                // Verificar si esta fila corresponde a una pregunta (decisión)
                const step = data.steps.find(s => Math.abs(s.y - y) < 5);
                
                if (step) {
                    // FILA DE DECISIÓN (V y F)
                    const isCurrentFalling = data.falling && Math.abs((player.y + player.h) - (y + 30)) < 25;
                    const playerSideX = (player.x + player.w / 2);

                    // Dibujar Tabla Izquierda (V)
                    let drawV = true, offV = 0;
                    if (isCurrentFalling && playerSideX < 400) { drawV = data.boardVisible; offV = data.shakeOffset; }
                    
                    if (drawV && data.images.boardV.complete) {
                        ctx.drawImage(data.images.boardV, 400 - 64 + offV, y, 64, 64);
                    } else {
                        ctx.fillStyle = "black"; ctx.fillRect(400 - 64, y, 64, 64);
                    }

                    // Dibujar Tabla Derecha (F)
                    let drawF = true, offF = 0;
                    if (isCurrentFalling && playerSideX >= 400) { drawF = data.boardVisible; offF = data.shakeOffset; }

                    if (drawF && data.images.boardF.complete) {
                        ctx.drawImage(data.images.boardF, 400 + offF, y, 64, 64);
                    } else {
                        ctx.fillStyle = "black"; ctx.fillRect(400, y, 64, 64);
                    }
                    
                    // Signo de interrogación si no se ha resuelto
                    if (!step.resolved) {
                        ctx.fillStyle = "white";
                        ctx.font = "14px 'Press Start 2P'";
                        ctx.textAlign = "center";
                        ctx.fillText("?", 400, y + 40);
                    }
                } else {
                    // FILA DE DESCANSO (Puente normal seguro)
                    ctx.drawImage(data.images.bridge, 400 - 64, y, 64, 64);
                    ctx.drawImage(data.images.bridge, 400, y, 64, 64);
                }
            }
        }

        // 3. Dibujar la puerta de salida al final
        if (data.steps.every(s => s.resolved)) {
            const exit = data.tileObjects.find(o => o.id === "exit");
            if (exit && TILES[5]) {
                const ex = exit.tileX * TILE_SIZE;
                const ey = MAP_OFFSET_Y - TILE_SIZE; 
                TILES[5].pattern(ex, ey + 32); // Dibujar puerta en la pared superior
                ctx.fillStyle = "lime";
                ctx.font = "10px 'Press Start 2P'";
                ctx.fillText("SALIDA", ex - 10, ey + 25);
            }
        }
    },
    interact: () => {
        const data = currentLevelData;
        if (data.falling) return;
        const exitDoor = data.tileObjects.find(o => o.id === 'exit' && checkProximity(o));
        if (exitDoor && data.steps.every(s => s.resolved)) {
            nextLevel();
        }
    }
};