(window.levelLogics = window.levelLogics || {})['snakes'] = {
    init: (levelData) => {
        const base = {
            ...levelData,
            currentRoom: 'center',
            roomTimer: 0,
            maxTime: 900, // 15 segundos antes de que aparezca una serpiente
            snakes: [],
            progressA: false,
            entryPointX: 0, // Nuevo: Almacena la X del jugador al entrar a una sub-habitación
            entryPointY: 0, // Nuevo: Almacena la Y del jugador al entrar a una sub-habitación
            progressB: false,
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            tileObjects: [
                { id: "doorA", type: "door", tileX: 0, tileY: 4, interactive: false, target: 'A', collidable: false },
                { id: "doorB", type: "door", tileX: 24, tileY: 4, interactive: false, target: 'B', collidable: false },
                { id: "exit", type: "door", tileX: 12, tileY: 0, interactive: true, target: 'exit' }
            ],
            roomItems: []
        };

        player.x = 300; player.y = 200;
        return base;
    },
    update: () => {
        const data = currentLevelData;
        data.roomTimer++;

        // 1. Spawning de serpientes por tiempo
        if (data.roomTimer > data.maxTime && data.roomTimer % 300 === 0) {
            data.snakes.push({ 
                x: Math.random() * canvas.width, 
                y: -40, 
                speed: 1.5,
                history: [] // Para dibujar el cuerpo
            });
            ui.innerHTML = "🐍 ¡Una serpiente ha entrado por el techo! ¡Date prisa!";
        }

        // 2. Movimiento de serpientes (Persiguen al jugador)
        data.snakes.forEach((s, idx) => {
            const targetX = player.x + player.w / 2;
            const targetY = player.y + player.h / 2;
            const angle = Math.atan2(targetY - s.y, targetX - s.x);
            
            // Movimiento ondulante en S (perpendicular a la dirección de avance)
            const wave = Math.sin(Date.now() * 0.01 + idx) * 1.5;
            const moveX = Math.cos(angle) * s.speed + Math.cos(angle + Math.PI/2) * wave;
            const moveY = Math.sin(angle) * s.speed + Math.sin(angle + Math.PI/2) * wave;

            // Lógica para que no se encimen (Separación)
            data.snakes.forEach((other, oIdx) => {
                if (idx === oIdx) return;
                const distBetween = Math.hypot(s.x - other.x, s.y - other.y);
                if (distBetween < 40) { // Distancia mínima entre serpientes
                    const escapeAngle = Math.atan2(s.y - other.y, s.x - other.x);
                    s.x += Math.cos(escapeAngle) * 1.5;
                    s.y += Math.sin(escapeAngle) * 1.5;
                }
            });

            s.x += moveX;
            s.y += moveY;

            // Guardar historial para el cuerpo
            s.history.unshift({ x: s.x, y: s.y });
            if (s.history.length > 35) s.history.pop(); // Cuerpo más largo

            // Colisión con jugador
            const dist = Math.hypot(s.x - targetX, s.y - targetY);
            if (dist < 25) {
                gameOver("¡Te ha mordido una serpiente venenosa!");
            }
        });

        // 3. Información automática (Estándar pedagógico)
        const nearItem = data.roomItems.find(i => checkProximity(i));
        if (nearItem) {
            ui.innerHTML = `💎 <strong>${nearItem.name}</strong>: ${nearItem.desc}`;
        }

        // 4. Transición automática de habitaciones por puerta
        if (data.currentRoom === 'center') {
            const doorA = data.tileObjects.find(o => o.target === 'A');
            const doorB = data.tileObjects.find(o => o.target === 'B');
            if (doorA && checkProximity(doorA)) {
                data.entryPointX = player.x;
                data.entryPointY = player.y;
                enterSubRoom('A');
                return;
            }
            if (doorB && checkProximity(doorB)) {
                data.entryPointX = player.x;
                data.entryPointY = player.y;
                enterSubRoom('B');
                return;
            }
        } else {
            const backDoor = data.tileObjects.find(o => o.target === 'center');
            if (backDoor && checkProximity(backDoor)) {
                returnToCenter();
                return;
            }
        }
    },
    draw: () => {
        const data = currentLevelData;
        
        // Dibujar ítems si estamos en sub-habitaciones
        data.roomItems.forEach(item => {
            ctx.fillStyle = NES_PALETTE.gold;
            ctx.fillRect(item.x, item.y, 32, 32);
            ctx.fillStyle = NES_PALETTE.white;
            ctx.fillRect(item.x + 8, item.y + 8, 16, 16);
        });

        // Dibujar Serpientes
        data.snakes.forEach(s => {
            // Dibujar cuerpo por segmentos (del final a la cabeza)
            for (let i = s.history.length - 1; i >= 0; i--) {
                const pos = s.history[i];
                // Aún más delgadas para que no desentone con el pixel art
                const size = i === 0 ? 5 : Math.max(1.5, 4 - i * 0.08); 
                
                // Colores planos estilo NES
                ctx.fillStyle = i % 2 === 0 ? "#007800" : "#00a800"; 
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Detalles de la cabeza (solo en el primer segmento)
                if (i === 0) {
                    const next = s.history[1] || pos;
                    const angle = Math.atan2(pos.y - next.y, pos.x - next.x);
                    
                    ctx.save();
                    ctx.translate(pos.x, pos.y);
                    ctx.rotate(angle);
                    ctx.fillStyle = "black";
                    // Ojos: dos pequeñas líneas negras "I I" integradas en el estilo
                    ctx.fillRect(1, -3, 1, 2);
                    ctx.fillRect(1, 1, 1, 2);
                    ctx.restore();
                }
            }
        });

        // Indicadores de progreso en la sala central
        if (data.currentRoom === 'center') {
            ctx.fillStyle = data.progressA ? "lime" : "red";
            ctx.fillRect(20, 160, 20, 20);
            ctx.fillStyle = data.progressB ? "lime" : "red";
            ctx.fillRect(760, 160, 20, 20);
        }
    },
    interact: () => {
        const data = currentLevelData;

        // En habitaciones laterales: solo recoger objetos
        if (data.currentRoom !== 'center') {
            const itemIdx = data.roomItems.findIndex(i => checkProximity(i));
            if (itemIdx !== -1) {
                const item = data.roomItems[itemIdx];
                if (item.correct) {
                    if (data.currentRoom === 'A') data.progressA = true;
                    if (data.currentRoom === 'B') data.progressB = true;
                    ui.innerHTML = `✅ ¡Has obtenido el objeto correcto: ${item.name}! Vuelve a la sala central.`;
                    data.roomItems = [];
                } else {
                    ui.innerHTML = "❌ ¡ERROR! Ese objeto es falso. ¡Las serpientes se han despertado!";
                    for(let i=0; i<3; i++) data.snakes.push({ x: Math.random()*800, y: -20, speed: 1.5, history: [] });
                }
            }
            return;
        }

        // En la habitación central: solo puerta de salida
        const exitDoor = data.tileObjects.find(d => d.target === 'exit' && checkProximity(d));
        if (exitDoor) {
            if (data.progressA && data.progressB) nextLevel();
            else ui.innerHTML = "🚪 La puerta está sellada. Necesitas los dos objetos de las cámaras laterales.";
        }
    }
};

