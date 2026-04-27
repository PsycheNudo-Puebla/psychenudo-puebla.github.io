/** SISTEMA DE REPORTE Y DESCARGA EN PDF **/

window.reportSystem = {
    /**
     * Genera un reporte en PDF con las estadísticas del juego
     * @param {string} playerName - Nombre del jugador
     * @param {boolean} completed - true si completó el juego, false si se rindió
     */
    generateReport: function(playerName, completed) {
        const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF; // Compatibilidad con diferentes versiones de la librería jsPDF
        if (!jsPDFConstructor) {
            alert('Error: Librería PDF no cargada. Por favor recarga la página.');
            console.error('jsPDF no encontrado. Asegúrate de tener el script en tu HTML.');
            return;
        }

        const doc = new jsPDFConstructor();
        
        // Colores
        const primaryColor = [30, 50, 100]; // Azul oscuro
        const accentColor = [200, 20, 30];  // Rojo
        const textColor = [50, 50, 50];     // Gris oscuro
        
        let yPos = 20;
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Encabezado
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('ESCAPE ROOM - REPORTE DE DESEMPEÑO', pageWidth / 2, 18, { align: 'center' });
        
        yPos = 40;
        doc.setTextColor(...textColor);
        
        // Información del Jugador
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('INFORMACIÓN DEL JUGADOR', margin, yPos);
        yPos += 8;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.text(`Nombre: ${playerName}`, margin, yPos);
        yPos += 7;
        
        const fecha = new Date();
        const fechaFormato = fecha.toLocaleDateString('es-ES') + ' ' + fecha.toLocaleTimeString('es-ES');
        doc.text(`Fecha: ${fechaFormato}`, margin, yPos);
        yPos += 7;
        
        const estado = completed ? 'COMPLETADO' : 'ABANDONADO';
        doc.setTextColor(...accentColor);
        doc.setFont(undefined, 'bold');
        doc.text(`Estado: ${estado}`, margin, yPos);
        yPos += 12;
        
        // Resumen General
        doc.setTextColor(...textColor);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('RESUMEN GENERAL', margin, yPos);
        yPos += 8;
        
        const stats = window.gameStats;
        const totalTime = Object.values(stats.levelStats).reduce((sum, s) => sum + s.time, 0);
        const totalErrors = stats.totalAttempts - stats.totalHits; // Total de respuestas incorrectas o intentos fallidos
        const accuracy = stats.totalAttempts > 0 ? ((stats.totalHits / stats.totalAttempts) * 100).toFixed(1) : 0;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        const summaryData = [
            { label: 'Tiempo Total Jugado', value: `${totalTime.toFixed(1)}s` },
            { label: 'Aciertos', value: `${stats.totalHits}` },
            { label: 'Errores', value: `${totalErrors}` },
            { label: 'Precisión', value: `${accuracy}%` }
        ];
        
        const colWidth = (pageWidth - 2 * margin) / 2;
        
        summaryData.forEach((item, idx) => {
            const x = margin + (idx % 2) * colWidth;
            const y = yPos + Math.floor(idx / 2) * 12;
            
            doc.setFont(undefined, 'bold');
            doc.text(item.label + ':', x, y);
            doc.setFont(undefined, 'normal');
            doc.text(item.value, x + colWidth - 20, y);
        });
        
        yPos += 40;
        
        // Detalle por Nivel
        if (Object.keys(stats.levelStats).length > 0) {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.text('DETALLE POR NIVEL', margin, yPos);
            yPos += 8;
            
            // Encabezado de tabla
            doc.setFillColor(230, 230, 230);
            doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 6, 'F');
            
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.text('Nivel', margin + 2, yPos);
            doc.text('Intentos', margin + 40, yPos);
            doc.text('Aciertos', margin + 70, yPos);
            doc.text('Tiempo(s)', margin + 100, yPos);
            doc.text('Precisión', margin + 130, yPos);
            
            yPos += 8;
            
            Object.keys(stats.levelStats).forEach(idx => {
                doc.setFont(undefined, 'bold');
                doc.setFontSize(9);
                // Verificar si necesita nueva página
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }
                
                const s = stats.levelStats[idx];
                const levelAccuracy = s.attempts > 0 ? ((s.hits / s.attempts) * 100).toFixed(1) : 0;
                const levelNum = parseInt(idx) + 1;
                
                doc.text(`Nivel ${levelNum}`, margin + 2, yPos);
                doc.text(`${s.attempts}`, margin + 40, yPos);
                doc.text(`${s.hits}`, margin + 70, yPos);
                doc.text(`${s.time.toFixed(1)}`, margin + 100, yPos);
                doc.text(`${levelAccuracy}%`, margin + 130, yPos);
                
                yPos += 8;
            });
        }
        
        yPos += 10;
        
        // Pie de página
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Reporte generado automáticamente por el sistema Escape Room', pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        // Descargar
        const nombreArchivo = `Reporte_${playerName.replace(/\s+/g, '_')}_${fecha.getTime()}.pdf`;
        doc.save(nombreArchivo);
    },

    /**
     * Muestra un diálogo para capturar el nombre del jugador
     * @param {boolean} completed - true si completó el juego
     * @returns {Promise<string|null>} El nombre ingresado o null si cancela
     */
    promptPlayerName: function(completed) {
        return new Promise((resolve) => {
            const status = completed ? 'COMPLETADO' : 'ABANDONADO';
            const message = completed 
                ? '¡FELICIDADES! ¿Cuál es tu nombre?' 
                : '¿Deseas descargar tu reporte? Ingresa tu nombre:';
            
            // Crear overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            // Crear diálogo
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #1a1a2e;
                color: white;
                padding: 30px;
                border: 4px solid #f8b800;
                border-radius: 8px;
                text-align: center;
                max-width: 400px;
                max-height: 90vh;
                overflow-y: auto;
                font-family: 'Press Start 2P', monospace;
                box-shadow: 0 0 20px rgba(248, 184, 0, 0.3);
            `;
            
            // Título
            const title = document.createElement('div');
            title.style.cssText = 'font-size: 16px; margin-bottom: 20px; color: #f8b800;';
            title.textContent = status;
            dialog.appendChild(title);
            
            // Mensaje
            const msg = document.createElement('div');
            msg.style.cssText = 'font-size: 11px; margin-bottom: 20px; line-height: 1.5;';
            msg.textContent = message;
            dialog.appendChild(msg);
            
            // Input
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Tu nombre aquí';
            input.style.cssText = `
                width: 100%;
                padding: 10px;
                font-family: 'Press Start 2P', monospace;
                font-size: 10px;
                border: 2px solid #f8b800;
                background: #0f0f1e;
                color: white;
                box-sizing: border-box;
                margin-bottom: 15px;
                text-align: center;
            `;
            dialog.appendChild(input);
            
            // Botones
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 10px;';
            
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'DESCARGAR';
            acceptBtn.style.cssText = `
                flex: 1;
                padding: 10px;
                background: #a80020;
                color: white;
                border: 2px solid #f8b800;
                font-family: 'Press Start 2P', monospace;
                font-size: 9px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            `;
            acceptBtn.onmouseover = () => acceptBtn.style.background = '#f8b800';
            acceptBtn.onmouseout = () => acceptBtn.style.background = '#a80020';
            acceptBtn.onclick = () => {
                const name = input.value.trim() || 'Jugador';
                overlay.remove();
                resolve(name);
            };
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'CANCELAR';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 10px;
                background: #333;
                color: white;
                border: 2px solid #666;
                font-family: 'Press Start 2P', monospace;
                font-size: 9px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            `;
            cancelBtn.onmouseover = () => cancelBtn.style.background = '#555';
            cancelBtn.onmouseout = () => cancelBtn.style.background = '#333';
            cancelBtn.onclick = () => {
                overlay.remove();
                resolve(null);
            };
            
            buttonContainer.appendChild(acceptBtn);
            buttonContainer.appendChild(cancelBtn);
            dialog.appendChild(buttonContainer);
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Focus en el input
            input.focus();
            
            // Permitir Enter para enviar
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    acceptBtn.click();
                }
            };
        });
    }
};
      