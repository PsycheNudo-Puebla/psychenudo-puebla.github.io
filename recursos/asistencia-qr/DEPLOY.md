# 🚀 Proceso de Deploy — Asistencia QR

## ⚠️ Regla de Oro

**Los 3 HTMLs (`profesor.html`, `alumno.html`, `index.html`) tienen el flag `skip-worktree` de git.**  
Esto significa que git **ignora deliberadamente** los cambios locales en esos archivos.  
Si editas un HTML manualmente y no sigues el proceso de deploy, **tus cambios no se subirán a GitHub Pages**.

---

## 📋 Flujo Completo de Deploy

### 1. Hacer cambios en el código

Edita los archivos fuente en `src/` o los HTMLs según necesites.

### 2. Compilar y desplegar

```powershell
cd recursos/asistencia-qr

# Opción A (recomendada) — Un solo comando:
npm run deploy

# Opción B — Paso a paso:
npm run build
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

El script `deploy.ps1` hace automáticamente:

| Paso | Descripción |
|------|-------------|
| 1️⃣ `npm run build` | Compila TypeScript con Vite → genera `dist/` |
| 2️⃣ Respaldos | Copia `*.html` → `*.html.bak` (modo desarrollo) |
| 3️⃣ Copia archivos | Pasa `dist/` → raíz: assets, js, HTMLs de producción |
| 4️⃣ Git stage | Quita `skip-worktree`, staggea los archivos, re-aplica `skip-worktree` |

### 3. Commit y push

```powershell
cd ../..  # o: cd C:\MIs proyectos\psychenudo-puebla.github.io

git commit -m "despliegue produccion"
git push
```

### 4. Restaurar modo desarrollo (local)

Después del push, los HTMLs locales están en **modo producción** (apuntan a `.js` compilados).  
Si vas a seguir editando, restáuralos a modo desarrollo:

```powershell
cd recursos/asistencia-qr
Copy-Item alumno.html.bak alumno.html -Force
Copy-Item profesor.html.bak profesor.html -Force
Copy-Item index.html.bak index.html -Force
```

Esto los devuelve a modo desarrollo (apuntan a `src/*.ts`).

---

## 🔄 Resumen visual del ciclo

```
┌─────────────────────────────────────────┐
│ 1. Editas src/*.ts o HTMLs locales       │
│    (modo desarrollo → apuntan a .ts)     │
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│ 2. npm run deploy (build + deploy.ps1)   │
│    • Compila .ts → .js                   │
│    • Respaldos automáticos (.bak)        │
│    • HTMLs → modo producción (.js)       │
│    • Staggea archivos en git             │
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│ 3. git commit + git push                 │
│    → GitHub Pages actualizado ✅         │
└──────────┬──────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│ 4. Restaurar .bak → modo desarrollo      │
│    (para seguir editando localmente)     │
└─────────────────────────────────────────┘
```

---

## ❗ Errores comunes y soluciones

### "Mis cambios en profesor.html no aparecen en GitHub"

**Causa:** El flag `skip-worktree` impidió que git viera los cambios.

**Solución:**
```powershell
git update-index --no-skip-worktree recursos/asistencia-qr/profesor.html
# Haz commit de los cambios
# Luego re-aplica el flag:
git update-index --skip-worktree recursos/asistencia-qr/profesor.html
```

**Alternativa:** Sigue el proceso completo de deploy (paso 2-3), que maneja esto automáticamente.

### "Se me olvidó restaurar los .bak y ahora los HTMLs apuntan a .js"

Sigue editando sin problema, los `.js` compilados funcionan igual.  
Pero es mejor restaurar los `.bak` para mantener consistencia.

### "Los hashes de assets cambiaron y ensucian el git status"

Normal. Los hashes cambian en cada build. El `deploy.ps1` staggea solo los necesarios.
Si no quieres verlos, usa `git status` ignorando ciertos archivos.

---

## 🧪 Modo desarrollo local (sin deploy)

Si solo quieres probar cambios localmente sin desplegar:

```powershell
cd recursos/asistencia-qr
npm run dev
```

Esto inicia el servidor de Vite en modo desarrollo (hot-reload + apunta a `.ts`).

---

## 📦 Dependencias

- **Node.js** + **npm**
- **Vite** (bundler)
- **TypeScript**
- Los HTMLs en modo desarrollo usan `<script type="module" src="./src/...">`  
  Los HTMLs en producción usan `<script src="./assets/....js">`
