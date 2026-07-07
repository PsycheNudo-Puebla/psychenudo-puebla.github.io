// ============================================================
// examen-pdf.js — Generación de PDF (pdfmake e imprimible HTML)
// ============================================================

function buildSafariPrintDocument(reportHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte PDF</title>
  <style>
    @page { size: A4; margin: 8mm; }
    html, body { margin: 0; padding: 0; background: white; color: #0f172a; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 0; }
    * { box-sizing: border-box; }
    .pdf-question-block { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>
  <div style="width: 100%; max-width: 100%; padding: 0; margin: 0;">${reportHtml}</div>
</body>
</html>`;
}

async function exportToPdf(filename) {
  if (!latestResultPayload) return;
  
  const data = latestResultPayload;
  const scoreBase10 = (data.score && !isNaN(parseFloat(data.score))) ? data.score : ((data.totalPoints > 0) ? ((data.earnedPoints / data.totalPoints) * 10).toFixed(1) : "0.0");
  
  // --- Preparar contenido de tareas asignadas para el PDF ---
  let tareasContent = [];
  if (data.tareas_asignadas && data.tareas_asignadas.length > 0) {
    tareasContent = [
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 2, lineColor: '#f59e0b' }] },
      { text: 'TAREAS ASIGNADAS', style: 'sectionHeader', color: '#f59e0b', margin: [0, 20, 0, 15] },
      ...data.tareas_asignadas.map((tarea, i) => ({
        unbreakable: true,
        margin: [0, 0, 0, 12],
        stack: [
          { text: `${i + 1}. ${tarea.nombre}`, bold: true, fontSize: 12, color: '#0f172a', margin: [0, 0, 0, 4] },
          ...(tarea.fecha_entrega ? [{ text: `Fecha de entrega: ${tarea.fecha_entrega}`, fontSize: 10, color: '#64748b', margin: [0, 0, 0, 4] }] : []),
          { text: tarea.descripcion || "Sin descripción", fontSize: 11, color: '#334155', margin: [0, 0, 0, 4] },
          ...(tarea.instrucciones ? [{ text: `Instrucciones: ${tarea.instrucciones}`, fontSize: 10, color: '#475569', italics: true }] : [])
        ]
      }))
    ];
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        columns: [
          {
            text: [
              { text: 'TestLab Pro\n', style: 'brand' },
              { text: 'REPORTE DE RESULTADOS', style: 'brandSub' }
            ]
          },
          {
            text: data.examTitle,
            style: 'examTitle',
            alignment: 'right'
          }
        ]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 2, lineColor: '#4f46e5' }] },
      {
        style: 'metaTable',
        table: {
          widths: ['auto', '*', 'auto', '*'],
          body: [
            [
              { text: 'Estudiante:', style: 'label' }, { text: data.studentName, style: 'value' },
              { text: 'Matrícula:', style: 'label' }, { text: data.studentId, style: 'value' }
            ],
            [
              { text: 'Fecha:', style: 'label' }, { text: data.date, style: 'value' },
              { text: 'Intento:', style: 'label' }, { text: `#${data.attemptNumber}`, style: 'value' }
            ],
            [
              { text: 'Iniciado:', style: 'label' }, { text: data.startTimeFormatted || 'No registrada', style: 'value' },
              { text: '', style: 'label' }, { text: '', style: 'value' }
            ]
          ]
        },
        layout: 'noBorders'
      },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'CALIFICACIÓN', style: 'statLabel', alignment: 'center' },
                  { text: `${scoreBase10}/10`, style: 'statValue', alignment: 'center' }
                ],
                fillColor: '#4f46e5', color: 'white'
              },
              {
                stack: [
                  { text: 'PUNTAJE', style: 'statLabelGray', alignment: 'center' },
                  { text: `${data.earnedPoints} de ${data.totalPoints}`, style: 'statValueGray', alignment: 'center' }
                ],
                fillColor: '#f8fafc'
              },
              {
                stack: [
                  { text: 'SALIDAS', style: 'statLabelGray', alignment: 'center' },
                  { text: data.cheatCount.toString(), style: 'statValueGray', alignment: 'center', color: data.cheatCount > 0 ? '#ef4444' : '#10b981' }
                ],
                fillColor: '#f8fafc'
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 20, 0, 30]
      },
      { text: 'RESULTADOS DETALLADOS', style: 'sectionHeader' },
      ...data.questions.map((q, i) => {
        const isCorrect = q.status.includes('✅');
        const isIncorrect = q.status.includes('❌');
        const statusColor = isCorrect ? '#166534' : (isIncorrect ? '#991b1b' : '#854d0e');
        const statusBg = isCorrect ? '#dcfce7' : (isIncorrect ? '#fee2e2' : '#fef9c3');
        const cleanStatusText = q.status.replace('✅', 'CORRECTO').replace('❌', 'INCORRECTO').replace('🟡', 'PARCIAL').replace('⏳', 'PENDIENTE');
        
        return {
          unbreakable: true,
          margin: [0, 0, 0, 15],
          stack: [
            {
              columns: [
                { text: `Pregunta ${i + 1}`, bold: true, fontSize: 10, color: '#64748b' },
                { text: `${q.points} pts`, alignment: 'right', fontSize: 10, color: '#64748b' }
              ],
              margin: [0, 0, 0, 5]
            },
            { text: q.question, bold: true, fontSize: 12, margin: [0, 0, 0, 10] },
            (q.type === 'relacionar' ? {
              fillColor: '#f8fafc',
              padding: [10, 8],
              stack: (function(){
                const out = [];
                // Usar datos estructurados si están disponibles
                const details = q.studentAnswerDetails;
                if (Array.isArray(details) && details.length > 0) {
                  // Tabla: Concepto | Respuesta | Resultado
                  out.push({
                    table: {
                      widths: ['auto', '*', 'auto'],
                      headerRows: 1,
                      body: [
                        [
                          { text: 'Concepto', bold: true, fontSize: 9, color: '#64748b', fillColor: '#f1f5f9', margin: [4, 4] },
                          { text: 'Tu respuesta', bold: true, fontSize: 9, color: '#64748b', fillColor: '#f1f5f9', margin: [4, 4] },
                          { text: 'Resultado', bold: true, fontSize: 9, color: '#64748b', fillColor: '#f1f5f9', margin: [4, 4] }
                        ],
                        ...details.map(detail => [
                          { text: detail.key, fontSize: 10, color: '#1e293b', bold: true, margin: [4, 4] },
                          {
                            text: detail.studentValue || "Sin respuesta",
                            fontSize: 10,
                            color: detail.isSubCorrect ? '#166534' : '#991b1b',
                            bold: true,
                            margin: [4, 4]
                          },
                          {
                            stack: detail.isSubCorrect
                              ? [
                                  { text: 'CORRECTO', fontSize: 9, color: '#16a34a', bold: true, margin: [4, 4] }
                                ]
                              : [
                                  { text: 'INCORRECTO', fontSize: 9, color: '#991b1b', bold: true, margin: [4, 4] },
                                  { text: `Corr: ${detail.correctValue}`, fontSize: 8, color: '#2563eb', italics: true, margin: [4, 0, 4, 4] }
                                ],
                            margin: [4, 4]
                          }
                        ])
                      ]
                    },
                    layout: {
                      hLineWidth: (i) => (i === 0 || i === 1) ? 1 : 0.5,
                      vLineWidth: () => 0.5,
                      hLineColor: () => '#e2e8f0',
                      vLineColor: () => '#e2e8f0',
                      paddingLeft: () => 4,
                      paddingRight: () => 4,
                      paddingTop: () => 4,
                      paddingBottom: () => 4
                    },
                    margin: [0, 0, 0, 8]
                  });
                  // Resumen de aciertos
                  const aciertos = details.filter(d => d.isSubCorrect).length;
                  const total = details.length;
                  out.push({
                    text: `Aciertos: ${aciertos}/${total}`,
                    fontSize: 10,
                    bold: true,
                    color: aciertos === total ? '#16a34a' : (aciertos > 0 ? '#ca8a04' : '#991b1b'),
                    margin: [0, 4, 0, 0]
                  });
                } else {
                  // Fallback: mostrar HTML limpio
                  out.push({ text: cleanHtmlForPdf(q.studentAnswer), fontSize: 11, color: '#1e293b' });
                }
                return out;
              })()
            } : {
              fillColor: '#f8fafc',
              stack: [
                { text: 'TU RESPUESTA:', fontSize: 8, bold: true, color: '#64748b', margin: [0, 0, 0, 2] },
                { text: cleanHtmlForPdf(q.studentAnswer), fontSize: 11, color: '#1e293b' }
              ],
              padding: [10, 8]
            }),
            ...(q.type !== 'relacionar' ? [{
              fillColor: '#f0f7ff',
              stack: [
                { text: 'GUÍA / RESPUESTA CORRECTA:', fontSize: 8, bold: true, color: '#4f46e5', margin: [0, 0, 0, 2] },
                { text: cleanHtmlForPdf(q.correctAnswer), fontSize: 10, color: '#1e40af' }
              ],
              padding: [10, 8],
              margin: [0, 5, 0, 5]
            }] : []),
            {
              text: `${cleanStatusText} (${q.earnedPoints} pts)`,
              alignment: 'right',
              bold: true,
              fontSize: 10,
              color: statusColor,
              background: statusBg,
              margin: [0, 5, 0, 0]
            }
          ]
        };
      }),
      // --- Sección de Tareas Asignadas ---
      ...tareasContent
    ],
    styles: {
      brand: { fontSize: 22, bold: true, color: '#4f46e5' },
      brandSub: { fontSize: 9, bold: true, color: '#64748b', letterSpacing: 1 },
      examTitle: { fontSize: 14, bold: true, color: '#1e293b' },
      metaTable: { margin: [0, 15, 0, 0] },
      label: { fontSize: 10, color: '#64748b' },
      value: { fontSize: 10, bold: true },
      statLabel: { fontSize: 9, bold: true, margin: [0, 10, 0, 0] },
      statValue: { fontSize: 24, bold: true, margin: [0, 0, 0, 10] },
      statLabelGray: { fontSize: 9, bold: true, color: '#64748b', margin: [0, 10, 0, 0] },
      statValueGray: { fontSize: 18, bold: true, color: '#1e293b', margin: [0, 0, 0, 10] },
      sectionHeader: { fontSize: 14, bold: true, color: '#1e293b', margin: [0, 0, 0, 15] }
    },
    defaultStyle: { font: 'Roboto' }
  };
  
  pdfMake.createPdf(docDefinition).download(filename);
}

