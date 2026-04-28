levelLogics['art'] = {
    init: (levelData) => {
        // Soporte para múltiples escenarios aleatorios
        let scenario = levelData;
        if (levelData.scenarios && levelData.scenarios.length > 0) {
            scenario = levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)];
        }

        const base = {
            ...scenario,
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
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
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [
                { "id": "exit", "type": "door", "tileX": 24, "tileY": 8, "interactive": true }
            ],
            placedCorrectly: false,
            gasActive: false,
            gasAlpha: 0,
            gameOver: false,
            targetSlot: { x: 700, y: 150, w: 70, h: 90, interactive: true }, // Marco vacío
            furniture: [
                { id: 'rug', type: 'decor', x: 150, y: 200, w: 500, h: 120, color: NES_PALETTE.rug, collidable: false },
                { id: 'shelf', x: 40, y: 150, w: 64, h: 128, color: NES_PALETTE.wood, collidable: true },
                { id: 'plant', x: 680, y: 80, w: 40, h: 40, color: '#00a800', collidable: true },
                { id: 'statue', x: 100, y: 400, w: 32, h: 64, color: '#a0a0a0', shape: 'statue', collidable: true },
                { id: 'vase', x: 650, y: 400, w: 32, h: 32, color: '#ffffff', shape: 'vase', collidable: true }
            ]
        };

        // Spawn seguro dentro de la Galería
        player.x = 400; player.y = 250;

        const listaCuadros = scenario.paintings || scenario.cuadros || [];
        
        listaCuadros.forEach((p, i) => {
            base.furniture.push({ 
                id: 'painting', 
                name: p.name || p.nombre, 
                description: p.descripcion || p.description,
                style: p.style || p.cat, 
                x: 150 + (i * 200), y: 10, w: 60, h: 40, 
                interactable: true,
                collidable: false // Los cuadros en la pared no deben bloquear
            });
        });

        return base;
    },
    update: () => {
        if (currentLevelData.gasActive && !currentLevelData.gameOver) {
            currentLevelData.gasAlpha += 0.002;
            if (currentLevelData.gasAlpha >= 0.8) {
                currentLevelData.gameOver = true;
                gameOver("¡El gas venenoso te ha alcanzado!");
            }
        }

        // Información automática por proximidad
        if (!currentLevelData.gameOver) {
            const nearPainting = currentLevelData.furniture.find(f => f.id === 'painting' && checkProximity(f));
            const nearSlot = checkProximity(currentLevelData.targetSlot);

            if (nearPainting) {
                ui.innerHTML = `🖼️ <strong>${nearPainting.name}</strong>: ${nearPainting.description}`;
            } else if (nearSlot) {
                ui.innerHTML = state.inventory ? `📍 Espacio para un cuadro de estilo: ${currentLevelData.targetStyle}` : "📍 Un marco vacío en la pared.";
            }
        }
    },
    draw: () => {
        // Si la puerta está abierta, cambiamos el tile de la pared (5) por suelo (0)
        if (currentLevelData.placedCorrectly && currentLevelData.map[8][24] === 5) {
            currentLevelData.map[8][24] = 0;
        }

        currentLevelData.furniture.forEach(f => {
            if (f.id === 'rug') { 
                // Alfombra con patrón NES
                ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.w, f.h);
                ctx.strokeStyle = NES_PALETTE.gold; ctx.lineWidth = 4;
                ctx.strokeRect(f.x + 10, f.y + 10, f.w - 20, f.h - 20);
                // Flecos
                ctx.fillStyle = NES_PALETTE.gold;
                for(let i=0; i<f.w; i+=10) { ctx.fillRect(f.x + i, f.y - 2, 4, 4); ctx.fillRect(f.x + i, f.y + f.h - 2, 4, 4); }
            }
            if (f.id === 'shelf') { 
                ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.w, f.h);
                ctx.fillStyle = NES_PALETTE.woodLight; ctx.fillRect(f.x+2, f.y+20, f.w-4, 4);
            }
            if (f.id === 'plant') {
                ctx.fillStyle = '#881400'; ctx.fillRect(f.x + 10, f.y + 20, 20, 20); // Maceta
                ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, 40, 20); // Hojas
            }
            if (f.shape === 'statue' || f.shape === 'vase') {
                // Reutilizamos la lógica de dibujo de level2 si es necesario
                ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.w, f.h);
            }
            if (f.id === 'painting') {
                // Marco dorado
                ctx.fillStyle = NES_PALETTE.gold; ctx.fillRect(f.x - 2, f.y - 2, f.w + 4, f.h + 4);
                // Lienzo base
                ctx.fillStyle = '#101010'; ctx.fillRect(f.x, f.y, f.w, f.h);
                
                // Pinceladas únicas basadas en el nombre y estilo
                const seed = f.name.length;
                let colors = f.style === 'Cleaver' ? ['#a80020', '#f8b800', '#503000'] : ['#3cbcfc', '#00a800', '#f8f8f8'];
                
                for(let i=0; i<12; i++) {
                    ctx.fillStyle = colors[(seed + i) % colors.length];
                    let px = ((seed * (i + 1) * 17) % (f.w - 8)) + 2;
                    let py = ((seed * (i + 1) * 31) % (f.h - 8)) + 2;
                    ctx.fillRect(f.x + px, f.y + py, 6, 6);
                }
            }
        });

        const slot = currentLevelData.targetSlot;
        // Marco de madera para el objetivo
        ctx.strokeStyle = '#402000';
        ctx.lineWidth = 6;
        ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

        if (currentLevelData.placedCorrectly) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(slot.x + 5, slot.y + 5, slot.w - 10, slot.h - 10);
        }

        if (currentLevelData.gasActive) {
            ctx.fillStyle = `rgba(0, 255, 0, ${currentLevelData.gasAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },
    interact: () => {
        // 1. Intentar recoger un cuadro de la pared norte
        const paintingIdx = currentLevelData.furniture.findIndex(f => f.id === 'painting' && checkProximity(f));
        if (paintingIdx !== -1 && !state.inventory) {
            const p = currentLevelData.furniture[paintingIdx];
            state.inventory = { ...p };
            currentLevelData.furniture.splice(paintingIdx, 1); // Quitar de la pared
            ui.innerHTML = "Llevas: " + p.name;
            return;
        }

        // 2. Intentar colocar el cuadro en el slot de la derecha
        if (state.inventory && checkProximity(currentLevelData.targetSlot)) {
            if (state.inventory.style === currentLevelData.targetStyle) {
                currentLevelData.placedCorrectly = true;
                ui.innerHTML = "✅ ¡Excelente! " + state.inventory.name + " está en su sitio. ¡La puerta lateral se ha abierto!";
                state.inventory = null;
                return;
            } else {
                ui.innerHTML = "❌ ¡ERROR! Este cuadro no pertenece aquí. El gas venenoso se ha activado.";
                currentLevelData.gasActive = true;
                // El cuadro vuelve a la pared
                currentLevelData.furniture.push({ id: 'painting', ...state.inventory, x: 100, y: MAP_OFFSET_Y + 5, w: 60, h: 40, interactable: true, collidable: false });
                state.inventory = null;
            }
        }

        // 3. Interacción con la puerta de salida
        const exitDoor = currentLevelData.tileObjects.find(o => o.id === 'exit' && checkProximity(o));
        if (exitDoor) {
            if (currentLevelData.placedCorrectly) {
                nextLevel();
            } else {
                ui.innerHTML = "🚪 La puerta lateral está bloqueada. Necesitas colocar el cuadro correcto primero.";
            }
        }
    }
};