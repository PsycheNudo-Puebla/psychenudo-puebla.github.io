/** GLOBALES Y REGISTRO **/
let canvas, ctx, ui, menu, jsonInput, startBtn;
let uiMinimized = false;

// Registro de lógica de niveles (Debe estar al principio)
window.levelLogics = window.levelLogics || {};
let currentLevelData = null;

// Lista de desafíos disponibles en el servidor
const PREDEFINED_CHALLENGES = [
    { name: "Psicometría Clínica", path: "levels/psicometria.json" },
    { name: "Psicopatología", path: "levels/psicopatologia.json" }
];

// Configuración Visual Global NES
const NES_PALETTE = {
    black: '#000000', white: '#ffffff',
    floor: '#e4e4e4', wall: '#7c7c7c', wallDark: '#404040',
    wood: '#881400', woodLight: '#ab5233', woodDark: '#401000',
    object: '#3cbcfc', rug: '#a80020', gold: '#f8b800'
};

// Almacenamiento de imágenes para el sprite del jugador
const PLAYER_IMAGES = {
    up: [],
    down: [],
    left: [],
    right: []
};

// Mapeo de secuencia de animación para 3 imágenes:
// animFrame 0 -> Imagen 0 (Reposo)
// animFrame 1 -> Imagen 1 (Paso 1)
// animFrame 2 -> Imagen 0 (Reposo)
// animFrame 3 -> Imagen 2 (Paso 2)
const ANIM_SEQUENCE = [0, 1, 0, 2];

// Mapeo de tipos de objetos a números de tiles
const TILE_OBJECT_TYPES = {
    'table': 2,
    'chair': 3,
    'bookshelf': 4,
    'pedestal_tile': 8, // Nuevo tile para el pedestal
    'door': 5,
    'rug': 6,
    'plant': 7
};

// Diccionario de tiles (16x16 píxeles) - Texturas mejoradas
const TILE_SIZE = 32;
const MAP_OFFSET_Y = 60;