function buildPrintableReport(resultPayload) {
      const { examTitle: title, studentName: name, studentId: id, date, startTimeFormatted, attemptNumber, score, earnedPoints, totalPoints, cheatCount, questions, tareas_asignadas } = resultPayload;
  const displayScore = score || (totalPoints > 0 ? ((earnedPoints / totalPoints) * 10).toFixed(1) : "0.0");

  // Generar HTML de tareas asignadas
  let tareasHtml = "";
  if (tareas_asignadas && tareas_asignadas.length > 0) {
    tareasHtml = `
      <div class="tareas-asignadas-pdf" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f59e0b;">
        <h3 style="color: #f59e0b; font-size: 16px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Tareas Asignadas</h3>
        ${tareas_asignadas.map((t, i) => `
          <div class="tarea-pdf-item" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fcfdff; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div class="tarea-nombre" style="font-weight: bold; font-size: 13px; color: #0f172a;">${escapeHtml(t.nombre)}</div>
              ${t.fecha_entrega ? `<span style="font-size: 11px; color: #64748b; white-space: nowrap;">Entrega: ${escapeHtml(t.fecha_entrega)}</span>` : ''}
            </div>
            <div class="tarea-desc" style="font-size: 12px; color: #334155; margin-top: 6px; padding: 8px; background: #f8fafc; border-radius: 6px;">
              ${escapeHtml(t.descripcion || "Sin descripción")}
            </div>
            ${t.instrucciones ? `<div style="font-size: 11px; color: #475569; margin-top: 6px; font-style: italic;">Instrucciones: ${escapeHtml(t.instrucciones)}</div>` : ''}
            ${t.regla_que_asigno ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Asignada por: ${escapeHtml(t.regla_que_asigno)}</div>` : ''}
          </div>
        `).join('')}
      </div>`;
  }

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Helvetica, Arial, sans-serif; color: #0f172a; width: 170mm; max-width: 170mm; min-width: 170mm; padding: 0 3mm; margin: 0 auto; background: #ffffff; line-height: 1.6; box-sizing: border-box; overflow-wrap: anywhere; word-break: break-word; page-break-inside: auto;">
      <table style="width: 100%; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; margin-bottom: 25px;">
        <tr>
          <td>
            <h1 style="font-size: 26px; margin: 0; color: #4f46e5; letter-spacing: -0.5px;">TestLab Pro</h1>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Reporte de Resultados</p>
          </td>
          <td style="text-align: right; vertical-align: bottom;">
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">${escapeHtml(title)}</p>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Estudiante:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${escapeHtml(name)}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; text-align: right;">Matrícula:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">${escapeHtml(id)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Fecha:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${escapeHtml(date)}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; text-align: right;">Intento:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">#${attemptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Iniciado:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(startTimeFormatted || 'No registrada')}</td>
            <td style="padding: 8px 0; color: #64748b;"></td>
            <td style="padding: 8px 0;"></td>
          </tr>
        </table>
      </div>

      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 40px; table-layout: fixed;">
        <tr>
          <td style="width: 33.33%; background-color: #4f46e5; color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.1);">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; opacity: 0.9;">Calificación</p>
            <div style="font-size: 32px; font-weight: 800; margin-top: 5px;">${displayScore}<span style="font-size: 14px; font-weight: 400; opacity: 0.7;">/10</span></div>
          </td>
          <td style="width: 33.33%; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; color: #64748b;">Puntaje</p>
            <div style="font-size: 22px; font-weight: 700; margin-top: 5px; color: #1e293b;">${earnedPoints}<span style="font-size: 14px; font-weight: 400; color: #94a3b8;"> de ${totalPoints}</span></div>
          </td>
          <td style="width: 33.33%; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; color: #64748b;">Salidas</p>
            <div style="font-size: 22px; font-weight: 700; margin-top: 5px; color: ${cheatCount > 0 ? '#ef4444' : '#10b981'};">${cheatCount}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 20px;">
        <h3 style="font-size: 18px; color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Resultados Detallados</h3>
        ${questions.map((q, index) => {
            let studentAnswerContent;
            if (q.type === "relacionar") {
                const details = q.studentAnswerDetails;
                if (Array.isArray(details) && details.length > 0) {
                    const aciertos = details.filter(d => d.isSubCorrect).length;
                    const total = details.length;
                    studentAnswerContent = `
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px;">
                            <thead>
                                <tr style="background-color: #f1f5f9;">
                                    <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 10px; color: #64748b; text-transform: uppercase;">Concepto</th>
                                    <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 10px; color: #64748b; text-transform: uppercase;">Tu respuesta</th>
                                    <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #64748b; text-transform: uppercase; width: 100px;">Resultado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${details.map(d => `
                                    <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">${escapeHtml(d.key)}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600; color: ${d.isSubCorrect ? '#166534' : '#991b1b'};">${escapeHtml(d.studentValue || 'Sin respuesta')}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">
                                            ${d.isSubCorrect
                                                ? '<span style="color: #16a34a; font-weight: 800;">✅ Correcto</span>'
                                                : `<span style="color: #991b1b; font-weight: 800;">❌ Incorrecto</span><br><span style="color: #2563eb; font-size: 11px; font-style: italic;">→ ${escapeHtml(d.correctValue)}</span>`
                                            }
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div style="font-weight: bold; font-size: 12px; color: ${aciertos === total ? '#16a34a' : (aciertos > 0 ? '#ca8a04' : '#991b1b')}; margin-top: 4px;">
                            Aciertos: ${aciertos}/${total}
                        </div>`;
                } else if (typeof q.studentAnswer === 'string') {
                    studentAnswerContent = q.studentAnswer;
                } else {
                    studentAnswerContent = 'Sin respuesta';
                }
            } else {
                studentAnswerContent = (typeof q.studentAnswer === 'string') ? q.studentAnswer : 'Sin respuesta';
            }

            return `
                <div class="pdf-question-block" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 0 0 20px 0; background-color: #fcfdff; page-break-inside: avoid; break-inside: avoid; display: block; clear: both; position: relative; overflow: hidden; box-sizing: border-box; max-width: 100%;">
                    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px; overflow: hidden;">
                        <span style="float: left; font-weight: bold; color: #1e293b;">Pregunta ${index + 1}</span>
                        <span style="float: right; font-size: 11px; color: #64748b; font-weight: bold;">${q.points} pts</span>
                    </div>
                    <div style="margin: 0 0 15px 0; font-size: 14px; color: #0f172a; font-weight: 500; overflow-wrap: anywhere; word-break: break-word;">${escapeHtml(q.question)}</div>
                    <div style="margin-bottom: 12px; padding: 10px; background-color: #f8fafc; border-radius: 6px; font-size: 13px; page-break-inside: avoid; break-inside: avoid;">
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; font-weight: bold;">Tu respuesta:</div>
                        <div style="color: #1e293b;">${studentAnswerContent}</div>
                    </div>
                    <div style="margin-bottom: 12px; padding: 10px 10px 15px 10px; background-color: #f0f7ff; border-radius: 6px; font-size: ${q.type === "abierta" ? '12px' : '13px'}; border-left: 3px solid #4f46e5; page-break-inside: avoid; break-inside: avoid; overflow-wrap: anywhere; word-break: break-word; line-height: 1.5; min-height: 40px;">
                        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; margin-bottom: 4px; font-weight: bold;">
                            ${q.type === "abierta" ? "Guía de respuesta / Respuesta esperada" : (q.type === 'relacionar' ? 'Relación correcta de conceptos:' : 'Respuesta correcta:')}
                        </div>
                        <div style="color: #1e40af; overflow-wrap: anywhere; word-break: break-word; padding-bottom: 5px;">
                            ${q.type === 'relacionar' && Array.isArray(q.studentAnswerDetails) && q.studentAnswerDetails.length > 0
                                ? `<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px;">
                                    <tbody>
                                        ${q.studentAnswerDetails.map(d => `
                                            <tr>
                                                <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b; width: 120px;">${escapeHtml(d.key)}</td>
                                                <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; color: #4f46e5;">→ ${escapeHtml(d.correctValue)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>`
                                : (escapeHtml(String(q.correctAnswer || "")).replace(/\n/g, "<br>"))
                            }
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 5px; page-break-inside: avoid; break-inside: avoid;">
                        <span style="font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; display: inline-block; ${q.isCorrect === true ? 'background-color: #dcfce7; color: #166534;' : (q.isCorrect === false ? 'background-color: #fee2e2; color: #991b1b;' : 'background-color: #fef9c3; color: #854d0e;')}">
                            ${q.status}
                        </span>
                    </div>
                </div>
            `;
        }).join("")}
      </div>

      ${tareasHtml}

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic; page-break-inside: avoid; break-inside: avoid;">
        Este documento es un comprobante oficial de evaluación. Las respuestas abiertas requieren revisión manual por parte del docente.
        <br>Generado por TestLab Pro &copy; ${new Date().getFullYear()}
        <div style="height: 100px; display: block; clear: both; width: 100%;"></div>
      </div>
    </div>`;
}
