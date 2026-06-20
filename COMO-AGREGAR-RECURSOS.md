# Cómo Agregar un Nuevo Recurso a PsycheNudo

El sitio de PsycheNudo es de **una sola página con pestañas** (Misión, Nudo, Recursos, Artículos).  
Los recursos se muestran como **tarjetas** dentro de la pestaña "Recursos" del `index.html`.

---

## Archivos que debes modificar

### 1. `index.html` (principal — donde se ven las tarjetas)

Agrega una tarjeta nueva dentro de la sección `<section id="recursos">`, antes del cierre `</div>` del `.grid-colegas`.

Sigue el mismo formato de las tarjetas existentes. Ejemplo:

```html
<article class="tarjeta-colega">
    <h3>Nombre del Recurso</h3>
    <p class="especialidad-colega">Categoría / Tipo</p>
    <p>Descripción breve de qué hace la herramienta.</p>
    <p>Descripción adicional con más detalle de su funcionamiento.</p>
    <p><strong>Incluye:</strong> características destacadas separadas por comas.</p>
    <div class="acciones-tarjeta">
        <a href="{{ '/recursos/nombre-carpeta/index.html' | relative_url }}" class="boton" target="_blank" rel="noopener noreferrer">Abrir aplicación</a>
    </div>
</article>
```

### 2. `recursos/index.md` (página secundaria)

Agrega un ítem en la lista de "Herramientas de Evaluación":

```markdown
*   **[Nombre del Recurso](./carpeta/index.html)**: Descripción breve de la herramienta.
```

> ⚠️ **Nota:** Este archivo es una página independiente a la que se llega directamente mediante la URL `/recursos/`. La mayoría de los usuarios entra por la pestaña del `index.html`, pero conviene mantener ambas actualizadas.

---

## Pasos finales

Después de editar los archivos:

```bash
# 1. Reconstruir el sitio
bundle exec jekyll build

# 2. Subir los cambios a GitHub
git add .
git commit -m "Agrega [nombre del recurso]"
git push
```

> ⏱ Espera ~1-2 minutos a que GitHub Pages lo publique.

---

## Estructura esperada del recurso

Cada recurso debe tener al menos un `index.html` dentro de su carpeta en `recursos/`:

```
recursos/
  nombre-del-recurso/
    index.html
    css/   (opcional)
    js/    (opcional)
```

¡Listo! 🚀
