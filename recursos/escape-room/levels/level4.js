(window.levelLogics = window.levelLogics || {})['tower'] = {
    init: (levelData) => {
        // Soporte para múltiples escenarios aleatorios
        let scenario = levelData;
        if (levelData.scenarios && levelData.scenarios.length > 0) {
            scenario = levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)];
        }

        const cW = (canvas && canvas.width) ? canvas.width : 800;
        const base = {
            ...scenario,
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [
                { "id": "exit", "type": "door", "tileX": 24, "tileY": 8, "interactive": true }
            ],
            solved: false,
            idleTimer: 0,
            maxIdleTime: 300, // Aumentado de 3 a 5 segundos aprox
            startGrace: 180,  // 3 segundos de gracia al iniciar
            spider: {
                x: cW / 2, y: 30, state: "scanning", targetX: cW / 2, targetY: 30,
                heldItem: null, animFrame: 0, animCounter: 0, speed: 4,
                currentTargetPedestal: null
            },
            pedestals: []
        };

        const jsonItems = scenario.items || [];
        // Lógica N+1: Pedestales necesarios para mover piezas
        const numPedestals = jsonItems.length + 1;
        // Ajustamos el espaciado para que quepan más elementos (80px en lugar de 100px)
        const spacing = numPedestals > 5 ? 80 : 100;
        const startX = (cW - (numPedestals * spacing)) / 2;

        for (let i = 0; i < numPedestals; i++) {
            base.pedestals.push({ id: i, x: startX + (i * spacing), y: 350, tower: null });
        }

        // Barajar hasta asegurar que NO empiece resuelto
        let availableIndices;
        let solvedAtStart = true;
        // El orden esperado es el orden definido en el arreglo 'items' del JSON
        const expectedOrder = [0, ...jsonItems.map(i => i.size)];

        while (solvedAtStart) {
            availableIndices = [...Array(numPedestals).keys()].sort(() => Math.random() - 0.5);
            
            // Pre-verificación del orden resultante
            const testOrder = new Array(numPedestals).fill(0);
            jsonItems.forEach((item, idx) => {
                testOrder[availableIndices[idx]] = item.size;
            });
            
            solvedAtStart = testOrder.every((v, i) => v === expectedOrder[i]);
        }

        jsonItems.forEach((item, idx) => {
            base.pedestals[availableIndices[idx]].tower = { ...item };
        });

        // Desplazamos al jugador a la izquierda al iniciar para evitar alineación inmediata
        player.x = cW / 2 - 100; player.y = 200;
        player.isCaptured = false;
        return base;
    },
    update: (dt) => {
        if (currentLevelData.solved) return;

        // Información automática por proximidad (Estándar pedagógico)
        const nearPedestal = currentLevelData.pedestals.find(p => p.tower && checkProximity({ x: p.x, y: p.y, w: 32, h: 32 }));
        if (nearPedestal && !player.isCaptured) {
            ui.innerHTML = `🔍 Elemento: <strong>${nearPedestal.tower.name}</strong>`;
        }

        // Decrementar periodo de gracia
        if (currentLevelData.startGrace > 0) currentLevelData.startGrace -= dt;

        // 1. Lógica de inactividad del jugador
        if (!player.moving) {
            currentLevelData.idleTimer += dt;
        } else {
            currentLevelData.idleTimer = 0;
        }

        const s = currentLevelData.spider;

        // REGLA DE ORO: Solo captura si NO lleva un objeto y ha pasado el tiempo de gracia
        if (!player.isCaptured && currentLevelData.startGrace <= 0 && !s.heldItem) {
            const distToBody = Math.hypot((player.x + 12) - s.x, (player.y + 20) - s.y);
            if (distToBody < 65) {
                s.heldItem = "PLAYER";
                player.isCaptured = true;
                s.state = "lifting";
            }
        }

        switch(s.state) {
            case "scanning":
                // 1. Detección: Solo si ha pasado el periodo de gracia
                const isPlayerTarget = (currentLevelData.startGrace <= 0) && (
                                     (currentLevelData.idleTimer >= currentLevelData.maxIdleTime) || 
                                     (Math.abs(s.x - (player.x + 32)) < 30)
                );
                
                let target = isPlayerTarget ? { x: player.x, y: player.y, isPlayer: true } : null;
                
                // 2. Si no va tras el jugador, busca un objeto al azar y MANTÉN el objetivo para evitar temblores
                if (!target) {
                    if (!s.currentTargetPedestal) {
                        const towers = currentLevelData.pedestals.filter(p => p.tower);
                        if (towers.length > 0) {
                            s.currentTargetPedestal = towers[Math.floor(Math.random() * towers.length)];
                        }
                    }
                    if (s.currentTargetPedestal) {
                        target = { x: s.currentTargetPedestal.x + 20, y: s.currentTargetPedestal.y, isPlayer: false };
                    }
                }

                if (target) {
                    let tx = target.isPlayer ? target.x + 32 : target.x; // Apuntar al centro del jugador
                    if (Math.abs(s.x - tx) > 5) {
                        s.x += (s.x < tx) ? s.speed * dt : -s.speed * dt;
                    } else {
                        s.state = "descending";
                        s.targetY = target.y + 20;
                        s.isAttackingPlayer = target.isPlayer;
                        s.currentTargetPedestal = null; // Resetear para la próxima búsqueda
                    }
                }
                break;
            
            case "descending":
                s.y += 7 * dt; // Descenso más agresivo
                if (s.y >= s.targetY) {
                    // El contacto con el jugador ya se maneja globalmente arriba.
                    // Aquí solo procesamos la captura de piezas si el jugador no fue atrapado ya.
                    if (!player.isCaptured) {
                        const p = currentLevelData.pedestals.find(p => Math.abs(p.x + 20 - s.x) < 40 && p.tower);
                        if (p) {
                            s.heldItem = p.tower;
                            p.tower = null;
                        }
                    }
                    s.state = "lifting";
                }
                break;

            case "lifting":
                s.y -= 5 * dt;
                if (s.heldItem === "PLAYER") {
                    player.x = s.x - 32; // Centrar al jugador de 64px de ancho
                    player.y = s.y + 25; // Colgarlo de las patas
                }
                if (s.y <= 30) {
                    if (s.heldItem === "PLAYER") {
                        currentLevelData.gameOver = true;
                        if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, "Evadir a la araña", false);
                        gameOver("¡La araña te ha llevado a su nido!");
                    } else if (s.heldItem) {
                        const emptyPed = currentLevelData.pedestals.find(p => !p.tower);
                        if (emptyPed) emptyPed.tower = s.heldItem;
                        ui.innerHTML = "🕷️ ¡La araña ha desordenado las piezas!";
                    }
                    s.heldItem = null;
                    s.state = "scanning";
                }
                break;
        }
        s.animCounter += dt;
        if(s.animCounter > 10) { 
            s.animCounter = 0; 
            s.animFrame = ((s.animFrame || 0) + 1) % 4; 
        }

        // 3. Verificar condición de victoria: El primer pedestal DEBE estar vacío (0)
        // y el resto deben seguir el orden ascendente esperado.
        const currentOrder = currentLevelData.pedestals.map(p => p.tower ? p.tower.size : 0);
        // Ahora sigue el orden EXACTO definido en el JSON
        const winOrder = [0, ...(currentLevelData.items || []).map(i => i.size)];

        if (currentOrder.length === winOrder.length && currentOrder.every((v, i) => v === winOrder[i])) {
            if (!currentLevelData.solved) {
                currentLevelData.solved = true;
                if (window.gameStats) window.gameStats.recordHit(state.levelIndex);
                ui.innerHTML = "✅ ¡Orden perfecto! El espacio vacío al inicio disuelve la telaraña.";
            }
        }
    },
    draw: () => {
        currentLevelData.pedestals.forEach(p => {
            if (TILES[8]) TILES[8].pattern(p.x, p.y); 
            if (p.tower) {
                let h = p.tower.size * 15 + 10;
                ctx.fillStyle = p.tower.color;
                ctx.fillRect(p.x + 8, p.y + 15 - h, 16, h);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(p.x + 8, p.y + 15 - h, 4, h);
            }
        });

        const s = currentLevelData.spider;
        ctx.strokeStyle = "#e0f8d0"; 
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, s.y); ctx.stroke();

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.fillStyle = NES_PALETTE.black;
        ctx.fillRect(-24, -16, 48, 32); 
        ctx.fillRect(-16, 8, 32, 16);   
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-10, 16, 4, 4); ctx.fillRect(6, 16, 4, 4);
        
        ctx.strokeStyle = NES_PALETTE.black; ctx.lineWidth = 1.5;
        let offset = Math.sin(Date.now() * 0.01) * 5;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(-24, -8 + i*8); ctx.lineTo(-40 - offset*2, -16 + i*12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(24, -8 + i*8); ctx.lineTo(40 + offset*2, -16 + i*12); ctx.stroke();
        }
        ctx.restore();
        
        if (s.heldItem && s.heldItem !== "PLAYER") {
            ctx.fillStyle = s.heldItem.color;
            ctx.fillRect(s.x - 16, s.y + 20, 32, 24);
        }

        if (currentLevelData.idleTimer > currentLevelData.maxIdleTime * 0.7 && !currentLevelData.solved) {
            ctx.fillStyle = "red";
            ctx.font = "10px 'Press Start 2P'";
            ctx.fillText("¡MUÉVETE!", player.x - 10, player.y - 20);
        }

        // Dibujar puerta de salida (abierta)
        if (currentLevelData.solved) {
            const door = currentLevelData.tileObjects.find(o => o.id === 'exit');
            const dx = door.tileX * 32;
            const dy = door.tileY * 32 + MAP_OFFSET_Y;
            ctx.fillStyle = NES_PALETTE.black;
            ctx.fillRect(dx, dy, 32, 32);
            ctx.fillStyle = NES_PALETTE.white;
            ctx.font = "8px 'Press Start 2P'";
            ctx.fillText("SALIDA", dx - 60, dy + 20);
        }
    },
    interact: () => {
        if (player.isCaptured) return;

        const nearPedestal = currentLevelData.pedestals.find(p => checkProximity({ x: p.x, y: p.y, w: 32, h: 32 }));
        
        if (nearPedestal) {
            if (!state.inventory && nearPedestal.tower) {
                // Recoger torre
                state.inventory = nearPedestal.tower;
                nearPedestal.tower = null;
                ui.innerHTML = "Llevas: " + state.inventory.name;
            } else if (state.inventory && !nearPedestal.tower) {
                // Dejar torre en pedestal vacío
                nearPedestal.tower = state.inventory;
                ui.innerHTML = "Has colocado la " + state.inventory.name;
                state.inventory = null;
            }
        }

        const exitDoor = currentLevelData.tileObjects.find(o => o.id === 'exit' && checkProximity(o));
        if (exitDoor) {
            if (currentLevelData.solved) {
                nextLevel();
            } else {
                ui.innerHTML = "La puerta está sellada por telarañas. " + (currentLevelData.description || "Ordena las torres de menor a mayor.");
            }
        }
    }
};