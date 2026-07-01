# 🚀 Guía de Flujo de Trabajo Multicomputadora

Este archivo contiene la rutina diaria para sincronizar el trabajo entre la computadora potente (Windows - Casa) y la computadora sencilla (Linux - Traslados).

---

## ⏳ AL EMPEZAR (En cualquiera de las dos computadoras)

Antes de modificar o crear cualquier archivo, debes traer los últimos cambios que hiciste en la otra máquina para evitar conflictos.

**Comando obligatorio para empezar:**
```bash
git pull
```

> **Nota:** Si `git pull` falla porque tienes cambios sin guardar, haz un `git status` para ver qué archivos están modificados. Puedes hacer `git stash` para guardarlos temporalmente, luego `git pull`, y después `git stash pop` para recuperarlos.

---

## ✅ AL TERMINAR (En cualquiera de las dos computadoras)

Cuando termines tu sesión de trabajo, sube los cambios para que estén disponibles en la otra máquina.

```bash
# 1. Verifica qué archivos cambiaste
git status

# 2. Agrega los archivos que quieras subir
git add .

# 3. Crea un commit con un mensaje descriptivo
git commit -m "Descripción breve de lo que hiciste"

# 4. Sube los cambios a GitHub
git push
```

**Consejos para el mensaje del commit:**
- `"Agregada sección de ansiedad en recursos"`
- `"Corregido error en rúbrica de evaluación"`
- `"Actualizado perfil de colaborador"`
- `"Nuevo recurso: escape room"`

---

## 🌿 RAMA RECOMENDADA

Trabaja siempre en la rama `main` (a menos que estés experimentando).

```bash
# Para ver en qué rama estás
git branch

# Si no estás en main, cámbiate
git checkout main
```

Si quieres hacer una prueba sin riesgo, crea una rama temporal:

```bash
git checkout -b experimental
# ... haces tus pruebas ...
# Para descartarla al volver a main:
git checkout main
git branch -D experimental
```

---

## ⚠️ CÓMO RESOLVER CONFLICTOS

Si al hacer `git pull` aparecen conflictos (mensaje *"Automatic merge failed"*):

1. Abrí los archivos marcados como conflictos (VS Code los señala con colores y botones).
2. Verás secciones así:
   ```diff
   <<<<<<< HEAD
   (cambios locales)
   =======
   (cambios remotos)
   >>>>>>> main
   ```
3. Elige qué versión conservar o combínalas manualmente.
4. Borra las líneas `<<<<<<<`, `=======` y `>>>>>>>`.
5. Guarda el archivo.
6. Finaliza la fusión:
   ```bash
   git add .
   git commit -m "Resuelto conflicto en [nombre del archivo]"
   git push
   ```

---

## 🧹 RECORDATORIOS IMPORTANTES

### `.gitignore` — Archivos que no se suben a GitHub

El proyecto ya incluye un `.gitignore` con estas exclusiones:

| Regla | ¿Qué excluye? |
|-------|---------------|
| `_site/` | Sitio generado por Jekyll (se regenera con `jekyll build`) |
| `.sass-cache/` | Caché de SASS |
| `.jekyll-cache/` | Caché de Jekyll |
| `.bundle/` | Dependencias locales de Ruby |
| `vendor/bundle/` | Gemas instaladas localmente |
| `venv*/`, `.venv/`, etc. | Entornos virtuales de Python |
| `.DS_Store`, `Thumbs.db` | Archivos temporales del sistema |

> **Importante:** Si ves la carpeta `_site/` aparecer en `git status`, significa que el `.gitignore` no está funcionando. Verifica que esté en la raíz del proyecto.

### Regla de oro
**Siempre haz `git pull` antes de empezar y `git push` antes de cerrar sesión.** Así ambas computadoras se mantienen sincronizadas sin conflictos.

---

## 📋 RESUMEN RÁPIDO (Cheatsheet)

| Acción | Comando |
|--------|---------|
| Bajar cambios | `git pull` |
| Ver estado | `git status` |
| Preparar todo | `git add .` |
| Confirmar | `git commit -m "mensaje"` |
| Subir cambios | `git push` |
| Guardar cambios temporales | `git stash` |
| Recuperar cambios temporales | `git stash pop` |
| Ver ramas | `git branch` |
| Cambiar de rama | `git checkout <nombre>` |
