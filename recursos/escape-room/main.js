/** GLOBALES Y REGISTRO **/
let canvas, ctx, ui, menu, jsonInput, startBtn, lastTime = 0;

// Registro de lógica de niveles (Debe estar al principio)
window.levelLogics = window.levelLogics || {};
let currentLevelData = null;

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
window.TILE_SIZE = 32;
window.MAP_OFFSET_Y = 60;
const TILE_SIZE = 32;
const MAP_OFFSET_Y = 60;

const TILES = {
    0: { // Suelo de parquet de madera (identidad mansiones)
        pattern: (x, y) => {
            // Base de madera cálida
            ctx.fillStyle = '#7a5230';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            // Tablones verticales con juntas oscuras
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x + 7, y, 1, TILE_SIZE);
            ctx.fillRect(x + 15, y, 1, TILE_SIZE);
            ctx.fillRect(x + 23, y, 1, TILE_SIZE);
            // Veta de madera (resaltes)
            ctx.fillStyle = 'rgba(255,225,180,0.10)';
            ctx.fillRect(x + 1, y + 5, 6, 1);
            ctx.fillRect(x + 9, y + 16, 6, 1);
            ctx.fillRect(x + 17, y + 24, 6, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.10)';
            ctx.fillRect(x + 1, y + 11, 6, 1);
            ctx.fillRect(x + 9, y + 22, 6, 1);
            // Sombra inferior para dar profundidad
            ctx.fillStyle = 'rgba(0,0,0,0.14)';
            ctx.fillRect(x, y + TILE_SIZE - 3, TILE_SIZE, 3);
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
    2: { // Mesa de madera (tapa con resalte y patas)
        pattern: (x, y) => {
            // Sombra en el suelo
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x + 3, y + TILE_SIZE - 3, TILE_SIZE - 6, 3);
            // Patas
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(x + 5, y + 15, 4, 15);
            ctx.fillRect(x + TILE_SIZE - 9, y + 15, 4, 15);
            // Tapa
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 2, y + 8, TILE_SIZE - 4, 8);
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x + 2, y + 8, TILE_SIZE - 4, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x + 2, y + 13, TILE_SIZE - 4, 2);
        }
    },
    3: { // Silla de madera
        pattern: (x, y) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x + 4, y + TILE_SIZE - 3, TILE_SIZE - 8, 3);
            // Respaldo
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 6, y + 2, TILE_SIZE - 12, 12);
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x + 6, y + 2, TILE_SIZE - 12, 3);
            // Asiento
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 4, y + 14, TILE_SIZE - 8, 5);
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x + 4, y + 14, TILE_SIZE - 8, 2);
            // Patas
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(x + 7, y + 19, 3, 9);
            ctx.fillRect(x + TILE_SIZE - 10, y + 19, 3, 9);
        }
    },
    4: { // Librero con estanterías y libros de colores
        pattern: (x, y) => {
            // Bastidor
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 2, y + 1, TILE_SIZE - 4, TILE_SIZE - 2);
            // Balda central
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(x + 2, y + 11, TILE_SIZE - 4, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x + 3, y + 13, TILE_SIZE - 6, 2);
            // Libros (fila superior)
            const bookColors = ['#c84b31', '#3b6ea5', '#e0b84b', '#4a8c5a', '#8e44ad', '#d98c4a'];
            const off = (x / TILE_SIZE | 0);
            let bx = x + 4;
            for (let i = 0; i < 4 && bx < x + TILE_SIZE - 4; i++) {
                ctx.fillStyle = bookColors[(i + off) % bookColors.length];
                const bh = 7 + (i % 2);
                ctx.fillRect(bx, y + 4, 4, bh);
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(bx, y + 4, 1, bh);
                bx += 5;
            }
            // Libros (fila inferior)
            bx = x + 4;
            for (let i = 0; i < 4 && bx < x + TILE_SIZE - 4; i++) {
                ctx.fillStyle = bookColors[(i + 2) % bookColors.length];
                ctx.fillRect(bx, y + 15, 4, 10);
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(bx, y + 15, 1, 10);
                bx += 5;
            }
            // Resalte del bastidor
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(x + 2, y + 1, TILE_SIZE - 4, 2);
        }
    },
    5: { // Puerta clásica de madera (con paneles y pomo dorado)
        pattern: (x, y) => {
            ctx.fillStyle = '#3a2410'; // Marco
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = NES_PALETTE.wood;
            ctx.fillRect(x + 3, y + 1, TILE_SIZE - 6, TILE_SIZE - 1);
            ctx.fillStyle = NES_PALETTE.woodLight;
            ctx.fillRect(x + 3, y + 1, TILE_SIZE - 6, 3);
            // Paneles hundidos
            ctx.fillStyle = NES_PALETTE.woodDark;
            ctx.fillRect(x + 7, y + 6, 6, 8);
            ctx.fillRect(x + 19, y + 6, 6, 8);
            ctx.fillRect(x + 7, y + 18, 6, 8);
            ctx.fillRect(x + 19, y + 18, 6, 8);
            // Pomo dorado
            ctx.fillStyle = NES_PALETTE.gold;
            ctx.fillRect(x + TILE_SIZE - 9, y + 15, 3, 3);
        }
    },
    6: { // Alfombra ornamental (diamante central)
        pattern: (x, y) => {
            ctx.fillStyle = '#7a2230';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#9c2f3f';
            ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            ctx.strokeStyle = NES_PALETTE.gold;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            // Diamante
            ctx.fillStyle = NES_PALETTE.gold;
            ctx.beginPath();
            ctx.moveTo(x + TILE_SIZE / 2, y + 8);
            ctx.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE / 2);
            ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 8);
            ctx.lineTo(x + 8, y + TILE_SIZE / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#7a2230';
            ctx.fillRect(x + TILE_SIZE / 2 - 2, y + TILE_SIZE / 2 - 2, 4, 4);
        }
    },
    7: { // Maceta con planta
        pattern: (x, y) => {
            // Maceta
            ctx.fillStyle = '#9c5a2c';
            ctx.fillRect(x + 9, y + 18, 14, 12);
            ctx.fillStyle = '#b8733a';
            ctx.fillRect(x + 9, y + 18, 14, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x + 9, y + 28, 14, 2);
            // Tierra
            ctx.fillStyle = '#3a2412';
            ctx.fillRect(x + 10, y + 16, 12, 3);
            // Tallo
            ctx.fillStyle = '#2e8b2e';
            ctx.fillRect(x + 15, y + 4, 3, 14);
            // Hojas
            ctx.fillStyle = '#3fae3f';
            ctx.beginPath(); ctx.ellipse(x + 10, y + 10, 5, 7, -0.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 22, y + 11, 5, 7, 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 16, y + 4, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.ellipse(x + 14, y + 8, 2, 4, -0.5, 0, Math.PI * 2); ctx.fill();
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
    currentInput: "",
    paused: false,
    soundEnabled: true,
    controlMode: 'dpad',
    showingInstructions: false,
    instructionsShownThisLevel: false
};

// Inicialización del sonido de pasos (Asegúrate de tener el archivo en assets/)
const footstepSound = new Audio('assets/footstep.mp3');

const player = {
    x: 400, y: 300, w: 64, h: 64, speed: 5, 
    direction: "down",
    animFrame: 0, // Ciclo 0, 1, 2, 3
    animCounter: 0,
    moving: false,
    showPrompt: false
};

const keys = {};

window.addEventListener('keydown', e => {
    if (e.target && e.target.id === 'hidden-mobile-input') {
        return; // No mover al jugador si el teclado está capturando texto
    }

    if (state.running && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }

    // B button: mostrar/ocultar instrucciones
    if (e.code === 'KeyB' && state.running && !state.inputModo) {
        e.preventDefault();
        window.toggleLevelInstructions();
        return;
    }

    // Select button: abrir menú de control (usamos ShiftLeft o Tab como Select en desktop)
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Tab') && state.running && !state.inputModo) {
        e.preventDefault();
        if (window.showControlMenu) {
            state.paused = true;
            window.showControlMenu();
        }
        return;
    }

    keys[e.code] = true;
});
window.addEventListener('keyup', e => {
    if (e.target && e.target.id === 'hidden-mobile-input') {
        return;
    }
    keys[e.code] = false;
});

/** INICIALIZACIÓN **/
window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    ui = document.getElementById('ui-overlay');
    menu = document.getElementById('menu');
    document.body.classList.add('menu-visible'); // La pantalla de inicio usa todo el espacio
    jsonInput = document.getElementById('jsonInput');
    startBtn = document.getElementById('startBtn');
    const sidebarLeftBtn = document.getElementById('sidebarLeft');
    const sidebarRightBtn = document.getElementById('sidebarRight');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');

    function setSidebarSide(side) {
        document.body.classList.toggle('ui-left', side === 'left');
        document.body.classList.toggle('ui-right', side === 'right');
        localStorage.setItem('dialogSidebarSide', side);
        if (sidebarLeftBtn) sidebarLeftBtn.classList.toggle('active', side === 'left');
        if (sidebarRightBtn) sidebarRightBtn.classList.toggle('active', side === 'right');
    }

    const savedSidebar = localStorage.getItem('dialogSidebarSide') || 'right';
    setSidebarSide(savedSidebar);
    if (sidebarLeftBtn) sidebarLeftBtn.onclick = () => setSidebarSide('left');
    if (sidebarRightBtn) sidebarRightBtn.onclick = () => setSidebarSide('right');

    // Listener para pausa (Enter) y cambio de panel (P)
    // Se coloca aquí dentro para que tenga acceso a setSidebarSide
    window.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            if (state.running && !state.inputModo) {
                state.paused = !state.paused;
                e.preventDefault();
            }
        } else if (e.key && e.key.toLowerCase() === 'p' && e.altKey) {
            const currentSide = document.body.classList.contains('ui-left') ? 'left' : 'right';
            const newSide = currentSide === 'left' ? 'right' : 'left';
            setSidebarSide(newSide);
            e.preventDefault();
        }
    });

    // Botón para mostrar/ocultar opciones de panel
    if (togglePanelBtn) togglePanelBtn.onclick = () => {
        const toggleDiv = document.getElementById('sidebar-position-toggle');
        if (toggleDiv) toggleDiv.classList.toggle('show');
    };

    // Inicializar soporte para móviles (debe ir antes de cualquier uso de isMobile)
    window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Toggle de controles en el menú principal
    const toggleControlsBtn = document.getElementById('toggleControlsBtn');
    const controlesInfo = document.getElementById('controles-info');
    if (toggleControlsBtn && controlesInfo) {
        // Generar texto de controles adaptado a móvil/escritorio
        if (window.isMobile) {
            controlesInfo.innerHTML = `
                🎮 CONTROLES:<br>
                🕹️ Joystick: Mover<br>
                [A]/Toque: Interactuar<br>
                [B]/Menú: Instrucciones del nivel<br>
                [Select]/Menú: Control<br>
                ⏸️ Pausa / ⚙️ Panel<br><br>
                💡 Toca [B] en cada nivel para ver instrucciones
            `;
        }
        toggleControlsBtn.onclick = () => {
            controlesInfo.style.display = controlesInfo.style.display === 'none' ? 'block' : 'none';
        };
    }
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

    // Función para cargar JSON desde el servidor
    window.loadRemoteJSON = function(filename) {
        // Detectar si se está ejecutando localmente sin servidor (CORS policy bypass)
        if (window.location.protocol === 'file:') {
            alert("⚠️ CARGA LOCAL BLOQUEADA:\n\nEl navegador no permite cargar archivos JSON automáticamente desde una carpeta local.\n\nSOLUCIONES:\n1. Usa el botón 'Elegir archivo' de abajo.\n2. Sube tus cambios a GitHub.\n3. Usa un servidor local (como la extensión Live Server de VS Code).");
            return;
        }

        fetch(`levels/${filename}`)
            .then(response => {
                if (!response.ok) throw new Error(`El archivo '${filename}' no existe en la carpeta /levels/. Verifica que el nombre coincida exactamente (mayúsculas/minúsculas) en GitHub.`);
                return response.json();
            })
            .then(data => {
                processJSONData(data, filename);
            })
            .catch(err => {
                console.error("[ERROR DE CARGA]", err);
                if (err.name === 'TypeError') {
                    alert("Error de red o CORS. Si estás en local, usa el botón 'Elegir archivo'.");
                } else {
                    alert("Error: " + err.message);
                }
            });
    };

    function processJSONData(data, filename) {
        if (!data.levels || data.levels.length === 0) {
            alert("Formato de JSON inválido.");
            return;
        }
        
        // Inicializar estadísticas para esta partida
        if (window.gameStats && window.gameStats.resetGlobal) {
            window.gameStats.resetGlobal();
        }
        
        state.allLevels = data.levels;
        window.gameStats.gameSet = filename.split('.')[0]; // Store the name of the loaded set
        state.levelIndex = 0;
        
        // Registrar inicio del primer nivel
        if (window.gameStats && window.gameStats.initLevel) {
            window.gameStats.initLevel(0);
        }
        loadCurrentLevel();

        // Limpiar menú y mostrar niveles
        const menuContent = document.getElementById('menu');
        menuContent.innerHTML = `<h1>${filename.split('.')[0].toUpperCase()}</h1><p>Selecciona nivel:</p>`;
        
        state.allLevels.forEach((lvl, idx) => {
            const btn = document.createElement('button');
            btn.className = "btn";
            btn.innerText = `NIVEL ${idx + 1}: ${lvl.title || lvl.type}`;
            btn.style.display = 'block';
            btn.style.margin = '10px auto';
            btn.onclick = () => {
                state.levelIndex = idx;
                
                // Registrar inicio del nuevo nivel
                if (window.gameStats && window.gameStats.initLevel) {
                    window.gameStats.initLevel(idx);
                }
                
                loadCurrentLevel();
                startGame();
            };
            menuContent.appendChild(btn);
        });

        // Re-agregar crédito al final cuando se cargan los niveles
        const footer = document.createElement('p');
        footer.style.cssText = "font-size: 9px; margin-top: 30px; color: #666; text-align: center;";
        footer.innerText = "Creado por Alfredo Adrián González Lazcano";
        menuContent.appendChild(footer);
    }

    // Exponer processJSONData para que el editor de niveles (levelEditor.js)
    // pueda lanzar sets personalizados creados por docentes.
    window.processJSONData = processJSONData;
    // Exponer también el contenido de un set en edición (si el editor lo fija)
    window.__customSetData = null;

    // Agregar eventos a botones de presets
    const level1Btn = document.getElementById('level1Btn');
    if (level1Btn) level1Btn.onclick = () => loadRemoteJSON('level1.json');
    
    document.getElementById('psicometriaBtn').onclick = () => loadRemoteJSON('psicometria.json');
    const psicopatoBtn = document.getElementById('psicopatologiaBtn');
    if (psicopatoBtn) psicopatoBtn.onclick = () => loadRemoteJSON('psicopatologia.json');
    const transBtn = document.getElementById('transdisciplinaBtn');
    if (transBtn) transBtn.onclick = () => loadRemoteJSON('transdisciplina.json');

    // Mantener compatibilidad con input de archivo local
    jsonInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => processJSONData(JSON.parse(event.target.result), file.name);
        reader.readAsText(file);
    });

    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }
});

