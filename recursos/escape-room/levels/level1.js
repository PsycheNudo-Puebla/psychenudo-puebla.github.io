levelLogics['date'] = {
    init: (levelData) => {
        const activeScenario = (levelData.scenarios && levelData.scenarios.length > 0)
            ? levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)]
            : levelData;

        const base = {
            ...activeScenario,
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
            doorUnlocked: false,
            doorAnimY: 0
        };
        
        // Spawn seguro dentro del Laboratorio
        player.x = 400; player.y = 300;
        
        // Distribuir pistas en los libreros
        const hints = levelData.bookshelfHints || [];
        const bookshelves = base.tileObjects.filter(o => o.type === 'bookshelf');
        bookshelves.forEach((bs, i) => {
            if (hints[i]) bs.bookshelfHint = hints[i];
        });

        // Lógica de juego: Ocultar objeto ganador
        const potentialSpots = base.tileObjects.filter(o => o.type !== 'door');
        // Hacemos que todos los muebles candidatos muestren el signo "?"
        potentialSpots.forEach(spot => spot.interactive = true);

        const winner = potentialSpots[Math.floor(Math.random() * potentialSpots.length)];
        winner.hasWinningObject = true;
        
        return base;
    },
    draw: () => {
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
            currentLevelData.foundObject = true;
            ui.innerHTML = `⭐ ${currentLevelData.object}:\n"${currentLevelData.pistaLibrero}"`;
        } else if (obj.type === 'bookshelf' && obj.bookshelfHint) {
            ui.innerHTML = `📖 ${obj.bookshelfHint}`;
        } else {
            ui.innerHTML = "Aquí no hay nada útil...";
        }
    }
};