const TILES = {
    0: { // Suelo con baldosas
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.floor;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            // Baldosas con líneas
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.beginPath();
            ctx.moveTo(x + TILE_SIZE/2, y);
            ctx.lineTo(x + TILE_SIZE/2, y + TILE_SIZE);
            ctx.moveTo(x, y + TILE_SIZE/2);
            ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2);
            ctx.stroke();
            // Sombras en esquinas
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(x + TILE_SIZE - 4, y + 2, 2, TILE_SIZE - 4);
            ctx.fillRect(x + 2, y + TILE_SIZE - 4, TILE_SIZE - 4, 2);
        }
    },
    1: { // Pared de ladrillos NES con tilt
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.wall;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = NES_PALETTE.wallDark;
            ctx.fillRect(x, y, TILE_SIZE - 2, (TILE_SIZE/2) - 2);
            ctx.fillRect(x + 4, y + (TILE_SIZE/2), TILE_SIZE - 4, (TILE_SIZE/2) - 2);
            // Añadir líneas diagonales para tilt
            ctx.strokeStyle = NES_PALETTE.wallLight;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + TILE_SIZE/2);
            ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE/2);
            ctx.moveTo(x + 4, y);
            ctx.lineTo(x + TILE_SIZE - 4, y + TILE_SIZE);
            ctx.stroke();
            // Sombras para profundidad
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x + TILE_SIZE - 4, y + 2, 2, TILE_SIZE - 4);
        }
    },
    2: { // Mesa de madera
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 8);
            // Patas
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 4, y + 10, 4, 18);
            ctx.fillRect(x + TILE_SIZE - 8, y + 10, 4, 18);
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillRect(x + 4, y + TILE_SIZE - 4, TILE_SIZE - 8, 4);
        }
    },
    3: { // Silla de madera
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            // Asiento
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x + 4, y + 14, TILE_SIZE - 8, 4);
            // Respaldo
            ctx.fillRect(x + 6, y + 4, TILE_SIZE - 12, 10);
            // Patas
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 8, y + 18, 4, 10);
            ctx.fillRect(x + TILE_SIZE - 12, y + 18, 4, 10);
        }
    },
    4: { // Librero lleno
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x+2, y+4, TILE_SIZE-4, 4);
            ctx.fillRect(x+2, y+16, TILE_SIZE-4, 4);
            // Libros pixelados
            const colors = [NES_PALETTE.object, NES_PALETTE.rug, NES_PALETTE.gold];
            for(let i=0; i<3; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(x + 4 + (i*8), y + 8, 6, 8);
                ctx.fillRect(x + 4 + (i*8), y + 20, 6, 8);
            }
        }
    },
    5: { // Puerta Clásica Madera
        pattern: (x, y) => {
            ctx.fillStyle = '#402000'; // Marco de madera oscura
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            // Hoja de la puerta
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 4, y + 2, TILE_SIZE - 8, TILE_SIZE - 2);
            // Paneles decorativos
            ctx.fillStyle = '#402000';
            ctx.fillRect(x + 8, y + 6, 6, 8);
            ctx.fillRect(x + 18, y + 6, 6, 8);
            ctx.fillRect(x + 8, y + 18, 6, 8);
            ctx.fillRect(x + 18, y + 18, 6, 8);
            // Pomo dorado
            ctx.fillStyle = NES_PALETTE.gold;
            ctx.fillRect(x + TILE_SIZE - 12, y + 16, 4, 4);
        }
    },
    6: { // Alfombra decorativa
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.rug;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = NES_PALETTE.gold;
            ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            ctx.fillRect(x + 14, y + 14, 4, 4);
        }
    },
    7: { // Maceta con planta
        pattern: (x, y) => {
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(x + 8, y + 16, 16, 12);
            ctx.fillStyle = '#00a800';
            ctx.fillRect(x + 14, y + 4, 4, 12);
            ctx.fillRect(x + 8, y + 8, 6, 6);
            ctx.fillRect(x + 18, y + 8, 6, 6);
            ctx.fillStyle = '#007800';
            ctx.fillRect(x + 10, y, 12, 8);
        }
    },
    8: { // Pedestal vacío
        pattern: (x, y) => {
            ctx.fillStyle = '#7c7c7c'; // Gris piedra
            ctx.fillRect(x + 4, y + 20, 24, 12); // Base
            ctx.fillStyle = '#a0a0a0'; // Luz piedra
            ctx.fillRect(x + 8, y + 10, 16, 12); // Columna
            ctx.fillStyle = '#ffffff'; // Brillo superior
            ctx.fillRect(x + 4, y + 6, 24, 4); // Plato superior
            ctx.fillStyle = NES_PALETTE.black;
            ctx.fillRect(x + 6, y + 30, 20, 2); // Sombra suelo
        }
    }
};

const state = {
    running: false,
    levelIndex: 0,
    allLevels: [],
    inventory: null,
    inputModo: false,
    currentInput: ""
};

const player = {
    x: 400, y: 300, w: 64, h: 64, speed: 5, 
    direction: "down",
    animFrame: 0, // Ciclo 0, 1, 2, 3
    animCounter: 0,
    moving: false,
    showPrompt: false
};

const keys = {};

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