// Iguala la altura de la sala a un tamaño común (12 filas) rellenando con
// piso el espacio hasta el muro inferior. Así el muro de abajo queda siempre
// en el mismo sitio y no aparece una franja gris a media pantalla.
// No mueve objetos (solo añade filas de piso con muros laterales).
function normalizeRoom(map, targetRows) {
    if (!Array.isArray(map) || map.length >= targetRows) return map;
    const last = map[map.length - 1];            // muro inferior original
    const floorRow = map[map.length - 2] || last; // piso con muros laterales
    const pad = targetRows - map.length;
    const out = map.slice(0, map.length - 1);
    for (let i = 0; i < pad; i++) out.push(floorRow.slice());
    out.push(last);
    return out;
}

function loadCurrentLevel() {
    state.inventory = null;
    // Resetear estado completo del jugador para que funcione REINTENTAR
    player.isCaptured = false;
    player.moving = false;
    player.showPrompt = false;
    player.animFrame = 0;
    player.direction = "down";
    player.speed = 5; // Velocidad base por defecto (cada nivel la ajusta si necesita)
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

    // Uniformizar el tamaño de la sala (evita la franja gris a media pantalla).
    // Se omiten los niveles con mapa especial (maze, tennis).
    if (currentLevelData.map && !['maze', 'tennis'].includes(levelData.type)) {
        currentLevelData.map = normalizeRoom(currentLevelData.map, 12);
    }

    // Acento de tema en el panel de diálogo según el tipo de nivel
    if (ui) {
        const THEME_ACCENT = {
            date: '#4aa3ff', atomic: '#ff8c00', art: '#b06bff', tower: '#39d98a',
            snakes: '#39d98a', bridge: '#36c6c6', dragon: '#ff4a4a', tennis: '#39d98a', maze: '#b0a080'
        };
        ui.style.setProperty('--accent', THEME_ACCENT[levelData.type] || '#f8b800');
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
    // Registrar finalización del nivel actual
    if (window.gameStats && window.gameStats.recordLevelComplete) {
        window.gameStats.recordLevelComplete(state.levelIndex);
    }
    
    state.levelIndex++;
    if (state.levelIndex < state.allLevels.length) {
        // Registrar inicio del nuevo nivel
        if (window.gameStats && window.gameStats.initLevel) {
            window.gameStats.initLevel(state.levelIndex);
        }
        
        // Reiniciar indicador de instrucciones para el nuevo nivel
        state.instructionsShownThisLevel = false;
        state.showingInstructions = false;
        
        loadCurrentLevel();
        ui.innerHTML = "Entrando a: " + currentLevelData.title;
    } else {
        // Juego completado
        gameCompleted();
    }
}

async function gameCompleted() {
    state.running = false;
    menu.style.display = 'flex';
    document.body.classList.add('menu-visible');
    menu.innerHTML = `
        <h1>¡JUEGO COMPLETADO!</h1>
        <p>Has superado todos los niveles.</p>
        <button id="finalReportBtn" style="padding:15px 30px; margin-top:30px; cursor:pointer; font-family:'Press Start 2P'; background:#a80020; color:white; font-size:12px; border:2px solid #f8b800;">DESCARGAR MI REPORTE</button>
        <button onclick="location.reload()" style="padding:15px 30px; margin-top:15px; cursor:pointer; font-family:'Press Start 2P'; background:#346856; color:white; font-size:12px;">MENÚ PRINCIPAL</button>
    `;
    
    const reportBtn = document.getElementById('finalReportBtn');
    reportBtn.onclick = async () => {
        const playerName = await window.reportSystem.promptPlayerName(true);
        if (playerName) {
            window.reportSystem.generateReport(playerName, true);
        }
    };
}

// Sistema de instrucciones por nivel
window.toggleLevelInstructions = function() {
    if (!state.running || !currentLevelData) return;
    state.showingInstructions = !state.showingInstructions;
    const level = state.allLevels[state.levelIndex];
    if (state.showingInstructions) {
        const desc = currentLevelData.description || level.description || "Explora la habitación.";
        const title = level.title || currentLevelData.title || "Nivel";
        let controlesInfo = "⬆️⬇️⬅️➡️ Mover | " + (window.isMobile ? "🖐️ Tocar" : "[A/Space]") + " Interactuar";
        if (currentLevelData.type === 'date') controlesInfo += " | " + (window.isMobile ? "📋 Menú" : "[B]") + " Instrucciones";
        if (currentLevelData.type === 'tower') controlesInfo += " | 🕷️ ¡Evita a la araña!";
        if (currentLevelData.type === 'atomic') controlesInfo += " | 🔥 El fuego sube, ¡date prisa!";
        if (currentLevelData.type === 'art') controlesInfo += " | 🖼️ Coloca el cuadro correcto";
        if (currentLevelData.type === 'snakes') controlesInfo += " | 🐍 ¡Cuidado con las serpientes!";
        if (currentLevelData.type === 'bridge') controlesInfo += " | 🌉 Responde V o F al cruzar";
        if (currentLevelData.type === 'dragon') controlesInfo += " | 🐉 ¡Derríbalo con respuestas!";
        if (currentLevelData.type === 'tennis') controlesInfo += " | 🎾 ¡Devuelve la bomba!";
        if (currentLevelData.type === 'maze') controlesInfo += " | 🧩 Responde y escapa del laberinto";
        ui.innerHTML = `
            <div style="background: rgba(0,0,0,0.9); padding: 15px; border: 2px solid #f8b800;">
                <strong style="color: #f8b800;">📋 ${title}</strong><br><br>
                ${desc}<br><br>
                <span style="color: #aaa; font-size: 11px;">${controlesInfo}</span><br><br>
                <span style="color: #ffff66; font-size: 10px;">${window.isMobile ? "📋 Menú" : "[B/Shift]"} Volver al juego</span>
            </div>
        `;
        state.paused = true;
    } else {
        state.paused = false;
        ui.innerHTML = level.title || currentLevelData.title || "";
    }
};

function startGame() {
    menu.style.display = 'none';
    document.body.classList.remove('menu-visible');
    // Si es nivel de tenis, empezamos con la interfaz oculta para ver el juego
    if (currentLevelData && currentLevelData.type === 'tennis') {
        ui.style.display = 'none';
    } else {
        ui.style.display = 'block';
        const level = state.allLevels[state.levelIndex];
        const desc = currentLevelData.description || level.description || "Explora la habitación.";
        ui.innerHTML = `<strong>${level.title}</strong><br>${desc}`;
        
        // Mostrar invitación a instrucciones al inicio del nivel
        if (!state.instructionsShownThisLevel) {
            state.instructionsShownThisLevel = true;
            // Mostrar un breve mensaje indicando que puede presionar B para instrucciones
            setTimeout(() => {
                if (state.running && !state.inputModo && !state.showingInstructions) {
                    const hintKey = window.isMobile ? "📋 Menú" : "[B]";
                    ui.innerHTML = `<strong>${level.title}</strong><br>${desc}<br><br>
                        <span style="color: #ffff66; font-size: 11px;">💡 Presiona ${hintKey} para instrucciones detalladas</span>`;
                }
            }, 200);
        }
    }
    window.gameStats.gameStartTime = new Date(); // Record game start time
    state.inputModo = false; // Asegurar que el modo de entrada de texto esté desactivado al iniciar el juego
    state.showingInstructions = false;
    state.running = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

window.checkProximity = function(obj) {
    if (!obj) return false;
    // Si el objeto no tiene x/y reales, calculamos basados en tiles (como en Nivel 1 y 3)
    const ox = obj.x !== undefined ? obj.x : (obj.tileX * window.TILE_SIZE);
    const oy = obj.y !== undefined ? obj.y : (obj.tileY * window.TILE_SIZE + window.MAP_OFFSET_Y);
    const ow = obj.w || window.TILE_SIZE;
    const oh = obj.h || window.TILE_SIZE;
    
    const dist = Math.hypot((player.x + player.w / 2) - (ox + ow / 2), (player.y + player.h / 2) - (oy + oh / 2));
    return dist < 60; // Radio de detección
}

function checkCollision(nx, ny) {
    if (!currentLevelData) return false;

    // Caja de colisión (AABB) reducida a la base del personaje (pies)
    // Esto permite que la cabeza se superponga a objetos "detrás" sin bloquearse.
    // Ajustado para el nuevo tamaño "chibi" de 64x64
    const points = [
        { x: nx + 24, y: ny + 50 },
        { x: nx + 40, y: ny + 50 },
        { x: nx + 24, y: ny + 60 },
        { x: nx + 40, y: ny + 60 },
        { x: nx + 32, y: ny + 56 }
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
            // Colisión AABB de la caja de pies contra muebles colisionables
            // (plantas, sillas). Caja más ancha que los puntos de pie para no
            // dejar "burbujas" de colisión invisibles en la sala (el lookahead
            // 2x2 bloqueaba un tile entero al lado del mueble).
            const pL = nx + 6, pR = nx + 58, pT = ny + 46, pB = ny + 62;
            for (let obj of currentLevelData.tileObjects) {
                if (!obj.collidable) continue;
                const ox = obj.tileX * TILE_SIZE;
                const oy = obj.tileY * TILE_SIZE + MAP_OFFSET_Y;
                if (pL < ox + TILE_SIZE && pR > ox && pT < oy + TILE_SIZE && pB > oy) {
                    return true;
                }
            }
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
        const floorColor = currentLevelData.floorColor;
        const drawFloor = (px, py) => {
            if (floorColor) { ctx.fillStyle = floorColor; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
            else TILES[0].pattern(px, py);
        };
        currentLevelData.map.forEach((row, y) => {
            row.forEach((tileType, x) => {
                const px = x * TILE_SIZE, py = y * TILE_SIZE + MAP_OFFSET_Y;
                if (tileType === 0) {
                    drawFloor(px, py);
                } else if (TILES[tileType]) {
                    // En el nivel 'date' la mesa se dibuja como pieza única en level1.js:
                    // no pintamos la mesa pequeña por tile (evita ver "mesas sueltas")
                    if ((tileType === 2 || tileType === 4) && currentLevelData.type === 'date') {
                        drawFloor(px, py);
                    } else {
                        // Siempre dibujar el piso debajo del mueble para evitar fondo en blanco
                        drawFloor(px, py);
                        TILES[tileType].pattern(px, py);
                    }
                }
            });
        });
    }
    
    // Dibujar objetos de tiles
    if (currentLevelData.tileObjects) {
        currentLevelData.tileObjects.forEach(obj => {
            const tileType = TILE_OBJECT_TYPES[obj.type];
            if (tileType !== undefined && TILES[tileType]) {
                // En el nivel 'date' la mesa y los libreros ya se dibujan desde el
                // mapa (piezas de 2 cuadros). No los redibujamos como objeto suelto
                // para evitar libreros/mesas "sueltos" extra encima de los del mapa.
                if ((obj.type === 'table' || obj.type === 'bookshelf') && currentLevelData.type === 'date') return;
                const px = obj.tileX * TILE_SIZE, py = obj.tileY * TILE_SIZE + MAP_OFFSET_Y;
                TILES[tileType].pattern(px, py);
            }
        });
    }
}

// ─────────────────────────────────────────────────────────────
// MARCO COMÚN
//  - Parte SUPERIOR: madera tallada con velas y placa de título.
//  - Lados y BASE: ladrillo gris (mismo tile que la sala), idéntico
//    en todos los niveles.
// ─────────────────────────────────────────────────────────────

// Vela / palmatoria de pared (pequeña decoración de la cabecera)
function drawMansionSconce(cx, cy) {
    ctx.fillStyle = NES_PALETTE.woodDark;
    ctx.fillRect(cx - 2, cy - 2, 4, 10);
    ctx.fillStyle = '#e8d8a0';
    ctx.fillRect(cx - 2, cy - 8, 4, 8);
    const flick = Math.sin(Date.now() * 0.01 + cx) * 1.5;
    ctx.fillStyle = NES_PALETTE.gold;
    ctx.fillRect(cx - 1, Math.round(cy - 12 + flick), 2, 4);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(cx - 1, Math.round(cy - 11 + flick), 2, 2);
    ctx.fillStyle = 'rgba(248, 184, 0, 0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 9, 0, Math.PI * 2);
    ctx.fill();
}

// Cofre de madera (32x32) para ítems recolectables
function drawChest(x, y) {
    ctx.fillStyle = NES_PALETTE.woodDark;
    ctx.fillRect(x + 2, y + 8, 28, 22);
    ctx.fillStyle = NES_PALETTE.wood;
    ctx.fillRect(x + 4, y + 10, 24, 18);
    ctx.fillStyle = NES_PALETTE.woodLight;
    ctx.fillRect(x + 2, y + 4, 28, 8);
    ctx.fillStyle = NES_PALETTE.wood;
    ctx.fillRect(x + 4, y + 4, 24, 4);
    ctx.fillStyle = '#9a9a9a'; // Bandas metálicas
    ctx.fillRect(x + 2, y + 12, 28, 3);
    ctx.fillRect(x + 13, y + 4, 5, 26);
    ctx.fillStyle = NES_PALETTE.gold; // Cerrojo
    ctx.fillRect(x + 14, y + 15, 4, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; // Brillo
    ctx.fillRect(x + 6, y + 6, 6, 3);
}

// Interruptor de pared: panel (recuadro) con indicador luminoso y palanca
function drawWallSwitch(px, py, on) {
    ctx.fillStyle = '#3a2e22'; // Marco
    ctx.fillRect(px - 15, py - 20, 30, 40);
    ctx.fillStyle = '#1c1610'; // Interior
    ctx.fillRect(px - 12, py - 17, 24, 34);
    const lit = on ? '#39ff14' : '#ff2a2a';
    ctx.fillStyle = lit; // Indicador
    ctx.fillRect(px - 7, py - 13, 14, 12);
    ctx.fillStyle = on ? 'rgba(57,255,20,0.25)' : 'rgba(255,42,42,0.25)';
    ctx.beginPath(); ctx.arc(px, py - 7, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8c8c8'; // Palanca
    ctx.fillRect(px - 2, py + 2, 4, 12);
    ctx.fillStyle = lit; // Pomo (arriba=on, abajo=off)
    ctx.fillRect(px - 5, on ? py + 1 : py + 11, 10, 5);
}

// Cabecera de madera: muro superior + paneles + placa de título + velas
function drawRoomHeader() {
    const W = canvas.width;
    const H = MAP_OFFSET_Y;

    ctx.fillStyle = NES_PALETTE.wood;
    ctx.fillRect(0, 0, W, H);
    // Paneles verticales de madera oscura
    ctx.fillStyle = NES_PALETTE.woodDark;
    for (let x = 16; x < W; x += 64) {
        ctx.fillRect(x, 8, 4, H - 12);
    }
    // Moldura inferior que separa el muro de la sala
    ctx.fillStyle = NES_PALETTE.woodDark;
    ctx.fillRect(0, H - 4, W, 4);
    ctx.fillStyle = NES_PALETTE.gold;
    ctx.fillRect(0, H - 5, W, 1);

    // Placa de título centrada
    const title = (currentLevelData && currentLevelData.title) ? currentLevelData.title : "SALA";
    const plaqueW = Math.min(380, W - 160);
    const plaqueX = (W - plaqueW) / 2;
    const plaqueY = 10;
    const plaqueH = H - 20;
    ctx.fillStyle = NES_PALETTE.woodLight;
    ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = NES_PALETTE.woodDark; ctx.lineWidth = 3;
    ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = NES_PALETTE.gold; ctx.lineWidth = 1;
    ctx.strokeRect(plaqueX + 3, plaqueY + 3, plaqueW - 6, plaqueH - 6);
    let t = title.toUpperCase();
    if (t.length > 28) t = t.slice(0, 27) + "…";
    ctx.fillStyle = NES_PALETTE.white;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, W / 2, plaqueY + plaqueH / 2 + 1);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    // Velas flanqueando la placa
    drawMansionSconce(48, H / 2);
    drawMansionSconce(W - 48, H / 2);
}

// Bordes de ladrillo gris en lados y base del canvas.
// Mismo grosor (1 tile) y dibujo que el muro de la sala; la parte
// superior la aporta drawRoomHeader (madera). Así el marco es uniforme.
function drawBrickFrame() {
    const W = canvas.width, H = canvas.height;
    const B = TILE_SIZE;
    // Inferior: cubrir desde el muro inferior de la sala hasta el borde, para
    // que no quede una franja gris entre la sala y el marco de abajo.
    const roomBottom = (currentLevelData && currentLevelData.map)
        ? currentLevelData.map.length * TILE_SIZE + MAP_OFFSET_Y
        : H - B;
    for (let x = 0; x < W; x += TILE_SIZE) {
        for (let y = roomBottom; y < H; y += TILE_SIZE) {
            TILES[1].pattern(x, y);
        }
    }
    // Izquierda y derecha
    for (let y = 0; y < H; y += TILE_SIZE) {
        TILES[1].pattern(0, y);
        TILES[1].pattern(W - B, y);
    }
}

function drawCommonRoom() {
    // Dibujar suelo base siempre para evitar huecos negros
    ctx.fillStyle = NES_PALETTE.floor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cuadrícula tenue decorativa del suelo
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < canvas.width; i += 32) {
        for (let j = MAP_OFFSET_Y; j < canvas.height; j += 32) {
            if ((i + j) % 64 === 0) ctx.fillRect(i, j, 32, 32);
        }
    }

    // Marco: ladrillo gris en lados/base + madera con velas en la superior
    drawBrickFrame();
    drawRoomHeader();
}

function validarPassword() {
    const pass = (currentLevelData.claveCIE || currentLevelData.discoveryYear || "").toString().toUpperCase();
    if (state.currentInput === pass) {
        ui.innerHTML = "✅ ¡CLAVE CORRECTA! Puerta abierta.";
        state.inputModo = false;
        toggleMobileKeyboard(false);
        if (currentLevelData.type === 'date') currentLevelData.doorUnlocked = true;
        if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, "Ingreso de código de seguridad", true);
    } else {
        state.currentInput = "";
        const input = document.getElementById('hidden-mobile-input');
        if (input) input.value = "";
        ui.innerHTML = "❌ CLAVE INCORRECTA. Intenta de nuevo.";
        flashFailure();
        if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, "Ingreso de código de seguridad", false);
        setTimeout(actualizarDialogoInput, 1000);
    }
}

function handleKeyboardInput(e) {
    if (!state.inputModo) return;

    // Permitir que el input oculto en móviles capture caracteres sin interferencia
    if (e.target && e.target.id === 'hidden-mobile-input' && e.key !== "Enter") {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Enter") {
        validarPassword();
    } else if (e.key === "Escape" || e.code === "Space") {
        salirModoInput();
    } else if (e.key === "Backspace") {
        state.currentInput = state.currentInput.slice(0, -1);
        const input = document.getElementById('hidden-mobile-input');
        if (input) input.value = state.currentInput;
        actualizarDialogoInput();
    } else if (e.key.length === 1 && e.key !== " " && !e.altKey && state.currentInput.length < (currentLevelData.longitudClave || 4)) {
        state.currentInput += e.key.toUpperCase();
        const input = document.getElementById('hidden-mobile-input');
        if (input) input.value = state.currentInput;
        actualizarDialogoInput();
    }
}

function salirModoInput() {
    state.inputModo = false;
    state.currentInput = "";
    toggleMobileKeyboard(false);
    const input = document.getElementById('hidden-mobile-input');
    if (input) input.value = "";
    ui.innerHTML = currentLevelData?.title ? currentLevelData.title + ". Explora la habitación." : "Explora la habitación.";
}

function actualizarDialogoInput() {
    if (state.inputModo) toggleMobileKeyboard(true);
    if (!state.inputModo) return;
    let length = currentLevelData.longitudClave || 4;
    let display = "";
    for (let i = 0; i < length; i++) {
        if (i < state.currentInput.length) {
            display += state.currentInput[i] + " ";
        } else {
            display += "_ ";
        }
    }
    ui.innerHTML = `
        <div style="background: rgba(0,0,0,0.8); padding: 20px; border: 2px solid white; text-align: center;">
            SISTEMA DE SEGURIDAD<br>INGRESE CÓDIGO (${length} caracteres):<br><br>
            <span style="letter-spacing:10px; font-size: 24px; color: #f8b800;">${display}</span><br><br>
            ${window.isMobile ? "" : '<small>[ENTER] Confirmar - [ESC] Salir</small><br>'}
            <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                <button id="mobile-kb-btn" style="display:none; padding:10px; font-family:inherit; background:#3cbcfc; border:none; color:white; border-radius:5px; font-size:12px; touch-action: manipulation;">ABRIR TECLADO</button>
                <button id="salir-input-btn" style="padding:10px; font-family:inherit; background:#a80020; border:none; color:white; border-radius:5px; font-size:12px; cursor:pointer; touch-action: manipulation;">✕ SALIR</button>
            </div>
        </div>`;

    const salirBtn = document.getElementById('salir-input-btn');
    if (salirBtn) {
        salirBtn.onclick = salirModoInput;
        salirBtn.ontouchstart = (e) => { e.preventDefault(); salirModoInput(); };
    }

    // iOS y Android a veces bloquean el focus automático. Ofrecemos un botón de respaldo.
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        setTimeout(() => {
            const btn = document.getElementById('mobile-kb-btn');
            if (btn) {
                btn.style.display = 'inline-block';
                const focusInput = () => {
                    const input = document.getElementById('hidden-mobile-input');
                    if (input) {
                        input.focus();
                        input.click(); // Algunos navegadores Safari requieren click para disparar teclado
                    }
                };
                btn.onclick = focusInput;
                btn.ontouchstart = (e) => { e.preventDefault(); focusInput(); };
            }
        }, 50);
    }
}

