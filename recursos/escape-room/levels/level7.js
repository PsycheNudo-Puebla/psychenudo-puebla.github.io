levelLogics['dragon'] = {
    palette: {
        black: "#081820",
        red_dragon: "#A03020",
        red_wings: "#401008",
        red_mid: "#88c070",
        red_light: "#D08060",
        yellow_base: "#f8e800",
        red_fire: "#d82800",
        orange: "#f8a800",
        amber: "#E8A030",
        crimson: "#701818"
    },
    questions: [],
    currentQuestionIndex: 0,
    damage: 0, // Contador de fallos en el cañón
    gameOver: false,
    won: false,
    dragon: { x: 650, y: 300, dir: 1, speed: 6, fireTimer: 0, animFrame: 0, health: 3 },
    cannon: { x: 150, y: 300, w: 100, h: 80, loaded: false, bulletType: null, cooldown: 0 },
    cannonImg: null,
    cannonFurniture: null,
    bullets: [], // Balas en el suelo representadas por opciones
    activeBullet: { active: false, x: 0, y: 0 }, // La bala que viaja hacia el dragón
    dragonImages: [],
    // Ajustado para que el fuego salga pegado a la boca (más cerca del centro visual)
    fireOffset: { x: -140, y: -20 }, 
    dragonFire: { active: false, x: 0, y: 0, vx: 0, vy: 0, speed: 14 },
    fireAccuracy: 0, // Sin dispersión para apuntar directamente al jugador
    showText: '',
    textTimer: 0,
    map: [],

    init: function(levelData) {
        this.originalPlayerSpeed = player.speed; // Guardar velocidad original del jugador

        // Inicializar objeto de colisión para el cañón
        this.cannonFurniture = { 
            id: 'cannon_phys', 
            x: 100, y: 260, w: 100, h: 80, 
            collidable: true 
        };
        levelData.furniture = [this.cannonFurniture];
        
        // Cargar las 4 imágenes del dragón
        this.dragonImages = [];
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            img.src = `assets/dragonv${i}.png`;
            this.dragonImages.push(img);
        }

        this.cannonImg = new Image();
        this.cannonImg.src = 'assets/cañon.png';

        ui.innerHTML = ""; // ELIMINAR TEXTO OVERLAY HTML (Nombre del nivel)
        this.questions = levelData.questions || [];
        
        // Generar mapa completo de 17 filas para cubrir la pantalla (800x600) con ladrillos (tile 1)
        this.map = [];
        for (let i = 0; i < 17; i++) {
            if (i === 0 || i === 16) {
                this.map.push(Array(25).fill(1)); // Muros superior e inferior
            } else {
                let row = Array(25).fill(0);
                row[0] = 1;  // Muro izquierdo
                row[24] = 1; // Muro derecho
                this.map.push(row);
            }
        }

        this.currentQuestionIndex = 0;
        this.damage = 0;
        this.gameOver = false;
        this.won = false;
        this.dragon = { x: 650, y: 300, dir: 1, speed: window.isMobile ? 2 : 6, fireTimer: 0, animFrame: 0, health: this.questions.length || 3, state: 'normal', dashTimer: 0 };
        this.cannon = { x: 150, y: 300, w: 100, h: 80, loaded: false, bulletType: null, cooldown: 0 };
        this.bullets = [];
        this.activeBullet = { active: false, x: 0, y: 0 };
        this.dragonFire = { active: false, x: 0, y: 0, vx: 0, vy: 0, speed: window.isMobile ? 9 : 10 };
        this.bulletSpeed = window.isMobile ? 12 : 35;
        this.dashSpeed = window.isMobile ? 5 : 15;
        this.returnSpeed = window.isMobile ? 2 : 7;
        this.showText = '';
        this.textTimer = 0;
        this.explosion = { active: false, x: 0, y: 0, timer: 0 };

        player.speed = 8; // Aumentar velocidad del jugador para este nivel
        player.x = 100;
        player.y = 300;
        player.heldItem = null;

        // Sincronizar colisión inicial
        this.cannonFurniture.x = this.cannon.x - 50;
        this.cannonFurniture.y = this.cannon.y - 40;

        this.generateBullets();
        if (this.questions.length > 0) {
            ui.innerHTML = this.questions[0].question;
            ui.style.display = 'block';
        }
        return { 
            title: levelData.title, 
            type: levelData.type,
            map: this.map,
            tileObjects: [],
            won: false
        };
    },

    generateBullets: function() {
        const q = this.questions[this.currentQuestionIndex];
        if (!q) return;
        this.bullets = q.options.map((option, i) => ({
            x: 150 + (i * 150),
            y: 120, // Justo debajo del muro superior
            option,
            isCorrect: i === q.correct,
            collected: false
        }));
    },

    update: function() {
        if (this.gameOver || this.won) return;

        // Actualizar caja de colisión del cañón (sólo colisiona si no está cargado)
        this.cannonFurniture.x = this.cannon.x - 50;
        this.cannonFurniture.y = this.cannon.y - 40;
        this.cannonFurniture.collidable = !this.cannon.loaded;

        // Lógica de sujeción del cañón
        if (this.cannon.loaded) {
            player.x = this.cannon.x - 85; // Alineación fija a la izquierda del cañón
            
            // Restringir área de apuntado del jugador
            if (player.y < 50) player.y = 50;
            if (player.y > 450) player.y = 450;
            // El cañón sigue al jugador. Ajustado a +45 para que el jugador se vea más arriba
            this.cannon.y = player.y + 45; 
        } else {
            // Restricción de movimiento normal
            if (player.y > 480 && !this.won) player.y = 480;
            if (player.y < 80 && !this.won) player.y = 80;
        }

        // Movimiento del Dragón
        if (this.dragon.state === 'normal') {
            this.dragon.y += this.dragon.speed * this.dragon.dir;
            // Ajustamos límites de rebote para un dragón de 600px
            if (this.dragon.y > 380 || this.dragon.y < 220) this.dragon.dir *= -1;
            
            // Incrementar temporizador para el ataque de embestida
            this.dragon.dashTimer++;

            // Efecto de temblor antes de atacar (aviso visual)
            if (this.dragon.dashTimer > 350) {
                this.dragon.x = 650 + (Math.random() - 0.5) * 10;
            }

            if (this.dragon.dashTimer >= 400) { // Aproximadamente cada 6.6 segundos
                this.dragon.state = 'dashing';
                this.dragon.dashTimer = 0;
            }
        } else if (this.dragon.state === 'dashing') {
            // Embestida hacia la izquierda
            this.dragon.x -= this.dashSpeed; 
            if (this.dragon.x < 100) this.dragon.state = 'returning';
        } else if (this.dragon.state === 'returning') {
            // Regreso a la posición original
            this.dragon.x += this.returnSpeed;
            if (this.dragon.x >= 650) {
                this.dragon.x = 650;
                this.dragon.state = 'normal';
            }
        }

        // Colisión del jugador con el cuerpo del Dragón
        // Reducimos el radio a 75 y desplazamos el centro 50px a la izquierda para que sea el "pecho"
        const dragonHitX = this.dragon.x - 50; 
        const distToDragon = Math.hypot((player.x + player.w / 2) - dragonHitX, (player.y + player.h / 2) - this.dragon.y);
        
        if (distToDragon < 60) {
            this.gameOver = true;
            player.speed = this.originalPlayerSpeed;
            gameOver("¡Has sido aplastado por el gran dragón!");
        }

        // Animación de disparo del Dragón (Más rápido aún)
        this.dragon.fireTimer++;
        
        // Ciclo de animación normal (0, 1, 2, 3)
        this.dragon.animFrame = Math.floor(Date.now() / 150) % 4;

        // Cuando el timer llega a la fase de ataque, forzamos dragonv3.png (index 2)
        if (this.dragon.fireTimer > 85) this.dragon.animFrame = 2; 

        if (this.dragon.fireTimer > 120) {
            this.dragonFire.active = true;
            this.dragonFire.x = this.dragon.x + this.fireOffset.x;
            this.dragonFire.y = this.dragon.y + this.fireOffset.y;
            
            // LÓGICA DE APUNTADO: Calcular ángulo hacia el jugador con ligera dispersión
            const targetX = player.x + player.w / 2;
            const targetY = player.y + player.h / 2;
            const spread = (Math.random() - 0.5) * this.fireAccuracy;
            const angle = Math.atan2(targetY - this.dragonFire.y, targetX - this.dragonFire.x) + spread;
            
            this.dragonFire.vx = Math.cos(angle) * this.dragonFire.speed;
            this.dragonFire.vy = Math.sin(angle) * this.dragonFire.speed;
            
            this.dragon.fireTimer = 0;
        }

        // Movimiento de las llamas y colisión con jugador
        if (this.dragonFire.active) {
            this.dragonFire.x += this.dragonFire.vx;
            this.dragonFire.y += this.dragonFire.vy;
            
            // Desactivar si sale de los límites (ampliado para abarcar toda la pantalla)
            if (this.dragonFire.x < -200 || this.dragonFire.x > 1000 || this.dragonFire.y < -200 || this.dragonFire.y > 800) {
                this.dragonFire.active = false;
            }
            
            // Colisión contra el personaje principal (con margen más amplio)
            const hitRadius = 30; // Aumentado de 28 para una detección más segura
            if (Math.hypot((player.x + player.w / 2) - this.dragonFire.x, (player.y + player.h / 2) - this.dragonFire.y) < hitRadius) {
                this.gameOver = true;
                this.dragonFire.active = false;
                player.speed = this.originalPlayerSpeed; // Restaurar velocidad antes de Game Over
                gameOver("¡Has sido incinerado por el gran dragón!");
            }
        }

        // Movimiento de la bala y colisión con el dragón
        if (this.activeBullet.active) {
            this.activeBullet.x += this.bulletSpeed; // Bala más veloz
            if (this.activeBullet.x > 850) {
                this.activeBullet.active = false; // Desactivar la bala
                // REPARACIÓN: Si la bala sale de la pantalla, la bala correcta vuelve a aparecer en el suelo
                const correctB = this.bullets.find(b => b.isCorrect);
                if (correctB) correctB.collected = false;
                this.showText = "¡HAS FALLADO! Recuperando munición...";
                this.textTimer = 60;
            }

            // Colisión contra el dragón: Solo si la bala cruza la zona X del dragón y está cerca en Y
            if (this.activeBullet.x >= this.dragon.x - 50 && this.activeBullet.x <= this.dragon.x + 50 && Math.abs(this.activeBullet.y - this.dragon.y) < 80) {
                this.activeBullet.active = false;
                this.dragon.health--;
                const q = this.questions[this.currentQuestionIndex];
                if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, q.question, true);
                this.explosion.active = true;
                this.explosion.x = this.dragon.x;
                this.explosion.y = this.dragon.y;
                this.explosion.timer = 20;
                if (this.dragon.health <= 0) {
                    this.won = true;
                    currentLevelData.won = true; // Sincronizar con el motor principal
                    this.showText = "¡EL DRAGÓN HA CAÍDO! LA SALIDA SE HA ABIERTO ATRÁS.";
                    this.dragonFire.active = false; // Desaparecer el fuego inmediatamente
                    player.speed = this.originalPlayerSpeed; // Restaurar velocidad al ganar
                    this.dragon.x = -999; // Mover el dragón fuera de la pantalla para que no se dibuje
                    // Abrir la puerta en el muro superior (derecha, detrás del dragón)
                    this.map[0][22] = 0; 
                } else {
                    this.currentQuestionIndex++;
                    this.generateBullets();
                    if (this.questions[this.currentQuestionIndex]) {
                        ui.innerHTML = this.questions[this.currentQuestionIndex].question;
                    }
                }
            }
        }

        // Vincular bala recogida al jugador
        if (player.heldItem) {
            player.heldItem.x = player.x + 12;
            player.heldItem.y = player.y + 10;
        }

        if (this.textTimer > 0) this.textTimer--;
        if (this.explosion.active) {
            this.explosion.timer--;
            if (this.explosion.timer <= 0) this.explosion.active = false;
        }
    },

    interact: function() {
        // Salida del nivel si el dragón ha sido derrotado y el jugador llega a la puerta
        // La velocidad del jugador ya se restauró al ganar.
        if (this.won && player.y < 100 && player.x > 650) {
            nextLevel();
            return;
        }

        // Corregimos la detección de proximidad: el cañón se dibuja centrado en su X,Y
        const atCannon = checkProximity({ 
            x: this.cannon.x - 50, 
            y: this.cannon.y - 40, 
            w: 100, 
            h: 80 
        });

        // 1. Disparar (si el cañón está cargado)
        if (this.cannon.loaded && atCannon) {
            this.activeBullet.active = true;
            this.activeBullet.x = this.cannon.x + 50;
            this.activeBullet.y = this.cannon.y; // Disparo recto desde la altura del cañón
            this.cannon.loaded = false;
            this.showText = "¡FUEGO!";
            this.textTimer = 60;
            return;
        }

        // 2. Cargar cañón (si lleva bala y está cerca)
        if (player.heldItem && atCannon) {
            if (player.heldItem.isCorrect) {
                this.cannon.loaded = true;
                this.cannon.bulletType = player.heldItem;
                player.heldItem = null;
                this.showText = "¡CAÑÓN CARGADO!";
            } else {
                const q = this.questions[this.currentQuestionIndex];
                if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, q.question, false);
                this.damage++;
                if (this.damage >= 2) {
                    this.gameOver = true;
                    player.speed = this.originalPlayerSpeed; // Restaurar velocidad antes de Game Over
                    gameOver("¡El cañón explotó por usar la munición incorrecta!");
                } else {
                    this.showText = "¡ERROR! Daño al cañón. Un fallo más y explotará.";
                }
                player.heldItem.collected = false; // La bala vuelve a su sitio
                player.heldItem = null;
            }
            this.textTimer = 90;
            return;
        }

        // 3. Recoger bala (si no lleva nada)
        if (!player.heldItem) {
            const bullet = this.bullets.find(b => !b.active && checkProximity(b));
            if (bullet) {
                // Si ya había una recogida pero no activa, la "soltamos" para coger la nueva
                this.bullets.forEach(b => b.collected = false);
                
                bullet.collected = true;
                player.heldItem = bullet;
                this.showText = `BALA RECOGIDA: ${bullet.option}`;
                this.textTimer = 120;
                return;
            }
        }
    },

    draw: function() {
        // Forzar dirección del jugador a la derecha si está operando el cañón
        if (this.cannon.loaded) {
            player.direction = "right";
        }

        this.drawCannon();
        
        // Dibujar balas (evitar que el jugador pase "por debajo" visualmente)
        this.bullets.forEach(b => {
            if (!b.collected || player.heldItem === b) {
                // Borde gris (Sombra/Contorno)
                ctx.fillStyle = "#7c7c7c";
                ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, Math.PI*2); ctx.fill();
                
                // Esfera negra
                ctx.fillStyle = "#000000";
                ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill();
                
                // Punto blanco (Brillo/Reflejo)
                ctx.fillStyle = "#ffffff";
                ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI*2); ctx.fill();

                ctx.fillStyle = this.palette.black;
                ctx.font = "bold 14px monospace";
                ctx.fillText(b.option.substring(0, 15), b.x - 30, b.y + 30);
            }
        });

        // Dibujar bala en el aire
        if (this.activeBullet.active) {
            // Borde gris
            ctx.fillStyle = "#7c7c7c";
            ctx.beginPath(); ctx.arc(this.activeBullet.x, this.activeBullet.y, 17, 0, Math.PI*2); ctx.fill();
            
            // Esfera negra
            ctx.fillStyle = "#000000";
            ctx.beginPath(); ctx.arc(this.activeBullet.x, this.activeBullet.y, 14, 0, Math.PI*2); ctx.fill();
            
            // Punto blanco
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(this.activeBullet.x - 5, this.activeBullet.y - 5, 4, 0, Math.PI*2); ctx.fill();
        }

        // Dibujar fuego del dragón
        if (this.dragonFire.active) {
            const pulse = Math.sin(Date.now() * 0.02) * 5;
            
            // Capa Exterior (Capa de brillo roja)
            ctx.fillStyle = this.palette.red_fire;
            ctx.beginPath(); ctx.arc(this.dragonFire.x, this.dragonFire.y, 28 + pulse, 0, Math.PI*2); ctx.fill();
            
            // Capa Media (Naranja vibrante)
            ctx.fillStyle = this.palette.orange;
            ctx.beginPath(); ctx.arc(this.dragonFire.x, this.dragonFire.y, 18 + pulse/2, 0, Math.PI*2); ctx.fill();
            
            // Núcleo (Amarillo brillante)
            ctx.fillStyle = this.palette.yellow_base;
            ctx.beginPath(); ctx.arc(this.dragonFire.x, this.dragonFire.y, 8, 0, Math.PI*2); ctx.fill();
            
            // Estela pequeña
            ctx.fillStyle = "rgba(255, 100, 0, 0.4)";
            ctx.beginPath(); ctx.arc(this.dragonFire.x + (this.dragonFire.vx * -1.5), this.dragonFire.y + (this.dragonFire.vy * -1.5), 15, 0, Math.PI*2); ctx.fill();
        }

        if (!this.won) this.drawDragon(); // Solo dibujar el dragón si no se ha ganado
        this.drawExplosion();
        this.drawQuestionPanel();

        // Dibujar visualmente el hueco de la puerta de salida si se ganó
        if (this.won) {
            const dx = 22 * 32;
            const dy = 0 * 32 + MAP_OFFSET_Y;
            ctx.fillStyle = this.palette.black;
            ctx.fillRect(dx, dy, 32, 32);
            ctx.fillStyle = "white"; ctx.font = "8px monospace"; ctx.fillText("EXIT", dx + 2, dy + 20);
        }
    },

    drawCannon: function() {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(this.cannon.x, this.cannon.y);
        
        if (this.cannonImg && this.cannonImg.complete) {
            // Dibujamos el cañón centrado (100x80 píxeles)
            ctx.drawImage(this.cannonImg, -50, -40, 100, 80);
        } else {
            ctx.scale(2, 2);
            ctx.fillStyle = this.palette.red_dragon; ctx.fillRect(-8, 5, 16, 6);
            ctx.fillStyle = this.cannon.loaded ? this.palette.red_fire : this.palette.black;
            ctx.fillRect(-6, -6, 22, 12);
            ctx.fillStyle = this.palette.black; ctx.fillRect(14, -8, 4, 16);
        }
        ctx.restore();
    },

    drawQuestionPanel: function() {
        if (this.gameOver || this.won) return; // Evitar sobrescribir la UI si el nivel terminó
        const q = this.questions[this.currentQuestionIndex];
        if (q) {
            let text = q.question;
            const nearBullet = this.bullets.find(b => !b.collected && checkProximity(b));
            if (nearBullet) {
                text += "<br>Opción: " + nearBullet.option;
            } else if (this.textTimer > 0) {
                text += "<br>" + this.showText;
            }
            ui.innerHTML = text;
        }
    },

    drawDragon: function() {
        const d = this.dragon;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(d.x, d.y);

        // Efecto sutil de flotación
        ctx.translate(0, Math.sin(Date.now() / 300) * 3);

        const img = this.dragonImages[this.dragon.animFrame];
        if (img && img.complete) {
            // Dibujamos al dragón imponente (600x600)
            ctx.drawImage(img, -300, -300, 600, 600);
        }
        // Si la imagen no está lista, simplemente no dibujamos nada (sin cuadro rojo de fallback)
        ctx.restore();
    },

    drawExplosion: function() {
        if (!this.explosion.active) return;
        const radius = (20 - this.explosion.timer) * 2;
        ctx.fillStyle = this.palette.red_fire;
        ctx.beginPath();
        ctx.arc(this.explosion.x, this.explosion.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.palette.orange;
        ctx.beginPath();
        ctx.arc(this.explosion.x, this.explosion.y, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
};