function enterSubRoom(room) {
    const data = currentLevelData;
    data.currentRoom = room;
    data.roomTimer = 0; // Reiniciar tiempo al entrar
    
    // Cambiar mapa visual: marco con una sola puerta lateral según la habitación
    data.map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [room === 'A' ? 1 : 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, room === 'B' ? 1 : 0],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    // Definir salida por la misma puerta lateral
    data.tileObjects = [
        { id: "back", type: "door", tileX: room === 'A' ? 24 : 0, tileY: 4, interactive: false, target: 'center', collidable: false }
    ];

    // Generar ítems del JSON
    const sourceItems = room === 'A' ? data.roomA : data.roomB;
    const alreadyDone = room === 'A' ? data.progressA : data.progressB;
    
    data.roomItems = alreadyDone ? [] : sourceItems.map((it, idx) => ({
        ...it,
        x: 200 + (idx * 200),
        y: 200,
        w: 32, h: 32
    }));

    player.x = room === 'A' ? canvas.width - 5 * TILE_SIZE : 5 * TILE_SIZE; // Entrar desde el lado correcto
    player.y = 4 * TILE_SIZE + MAP_OFFSET_Y - 40;
    ui.innerHTML = room === 'A' ? "Has entrado a la Cámara Oeste." : "Has entrado a la Cámara Este.";
}

function returnToCenter() {
    const data = currentLevelData;
    data.currentRoom = 'center';
    data.roomItems = [];
    data.map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    data.tileObjects = [
        { id: "doorA", type: "door", tileX: 0, tileY: 4, interactive: false, target: 'A', collidable: false },
        { id: "doorB", type: "door", tileX: 24, tileY: 4, interactive: false, target: 'B', collidable: false },
        { id: "exit", type: "door", tileX: 12, tileY: 0, interactive: true, target: 'exit' }
    ];
    // Restaurar la posición del jugador a un poco dentro del centro del lado de entrada
    if (data.entryPointX < 100) {
        player.x = 60;
    } else if (data.entryPointX > canvas.width - 100) {
        player.x = canvas.width - 90;
    } else {
        player.x = data.entryPointX;
    }
    player.y = data.entryPointY;
}