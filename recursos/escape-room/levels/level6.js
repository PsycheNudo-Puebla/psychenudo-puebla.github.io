(window.levelLogics = window.levelLogics || {})['bridge'] = {
    init: (levelData) => {
        const activeScenario = (levelData.scenarios && levelData.scenarios.length > 0)
            ? levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)]
            : levelData;

        // Tablones del puente (posiciones verticales en pantalla, alineadas a 64px)
        // Empiezan en y=96, justo por debajo del muro superior, para no tocar el marco de madera.
        const plankYs = [96, 160, 224, 288, 352, 416, 480, 528];
        // Filas de decisión (V/F) de abajo hacia arriba: la primera al subir es la más baja.
        const questionRows = [480, 352, 224];

        const base = {
            ...activeScenario,
            type: levelData.type,
            title: levelData.title,
            // Carga de activos visuales
            images: {
                bridge: new Image(),
                boardV: new Image(),
                boardF: new Image()
            },
            // 17 filas x 25 cols. Columnas 10-14 despejadas para el puente.
            // Fila 0 = muro superior de ladrillo con la puerta (tipo 5) centrada en la columna 12.
            map: [
                [1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1],
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
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
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

        // Usar base.questions ya que base incluye las propiedades del activeScenario
        const qList = base.questions || [];
        console.log("Level 6 - Questions List:", qList); // Debugging

        qList.slice(0, questionRows.length).forEach((q, i) => {
            base.steps.push({
                ...q,
                y: questionRows[i],
                resolved: false
            });
        });

        // Personaje al fondo, centrado en el puente (sobre el piso inferior)
        player.x = 400 - 32;
        player.y = 508;

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

        // Mantener al personaje sobre el puente: su cuerpo no debe sobrepasar
        // los tablones (x 320-480) ni pisar el vacío negro de los lados.
        const bridgeX = 10 * TILE_SIZE;
        const bridgeW = 5 * TILE_SIZE;
        player.x = Math.max(bridgeX, Math.min(bridgeX + bridgeW - player.w, player.x));

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

        // 1. Dibujar el abismo (el marco común de ladrillo lo aporta drawCommonRoom)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Dibujar el puente como franja continua (y=92..540) a lo ancho del corredor
        ctx.imageSmoothingEnabled = false;

        const BRIDGE_X = 10 * TILE_SIZE;     // 320
        const BRIDGE_W = 5 * TILE_SIZE;      // 160 (columnas 10-14, todo el corredor)
        const drawPlank = (x, y, w) => {
            if (data.images.bridge.complete) ctx.drawImage(data.images.bridge, x, y, w, 64);
            else { ctx.fillStyle = "#3a2a14"; ctx.fillRect(x, y, w, 64); }
        };

        for (let y = 92; y <= 540; y += 64) {
            // Verificar si esta fila corresponde a una pregunta (decisión)
            const step = data.steps.find(s => Math.abs(s.y - y) < 5);

            // Base del puente a lo ancho de todo el corredor (sin huecos donde flotar)
            drawPlank(BRIDGE_X, y, BRIDGE_W);

            if (step) {
                // FILA DE DECISIÓN (V y F) superpuestas al centro del tablón
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
                    ctx.textAlign = "start";
                }
            }
        }

        // 3. Muro superior del puente (ladrillo) con la puerta centrada, dentro del puente.
        // El enmarcado del nivel es el de la pantalla (drawBrickFrame + drawRoomHeader),
        // no un cerco alrededor del puente.
        const wallY = MAP_OFFSET_Y;          // 60 (justo bajo el marco de madera)
        const wallH = TILE_SIZE;             // 32
        const doorX = 400 - TILE_SIZE / 2;   // 384 (centro del puente)

        // Muro superior con la puerta centrada, dentro del puente
        for (let bx = BRIDGE_X; bx < BRIDGE_X + BRIDGE_W; bx += TILE_SIZE) {
            if (bx === doorX) continue; // hueco de la puerta
            TILES[1].pattern(bx, wallY);
        }

        const allResolved = data.steps.every(s => s.resolved);
        if (allResolved) {
            // Puerta ABIERTA (salida): paso libre, se ve la abertura iluminada
            ctx.fillStyle = "#bfe9c0";
            ctx.fillRect(doorX, wallY, TILE_SIZE, wallH);
            ctx.strokeStyle = NES_PALETTE.gold;
            ctx.lineWidth = 2;
            ctx.strokeRect(doorX + 2, wallY + 2, TILE_SIZE - 4, wallH - 4);
            ctx.fillStyle = "lime";
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("SALIDA", 400, wallY + wallH + 12);
            ctx.textAlign = "start";
        } else {
            // Puerta CERRADA (inicial): se ve como puerta, no como hueco negro
            if (TILES[5]) TILES[5].pattern(doorX, wallY);
        }

        // Marco común (borde exterior de ladrillo + cabecera de madera, como en otros niveles)
        drawBrickFrame();
        drawRoomHeader();
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