/** INICIALIZACIÓN **/
window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    ui = document.getElementById('ui-overlay');
    menu = document.getElementById('menu');
    jsonInput = document.getElementById('jsonInput');
    startBtn = document.getElementById('startBtn');

    // Estilo de la barra de diálogo superior (compacta y animada)
    ui.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 50px;
        background: rgba(0,0,0,0.85); color: white; display: flex; 
        align-items: center; justify-content: center; text-align: center;
        font-size: 10px; z-index: 5000; pointer-events: none; border-bottom: 2px solid #f8b800;
        box-sizing: border-box; padding: 0 10px; font-family: 'Press Start 2P', monospace;
        transition: height 0.3s, background 0.3s; overflow: hidden;
    `;

    // Inicializar soporte para móviles
    setupMobileControls();

    // Precarga de imágenes del jugador
    const directions = ['up', 'down', 'left', 'right'];
    const dirMap = { 'up': 'Up', 'down': 'Down', 'left': 'Left', 'right': 'Right' };
    directions.forEach(dir => {
        for (let i = 1; i <= 3; i++) {
            const img = new Image();
            img.src = `assets/Male Character 3_Walking ${dirMap[dir]}_${i}.png`;
            PLAYER_IMAGES[dir].push(img);
        }
    });

    // Lector de JSON
    jsonInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                processJSON(JSON.parse(event.target.result), file.name);
            } catch(e) { alert("Error en JSON"); }
        };
        reader.readAsText(file);
    });

    // Cargar automáticamente la lista de desafíos
    renderChallengeMenu();

    startBtn.addEventListener('click', startGame);
});

function renderChallengeMenu() {
    const existingList = document.getElementById('predefined-list');
    if (existingList) existingList.remove();

    const container = document.createElement('div');
    container.id = 'predefined-list';
    container.style.cssText = "margin: 20px 0; display: flex; flex-direction: column; gap: 10px; width: 100%; align-items: center;";
    
    const title = document.createElement('p');
    title.innerText = "--- SELECCIONA UN DESAFÍO ---";
    container.appendChild(title);

    PREDEFINED_CHALLENGES.forEach(ch => {
        const btn = document.createElement('button');
        btn.innerText = "🕹️ " + ch.name;
        btn.style.cssText = "width: 80%; padding: 15px; font-family: inherit; background: #3cbcfc; color: white; border: 4px solid #000; cursor: pointer;";
        btn.onclick = () => {
            fetch(ch.path)
                .then(r => r.json())
                .then(data => processJSON(data, ch.name))
                .catch(err => alert("No se pudo cargar el archivo del servidor. Verifica la ruta."));
        };
        container.appendChild(btn);
    });

    menu.insertBefore(container, startBtn);
}

function processJSON(data, fileName) {
    try {
        if (!data.levels || data.levels.length === 0) {
            throw new Error("El archivo no contiene un array de 'levels' válido.");
        }
        state.allLevels = data.levels;
        state.levelIndex = 0;
        loadCurrentLevel();
        
        startBtn.style.display = 'none';
        jsonInput.style.display = 'none';
        if (document.getElementById('predefined-list')) document.getElementById('predefined-list').style.display = 'none';
        
        const menuP = document.querySelector('#menu p') || document.createElement('p');
        menuP.innerHTML = `<strong>${fileName}</strong> cargado.<br>Elige un nivel:`;
        if (!menuP.parentNode) menu.appendChild(menuP);

        state.allLevels.forEach((lvl, idx) => {
            const btn = document.createElement('button');
            btn.innerText = `NIVEL ${idx + 1}: ${lvl.title || lvl.type}`;
            btn.style.display = 'block';
            btn.style.cssText = "width: 80%; margin: 10px auto; padding: 12px; font-family: inherit; background: #f8b800; border: 4px solid black;";
            btn.onclick = () => {
                state.levelIndex = idx;
                loadCurrentLevel();
                startGame();
            };
            menu.appendChild(btn);
        });
    } catch (err) {
        alert("Error al procesar el JSON: " + err.message);
    }
}

function toggleUI() {
    uiMinimized = !uiMinimized;
    ui.style.height = uiMinimized ? "20px" : "50px";
    ui.style.background = uiMinimized ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.85)";
    
    if (state.inputModo) actualizarDialogoInput();
    else if (currentLevelData) ui.innerHTML = uiMinimized ? "..." : currentLevelData.title;
}
window.toggleUI = toggleUI; // Hacerlo accesible desde el botón móvil

function toggleFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    // Soporte para múltiples navegadores (Chrome, Safari, Firefox, IE)
    const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const exit = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (request) {
            request.call(docEl).catch(err => {
                console.warn("Error al intentar pantalla completa:", err);
            });
        }
    } else {
        if (exit) exit.call(doc);
    }
}

function loadCurrentLevel() {
    state.inventory = null;
    const levelData = state.allLevels[state.levelIndex];
    
    // Reiniciar posición por defecto
    player.x = 400; 
    player.y = 300;

    // Llamamos a la inicialización específica según el tipo de nivel
    const logic = window.levelLogics[levelData.type];
    if (logic) {
        currentLevelData = logic.init(levelData);
    } else {
        currentLevelData = { title: "Error", map: [[1]] };
        console.error(`ERROR: La lógica para el tipo '${levelData.type}' no está cargada. Revisa que levels/level4.js esté incluido en el HTML.`);
    }
}

function drawPlayer(x, y) {
    const dir = player.direction;
    const frameIdx = ANIM_SEQUENCE[player.animFrame];
    const sprite = PLAYER_IMAGES[dir][frameIdx];

    ctx.imageSmoothingEnabled = false; // Mantiene los píxeles nítidos (estilo retro)
    if (sprite && sprite.complete) {
        ctx.drawImage(sprite, x, y, player.w, player.h);
    } else {
        // Fallback si la imagen no carga: un rectángulo de color
        ctx.fillStyle = NES_PALETTE.object;
        ctx.fillRect(x, y, player.w, player.h);
    }
}


function nextLevel() {
    state.levelIndex++;
    if (state.levelIndex < state.allLevels.length) {
        loadCurrentLevel();
        ui.innerHTML = "Entrando a: " + currentLevelData.title;
    } else {
        state.running = false;
        menu.style.display = 'flex';
        menu.innerHTML = "<h1>¡JUEGO COMPLETADO!</h1>";
    }
}

function startGame() {
    menu.style.display = 'none';
    // Si es nivel de tenis, empezamos con la interfaz oculta para ver el juego
    if (currentLevelData && currentLevelData.type === 'tennis') {
        ui.style.display = 'none';
    } else {
        ui.style.display = 'block';
        ui.innerHTML = state.allLevels[state.levelIndex].title + ". Explora la habitación.";
    }
    state.running = true;
    gameLoop();
}

function checkProximity(obj) {
    if (!obj) return false;
    // Si el objeto no tiene x/y reales, calculamos basados en tiles (como en Nivel 1 y 3)
    const ox = obj.x !== undefined ? obj.x : (obj.tileX * TILE_SIZE);
    const oy = obj.y !== undefined ? obj.y : (obj.tileY * TILE_SIZE + MAP_OFFSET_Y);
    const ow = obj.w || TILE_SIZE;
    const oh = obj.h || TILE_SIZE;
    
    const dist = Math.hypot((player.x + player.w / 2) - (ox + ow / 2), (player.y + player.h / 2) - (oy + oh / 2));
    return dist < 60; // Radio de detección
}

function checkCollision(nx, ny) {
    if (!currentLevelData) return false;

    // Caja de colisión (AABB) reducida a la base del personaje (pies)
    // Esto permite que la cabeza se superponga a objetos "detrás" sin bloquearse.
    // Ajustado para el nuevo tamaño "chibi" de 64x64
    const points = [
        { x: nx + 18, y: ny + 45 },  
        { x: nx + 46, y: ny + 45 }, 
        { x: nx + 18, y: ny + 62 }, 
        { x: nx + 46, y: ny + 62 },
        { x: nx + 32, y: ny + 54 }
    ];

    for (let p of points) {
        const gx = Math.floor(p.x / TILE_SIZE);
        const gy = Math.floor((p.y - MAP_OFFSET_Y) / TILE_SIZE);
        
        if (currentLevelData.map && gy >= 0 && gy < currentLevelData.map.length && gx >= 0 && gx < currentLevelData.map[gy].length) {
            const tile = currentLevelData.map[gy][gx];
            // Tiles sólidos: 1(Pared), 2(Mesa), 4(Librero), 5(Puerta), 8(Pedestal)
            if ([1, 2, 4, 5, 8].includes(tile)) return true;
        }

        if (currentLevelData.tileObjects) {
            const hit = currentLevelData.tileObjects.find(o => o.tileX === gx && o.tileY === gy && o.collidable);
            if (hit) return true;
        }

        // Colisión con muebles (Furniture)
        const hitFurniture = currentLevelData.furniture?.find(f => {
            if (f.collidable === false || f.type === 'decor') return false;
            return p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h;
        });
        if (hitFurniture) return true;
    }

    return false;
}

function drawMap() {
    // Dibujar el mapa base
    if (currentLevelData.map) {
        currentLevelData.map.forEach((row, y) => {
            row.forEach((tileType, x) => {
                if (TILES[tileType]) {
                    TILES[tileType].pattern(x * TILE_SIZE, y * TILE_SIZE + MAP_OFFSET_Y);
                }
            });
        });
    }
    
    // Dibujar objetos de tiles
    if (currentLevelData.tileObjects) {
        currentLevelData.tileObjects.forEach(obj => {
            const tileType = TILE_OBJECT_TYPES[obj.type];
            if (tileType !== undefined && TILES[tileType]) {
                TILES[tileType].pattern(obj.tileX * TILE_SIZE, obj.tileY * TILE_SIZE + MAP_OFFSET_Y);
            }
        });
    }
}

function drawCommonRoom() {
    // Dibujar suelo base siempre para evitar huecos negros
    ctx.fillStyle = NES_PALETTE.floor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cuadrícula tenue decorativa
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for(let i=0; i<canvas.width; i+=32) {
        for(let j=60; j<canvas.height; j+=32) {
            if((i+j)%64===0) ctx.fillRect(i, j, 32, 32);
        }
    }

    // Pared superior base
    ctx.fillStyle = NES_PALETTE.wallDark; ctx.fillRect(0, 0, canvas.width, 60);
    ctx.fillStyle = NES_PALETTE.wall; ctx.fillRect(0, 45, canvas.width, 15);
    
    ctx.strokeStyle = NES_PALETTE.black; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
}

function handleKeyboardInput(e) {
    if (!state.inputModo) return;

    // Enter o Space (Botón A del móvil) para confirmar
    if (e.key === "Enter" || e.code === "Space") {
        if (e.code === "Space") e.preventDefault();
        const pass = (currentLevelData.claveCIE || currentLevelData.discoveryYear || "").toString().toUpperCase();
        if (state.currentInput === pass) {
            ui.innerHTML = "✅ ¡CÓDIGO CORRECTO!";
            state.inputModo = false;
            toggleMobileKeyboard(false);
            if (currentLevelData.type === 'date') currentLevelData.doorUnlocked = true;
        } else {
            state.currentInput = "";
            ui.innerHTML = "❌ ERROR: CÓDIGO INCORRECTO";
            setTimeout(actualizarDialogoInput, 1000);
        }
    } else if (e.key === "Escape") {
        state.inputModo = false;
        toggleMobileKeyboard(false);
        ui.innerHTML = currentLevelData.title;
    } else if (e.key === "Backspace") {
        state.currentInput = state.currentInput.slice(0, -1);
        actualizarDialogoInput();
    }
}

function actualizarDialogoInput() {
    if (state.inputModo) toggleMobileKeyboard(true);
    if (!state.inputModo) return;
    if (uiMinimized) { ui.innerHTML = "<div style='color:#f8b800; font-size:8px;'>[MODO ESCRITURA ACTIVO]</div>"; return; }

    let length = currentLevelData.longitudClave || 4;
    let display = "";
    for (let i = 0; i < length; i++) {
        display += (i < state.currentInput.length ? state.currentInput[i] : "_") + " ";
    }
    
    ui.innerHTML = `
        <div style="pointer-events: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
            <div style="font-size: 8px; color: #3cbcfc; margin-bottom: 2px;">SISTEMA DE SEGURIDAD</div>
            <div style="letter-spacing: 5px; font-size: 16px; color: #f8b800;">${display}</div>
            <button id="mobile-kb-btn" style="position: absolute; right: 10px; padding: 6px; background: #3cbcfc; color: white; border: none; font-size: 7px; border-radius: 4px;">TECLADO</button>
        </div>`;

    // iOS y Android a veces bloquean el focus automático. Ofrecemos un botón de respaldo.
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        setTimeout(() => {
            const btn = document.getElementById('mobile-kb-btn');
            if (btn) {
                btn.style.display = 'inline-block';
                btn.onclick = () => document.getElementById('hidden-mobile-input').focus();
            }
        }, 50);
    }
}

function update() {
    // Actualización específica del nivel (ej. techo bajando)
    if (currentLevelData && levelLogics[currentLevelData.type] && levelLogics[currentLevelData.type].update) {
        levelLogics[currentLevelData.type].update();
    }

    if (state.inputModo || (player.isCaptured)) return; // Bloquear movimiento si escribe o está capturado

    let nextX = player.x;
    let nextY = player.y;

    player.moving = false;
    let dx = 0, dy = 0;

    // Level-specific player movement override
    if (currentLevelData && currentLevelData.type === 'tennis' && !currentLevelData.won) {
        // En el nivel de tenis, el jugador solo se mueve horizontalmente
        dy = 0; // No hay movimiento vertical
        player.y = 500; // Posición Y fija para el tenis
        // Forzar la dirección "up" para la animación de caminar
        player.direction = "up";
        if (keys['ArrowLeft']) { dx = -player.speed; player.moving = true; }
        else if (keys['ArrowRight']) { dx = player.speed; player.moving = true; }
        else { player.moving = false; }
    } else {
    // Movimiento (Prioridad: Arriba/Abajo)
    if (keys['ArrowUp']) { dy = -player.speed; player.direction = "up"; player.moving = true; }
    else if (keys['ArrowDown']) { dy = player.speed; player.direction = "down"; player.moving = true; }
    else if (keys['ArrowLeft']) { dx = -player.speed; player.direction = "left"; player.moving = true; }
    else if (keys['ArrowRight']) { dx = player.speed; player.direction = "right"; player.moving = true; }

    // Aplicar movimiento
    }
    nextX += dx;
    nextY += dy;

    // Ciclo de animación (Quieto -> PieA -> Quieto -> PieB)
    if (player.moving) {
        player.animCounter++;
        // Velocidad del paso (más bajo = más rápido)
        if (player.animCounter > 15) { 
            player.animCounter = 0;
            player.animFrame = (player.animFrame + 1) % 4; // Ciclo 0, 1, 2, 3
        }
    } else {
        player.animFrame = 0; // Estado quieto
        player.animCounter = 0;
    }

    // Colisión Predictiva: Solo movemos si la siguiente posición está libre
    if (!checkCollision(nextX, player.y)) player.x = nextX;
    if (!checkCollision(player.x, nextY)) player.y = nextY;

    // Limites de pantalla
    player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
    player.y = Math.max(40, Math.min(canvas.height - 50, player.y)); // Permitir subir hasta las puertas

    // --- Lógica del signo "?" y detección de proximidad ---
    let isNearInteractable = false;

    // Revisar objetos de tiles (puertas, libreros, pedestales)
    if (currentLevelData.tileObjects) {
        isNearInteractable = currentLevelData.tileObjects.some(o => o.interactive && checkProximity(o));
    }
    // Revisar muebles (cuadros, químicos)
    if (!isNearInteractable && currentLevelData.furniture) {
        isNearInteractable = currentLevelData.furniture.some(f => (f.interactable || f.id === 'painting') && checkProximity(f));
    }
    // Revisar si está sobre un tile interactivo del mapa
    const gx = Math.floor((player.x + player.w / 2) / TILE_SIZE);
    const gy = Math.floor((player.y + player.h - 10 - MAP_OFFSET_Y) / TILE_SIZE);
    const tileBajoPies = currentLevelData.map?.[gy]?.[gx];
    if (tileBajoPies === 4 || tileBajoPies === 5) isNearInteractable = true;

    player.showPrompt = isNearInteractable;

    // Tecla de interacción
    if (keys['Space']) {
        handleInteraction();
        keys['Space'] = false; // Evitar repetición rápida
    }
}

window.addEventListener('keydown', handleKeyboardInput);
function handleInteraction() {
    // Verificar interacción con objetos de tiles
    if (currentLevelData.tileObjects) {
        const playerCenterX = player.x + player.w / 2;
        const playerCenterY = player.y + player.h / 2;
        
        const tileObj = currentLevelData.tileObjects.find(obj => {
            if (!obj.interactive) return false;
            const objX = obj.tileX * TILE_SIZE;
            const objY = obj.tileY * TILE_SIZE + MAP_OFFSET_Y;
            const dist = Math.hypot(playerCenterX - (objX + TILE_SIZE/2), playerCenterY - (objY + TILE_SIZE/2));
            return dist < 50; // Radio de interacción
        });
        
        if (tileObj) {
            // El motor detecta el objeto, pero dejamos que la lógica del nivel decida qué hace
        }
    }
    
    // Delegar al nivel específico
    const logic = levelLogics[currentLevelData.type];
    if (logic && logic.interact) {
        logic.interact();
    }
}

function gameLoop() {
    if (!state.running) return;
    update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawCommonRoom();
    drawMap();
    
    // Delegar el dibujo específico al nivel actual
    if (currentLevelData && levelLogics[currentLevelData.type]) {
        const logic = levelLogics[currentLevelData.type];
        logic.draw();
    }

    drawPlayer(player.x, player.y);
    
    if (player.showPrompt) {
        ctx.fillStyle = NES_PALETTE.black;
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText("?", player.x + 5, player.y - 10);
    }

    if (state.running) {
        requestAnimationFrame(gameLoop);
    }
}

function gameOver(message) {
    state.running = false;
    ui.style.display = 'block'; // Asegurar que el panel de UI sea visible para mostrar los botones
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    
    ui.innerHTML = `
        <span style="color:red">${message}</span><br><br>
        <button id="retryLevelBtn" style="padding:10px; cursor:pointer; font-family:'Press Start 2P'; background:#346856; color:white;">REINTENTAR NIVEL</button>
        <button onclick="location.reload()" style="padding:10px; cursor:pointer; font-family:'Press Start 2P';">MENÚ PRINCIPAL</button>
    `;

    document.getElementById('retryLevelBtn').onclick = () => {
        loadCurrentLevel();
        startGame();
    };
}

/** SISTEMA DE ADAPTACIÓN PARA MÓVILES (iOS/Android) **/
function setupMobileControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Hacer el canvas responsivo
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.touchAction = 'none'; 
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';

    // Asegurar que el viewport esté configurado correctamente para evitar zoom
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // Crear un input invisible para disparar el teclado del celular
    const hiddenInput = document.createElement('input');
    hiddenInput.id = 'hidden-mobile-input';
    hiddenInput.style.cssText = 'position:absolute; opacity:0; top:-100px; left:-100px; font-size:16px;';
    document.body.appendChild(hiddenInput);

    // Capturar caracteres individuales mediante el evento 'input'
    // Esto soluciona el problema de "doble tecla" en muchos navegadores móviles
    hiddenInput.addEventListener('input', (e) => {
        if (!state.inputModo) return;
        const char = e.target.value.slice(-1).toUpperCase();
        if (char && char !== " " && state.currentInput.length < (currentLevelData.longitudClave || 4)) {
            state.currentInput += char;
            actualizarDialogoInput();
        }
        e.target.value = ""; // Resetear valor del input invisible
    });

    if (!isMobile) return;

    // Evitar zoom y gestos del sistema que rompan la experiencia
    document.addEventListener('touchstart', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    const mobileUI = document.createElement('div');
    mobileUI.id = 'mobile-controls';
    mobileUI.innerHTML = `
        <style>
            #mobile-controls { position: relative; width: 100%; height: 280px; background: #8b8b8b; display: flex; justify-content: space-around; align-items: center; padding: 20px 0; border-top: 8px solid #333; pointer-events: auto; box-sizing: border-box; }
            .dpad { display: grid; grid-template-columns: repeat(3, 60px); grid-template-rows: repeat(3, 60px); }
            .btn-mobile { width: 60px; height: 60px; background: #333; color: white; display: flex; align-items: center; justify-content: center; user-select: none; font-size: 24px; border-radius: 5px; border: 2px solid #000; box-shadow: 0 4px #000; -webkit-tap-highlight-color: transparent; }
            .btn-mobile:active { transform: translateY(2px); box-shadow: 0 2px #000; background: #444; }
            .actions { display: flex; gap: 20px; margin-bottom: 20px; }
            .btn-action { width: 80px; height: 80px; border-radius: 50%; background: #a80020; border: 4px solid #500000; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 5px #500000; }
            .btn-action:active { transform: translateY(3px); box-shadow: 0 2px #500000; }
            .btn-fs { position: fixed; top: 10px; left: 10px; width: 40px; height: 40px; background: rgba(0,0,0,0.5); border: 1px solid white; color: white; border-radius: 5px; z-index: 10000; pointer-events: auto; }
            .btn-ui-toggle { position: fixed; top: 10px; right: 10px; width: 40px; height: 40px; background: rgba(0,0,0,0.5); border: 1px solid white; color: white; border-radius: 5px; z-index: 10000; pointer-events: auto; font-size: 18px; }
        </style>
        <button class="btn-fs" onclick="toggleFullScreen()">⛶</button>
        <button class="btn-ui-toggle" onclick="toggleUI()">👁️</button>
        <div class="dpad">
            <div></div><div class="btn-mobile" data-key="ArrowUp">▲</div><div></div>
            <div class="btn-mobile" data-key="ArrowLeft">◀</div><div></div><div class="btn-mobile" data-key="ArrowRight">▶</div>
            <div></div><div class="btn-mobile" data-key="ArrowDown">▼</div><div></div>
        </div>
        <div class="actions">
            <button class="btn-mobile btn-action" data-key="Space">A</button>
        </div>
    `;
    document.body.appendChild(mobileUI);

    // Mapear toques a las variables de teclas que ya usa el motor
    mobileUI.querySelectorAll('.btn-mobile').forEach(btn => {
        const key = btn.getAttribute('data-key');
        btn.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            keys[key] = true; 
        });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    });
}

function toggleMobileKeyboard(show) {
    const input = document.getElementById('hidden-mobile-input');
    if (input) {
        if (show) input.focus();
        else input.blur();
    }
}
