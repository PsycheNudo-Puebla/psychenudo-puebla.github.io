(window.levelLogics = window.levelLogics || {})['maze'] = {
    init: (levelData) => {
        const activeScenario = (levelData.scenarios && levelData.scenarios.length > 0)
            ? levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)]
            : levelData;

        const questions = activeScenario.questions || levelData.questions || [
            { prompt: "¿El condicionamiento operante fue propuesto por Skinner?", correct: "V" },
            { prompt: "¿El refuerzo negativo incrementa una conducta porque elimina un estímulo aversivo?", correct: "V" }
        ];

        const wallColors = activeScenario.wallColors || ["#7c7c7c", "#346856"];

        const base = {
            ...levelData,
            questions,
            currentQuestionIndex: 0,
            question: questions[0],
            wallColors,
            wallColor: wallColors[0],
            spawnTimer: 300, // 5 segundos de gracia (60fps * 5)
            conjurerSpawned: false,
            gameOver: false,
            keyImg: new Image(),
            // Mapa de laberinto con pasillos de 64px (doble tile) para evitar bloqueos
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,5,0,0,1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,0,1], // F en (1,1)
                [1,0,0,0,1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,0,0,1,1,1,1,1,0,0,1,0,0,1,1,1,1,1,0,0,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,0,1],
                [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1],
                [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
                [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1],
                [1,0,0,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,0,0,1,1,1,1,1,0,0,1,0,0,1,1,1,1,1,0,0,1,1,1],
                [1,5,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1], // V en (1,14)
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [
                { id: "door_v", type: "door", tileX: 1, tileY: 14, interactive: true, value: "V" }, // BL
                { id: "door_f", type: "door", tileX: 1, tileY: 1, interactive: true, value: "F" }   // TL
            ],
            keys: [
                { id: "key_v", type: "key", x: 730, y: 92, collected: false, value: "V" }, // TR
                { id: "key_f", type: "key", x: 730, y: 508, collected: false, value: "F" } // BR
            ],
            conjurer: {
                x: 384, y: 316, w: 64, h: 64, speed: 2.8,
                direction: "down", animFrame: 0, animCounter: 0,
                images: { up: [], down: [], left: [], right: [] }
            }
        };

        ['Up', 'Down', 'Left', 'Right'].forEach(dir => {
            const key = dir.toLowerCase();
            for (let i = 1; i <= 3; i++) {
                const img = new Image();
                img.src = `assets/Conjurer 5_${dir}_${i}.png`;
                base.conjurer.images[key].push(img);
            }
        });
        base.keyImg.src = 'assets/key.png';
        
        // Spawn en zona libre (Tile 12, 4) - Garantiza no estar incrustado
        player.x = 384; player.y = 188; 
        return base;
    },
    update: (dt) => {
        const c = currentLevelData.conjurer;
        if (currentLevelData.gameOver || state.paused) return;

        // Lógica de spawn retrasado
        if (!currentLevelData.conjurerSpawned) {
            currentLevelData.spawnTimer -= dt;
            if (currentLevelData.spawnTimer <= 0) {
                currentLevelData.conjurerSpawned = true;
            }
            // No retornamos aquí para permitir la interacción durante la advertencia
        }

        // IA de persecución: Movimiento hacia el jugador
        let dx = 0, dy = 0;
        if (currentLevelData.conjurerSpawned) {
            if (Math.abs(c.x - player.x) > 8) dx = c.x < player.x ? c.speed : -c.speed;
            if (Math.abs(c.y - player.y) > 8) dy = c.y < player.y ? c.speed : -c.speed;
            
            const nx = c.x + (dx * dt);
            const ny = c.y + (dy * dt);

            const isWall = (tx, ty) => {
            // Caja de colisión reducida para el enemigo (idéntica a la del jugador en main.js)
            const points = [
                { x: tx + 24, y: ty + 50 },
                { x: tx + 40, y: ty + 50 },
                { x: tx + 24, y: ty + 60 },
                { x: tx + 40, y: ty + 60 },
                { x: tx + 32, y: ty + 56 }
            ];
            for (let p of points) {
                const gx = Math.floor(p.x / 32);
                const gy = Math.floor((p.y - MAP_OFFSET_Y) / TILE_SIZE);
                if (currentLevelData.map[gy] && currentLevelData.map[gy][gx] === 1) return true;
            }
            return false;
        };
            
            if (!isWall(nx, c.y)) c.x = nx;
            if (!isWall(c.x, ny)) c.y = ny;

            // Actualizar dirección y animación del Conjurer
            if (Math.abs(dx) > Math.abs(dy)) c.direction = dx > 0 ? "right" : "left";
            else if (dy !== 0) c.direction = dy > 0 ? "down" : "up";

            c.animCounter += dt;
            if (c.animCounter > 12) {
                c.animCounter = 0;
                c.animFrame = (c.animFrame + 1) % 4;
            }

            // Colisión fatal con el jugador
            if (Math.hypot((c.x + 32) - (player.x + 32), (c.y + 45) - (player.y + 45)) < 30) {
                currentLevelData.gameOver = true;
                gameOver("¡El Conjurador te ha alcanzado en las sombras!");
                return;
            }
        }

        const keysNeeded = currentLevelData.keys.filter(k => !k.collected).length;
        if (!currentLevelData.gameOver) {
            if (!currentLevelData.conjurerSpawned) {
                ui.innerHTML = `<strong>${currentLevelData.question.prompt}</strong><br>¡CORRE! El enemigo aparecerá pronto...`;
            } else {
                ui.innerHTML = `<strong>${currentLevelData.question.prompt}</strong><br>${keysNeeded > 0 ? `<span style="color:cyan">Llaves restantes: ${keysNeeded}</span>` : `<span style="color:#f8b800">¡LLAVES RECOGIDAS! Ve a la puerta.</span>`}`;
            }
        }
    },
    draw: () => {
        // Dibujar Indicadores de Puertas
        ctx.font = "bold 20px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText("F", 1 * 32 + 16, 1 * 32 + 50);  // Arriba-Izquierda
        ctx.fillText("V", 1 * 32 + 16, 14 * 32 + 50); // Abajo-Izquierda

        // Dibujar Llaves
        currentLevelData.keys.forEach(k => {
            if (!k.collected) {
                if (currentLevelData.keyImg.complete) {
                    ctx.drawImage(currentLevelData.keyImg, k.x, k.y, 32, 32);
                } else {
                    ctx.fillStyle = "#f8b800";
                    ctx.fillRect(k.x, k.y, 20, 10); 
                }
                ctx.fillStyle = "white";
                ctx.font = "bold 12px Arial";
                ctx.fillText(k.value, k.x + 16, k.y - 5);
            }
        });

        if (currentLevelData.wallColor) {
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = currentLevelData.wallColor;
            currentLevelData.map.forEach((row, rowIndex) => {
                row.forEach((tileType, columnIndex) => {
                    if (tileType === 1) {
                        ctx.fillRect(columnIndex * 32, rowIndex * 32 + MAP_OFFSET_Y, 32, 32);
                    }
                });
            });
            ctx.globalAlpha = 1;
        }

        if (!currentLevelData.conjurerSpawned) {
            // Alerta sobre la cabeza del jugador (sin cuadro amarillo en el mapa)
            if (currentLevelData.spawnTimer < 120) {
                ctx.fillStyle = "#ff0000";
                ctx.textAlign = "center";
                ctx.font = "bold 16px 'Press Start 2P'";
                ctx.fillText("¡MUÉVETE!", player.x + 32, player.y - 20);
            }
            return;
        }
        const c = currentLevelData.conjurer;
        const animSeq = [0, 1, 0, 2];
        const frameIndex = animSeq[c.animFrame];
        // Verificación de seguridad para evitar pantalla blanca si la imagen no existe
        const img = c.images[c.direction] ? c.images[c.direction][frameIndex] : null;
        if (img && img.complete) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, c.x, c.y, c.w, c.h);
        }
    },
    interact: () => {
        const data = currentLevelData;

        // 1. Recolección de llaves con ESPACIO
        const alreadyHasAKey = data.keys.some(key => key.collected);
        const keyNearby = data.keys.find(k => !k.collected && checkProximity({ x: k.x, y: k.y, w: 32, h: 32 }));

        if (keyNearby) {
            if (!alreadyHasAKey) {
                keyNearby.collected = true;
                ui.innerHTML = `⭐ ¡Has encontrado la Llave ${keyNearby.value}! Busca su puerta.`;
            } else {
                ui.innerHTML = "Solo puedes cargar una llave a la vez.";
            }
            return;
        }

        // 2. Interacción con puertas
        const door = data.tileObjects.find(o => o.interactive && checkProximity(o));
        if (door) {
            const hasKey = data.keys.find(k => k.value === door.value && k.collected);
            
            if (!hasKey) {
                ui.innerHTML = `🔒 Necesitas la Llave ${door.value} para abrir esta puerta.`;
                return;
            }

            if (door.value === currentLevelData.question.correct) {
                if (currentLevelData.currentQuestionIndex + 1 < currentLevelData.questions.length) {
                    currentLevelData.currentQuestionIndex++;
                    currentLevelData.question = currentLevelData.questions[currentLevelData.currentQuestionIndex];
                    currentLevelData.wallColor = currentLevelData.wallColors[currentLevelData.currentQuestionIndex] || currentLevelData.wallColors[0];
                    currentLevelData.keys.forEach(k => k.collected = false);
                    currentLevelData.conjurerSpawned = false;
                    currentLevelData.spawnTimer = 300;
                    currentLevelData.conjurer.x = 384;
                    currentLevelData.conjurer.y = 316;
                    player.x = 384;
                    player.y = 188;
                    ui.innerHTML = `✅ ¡Has librado al Conjurador! Regresas al laberinto. Pregunta ${currentLevelData.currentQuestionIndex + 1}/${currentLevelData.questions.length}: ${currentLevelData.question.prompt}`;
                    return;
                }
                ui.innerHTML = "✅ ¡ESCAPE EXITOSO!";
                nextLevel();
            } else {
                currentLevelData.gameOver = true;
                gameOver("❌ ¡ERROR! Esta puerta era una trampa mortal en el laberinto.");
                return;
            }
        }
    }
};