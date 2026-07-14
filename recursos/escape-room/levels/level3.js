// ── Helpers de dibujo para la galería (Nivel 3) ──
function artDrawMotif(f) {
    const x = f.x, y = f.y, w = f.w, h = f.h;
    const m = f.motif || 0;
    if (m === 1) { // Barco a vela
        ctx.fillStyle = '#3cbcfc'; ctx.fillRect(x + 4, y + 27, w - 8, 11);
        ctx.fillStyle = '#f8b800'; ctx.beginPath(); ctx.arc(x + 13, y + 11, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b3e16'; ctx.fillRect(x + w / 2 - 1, y + 7, 2, 21);
        ctx.fillStyle = '#f4f0e0';
        ctx.beginPath(); ctx.moveTo(x + w / 2, y + 7); ctx.lineTo(x + w / 2, y + 25); ctx.lineTo(x + w / 2 + 13, y + 23); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8b4513';
        ctx.beginPath(); ctx.moveTo(x + 14, y + 27); ctx.lineTo(x + w - 14, y + 27); ctx.lineTo(x + w - 19, y + 34); ctx.lineTo(x + 19, y + 34); ctx.closePath(); ctx.fill();
    } else if (m === 2) { // Flor
        ctx.fillStyle = '#2f7d32'; ctx.fillRect(x + w / 2 - 1, y + 22, 3, 16);
        ctx.fillStyle = '#3fae3f';
        ctx.beginPath(); ctx.ellipse(x + w / 2 - 9, y + 30, 7, 3, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + w / 2 + 9, y + 30, 7, 3, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e84a8a';
        for (let a = 0; a < 6; a++) {
            const ang = Math.PI / 3 * a;
            ctx.beginPath(); ctx.arc(x + w / 2 + Math.cos(ang) * 9, y + 15 + Math.sin(ang) * 9, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#f8b800'; ctx.beginPath(); ctx.arc(x + w / 2, y + 15, 5, 0, Math.PI * 2); ctx.fill();
    } else if (m === 3) { // Hoja (Moss)
        ctx.fillStyle = '#3c8c3c'; ctx.fillRect(x + 25, y + 4, 4, 28);
        ctx.fillStyle = '#39d98a';
        ctx.beginPath(); ctx.ellipse(x + 27, y + 14, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (m === 4) { // Sol radiante
        ctx.fillStyle = '#f8b800'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f8b800'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const a = Math.PI / 4 * i;
            ctx.beginPath();
            ctx.moveTo(x + w / 2 + Math.cos(a) * 11, y + h / 2 + Math.sin(a) * 11);
            ctx.lineTo(x + w / 2 + Math.cos(a) * 15, y + h / 2 + Math.sin(a) * 15);
            ctx.stroke();
        }
    } else if (m === 5) { // Corazón
        ctx.fillStyle = '#a80020';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + 28);
        ctx.lineTo(x + 8, y + 14); ctx.lineTo(x + w / 2, y + 6); ctx.lineTo(x + w - 8, y + 14);
        ctx.closePath(); ctx.fill();
    } else { // 0: Paisaje (sol + montaña + agua)
        ctx.fillStyle = '#f8b800'; ctx.beginPath(); ctx.arc(x + w - 12, y + 10, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7c7c7c'; ctx.beginPath(); ctx.moveTo(x + 4, y + 30); ctx.lineTo(x + 20, y + 12); ctx.lineTo(x + 34, y + 30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3cbcfc'; ctx.fillRect(x + 4, y + 30, w - 8, 4);
    }
}

// Caballete / trípode de madera (en el suelo, no en la pared).
// Se dibuja la ESTRUCTURA primero y el CUADRO encima, para que el trípode
// no tape la pintura. El cuadro conserva su tamaño original (60x40).
function artDrawEasel(e, painting) {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    // 1) Estructura del trípode (detrás)
    ctx.strokeStyle = NES_PALETTE.woodDark; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 3, y + h); ctx.lineTo(x + w / 2 - 4, y + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - 3, y + h); ctx.lineTo(x + w / 2 + 4, y + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + h); ctx.lineTo(x + w / 2, y + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + h - 24); ctx.lineTo(x + w - 6, y + h - 24); ctx.stroke();
    ctx.lineCap = 'butt';

    // 2) Cuadro ENCIMA del trípode
    if (painting && painting.motif !== undefined && painting.motif !== null) {
        // Mismo estilo y tamaño que los cuadros de la pared (marco dorado + motivo)
        const pw = 60, ph = 40;
        const px = x + w / 2 - pw / 2, py = y + 6;
        ctx.fillStyle = NES_PALETTE.gold; ctx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
        ctx.fillStyle = '#efe6d0'; ctx.fillRect(px, py, pw, ph);
        artDrawMotif({ x: px, y: py, w: pw, h: ph, motif: painting.motif });
    } else {
        // Caballete vacío: lienzo pequeño inclinado con "?"
        const cw = 34, ch = 24, cx = x + w / 2, cy = y + 18;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.12);
        ctx.fillStyle = NES_PALETTE.wood; ctx.fillRect(-cw / 2 - 2, -ch / 2 - 2, cw + 4, ch + 4);
        ctx.fillStyle = '#efe6d0'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
        ctx.fillStyle = '#888'; ctx.font = "12px 'Press Start 2P'";
        ctx.fillText('?', -7, 5);
        ctx.restore();
    }
}

// Gas venenoso mejorado: tinte verdoso pulsante + bolsas de gas a la deriva + viñeta
function drawArtGas(alpha) {
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.004);
    ctx.fillStyle = `rgba(70, 190, 45, ${alpha * 0.42 * pulse})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const t = Date.now() * 0.00035;
    for (let i = 0; i < 7; i++) {
        const cx = (Math.sin(t * 1.3 + i * 2.1) * 0.5 + 0.5) * canvas.width;
        const cy = canvas.height - ((t * 55 + i * 150) % (canvas.height + 170)) + 90;
        const r = 55 + 35 * Math.sin(t * 2 + i);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(160, 255, 100, ${alpha * 0.28})`);
        g.addColorStop(1, 'rgba(160, 255, 100, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 130, canvas.width / 2, canvas.height / 2, 470);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(8, 40, 0, ${alpha * 0.6})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

levelLogics['art'] = {
    init: (levelData) => {
        // Soporte para múltiples escenarios aleatorios
        let scenario = levelData;
        if (levelData.scenarios && levelData.scenarios.length > 0) {
            scenario = levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)];
        }

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
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            // La puerta se dibuja SOLO desde el tile del mapa [10][24] (type 5).
            // No usamos un tileObject "exit" para evitar que se pinte dos veces.
            tileObjects: [],
            placedCorrectly: false,
            gasActive: false,
            gasAlpha: 0,
            gameOver: false,
            placedPainting: null,
            easel: { x: 560, y: 396, w: 46, h: 120, interactive: true }, // Caballete en el suelo (trípode estrecho)
            furniture: [
                { id: 'rug', type: 'decor', x: 150, y: 200, w: 500, h: 120, color: NES_PALETTE.rug, collidable: false },
                { id: 'plantTL', x: TILE_SIZE, y: MAP_OFFSET_Y + TILE_SIZE, w: 40, h: 40, color: '#00a800', collidable: true },
                { id: 'plantTR', x: 23 * TILE_SIZE, y: MAP_OFFSET_Y + TILE_SIZE, w: 40, h: 40, color: '#00a800', collidable: true },
                { id: 'easel', x: 560, y: 396, w: 46, h: 120, collidable: true }
            ]
        };

        // Spawn seguro dentro de la Galería
        player.x = 400; player.y = 250;

        const listaCuadros = scenario.paintings || scenario.cuadros || [];
        
        listaCuadros.forEach((p, i) => {
            const px = 150 + (i * 200), py = MAP_OFFSET_Y + 10;
            base.furniture.push({ 
                id: 'painting', 
                name: p.name || p.nombre, 
                description: p.descripcion || p.description,
                style: p.style || p.cat,
                motif: i % 6, // Imagen distinta para cada cuadro
                x: px, y: py, w: 60, h: 40, // Ajustar Y para que esté dentro del mapa
                home: { x: px, y: py }, // Lugar original en la pared (para devolverlo)
                interactable: true,
                collidable: false // Los cuadros en la pared no deben bloquear
            });
        });

        return base;
    },
    update: () => {
        if (currentLevelData.gasActive && !currentLevelData.gameOver) {
            currentLevelData.gasAlpha += 0.002; // Velocidad original
            if (currentLevelData.gasAlpha >= 0.8) {
                currentLevelData.gameOver = true;
                gameOver("¡El gas venenoso te ha alcanzado!");
            }
        }

        // Información automática por proximidad
        if (!currentLevelData.gameOver) {
            const nearPainting = currentLevelData.furniture.find(f => f.id === 'painting' && checkProximity(f));
            const nearEasel = checkProximity(currentLevelData.easel);

            if (nearPainting) {
                ui.innerHTML = `🖼️ <strong>${nearPainting.name}</strong>: ${nearPainting.description}`;
            } else if (nearEasel) {
                ui.innerHTML = state.inventory ? `📍 Coloca aquí el cuadro correcto (caballete): ${currentLevelData.targetStyle}` : "📍 El caballete está vacío. Busca el cuadro correcto.";
            }
        }
    },
    draw: () => {
        // Si la puerta está abierta, cambiamos el tile de la pared (5) por suelo (0)
        if (currentLevelData.placedCorrectly) {
            if (currentLevelData.map[10][24] === 5) currentLevelData.map[10][24] = 0;
            // Cubrimos el sprite de la puerta (dibujado por el tileObject "exit" en
            // main.js) pintando el piso y una abertura oscura = puerta abierta.
            const px = 24 * TILE_SIZE, py = 10 * TILE_SIZE + MAP_OFFSET_Y;
            if (TILES[0] && TILES[0].pattern) TILES[0].pattern(px, py);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(px + 3, py + 1, TILE_SIZE - 6, TILE_SIZE - 1);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(px, py, TILE_SIZE, 2);
        }

        currentLevelData.furniture.forEach(f => {
            if (f.id === 'rug') {
                // Alfombra con patrón NES
                ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.w, f.h);
                ctx.strokeStyle = NES_PALETTE.gold; ctx.lineWidth = 4;
                ctx.strokeRect(f.x + 10, f.y + 10, f.w - 20, f.h - 20);
                // Flecos
                ctx.fillStyle = NES_PALETTE.gold;
                for (let i = 0; i < f.w; i += 10) { ctx.fillRect(f.x + i, f.y - 2, 4, 4); ctx.fillRect(f.x + i, f.y + f.h - 2, 4, 4); }
            }
            if (f.id === 'plant' || f.id === 'plantTL' || f.id === 'plantTR') {
                const x = f.x, y = f.y;
                // Maceta de barro (trapezoide)
                ctx.fillStyle = '#a0522d';
                ctx.beginPath();
                ctx.moveTo(x + 8, y + 22); ctx.lineTo(x + 32, y + 22);
                ctx.lineTo(x + 28, y + 38); ctx.lineTo(x + 12, y + 38);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#7a3b1a'; ctx.fillRect(x + 8, y + 22, 24, 3);
                // Tallo
                ctx.fillStyle = '#2f7d32'; ctx.fillRect(x + 19, y + 12, 3, 11);
                // Hojas
                ctx.fillStyle = f.color;
                ctx.beginPath(); ctx.ellipse(x + 13, y + 14, 7, 4, -0.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + 27, y + 14, 7, 4, 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + 20, y + 7, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
            }
            if (f.id === 'painting') {
                // Marco dorado
                ctx.fillStyle = NES_PALETTE.gold; ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
                // Lienzo claro
                ctx.fillStyle = '#efe6d0'; ctx.fillRect(f.x, f.y, f.w, f.h);
                // Pequeña imagen según el estilo del cuadro
                artDrawMotif(f);
            }
        });

        const easel = currentLevelData.easel;
        // Caballete en el suelo (ya no hay marco en la pared -> solo 1 puerta)
        artDrawEasel(easel, currentLevelData.placedPainting);

        if (currentLevelData.gasAlpha > 0.01) {
            drawArtGas(currentLevelData.gasAlpha);
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

        // 2. Colocar / recoger el cuadro en el caballete (permanece visible, como el nivel 2)
        if (checkProximity(currentLevelData.easel)) {
            if (state.inventory) {
                if (currentLevelData.placedPainting) {
                    ui.innerHTML = "Retira primero el cuadro del caballete antes de colocar otro.";
                } else {
                    const p = state.inventory;
                    currentLevelData.placedPainting = { ...p };
                    state.inventory = null;
                    if (p.style === currentLevelData.targetStyle) {
                        currentLevelData.placedCorrectly = true;
                        currentLevelData.gasActive = false;
                        currentLevelData.gasAlpha = 0;
                        ui.innerHTML = "✅ ¡Excelente! " + p.name + " está en su sitio. ¡La puerta se ha abierto!";
                    } else {
                        ui.innerHTML = "❌ ¡ERROR! Este cuadro no pertenece aquí. El gas venenoso se ha activado.";
                        flashFailure();
                        currentLevelData.gasActive = true;
                    }
                }
                return;
            } else if (currentLevelData.placedPainting) {
                // Recoger el cuadro del caballete: el gas SIGUE activo. Solo se
                // detiene al devolver el cuadro a su lugar en la pared.
                state.inventory = { ...currentLevelData.placedPainting, fromEasel: true };
                currentLevelData.placedPainting = null;
                ui.innerHTML = "Has tomado " + state.inventory.name + ". Devuélvelo a su lugar o prueba otro.";
                return;
            }
        }

        // 3. Devolver el cuadro a la pared (su lugar original, tras sacarlo del caballete)
        if (state.inventory && state.inventory.fromEasel && state.inventory.home) {
            const h = state.inventory.home;
            if (checkProximity({ x: h.x, y: h.y, w: 60, h: 40 })) {
                // Al devolver el cuadro equivocado a la pared, el gas se DETIENE pero
                // NO se desvanece: queda como penalización congelada. Si vuelves a
                // equivocarte, el gas retoma desde donde quedó (sin 3er intento).
                currentLevelData.gasActive = false;
                currentLevelData.furniture.push({
                    id: 'painting',
                    name: state.inventory.name,
                    description: state.inventory.description,
                    style: state.inventory.style,
                    motif: state.inventory.motif,
                    x: h.x, y: h.y, w: 60, h: 40,
                    home: h,
                    interactable: true, collidable: false
                });
                ui.innerHTML = "Has devuelto " + state.inventory.name + " a su lugar.";
                state.inventory = null;
                return;
            }
        }

        // 3. Interacción con la puerta de salida (tile [10][24] del mapa)
        if (checkProximity({ x: 24 * TILE_SIZE, y: 10 * TILE_SIZE + MAP_OFFSET_Y, w: TILE_SIZE, h: TILE_SIZE })) {
            if (currentLevelData.placedCorrectly) {
                nextLevel();
            } else {
                ui.innerHTML = "🚪 La puerta lateral está bloqueada. Necesitas colocar el cuadro correcto primero.";
            }
        }
    }
};