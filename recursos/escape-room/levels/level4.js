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
            type: levelData.type,
            title: levelData.title,
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
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [
                { "id": "exit", "type": "door", "tileX": 24, "tileY": 8, "interactive": true }
            ],
            solved: false,
            idleTimer: 0,
            maxIdleTime: 300,
            startGrace: 180,
            // 🛡️ ZONA SEGURA: Toldo simple en esquina inferior izquierda
            safeZone: { x: 16, y: 468, w: 96, h: 80 },
            safeZoneActive: true,
            playerWasInSafeZone: false,
            structureWalls: [],
            spider: {
                x: cW / 2, y: 30, state: "scanning", targetX: cW / 2, targetY: 30,
                heldItem: null, animFrame: 0, animCounter: 0, speed: 4,
                currentTargetPedestal: null
            },
            pedestals: [],
            statusMessage: "",
            messageTimer: 0
        };

        const jsonItems = scenario.items || [];
        console.log("Level 4 - JSON Items:", jsonItems); // Debugging
        if (jsonItems.length === 0) return base; // Seguridad contra bloqueo/loop

        // Cachear el orden de victoria para no recalcular en cada frame (optimización móvil)
        base.winOrder = [0, ...jsonItems.map(i => i.size)];

        // Lógica N+1: Pedestales necesarios para mover piezas
        const numPedestals = jsonItems.length + 1;
        // Ajustamos el espaciado para que quepan más elementos (80px en lugar de 100px)
        const spacing = numPedestals > 5 ? 80 : 100;
        const startX = (cW - (numPedestals * spacing)) / 2;

        // Pedestales en la línea inferior (y: 470), accesibles desde la zona segura
        for (let i = 0; i < numPedestals; i++) {
            base.pedestals.push({ id: i, x: startX + (i * spacing), y: 470, tower: null });
        }

        // Barajar hasta asegurar que NO empiece ordenado de menor a mayor
        // (el reto real exige que el alumno tenga que reordenar los bloques).
        let availableIndices = Array.from({ length: numPedestals }, (_, i) => i);

        // Barajado robusto (Fisher-Yates)
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Devuelve el orden de tamaños resultante en los pedestales
        const orderFrom = (idx) => {
            const testOrder = new Array(numPedestals).fill(0);
            jsonItems.forEach((item, k) => { testOrder[idx[k]] = item.size; });
            return testOrder;
        };
        // ¿Está estrictamente ordenado de menor a mayor (con el vacío al inicio)?
        const isAscending = (order) => {
            for (let i = 1; i < order.length; i++) {
                if (order[i] <= order[i - 1]) return false;
            }
            return true;
        };

        // Re-barajamos hasta que el arreglo inicial NO quede ascendente.
        let guard = 0;
        do {
            shuffle(availableIndices);
            guard++;
        } while (isAscending(orderFrom(availableIndices)) && guard < 50);

        // Doble seguridad: si tras muchos intentos aún quedó ascendente
        // (poco probable), intercambiamos los dos primeros bloques.
        if (isAscending(orderFrom(availableIndices)) && numPedestals > 2) {
            [availableIndices[1], availableIndices[2]] = [availableIndices[2], availableIndices[1]];
        }

        jsonItems.forEach((item, idx) => {
            base.pedestals[availableIndices[idx]].tower = { ...item };
        });

        // Colocamos al jugador dentro de la zona segura (esquina inferior izquierda)
        player.x = 40; player.y = 490;
        
        // Agregar furniture (techo con colisión física) al nivel
        base.furniture = [
            { x: base.safeZone.x - 4, y: base.safeZone.y - 16, w: 96, h: 32, collidable: true }
        ];
        
        return base;
    },
    update: (dt) => {
        if (currentLevelData.solved) return;

        // UI Dinámica: Alterna entre la descripción (pregunta) y la info de proximidad
        let header = `<strong>${currentLevelData.title}</strong><br>`;
        let content = "";
        
        const nearPedestal = currentLevelData.pedestals.find(p => p.tower && checkProximity({ x: p.x, y: p.y, w: 32, h: 32 }));

        if (currentLevelData.messageTimer > 0) {
            content = `<span style="color: #f8b800;">${currentLevelData.statusMessage}</span>`;
            currentLevelData.messageTimer -= dt;
        } else if (nearPedestal && !player.isCaptured) {
            content = `🔍 Elemento: <strong>${nearPedestal.tower.name}</strong>`;
        } else if (state.inventory) {
            content = `📦 Llevas: <strong>${state.inventory.name}</strong>`;
        } else {
            content = currentLevelData.description || "Ordena los elementos.";
        }
        ui.innerHTML = header + content;

        // Decrementar periodo de gracia
        if (currentLevelData.startGrace > 0) currentLevelData.startGrace -= dt;

        // 1. Lógica de inactividad del jugador
        if (!player.moving) {
            currentLevelData.idleTimer += dt;
        } else {
            currentLevelData.idleTimer = 0;
        }

        // 🛡️ ZONA SEGURA: Verificar si el jugador está dentro
        const sz = currentLevelData.safeZone;
        const playerIsInSafeZone = (
            player.x + player.w / 2 >= sz.x &&
            player.x + player.w / 2 <= sz.x + sz.w &&
            player.y + player.h / 2 >= sz.y &&
            player.y + player.h / 2 <= sz.y + sz.h
        );

        // Zona segura: solo seguimiento de estado, sin mensajes (se infiere)
        if (playerIsInSafeZone && !currentLevelData.playerWasInSafeZone) {
            currentLevelData.playerWasInSafeZone = true;
        } else if (!playerIsInSafeZone && currentLevelData.playerWasInSafeZone) {
            currentLevelData.playerWasInSafeZone = false;
        }

        // Si el jugador está en la zona segura, la araña no lo detecta ni lo captura
        const s = currentLevelData.spider;

        // REGLA DE ORO: Solo captura si NO lleva un objeto, ha pasado el tiempo de gracia,
        // y el jugador NO está en la zona segura
        if (!player.isCaptured && currentLevelData.startGrace <= 0 && !s.heldItem && !playerIsInSafeZone) {
            const distToBody = Math.hypot((player.x + 12) - s.x, (player.y + 20) - s.y);
            if (distToBody < 65) {
                s.heldItem = "PLAYER";
                player.isCaptured = true;
                s.state = "lifting";
            }
        }

        switch(s.state) {
            case "scanning":
                // Detección: Solo si ha pasado el periodo de gracia y el jugador no está en zona segura
                const isPlayerTarget = (currentLevelData.startGrace <= 0) && !playerIsInSafeZone && (
                                     (currentLevelData.idleTimer >= currentLevelData.maxIdleTime) || 
                                     (Math.abs(s.x - (player.x + 32)) < 30)
                );
                
                let target = isPlayerTarget ? { x: player.x, y: player.y, isPlayer: true } : null;
                
                // 2. Si no va tras el jugador, busca un objeto al azar
                if (!target && !player.isCaptured) {
                    // Verificar si el pedestal actual todavía tiene torre, si no, buscar otro
                    if (!s.currentTargetPedestal || !s.currentTargetPedestal.tower) {
                        const towers = currentLevelData.pedestals.filter(p => p.tower);
                        if (towers.length > 0) {
                            s.currentTargetPedestal = towers[Math.floor(Math.random() * towers.length)];
                        }
                    }
                    if (s.currentTargetPedestal && s.currentTargetPedestal.tower) {
                        target = { x: s.currentTargetPedestal.x + 20, y: s.currentTargetPedestal.y, isPlayer: false };
                    } else if (currentLevelData.startGrace <= 0 && !playerIsInSafeZone) {
                        // Fallback: sin torres disponibles, ir al jugador
                        target = { x: player.x, y: player.y, isPlayer: true };
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
                // El techo bloquea el descenso de la araña
                if (s.x > sz.x - 4 && s.x < sz.x - 4 + 96 && s.y + 7 * dt >= sz.y - 16 && s.y <= sz.y - 16 + 32) {
                    s.state = "scanning";
                    s.y = sz.y - 16 - 10;
                    break;
                }
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
        const winOrder = currentLevelData.winOrder || [];

        if (winOrder.length > 0 && currentOrder.every((v, i) => v === winOrder[i])) {
            if (!currentLevelData.solved) {
                currentLevelData.solved = true;
                if (window.gameStats) window.gameStats.recordHit(state.levelIndex);
                ui.innerHTML = "✅ ¡Orden perfecto! El espacio vacío al inicio disuelve la telaraña.";
            }
        }
    },
    draw: () => {
        const sz = currentLevelData.safeZone;
        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.5;
        
        // === TECHO con diseño de pared (tile 1 - ladrillos del borde) ===
        TILES[1].pattern(sz.x - 4, sz.y - 16);
        TILES[1].pattern(sz.x + 28, sz.y - 16);
        TILES[1].pattern(sz.x + 60, sz.y - 16);
        
        // Sombra bajo el techo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(sz.x - 4, sz.y + 16, sz.w + 8, 8);
        
        // (Sin poste izquierdo — techo autosoportado)
        
        // (Sin marco visual — la zona segura se infiere por el techo y ubicación)

        // === TELARAÑAS más grandes en el marco superior (fuera del ladrillo) ===
        ctx.strokeStyle = 'rgba(214, 224, 234, 0.42)';
        ctx.lineWidth = 1.3;
        const cobwebs = [
            { x: 22,  y: 4, w: 48, h: 46 },
            { x: 150, y: 4, w: 34, h: 40 },
            { x: 650, y: 4, w: 34, h: 40 },
            { x: 778, y: 4, w: 48, h: 46 }
        ];
        cobwebs.forEach(cw => {
            const topY = 2;
            // Hilos radiales en abanico
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(cw.x, topY);
                ctx.lineTo(cw.x + i * cw.w * 0.3, cw.y + cw.h);
                ctx.stroke();
            }
            // Hilos transversales (tela)
            for (let j = 1; j <= 4; j++) {
                const wy = topY + (cw.h + 4) * (j / 4);
                const hw = j * cw.w * 0.26;
                ctx.beginPath();
                ctx.moveTo(cw.x - hw, wy);
                ctx.lineTo(cw.x + hw, wy);
                ctx.stroke();
            }
            // Hilo colgante central
            ctx.beginPath();
            ctx.moveTo(cw.x, topY);
            ctx.lineTo(cw.x, cw.y + cw.h + 4);
            ctx.stroke();
        });

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
        
        const nearPedestal = currentLevelData.pedestals.find(p => window.checkProximity({ x: p.x, y: p.y, w: 32, h: 32 }));
        
        if (nearPedestal) {
            if (!state.inventory && nearPedestal.tower) {
                // Recoger torre
                state.inventory = nearPedestal.tower;
                nearPedestal.tower = null;
                if (window.gameStats) window.gameStats.recordMove(state.levelIndex);
                currentLevelData.statusMessage = "📦 Has tomado: " + state.inventory.name;
                currentLevelData.messageTimer = 60;
            } else if (state.inventory && !nearPedestal.tower) {
                // Dejar torre en pedestal vacío
                nearPedestal.tower = state.inventory;
                currentLevelData.statusMessage = "✅ Has colocado: " + state.inventory.name;
                currentLevelData.messageTimer = 60;
                if (window.gameStats) window.gameStats.recordMove(state.levelIndex);
                state.inventory = null;
            }
        }

        const exitDoor = currentLevelData.tileObjects.find(o => o.id === 'exit' && window.checkProximity(o));
        if (exitDoor) {
            if (currentLevelData.solved) {
                nextLevel();
            } else {
                currentLevelData.statusMessage = "🚪 La puerta está sellada por telarañas.";
                currentLevelData.messageTimer = 90;
            }
        }
    }
};