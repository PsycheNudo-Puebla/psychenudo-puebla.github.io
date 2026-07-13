levelLogics['date'] = {
    init: (levelData) => {
        // 🧹 LIMPIEZA total de estado de ejecuciones anteriores
        // Los tileObjects son referencia al JSON original y acumulan propiedades
        if (levelData.tileObjects) {
            levelData.tileObjects.forEach(obj => {
                delete obj.hasWinningObject;
                delete obj.foundHint;
                delete obj.bookshelfHint;
            });
        }
        
        const activeScenario = (levelData.scenarios && levelData.scenarios.length > 0)
            ? levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)]
            : levelData;

        const base = {
            ...activeScenario,
            type: levelData.type,
            title: levelData.title,
            map: levelData.map || [
                [1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: levelData.tileObjects || [
                { "id": "t1", "type": "table", "tileX": 10, "tileY": 4, "interactive": true },
                { "id": "t2", "type": "table", "tileX": 13, "tileY": 4, "interactive": true },
                { "id": "s1", "type": "bookshelf", "tileX": 2, "tileY": 1, "interactive": true },
                { "id": "s2", "type": "bookshelf", "tileX": 20, "tileY": 1, "interactive": true },
                { "id": "s3", "type": "bookshelf", "tileX": 2, "tileY": 8, "interactive": true },
                { "id": "s4", "type": "bookshelf", "tileX": 20, "tileY": 8, "interactive": true },
                { "id": "locked_door", "type": "door", "tileX": 12, "tileY": 0, "interactive": true }
            ],
            foundObject: false,
            object: activeScenario.object, // Asegurar que el objeto se pase
            pistaLibrero: activeScenario.pistaLibrero, // Asegurar que la pista se pase
            claveCIE: activeScenario.claveCIE, // Asegurar que la clave se pase
            longitudClave: activeScenario.longitudClave, // Asegurar que la longitud se pase
            doorUnlocked: false,
            doorAnimY: 0
        };
        
        // Spawn seguro dentro del Laboratorio
        player.x = 400; player.y = 300;
        
        // Distribuir pistas en los libreros
        const hints = base.bookshelfHints || [];
        const bookshelves = base.tileObjects.filter(o => o.type === 'bookshelf');
        bookshelves.forEach((bs, i) => {
            if (hints[i]) bs.bookshelfHint = hints[i];
        });

        // Activar colisiones en muebles sólidos (plantas, sillas)
        base.tileObjects.forEach(obj => {
            if (obj.type === 'plant' || obj.type === 'chair') {
                obj.collidable = true;
            }
        });

        // Lógica de juego: Ocultar objeto ganador
        const potentialSpots = base.tileObjects.filter(o => o.type !== 'door');
        // Hacemos que todos los muebles candidatos muestren el signo "?"
        potentialSpots.forEach(spot => spot.interactive = true);

        const winner = potentialSpots[Math.floor(Math.random() * potentialSpots.length)];
        winner.hasWinningObject = true;
        
        // Sistema robusto de tracking: IDs de pistas descubiertas
        // (evita problemas de referencia de objetos entre JSON y runtime)
        base._foundHintIds = [];
        
        return base;
    },
    draw: () => {
        // ⭐ Marcadores brillantes tipo estrella para pistas descubiertas
        const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
        
        // Helper para dibujar path de estrella
        const starPath = (cx, cy, outerR, innerR, spikes) => {
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const r = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI) / spikes - Math.PI / 2;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle) + 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        };
        
        if (currentLevelData.tileObjects) {
            currentLevelData.tileObjects.forEach(obj => {
                let showMarker = false;
                let markerType = 'hint';
                
                if (currentLevelData._foundHintIds && currentLevelData._foundHintIds.includes(obj.id)) {
                    showMarker = true;
                }
                if (obj.hasWinningObject && currentLevelData.foundObject) {
                    showMarker = true;
                    markerType = 'object';
                }
                
                if (showMarker && obj.tileX !== undefined) {
                    const cx = obj.tileX * TILE_SIZE + TILE_SIZE / 2;
                    const cy = obj.tileY * TILE_SIZE + MAP_OFFSET_Y + TILE_SIZE / 2;
                    
                    if (markerType === 'object') {
                        // ◆ Diamante dorado para OBJETO FINAL
                        const baseAlpha = 0.75 + pulse * 0.25;
                        const s = 8;
                        const drawDia = (ox, oy) => {
                            ctx.beginPath();
                            ctx.moveTo(cx + ox, cy + oy - s);
                            ctx.lineTo(cx + ox + s, cy + oy);
                            ctx.lineTo(cx + ox, cy + oy + s);
                            ctx.lineTo(cx + ox - s, cy + oy);
                            ctx.closePath();
                        };
                        // Borde negro (dibujar 8 veces con offset 1px)
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                drawDia(dx, dy);
                                ctx.fillStyle = '#000';
                                ctx.fill();
                            }
                        }
                        // Relleno dorado + contorno naranja
                        drawDia(0, 0);
                        ctx.fillStyle = `rgba(255, 215, 0, ${baseAlpha})`;
                        ctx.strokeStyle = 'rgba(255, 180, 0, 0.9)';
                        ctx.lineWidth = 1.5;
                        ctx.fill();
                        ctx.stroke();
                        // Brillito interior
                        ctx.fillStyle = `rgba(255, 255, 200, ${baseAlpha * 0.5})`;
                        ctx.beginPath();
                        ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        // ★ Estrella dorada para PISTAS de librero
                        const baseAlpha = 0.65 + pulse * 0.35;
                        const outerR = 6;
                        const innerR = 2.5;
                        const spikes = 5;
                        // Borde negro (dibujar 8 veces con offset 1px)
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                starPath(cx + dx, cy + dy, outerR, innerR, spikes);
                                ctx.fillStyle = '#000';
                                ctx.fill();
                            }
                        }
                        // Relleno amarillo + contorno naranja
                        starPath(cx, cy, outerR, innerR, spikes);
                        ctx.fillStyle = `rgba(255, 200, 0, ${baseAlpha})`;
                        ctx.strokeStyle = `rgba(255, 160, 0, ${0.7 + pulse * 0.3})`;
                        ctx.lineWidth = 1.5;
                        ctx.fill();
                        ctx.stroke();
                    }
                }
            });
        }

        if (currentLevelData.doorUnlocked) {
            // Animación de la puerta abriéndose hacia arriba
            if (currentLevelData.doorAnimY > -32) currentLevelData.doorAnimY -= 1;
            
            // Dibujar el hueco de la puerta
            ctx.fillStyle = NES_PALETTE.black;
            ctx.fillRect(12 * 32, MAP_OFFSET_Y, 32, 32);
            
            if (currentLevelData.doorAnimY <= -32) {
                ui.innerHTML = "🔓 ¡Puerta abierta! Cruza para escapar.";
            }
        } else {
            // Mensaje proactivo al acercarse a la puerta
            // Ajustado al centro del sprite de 64x64
            const playerCenterX = player.x + 32;
            const playerCenterY = player.y + 32;
            const doorX = 12 * 32 + 16;
            const doorY = 0 * 32 + 60 + 16;
            // Solo mostrar si el mensaje actual está vacío para no borrar pistas
            if (Math.hypot(playerCenterX - doorX, playerCenterY - doorY) < 60 && ui.innerHTML === "" && !state.inputModo) {
                ui.innerHTML = "🔑 La puerta principal está bloqueada. Requiere un código.";
            }
        }
    },
    interact: () => {
        const playerCenterX = player.x + 32;
        const playerCenterY = player.y + 32;

        const obj = currentLevelData.tileObjects.find(o => {
            return window.checkProximity(o);
        });

        if (!obj) return;

        if (obj.type === 'door') {
            if (currentLevelData.doorUnlocked) {
                nextLevel();
            } else {
                if (!currentLevelData.foundObject) {
                    ui.innerHTML = "❌ La puerta está cerrada con un teclado electrónico. Necesitas encontrar el código antes de intentar descifrarlo.";
                } else {
                    // Activar el modo de entrada de contraseña si ya tenemos el reporte
                    state.inputModo = true;
                    state.currentInput = "";
                    actualizarDialogoInput();
                }
            }
        } else if (obj.hasWinningObject) {
            if (!currentLevelData.foundObject) {
                currentLevelData.foundObject = true;
                ui.innerHTML = `⭐ ${currentLevelData.object}:\n"${currentLevelData.pistaLibrero}"`;
                if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, "Encontrar: " + currentLevelData.object, true);
            } else {
                // Releer la pista si ya la encontró
                ui.innerHTML = `⭐ ${currentLevelData.object}:\n"${currentLevelData.pistaLibrero}"<br><br><span style="color: #ffff66; font-size: 11px;">💡 Busca en el teclado de la puerta el año/código</span>`;
            }
        } else if (obj.type === 'bookshelf' && obj.bookshelfHint) {
            // Tracking robusto por ID (evita problemas con referencias del JSON)
            if (currentLevelData._foundHintIds && !currentLevelData._foundHintIds.includes(obj.id)) {
                currentLevelData._foundHintIds.push(obj.id);
            }
            // Releer la pista del librero
            ui.innerHTML = `📖 ${obj.bookshelfHint}`;
        } else {
            ui.innerHTML = "Aquí no hay nada útil...";
        }
    }
};