function update(dt) {
    if (state.paused) return; // No actualizar si está pausado

    // Actualización específica del nivel (ej. techo bajando)
    if (currentLevelData && levelLogics[currentLevelData.type] && levelLogics[currentLevelData.type].update) {
        levelLogics[currentLevelData.type].update(dt);
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
        if (keys['ArrowLeft']) { dx = -player.speed * dt; player.moving = true; }
        else if (keys['ArrowRight']) { dx = player.speed * dt; player.moving = true; }
        else { player.moving = false; }
    } else {
    // Movimiento (Prioridad: Arriba/Abajo)
    if (keys['ArrowUp']) { dy = -player.speed * dt; player.direction = "up"; player.moving = true; }
    else if (keys['ArrowDown']) { dy = player.speed * dt; player.direction = "down"; player.moving = true; }
    else if (keys['ArrowLeft']) { dx = -player.speed * dt; player.direction = "left"; player.moving = true; }
    else if (keys['ArrowRight']) { dx = player.speed * dt; player.direction = "right"; player.moving = true; }

    // Aplicar movimiento
    }
    nextX += dx;
    nextY += dy;

    // Ciclo de animación (Quieto -> PieA -> Quieto -> PieB)
    if (player.moving) {
        player.animCounter += dt;
        // Velocidad del paso (más bajo = más rápido)
        if (player.animCounter > 15) { 
            player.animCounter = 0;
            player.animFrame = (player.animFrame + 1) % 4; // Ciclo 0, 1, 2, 3
            
            // Reproducir sonido de pasos en los frames de contacto (1 y 3)
            if (state.soundEnabled && (player.animFrame === 1 || player.animFrame === 3)) {
                footstepSound.currentTime = 0; // Reiniciar para permitir pasos rápidos
                footstepSound.volume = 0.2;     // Volumen moderado
                footstepSound.play().catch(() => {}); // El catch evita errores si el navegador bloquea audio inicial
            }
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
        isNearInteractable = currentLevelData.tileObjects.some(o => o.interactive && !o.searched && checkProximity(o));
    }
    // Revisar muebles (cuadros, químicos)
    if (!isNearInteractable && currentLevelData.furniture) {
        isNearInteractable = currentLevelData.furniture.some(f => (f.interactable || f.id === 'painting') && checkProximity(f));
    }
    // Revisar si está sobre un tile interactivo del mapa
    const gx = Math.floor((player.x + player.w / 2) / TILE_SIZE);
    const gy = Math.floor((player.y + player.h - 10 - MAP_OFFSET_Y) / TILE_SIZE);
    const tileBajoPies = currentLevelData.map?.[gy]?.[gx];
    const doorObj = currentLevelData.tileObjects.find(o => o.type === 'door');
    if (tileBajoPies === 4 || (tileBajoPies === 5 && !(doorObj && doorObj.searched))) isNearInteractable = true;

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

// Señal visual de fallo: parpadeo rojo que se desvanece
let failureFlash = 0;
function flashFailure() { failureFlash = 1; }
window.flashFailure = flashFailure;

// Atmósfera global: viñeteado + tinte cálido + respiración de las velas
function drawAtmosphere() {
    const W = canvas.width, H = canvas.height;
    if (!drawAtmosphere._grad) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.7, 'rgba(10,6,2,0.12)');
        g.addColorStop(1, 'rgba(0,0,0,0.5)');
        drawAtmosphere._grad = g;
    }
    ctx.fillStyle = drawAtmosphere._grad;
    ctx.fillRect(0, 0, W, H);
    // Respiración de la luz de las velas (parpadeo global suave)
    const t = Date.now();
    const candle = 0.5 + 0.5 * Math.sin(t * 0.0013);
    const flutter = 0.5 + 0.5 * Math.sin(t * 0.009 + 1.7);
    const flick = 0.82 + 0.18 * (candle * 0.6 + flutter * 0.4); // ~0.82..1.0
    ctx.fillStyle = `rgba(60,30,5,${0.06 * flick})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${(1 - flick) * 0.05})`;
    ctx.fillRect(0, 0, W, H);
}

