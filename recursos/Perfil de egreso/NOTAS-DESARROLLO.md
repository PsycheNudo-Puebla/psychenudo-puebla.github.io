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
├── Perfil de egreso.html       ← Aplicación completa (single-file)
├── tests-manifest.json         ← Manifiesto de pruebas precargadas
├── perfiles-psicologia.json    ← Pruebas de ejemplo (Psicología Educativa + Trastornos Adulto)
├── historia-psicologia-unam.json  ← Prueba: Historia de la Psicología (UNAM)
├── trastornos-psicologicos-adulto.json  ← Prueba standalone (respaldada en perfiles-psicologia.json)
└── NOTAS-DESARROLLO.md         ← Este archivo
```

## 📦 Cómo agregar una nueva prueba precargada

**Sin tocar `Perfil de egreso.html`** — solo agregando archivos:

### 1. Crea tu archivo JSON (ej: `mi-nueva-prueba.json`)
```json
{
  "id": "mi_prueba_unica",
  "nombre": "Diagnóstico: Mi Nueva Prueba",
  "descripcion": "Descripción breve para el alumno",
  "curso": {
    "nombre": "Nombre de la Materia",
    "descripcion": "Descripción de la materia",
    "perfilLicenciatura": "Perfil de egreso de la licenciatura",
    "competenciasLicenciatura": "Competencia 1\nCompetencia 2\nCompetencia 3",
    "alumno": ""
  },
  "competencias": [
    { "id": "c1", "nombre": "Competencia 1", "descripcion": "...", "peso": 5, "esperadoInicio": 1, "esperadoFinal": 5, "mapeoLicenciatura": [0] },
    { "id": "c2", "nombre": "Competencia 2", "descripcion": "...", "peso": 4, "esperadoInicio": 1, "esperadoFinal": 4, "mapeoLicenciatura": [1] }
  ],
  "preguntas": [
    { "id": "p1", "tipo": "opcion_multiple", "competenciaId": "c1", "texto": "¿Pregunta?", "opciones": ["A", "B", "C"], "respuestaCorrecta": 1 },
    { "id": "p2", "tipo": "likert", "competenciaId": "c2", "texto": "Afirmación para autoevaluar" }
  ]
}
```
**Tipos válidos:** `opcion_multiple`, `seleccion_multiple`, `likert`, `abierta`, `caso`

### 2. Registra en `tests-manifest.json`
```json
{
  "tests": [
    { "id": "psi_edu", "file": "perfiles-psicologia.json", "nombre": "...", "descripcion": "..." },
    { "id": "psi_historia_unam", "file": "historia-psicologia-unam.json", "nombre": "...", "descripcion": "..." },
    { "id": "mi_prueba_unica", "file": "mi-nueva-prueba.json", "nombre": "Diagnóstico: Mi Nueva Prueba", "descripcion": "Descripción breve" }
  ]
}
```

### 3. Listo
Recarga la página. La prueba aparece en **"Tomar prueba precargada"**.

**Notas:**
- El `id` en el manifest debe coincidir con el `id` interno del JSON (fallback al del manifest)
- `mapeoLicenciatura` usa índices 0-based que apuntan a líneas de `competenciasLicenciatura`
- El archivo JSON puede ser un **objeto único** o un **array** `[{...}, {...}]` (como `perfiles-psicologia.json`)

---

## 📄 ¿Qué es `perfiles-psicologia.json`?

Es un **archivo contenedor** con **2 pruebas completas en un array**:

1. **`psi_educativa`** — Diagnóstico: Psicología Educativa (5 preguntas, 3 competencias)
2. **`psi_trastornos_adulto`** — Diagnóstico: Trastornos Psicológicos del Adulto (16 preguntas, 4 competencias)

**Función:** Sirve como **ejemplo de exportación** del modo creador y como **fuente de pruebas precargadas**. El manifest lo referencia una sola vez (`"file": "perfiles-psicologia.json"`) y el cargador detecta automáticamente que es un array y extrae ambas pruebas.

El archivo `trastornos-psicologicos-adulto.json` es la **versión standalone** de la segunda prueba (mismo contenido, distinto formato). Se mantiene solo como respaldo histórico.
