(window.levelLogics = window.levelLogics || {})['tennis'] = {
    palette: {
        grass: "#346856", // Fondo de la cancha
        line: "#e0f8d0", // Líneas de la cancha
        diablo: "#d82800", // Color del Diablo
        ball: "#f8a800", // Color de la bomba/pelota
        black: "#000000",
        horn: "#f8e800", // Cuernos del Diablo
        paddle: "#5e3a25" // Color de las paletas de madera
    },

    init: function(levelData) {
        // Soporte para múltiples escenarios
        if (levelData.scenarios && levelData.scenarios.length > 0) {
            Object.assign(levelData, levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)]);
        }

        ui.innerHTML = "";
        this.originalSpeed = player.speed; // Guardar velocidad base del juego
        player.speed = 11; // Aumentar velocidad del personaje para el tenis
        this.gameState = "play"; // Empezar directo
        this.lives = 2;
        this.questions = levelData.questions || [];
        this.currentQuestionIndex = 0;
        console.log("Level 8 - Questions List:", this.questions); // Debugging
        this.won = false;
        this.gameOver = false; // Añadido para consistencia
        this.countdownActive = false;
        this.countdownValue = 3;
        this.countdownTimer = 0;

        // Generar mapa de ladrillos (tile 1) para los bordes
        this.map = [];
        for (let i = 0; i < 17; i++) {
            if (i === 0 || i === 16) {
                this.map.push(Array(25).fill(1));
            } else {
                let row = Array(25).fill(0);
                row[0] = 1; row[24] = 1;
                this.map.push(row);
            }
        }
        // Puerta de salida en la parte inferior derecha
        this.map[16][22] = 5; // Inicialmente un tile de puerta cerrada

        // El jugador es la paleta inferior
        player.x = 400 - player.w / 2; // Centrado horizontalmente
        player.y = 500; // Fijo en la parte inferior
        this.playerPaddle = { x: player.x, y: player.y + player.h / 2, w: 80, h: 15 }; // Paleta dibujada alrededor del jugador

        // El Diablo es la paleta superior
        this.diablo = { x: 400 - 40, y: 120, w: 80, h: 15, speed: 4.5 }; // Reducida para que no llegue a tiros esquinados
        this.diabloPaddle = { x: this.diablo.x, y: this.diablo.y + 10, w: 80, h: 15 }; // Paleta dibujada frente al Diablo
        
        // La Pelota/Bomba
        this.bomb = { x: 400, y: 300, vx: 0, vy: 0, r: 8 }; 
        
        this.particles = [];
        this.resetBomb();

        ui.innerHTML = levelData.title || "TENIS INFERNAL";
        ui.style.display = 'none'; // Ocultar UI inicialmente

        return { title: levelData.title, type: levelData.type, map: this.map, tileObjects: [], won: false };
    },

    showQuiz: function(q) {
        this.gameState = "quiz"; // DETENER FÍSICA
        ui.style.display = 'block'; // Mostrar la interfaz para ver la pregunta
        const container = document.createElement('div');
        container.id = this.questionContainerId;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontSize = '14px';
        container.style.color = "white";

        const questionText = document.createElement('div');
        questionText.innerText = q.question;
        questionText.style.marginBottom = '10px';
        questionText.style.fontWeight = '700';
        container.appendChild(questionText);

        q.options.forEach((opt, idx) => {
            const b = document.createElement('button');
            b.innerText = opt;
            b.style.width = '100%';
            b.style.maxWidth = '360px';
            b.style.padding = '10px 14px';
            b.style.border = '2px solid white';
            b.style.background = '#346856';
            b.style.color = 'white';
            b.style.fontFamily = '"Press Start 2P", monospace';
            b.style.cursor = 'pointer';
            b.onclick = () => {
                if (idx === q.correct) {
                    this.currentQuestionIndex++;
                    if (window.gameStats) window.gameStats.recordHit(state.levelIndex);
                    this.createExplosion(this.bomb.x, this.bomb.y);
                    ui.style.display = 'none'; // Ocultar UI después de responder
                    // Si todas las preguntas han sido respondidas, el juego termina
                    if (this.currentQuestionIndex >= this.questions.length) {
                        this.won = true;
                        currentLevelData.won = true; // Notificar al motor principal para liberar movimiento
                        player.speed = this.originalSpeed; // Restaurar velocidad inmediatamente
                        ui.innerHTML = "¡HAS DERROTADO AL DIABLO! LA SALIDA ESTÁ ABIERTA ABAJO.";
                        ui.style.display = 'block';
                        this.map[16][22] = 0; // Abrir la puerta
                    }
                    this.resetBomb();
                } else {
                    this.lives--;
                    if (this.lives <= 0) {
                        this.gameState = "play"; // Salir del estado de quiz
                        player.speed = this.originalSpeed; // Restaurar antes del Game Over
                        gameOver("EL DIABLO HA RECLAMADO TU ALMA");
                        return;
                    }
                    if (window.gameStats) window.gameStats.recordQuestion(state.levelIndex, q.question, false); // Record incorrect answer
                    ui.innerHTML = `¡INCORRECTO! Vidas restantes: ${this.lives}.`;
                    ui.style.display = 'block';
                    this.resetBomb();
                }
            };
            container.appendChild(b);
        });

        ui.innerHTML = "";
        ui.appendChild(container);
    },

    createExplosion: function(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: i % 2 === 0 ? "#d82800" : "#f8a800"
            });
        }
    },

    resetBomb: function() {
        this.bomb.x = 400;
        this.bomb.y = 300;
        this.bomb.vx = 0;
        this.bomb.vy = 0;
        this.countdownValue = 3;
        this.countdownTimer = 60;
        this.countdownActive = true;
        this.gameState = "play";
    },

    update: function(dt) {
        if (this.gameState !== "play" || this.won || this.gameOver) return;

        if (this.countdownActive) {
            this.countdownTimer -= dt;
            if (this.countdownTimer <= 0) {
                this.countdownValue--;
                this.countdownTimer = 60;
                if (this.countdownValue <= 0) {
                    this.countdownActive = false;
                    const initialSpeed = 4;
                    this.bomb.vx = initialSpeed * (Math.random() > 0.5 ? 1 : -1);
                    this.bomb.vy = initialSpeed * (Math.random() > 0.5 ? 1 : -1);
                }
            }
            // Permitir movimiento del jugador durante cuenta regresiva
            player.x = Math.max(32, Math.min(canvas.width - player.w - 32, player.x));
            this.playerPaddle.x = player.x - (this.playerPaddle.w - player.w) / 2;
            return;
        }

        // Movimiento del jugador (manejado por main.js, pero se restringe 'x')
        player.x = Math.max(32, Math.min(canvas.width - player.w - 32, player.x));
        player.y = 500; // Mantener al jugador fijo en la parte inferior
        player.direction = "up"; // Sostiene la barra caminando hacia arriba
        
        // Actualizar posición de la paleta del jugador
        this.playerPaddle.x = player.x - (this.playerPaddle.w - player.w) / 2;
        this.playerPaddle.y = player.y - 5; // Un poco arriba de los pies para que parezca que la carga

        // Movimiento de la bomba
        this.bomb.x += this.bomb.vx * dt;
        this.bomb.y += this.bomb.vy * dt;

        // Rebote paredes izquierda y derecha (Refinado)
        if (this.bomb.x - this.bomb.r < 32) {
            this.bomb.vx = Math.abs(this.bomb.vx); // Asegurar rebote a la derecha
            this.bomb.x = 32 + this.bomb.r; // Reposicionar fuera del muro
        } else if (this.bomb.x + this.bomb.r > canvas.width - 32) {
            this.bomb.vx = -Math.abs(this.bomb.vx); // Asegurar rebote a la izquierda
            this.bomb.x = canvas.width - 32 - this.bomb.r;
        }

        // IA del Diablo (horizontal) - con algo de imperfección
        let targetX = this.bomb.x - this.diablo.w / 2 + (Math.random() - 0.5) * 90; // Mayor margen de error en la IA
        if (this.diablo.x < targetX) this.diablo.x += this.diablo.speed * dt;
        if (this.diablo.x > targetX) this.diablo.x -= this.diablo.speed * dt;
        
        // Restringir al Diablo a los bordes de la pantalla
        this.diablo.x = Math.max(32, Math.min(canvas.width - this.diablo.w - 32, this.diablo.x));

        // Actualizar posición de la paleta del Diablo
        this.diabloPaddle.x = this.diablo.x;
        this.diabloPaddle.y = this.diablo.y + 35; // Frente al Diablo

        // Colisión con Jugador (Paleta inferior)
        if (this.bomb.vy > 0 && // Bomba moviéndose hacia abajo
            this.bomb.y + this.bomb.r > this.playerPaddle.y &&
            this.bomb.x > this.playerPaddle.x && this.bomb.x < this.playerPaddle.x + this.playerPaddle.w) {
            
            // Lógica de Empuje / Amortiguación
            let speedMultiplier = 1.05; // Base
            if (keys['ArrowUp']) {
                speedMultiplier = 1.4; // EMPUJE: acelera la pelota
            } else if (keys['ArrowDown']) {
                speedMultiplier = 0.75; // AMORTIGUA: frena la pelota
            }

            // Calcular el punto de impacto relativo (-1 a 1)
            let hit = (this.bomb.x - (this.playerPaddle.x + this.playerPaddle.w / 2)) / (this.playerPaddle.w / 2);
            this.bomb.vx = hit * 8.5; // Aumentado para permitir ataques diagonales más agresivos
            this.bomb.vy = -Math.abs(this.bomb.vy) * speedMultiplier; 
            
            // Limitar velocidad máxima
            const maxSpeed = window.isMobile ? 8 : 15;
            if (Math.abs(this.bomb.vy) > maxSpeed) this.bomb.vy = -maxSpeed;

            this.bomb.y = this.playerPaddle.y - this.bomb.r;
        }

        // Colisión con Diablo (Paleta superior)
        if (this.bomb.vy < 0 && // Bomba moviéndose hacia arriba
            this.bomb.y - this.bomb.r < this.diabloPaddle.y + this.diabloPaddle.h &&
            this.bomb.x > this.diabloPaddle.x && this.bomb.x < this.diabloPaddle.x + this.diabloPaddle.w) {
            
            // El Diablo también devuelve con ángulo basado en dónde le pegue
            let hit = (this.bomb.x - (this.diabloPaddle.x + this.diabloPaddle.w / 2)) / (this.diabloPaddle.w / 2) + (Math.random() - 0.5) * 0.3; // Pequeña imperfección
            this.bomb.vx = hit * 7;
            this.bomb.vy = Math.abs(this.bomb.vy) * 1.05;
            this.bomb.y = this.diabloPaddle.y + this.diabloPaddle.h + this.bomb.r;
        }

        // Punto perdido (Si la bomba sale por abajo)
        if (this.bomb.y > canvas.height - 32) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver = true;
                gameOver("EL DIABLO HA RECLAMADO TU ALMA");
            } else {
                this.resetBomb();
            }
        }

        // Punto ganado (Si la bomba sale por arriba)
        if (this.bomb.y < 32) {
            this.showQuiz(this.questions[this.currentQuestionIndex]); // Mostrar pregunta
        }

        // Partículas
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.life -= dt;
            return p.life > 0;
        });
    },

    draw: function() {
        // Dibujar Césped
        ctx.fillStyle = this.palette.grass;
        ctx.fillRect(32, 32 + MAP_OFFSET_Y, canvas.width - 64, canvas.height - 64 - MAP_OFFSET_Y);

        // Líneas de cancha (verticales)
        ctx.strokeStyle = this.palette.line;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, 32 + MAP_OFFSET_Y); ctx.lineTo(canvas.width / 2, canvas.height - 32); ctx.stroke();
        ctx.setLineDash([]);

        if (!this.won) {
            // Dibujar Diablo (personaje)
            this.drawDiabloCharacter(this.diablo.x + this.diablo.w / 2, this.diablo.y);
            // Dibujar Paleta del Diablo
            ctx.fillStyle = this.palette.paddle;
            ctx.fillRect(this.diabloPaddle.x, this.diabloPaddle.y, this.diabloPaddle.w, this.diabloPaddle.h);

            // Dibujar Paleta del Jugador (el personaje se dibuja por main.js)
            ctx.fillStyle = this.palette.paddle;
            ctx.fillRect(this.playerPaddle.x, this.playerPaddle.y, this.playerPaddle.w, this.playerPaddle.h);

            // Dibujar Pelota/Bomba
            ctx.fillStyle = this.palette.black;
            ctx.beginPath(); ctx.arc(this.bomb.x, this.bomb.y, this.bomb.r, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = this.palette.ball;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.bomb.x, this.bomb.y, this.bomb.r + 2, 0, Math.PI*2);
            ctx.stroke();

            // Partículas
            this.particles.forEach(p => {
                ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3);
            });

            if (this.countdownActive) {
                ctx.fillStyle = "white";
                ctx.font = '48px "Press Start 2P"';
                ctx.textAlign = "center";
                ctx.fillText(this.countdownValue, canvas.width / 2, canvas.height / 2);
                ctx.textAlign = "start";
            }
        }

        // Marcador
        ctx.fillStyle = "white";
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(`VIDAS: ${this.lives}`, 50, 40);
        ctx.fillText(`PUNTOS: ${this.currentQuestionIndex}`, 600, 40);
    },

    drawDiabloCharacter: function(x, y) {
        const d = this.diablo;
        ctx.save();
        ctx.translate(x, y);

        // Animación de respiración/paso
        let step = (Math.floor(Date.now() / 200) % 2 === 0) ? -2 : 0;
        ctx.translate(0, step);

        // Cuerpo
        ctx.fillStyle = this.palette.diablo;
        ctx.fillRect(-15, 0, 30, 35); // Tronco
        
        // Cabeza
        ctx.fillRect(-12, -15, 24, 20);
        
        // Cuernos (Estilo tennis.html)
        ctx.fillStyle = this.palette.black;
        ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-15, -30); ctx.lineTo(-5, -20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, -20); ctx.lineTo(15, -30); ctx.lineTo(5, -20); ctx.fill();
        
        // Ojos negros
        ctx.fillStyle = this.palette.black;
        ctx.fillRect(-7, -8, 4, 6); ctx.fillRect(3, -8, 4, 6);

        // Pies
        ctx.fillStyle = this.palette.black;
        ctx.fillRect(-12, 35, 8, 5); ctx.fillRect(4, 35, 8, 5);

        // Brazos sosteniendo la barra
        ctx.fillStyle = this.palette.diablo;
        ctx.fillRect(-20, 10, 6, 15); ctx.fillRect(14, 10, 6, 15);
        
        ctx.restore();
    },

    interact: function() {
        // Salir si se ganó y el jugador está en la puerta
        if (this.won && player.y > 500 && player.x > 650) {
            player.speed = this.originalSpeed; // Restaurar velocidad al salir del nivel
            nextLevel();
        }
    }
};