function gameLoop(timestamp) {
    if (!state.running) return;

    // Calcular Delta Time (dt) para normalizar velocidad (basado en 60fps)
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    const dt = Math.min(deltaTime, 100) / (1000 / 60); 

    // Accumulate time for the current level
    if (state.running && !state.paused && currentLevelData && state.levelIndex !== undefined) {
        if (!window.gameStats.levelStats[state.levelIndex]) window.gameStats.initLevel(state.levelIndex);
        window.gameStats.levelStats[state.levelIndex].time += deltaTime / 1000; // Accumulate time in seconds
    }

    update(dt);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawCommonRoom();
    drawMap();
    
    // Delegar el dibujo específico al nivel actual
    if (currentLevelData && levelLogics[currentLevelData.type]) {
        const logic = levelLogics[currentLevelData.type];
        logic.draw();
    }

    drawPlayer(player.x, player.y);
    
    // Atmósfera (viñeteado + tinte) sobre toda la escena
    drawAtmosphere();

    // Señal de fallo: destello rojo + borde que se desvanece
    if (failureFlash > 0) {
        ctx.fillStyle = `rgba(190,0,0,${0.4 * failureFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = `rgba(255,50,50,${0.9 * failureFlash})`;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        failureFlash = Math.max(0, failureFlash - 0.045);
    }

    if (player.showPrompt) {
        ctx.fillStyle = NES_PALETTE.black;
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText("?", player.x + 5, player.y - 10);
    }

    // Efecto visual de Pausa
    if (state.paused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Capa gris semi-transparente
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = NES_PALETTE.white;
        ctx.font = '32px "Press Start 2P"';
        ctx.textAlign = "center";
        ctx.fillText("PAUSA", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "start"; // Restaurar alineación para no afectar otros dibujos
    }

    if (state.running) {
        requestAnimationFrame(gameLoop);
    }
}

function gameOver(message) {
    flashFailure();
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
        <button id="downloadReportBtn" style="padding:10px; cursor:pointer; font-family:'Press Start 2P'; background:#a80020; color:white;">DESCARGAR REPORTE</button>
        <button onclick="location.reload()" style="padding:10px; cursor:pointer; font-family:'Press Start 2P';">MENÚ PRINCIPAL</button>
    `;

    document.getElementById('retryLevelBtn').onclick = () => {
        loadCurrentLevel();
        startGame();
    };

    document.getElementById('downloadReportBtn').onclick = async () => {
        const playerName = await window.reportSystem.promptPlayerName(false);
        if (playerName) {
            window.reportSystem.generateReport(playerName, false);
        }
    };
}

/** SISTEMA DE ADAPTACIÓN PARA MÓVILES (iOS/Android) **/
function setupMobileControls() {
    if (!window.isMobile) return;
    
    // Hacer el canvas responsivo
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.touchAction = 'none'; // Previene scroll accidental al jugar

    // Aumentar tamaño y posicionar entre el juego y los controles
    ui.style.position = 'fixed';
    ui.style.left = '0';
    ui.style.right = '0';
    ui.style.width = '100%';
    ui.style.bottom = '220px'; // Unida a la parte superior de los botones (altura de controles)
    ui.style.margin = '0';
    ui.style.boxSizing = 'border-box';

    // Función para ajustar dinámicamente la posición superior unida al canvas
    const updateUIPosition = () => {
        const canvasRect = canvas.getBoundingClientRect();
        ui.style.top = Math.floor(canvasRect.bottom) + 'px'; // Unida exactamente a la base del canvas
        ui.style.height = 'auto'; // Permite que el cuadro se estire hasta el bottom de 220px
    };

    window.addEventListener('resize', updateUIPosition);
    setTimeout(updateUIPosition, 150); // Retardo para asegurar el renderizado inicial

    ui.style.maxHeight = 'none';
    ui.style.overflowY = 'auto';
    ui.style.pointerEvents = 'auto';
    ui.style.padding = '20px';
    const accent = (ui.style.getPropertyValue('--accent') || '#f8b800').trim() || '#f8b800';
    ui.style.borderTop = '4px solid ' + accent;
    ui.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';

    // Crear un input invisible para disparar el teclado del celular
    const hiddenInput = document.createElement('input');
    hiddenInput.id = 'hidden-mobile-input';
    hiddenInput.type = 'text';
    hiddenInput.setAttribute('autocorrect', 'off');
    hiddenInput.setAttribute('autocapitalize', 'none');
    hiddenInput.setAttribute('spellcheck', 'false');
    hiddenInput.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 1px; height: 1px; font-size: 16px; opacity: 0; border: none; outline: none;';
    document.body.appendChild(hiddenInput);

    // Listener para capturar texto en móviles de forma nativa
    hiddenInput.addEventListener('input', (e) => {
        if (state.inputModo) {
            state.currentInput = e.target.value.toUpperCase().slice(0, currentLevelData.longitudClave || 4);
            actualizarDialogoInput();
        }
    });

    // Enter en el teclado móvil para enviar
    hiddenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.inputModo) {
            handleKeyboardInput(e);
        }
    });

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
            #mobile-controls { position: fixed; bottom: 0; left: 0; right: 0; height: 220px; background: #9ea0ac; border-top: 4px solid #757781; display: flex; justify-content: space-around; align-items: center; pointer-events: auto; z-index: 9999; padding-bottom: 20px; box-sizing: border-box; }
            #mobile-controls .dpad { display: grid; grid-template-columns: repeat(3, 50px); grid-template-rows: repeat(3, 50px); background: #757781; padding: 5px; border-radius: 5px; }
            #mobile-controls .btn-mobile { width: 50px; height: 50px; background: #2d2d2d; color: #757781; display: flex; align-items: center; justify-content: center; user-select: none; font-size: 20px; -webkit-tap-highlight-color: transparent; box-shadow: inset 0 0 5px #000; }
            #mobile-controls .btn-mobile:active { background: #000; color: #fff; }
            #mobile-controls .center-buttons { display: flex; flex-direction: row; gap: 20px; align-self: flex-end; margin-bottom: 10px; }
            #mobile-controls .btn-pill { width: 45px; height: 15px; background: #757781; border-radius: 10px; transform: rotate(-25deg); position: relative; }
            #mobile-controls .btn-pill::after { content: attr(data-label); position: absolute; bottom: -20px; left: 0; font-size: 8px; color: #343434; font-family: 'Press Start 2P'; transform: rotate(25deg); }
            #mobile-controls .btn-action-group { display: flex; gap: 15px; align-items: center; }
            #mobile-controls .btn-circle { width: 65px; height: 65px; border-radius: 50%; background: #a80020; border: 3px solid #700016; color: rgba(0,0,0,0.3); font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 2px 2px 0 #700016; }
            #mobile-controls .btn-circle:active { transform: translate(1px, 1px); box-shadow: none; background: #700016; }
            #mobile-controls .btn-circle-b { width: 55px; height: 55px; border-radius: 50%; background: #346856; border: 3px solid #1a3a2a; color: rgba(0,0,0,0.3); font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 2px 2px 0 #1a3a2a; }
            #mobile-controls .btn-circle-b:active { transform: translate(1px, 1px); box-shadow: none; background: #1a3a2a; }
            /* Joystick styles */
            #mobile-controls .joystick-area { display: none; width: 140px; height: 140px; position: relative; border-radius: 50%; background: #555; box-shadow: inset 0 0 15px rgba(0,0,0,0.5); }
            #mobile-controls .joystick-knob { width: 50px; height: 50px; border-radius: 50%; background: #a80020; position: absolute; top: 45px; left: 45px; box-shadow: 0 3px 5px rgba(0,0,0,0.4); pointer-events: none; }
            #mobile-controls .joystick-area.active { display: block; }
            /* Control menu overlay */
            .control-menu-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10000; font-family: 'Press Start 2P', monospace; color: white; }
            .control-menu-overlay h2 { color: #f8b800; font-size: 16px; margin-bottom: 20px; }
            .control-menu-overlay .ctrl-btn { padding: 12px 24px; margin: 8px; background: #333; border: 2px solid #666; color: white; font-family: inherit; font-size: 11px; cursor: pointer; min-width: 200px; }
            .control-menu-overlay .ctrl-btn:hover { border-color: #f8b800; }
            .control-menu-overlay .ctrl-btn.active { border-color: #f8b800; background: #503000; }
            .control-menu-overlay .ctrl-close { margin-top: 20px; padding: 8px 16px; background: #a80020; border: none; color: white; font-family: inherit; font-size: 10px; cursor: pointer; }
        </style>
        <div class="dpad" id="ctrl-dpad">
            <div></div><div class="btn-mobile" data-key="ArrowUp">▲</div><div></div>
            <div class="btn-mobile" data-key="ArrowLeft">◀</div><div></div><div class="btn-mobile" data-key="ArrowRight">▶</div>
            <div></div><div class="btn-mobile" data-key="ArrowDown">▼</div><div></div>
        </div>
        <div class="joystick-area" id="ctrl-joystick">
            <div class="joystick-knob" id="joystick-knob"></div>
        </div>
        <div class="center-buttons">
            <div class="btn-pill" data-key="Select" data-label="SELECT"></div>
            <div class="btn-pill" data-key="Enter" data-label="START"></div>
        </div>
        <div class="btn-action-group">
            <div class="btn-circle-b btn-mobile" data-key="KeyB" id="btn-b">B</div>
            <div class="btn-circle btn-mobile" data-key="Space">A</div>
        </div>
    `;
    document.body.appendChild(mobileUI);

    // Estado del joystick
    let joystickActive = false;
    let joystickInterval = null;
    let joystickBase = { x: 0, y: 0 };
    const joystickArea = document.getElementById('ctrl-joystick');
    const joystickKnob = document.getElementById('joystick-knob');
    const dpadArea = document.getElementById('ctrl-dpad');

    function setupJoystick() {
        if (!joystickArea) return;
        const updateJoystick = (touchX, touchY) => {
            const rect = joystickArea.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const maxDist = rect.width / 2 - 30;
            let dx = touchX - cx;
            let dy = touchY - cy;
            const dist = Math.hypot(dx, dy);
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }
            joystickKnob.style.left = (45 + dx) + 'px';
            joystickKnob.style.top = (45 + dy) + 'px';

            // Limpiar teclas anteriores
            keys['ArrowUp'] = false;
            keys['ArrowDown'] = false;
            keys['ArrowLeft'] = false;
            keys['ArrowRight'] = false;

            // Determinar dirección principal
            if (dist > 15) {
                const angle = Math.atan2(dy, dx);
                if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) keys['ArrowUp'] = true;
                else if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) keys['ArrowDown'] = true;
                if (angle > Math.PI * 0.75 || angle < -Math.PI * 0.75) keys['ArrowLeft'] = true;
                else if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25) keys['ArrowRight'] = true;
            }
        };
        joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            const touch = e.touches[0];
            updateJoystick(touch.clientX, touch.clientY);
        });
        joystickArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!joystickActive) return;
            const touch = e.touches[0];
            updateJoystick(touch.clientX, touch.clientY);
        });
        joystickArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            joystickActive = false;
            joystickKnob.style.left = '45px';
            joystickKnob.style.top = '45px';
            keys['ArrowUp'] = false;
            keys['ArrowDown'] = false;
            keys['ArrowLeft'] = false;
            keys['ArrowRight'] = false;
        });
    }

    // Función para mostrar/ocultar menú de control
    window.showControlMenu = function() {
        const currentMode = state.controlMode || 'dpad';
        const overlay = document.createElement('div');
        overlay.className = 'control-menu-overlay';
        overlay.id = 'control-menu-overlay';
        overlay.innerHTML = `
            <h2>🎮 CONFIGURACIÓN DE CONTROL</h2>
            <p style="font-size:9px; color:#aaa; margin-bottom:15px;">Selecciona tu modo de control preferido</p>
            <button class="ctrl-btn ${currentMode === 'dpad' ? 'active' : ''}" data-mode="dpad">⬆️⬇️⬅️➡️ CRUZETA</button>
            <button class="ctrl-btn ${currentMode === 'joystick' ? 'active' : ''}" data-mode="joystick">🕹️ JOYSTICK CLÁSICO</button>
            <button id="ctrl-menu-mainmenu" class="ctrl-close" style="background:#346856; margin-top:4px;">🏠 MENÚ PRINCIPAL</button>
            <button class="ctrl-close" id="ctrl-menu-close">✕ CERRAR</button>
        `;
        document.body.appendChild(overlay);

        overlay.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                state.controlMode = mode;
                localStorage.setItem('escapeRoomControlMode', mode);
                overlay.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                aplicarModoControl(mode);
            });
        });
        document.getElementById('ctrl-menu-mainmenu').onclick = () => {
            location.reload();
        };
        document.getElementById('ctrl-menu-close').onclick = () => {
            overlay.remove();
            if (state.paused) state.paused = false;
        };
    };

    function aplicarModoControl(mode) {
        if (mode === 'joystick') {
            dpadArea.style.display = 'none';
            joystickArea.style.display = 'block';
            joystickArea.classList.add('active');
            setupJoystick();
        } else {
            dpadArea.style.display = 'grid';
            joystickArea.style.display = 'none';
            joystickArea.classList.remove('active');
        }
    }

    // Cargar modo guardado
    const savedMode = localStorage.getItem('escapeRoomControlMode') || 'dpad';
    state.controlMode = savedMode;
    aplicarModoControl(savedMode);

    // Mapear toques a las variables de teclas que ya usa el motor (tanto .btn-mobile como .btn-pill)
    const allButtons = mobileUI.querySelectorAll('.btn-mobile, .btn-pill');
    allButtons.forEach(btn => {
        const key = btn.getAttribute('data-key');
        btn.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            if (key === 'Select') {
                if (state.inputModo) {
                    toggleMobileKeyboard(true);
                } else {
                    if (!state.running) return;
                    state.paused = true;
                    window.showControlMenu();
                }
                return;
            }
            if (key === 'Enter') {
                if (state.running && !state.inputModo) state.paused = !state.paused;
                return;
            }
            if (key === 'KeyB') {
                window.toggleLevelInstructions();
                return;
            }
            keys[key] = true; 
        });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    });
    
    // También soporte para mouse (desktop/testing)
    allButtons.forEach(btn => {
        const key = btn.getAttribute('data-key');
        if (key === 'Select' || key === 'Enter' || key === 'KeyB') return;
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
    });
}

function toggleMobileKeyboard(show) {
    const input = document.getElementById('hidden-mobile-input');
    if (input) {
        if (show) {
            if (document.activeElement !== input) {
                input.value = state.currentInput;
                input.focus();
            }
        }
        else input.blur();
    }
}
