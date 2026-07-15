levelLogics['date'] = {
    init: (levelData) => {
        // 🧹 LIMPIEZA total de estado de ejecuciones anteriores
        // Los tileObjects son referencia al JSON original y acumulan propiedades
        if (levelData.tileObjects) {
            levelData.tileObjects.forEach(obj => {
                delete obj.hasWinningObject;
                delete obj.foundHint;
                delete obj.bookshelfHint;
                delete obj.searched;
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
            password: activeScenario.password || activeScenario.claveCIE, // Contraseña (palabra/clave/fecha)
            doorUnlocked: false,
            doorAnimY: 0
        };
        
        // Spawn seguro dentro del Archivo (frente a la mesa central)
        player.x = 400; player.y = 380;
        
        // Activar colisiones en muebles sólidos (plantas, sillas)
        base.tileObjects.forEach(obj => {
            if (obj.type === 'plant' || obj.type === 'chair') {
                obj.collidable = true;
            }
        });

        // Todos los muebles (excepto la puerta) son revisables: muestran "?"
        // hasta que el jugador los revise; tras revisarlos ya no aparece el signo.
        const reviewable = base.tileObjects.filter(o => o.type !== 'door');
        reviewable.forEach(spot => spot.interactive = true);

        // Pistas y objeto final: SOLO en libreros, mesa y sillas (plantas excluidas)
        const eligible = base.tileObjects.filter(o =>
            o.type === 'bookshelf' || o.type === 'table' || o.type === 'chair'
        );

        // Objeto final en un lugar elegible al azar
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        winner.hasWinningObject = true;

        // Pistas en los demás lugares elegibles (sin pisar el objeto final,
        // para que las 3 pistas sean siempre visibles)
        const hintPool = eligible.filter(o => o !== winner);
        const hints = base.bookshelfHints || [];
        const shuffled = hintPool.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        shuffled.slice(0, hints.length).forEach((o, i) => {
            if (hints[i]) o.bookshelfHint = hints[i];
        });
        
        // Sistema robusto de tracking: IDs de pistas descubiertas
        // (evita problemas de referencia de objetos entre JSON y runtime)
        base._foundHintIds = [];
        
        return base;
    },
    draw: () => {
        // ⭐ Gran mesa central (cols 10-13, rows 7-8) dibujada como pieza única
        const tbx = 10 * TILE_SIZE;
        const tby = 7 * TILE_SIZE + MAP_OFFSET_Y;
        const tbw = 4 * TILE_SIZE;
        const tbh = 2 * TILE_SIZE;
        // Sombra en el suelo
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(tbx + 4, tby + tbh - 3, tbw - 8, 7);
        // Cuerpo de la mesa
        ctx.fillStyle = NES_PALETTE.wood;
        ctx.fillRect(tbx + 2, tby + 2, tbw - 4, tbh - 4);
        // Superficie superior (resalte)
        ctx.fillStyle = NES_PALETTE.woodLight;
        ctx.fillRect(tbx + 2, tby + 2, tbw - 4, 7);
        // Veta de madera
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let gy = tby + 14; gy < tby + tbh - 8; gy += 9) ctx.fillRect(tbx + 5, gy, tbw - 10, 1);
        // Borde inferior oscuro
        ctx.fillStyle = NES_PALETTE.woodDark;
        ctx.fillRect(tbx + 2, tby + tbh - 9, tbw - 4, 7);
        // Patas en las esquinas
        ctx.fillStyle = NES_PALETTE.woodDark;
        ctx.fillRect(tbx + 4, tby + tbh - 6, 7, 8);
        ctx.fillRect(tbx + tbw - 11, tby + tbh - 6, 7, 8);
        ctx.fillRect(tbx + tbw / 2 - 3, tby + tbh - 6, 7, 8);

        // ⭐ Libreros (4 unidades, 2 por columna, cada una 4 cuadros de alto).
        // Se dibujan como pieza continua para que el bastidor quede alineado
        // (el TILES[4] por tile dejaba marcos desalineados al apilar 4).
        const bookshelfH = 4 * TILE_SIZE;
        const drawBookcase = (px, py, w, h) => {
            // Sombra en el suelo
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(px + 2, py + h - 4, w - 4, 6);
            // Panel trasero
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(px + 3, py + 3, w - 6, h - 6);
            // Postes laterales
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(px, py, 4, h);
            ctx.fillRect(px + w - 4, py, 4, h);
            // Rieles superior e inferior
            ctx.fillRect(px, py, w, 5);
            ctx.fillRect(px, py + h - 5, w, 5);
            // Baldas internas (3 baldas => 4 compartimentos)
            const comp = h / 4;
            for (let i = 1; i < 4; i++) {
                ctx.fillStyle = NES_PALETTE.woodDark;
                ctx.fillRect(px + 4, Math.round(py + comp * i) - 2, w - 8, 4);
            }
            // Libros en cada compartimento
            const bookColors = ['#c84b31', '#3b6ea5', '#e0b84b', '#4a8c5a', '#8e44ad', '#d98c4a'];
            for (let c = 0; c < 4; c++) {
                const top = py + comp * c + 4;
                const bottom = py + comp * (c + 1) - 4;
                const compH = bottom - top;
                let bx = px + 6;
                let i = 0;
                while (bx < px + w - 8) {
                    const bw = 3 + (i % 3);
                    const bh = compH - (i % 2) * 3;
                    ctx.fillStyle = bookColors[(i + c) % bookColors.length];
                    ctx.fillRect(bx, Math.round(bottom - bh), bw, bh);
                    ctx.fillStyle = 'rgba(255,255,255,0.18)';
                    ctx.fillRect(bx, Math.round(bottom - bh), 1, bh);
                    bx += bw + 1;
                    i++;
                }
            }
        };
        if (currentLevelData.tileObjects) {
            currentLevelData.tileObjects.forEach(obj => {
                if (obj.type !== 'bookshelf') return;
                const px = obj.tileX * TILE_SIZE;
                const py = obj.tileY * TILE_SIZE + MAP_OFFSET_Y;
                drawBookcase(px, py, TILE_SIZE, bookshelfH);
            });
        }

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
                        const s = 10;
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
                        const outerR = 10;
                        const innerR = 4;
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
        obj.searched = true;

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
                ui.innerHTML = `⭐ ${currentLevelData.object}:\n"${currentLevelData.pistaLibrero}"<br><br><span style="color: #ffff66; font-size: 11px;">💡 Escribe la contraseña en el teclado de la puerta</span>`;
            }
        } else if (obj.bookshelfHint) {
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