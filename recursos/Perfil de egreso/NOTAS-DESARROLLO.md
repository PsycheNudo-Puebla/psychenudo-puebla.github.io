# Notas de desarrollo — Perfil de egreso

## 📋 Descripción
Aplicación web de una sola página (HTML+CSS+JS) para diagnóstico por competencias basado en ABP. Evalúa competencias de materia y licenciatura, genera gráficos radar y exporta a PDF.

## 🛠️ Trabajo realizado

### Mapeo manual de competencias
- Las competencias de licenciatura no tienen preguntas directas; su puntaje se **deriva** del promedio de las competencias de materia que mapean a ellas.
- Cada competencia de materia tiene un campo `mapeoLicenciatura: []` con IDs de competencias de licenciatura.
- En el paso 2 del creador, aparecen chips clicables (✅/⬜) para vincular cada competencia de materia con una o varias de licenciatura.

### Filtro de líneas en radar (checkbox)
- Tres casillas (inicio / meta / actual) permiten ocultar/mostrar líneas en la gráfica radar interactivamente.
- Controlado por `lineVisibility = { inicio, meta, actual }`.

### Rúbrica para preguntas abiertas y caso
- El docente escribe **criterios esperados** al crear preguntas tipo "abierta" o "caso".
- Al calificar aparecen 3 botones: ✅ Cumple (5/5), ◐ Parcialmente (2.5/5), ❌ No cumple (0/5).
- El badge "📋 Rúbrica" identifica las preguntas que tienen criterios definidos.

### Guía de valores en pantalla de inicio
- Botón **"?"** al lado de "¿Qué deseas hacer?" despliega una guía con la escala de:
  - **Peso (1-5)** — importancia relativa de la competencia
  - **Inicio esperado (0-5)** — nivel previo del alumno
  - **Meta (0-5)** — nivel esperado al finalizar

### Compatibilidad Safari/Mac/iOS
- Font stack con `-apple-system, BlinkMacSystemFont`
- `font-size: 16px` en inputs (evita zoom automático en iOS)
- `touch-action: manipulation` en elementos interactivos
- Download fix: append al DOM + `setTimeout` para revocar ObjectURL
- html2canvas: `useCORS: true`, `allowTaint: false`, `onclone`
- Chart.js: `pointLabels.padding: 20`, `layout.padding` para evitar texto cortado
- Media queries responsivas para el canvas del radar

### Correcciones de bugs
- **Duplicados al navegar**: `creadorIrPaso2()` ahora limpia competencias de licenciatura previas antes de parsear el textarea.
- **Checkboxes de mapeo no respondían**: Migrados de `<label>+<input>` a `<div class="mapeo-chip">` con ícono visual.
- **Canvas en uso (Chart.js)**: Se agrega `chartInstance.destroy()` antes de crear un nuevo chart.

---

## 🚀 Posibles mejoras

### Pendientes / Ideas

| Prioridad | Mejora | Descripción |
|-----------|--------|-------------|
| 🔴 Alta | **Persistencia local** | Guardar automáticamente el progreso del alumno en `localStorage` para evitar pérdida por cierre accidental |
| 🔴 Alta | **Modo oscuro** | Agregar soporte para tema oscuro vía `prefers-color-scheme` o conmutador manual |
| 🟡 Media | **Exportar CSV** | Además de PDF, permitir descargar resultados en CSV para análisis en Excel/SPSS |
| 🟡 Media | **Comparativa grupal** | Permitir al docente cargar múltiples alumnos y ver un radar promedio del grupo |
| 🟡 Media | **Editor de rúbrica avanzado** | En lugar de un textarea libre, permitir criterios estructurados con niveles (excelente, suficiente, insuficiente) y puntajes configurables |
| 🟡 Media | **Banco de preguntas** | Separar la lógica de preguntas en un archivo JSON externo para reutilizar entre materias |
| 🟡 Media | **Imágenes en preguntas** | Soporte para adjuntar imágenes en preguntas de análisis de caso |
| 🟢 Baja | **Atajos de teclado** | Navegación por teclado (Ctrl+Enter para avanzar, Escape para volver, etc.) |
| 🟢 Baja | **Test unitarios** | Agregar pruebas automatizadas para el cálculo de puntajes y pesos |
| 🟢 Baja | **Internacionalización** | Soporte básico para cambiar entre español/inglés (i18n) |
| 🟢 Baja | **Progreso en creador** | Barra de progreso visual en el paso a paso (actualmente solo indicador de pasos) |
| 🟢 Baja | **Estadísticas por pregunta** | En resultados finales, mostrar tasa de acierto por pregunta (no solo por competencia) |
| 🟢 Baja | **Copia de seguridad** | Autoguardado periódico mientras se crea la prueba |

### Arquitectura
- El archivo actual es un único HTML monolítico (~2150 líneas). Para escalar, convendría separar en:
  - `index.html` — estructura
  - `estilos.css` — estilos
  - `app.js` — lógica principal
  - `datos.js` — pruebas precargadas y constantes
  - `chart.js` — configuración de Chart.js
- La carga/guarda usa `JSON.stringify` completo. Para pruebas muy grandes, considerar compresión básica o chunking.

---

## 📁 Estructura del proyecto
```
recursos/Perfil de egreso/
├── Perfil de egreso.html   ← Aplicación completa (single-file)
├── perfiles-psicologia.json  ← Ejemplo de prueba exportada
└── NOTAS-DESARROLLO.md     ← Este archivo
```
