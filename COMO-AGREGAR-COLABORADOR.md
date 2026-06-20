# Cómo Agregar un Nuevo Colaborador a la Red (El Nudo)

Para agregar un nuevo profesional a PsycheNudo solo necesitas crear un archivo Markdown en la carpeta `_profesionales/`.  
**No necesitas editar `index.html`** — Jekyll genera automáticamente la tarjeta en la pestaña "Nudo" y su página de perfil.

---

## Archivo a crear

Dentro de `_profesionales/`, crea un archivo con el nombre del profesional:

```
_profesionales/nombre-apellido.md
```

Ejemplo: `_profesionales/carolina-vazquez.md`

---

## Front Matter (campos YAML)

```yaml
---
layout: perfil
nombre: "Mtra. Carolina Vázquez"
especialidad: "Psicología Organizacional"
invitado_por: "Mtro. Adrián González"
cedula: "12345678"
external_urls:
  - label: "LinkedIn Profesional"
    url: "https://linkedin.com/in/carolina-vazquez"
  - label: "Sitio Web Personal"
    url: "https://carolinavazquez.com"
---
```

### Campos disponibles

| Campo | ¿Requerido? | Descripción |
|---|---|---|
| `layout` | ✅ Siempre | Debe ser `perfil` |
| `nombre` | ✅ Sí | Nombre completo con título (ej. "Mtra.", "Mtro.", "Dr.", "Lic.") |
| `especialidad` | ✅ Sí | Área(s) de especialización |
| `invitado_por` | ✅ Sí | Quién lo invitó al nudo |
| `cedula` | ✅ Sí | Número de cédula profesional SEP |
| `external_urls` | ❌ Opcional | Lista de enlaces externos (LinkedIn, blog, etc.). Se muestra como un menú desplegable en el perfil |
| `external_url` | ❌ Opcional | Un solo enlace externo (alternativa simple a `external_urls`) |
| `url_personal` | ❌ Opcional | Ruta a una página personalizada dentro del sitio (ej. `/adrian-gonzalez/`) |
| `calendario_url` | ❌ Opcional | Enlace a agenda de citas (Google Calendar, Calendly, etc.) |

> **Importante:** Si usas `external_urls` (lista), no uses `external_url` (simple) — solo uno de los dos.

---

## Contenido del perfil

Después del front matter (los `---`), escribe una **biografía profesional breve** de 2 a 4 párrafos en Markdown normal.

```markdown
---
layout: perfil
nombre: "Mtra. Carolina Vázquez"
...
---

Psicóloga Organizacional con más de 10 años de experiencia en gestión de talento humano en empresas del sector industrial en Puebla.

Actualmente se desempeña como consultora independiente en desarrollo organizacional y clima laboral. Ha colaborado con empresas como Audi, Volkswagen y Grupo Bimbo en proyectos de evaluación de desempeño y selección de personal.

Es docente en la Universidad Popular Autónoma del Estado de Puebla (UPAEP) en la facultad de Psicología.
```

---

## Ejemplo completo (archivo real)

Puedes ver el archivo `_profesionales/adrian-gonzalez.md` como referencia.

---

## ¿Qué hace Jekyll automáticamente?

| Se genera | Dónde |
|---|---|
| ✅ Una **tarjeta** en la pestaña "Nudo" del `index.html` | En `index.html` con el nombre, especialidad, cédula y enlaces |
| ✅ Una **página de perfil** independiente | En `_site/profesionales/nombre-apellido/index.html` |
| ✅ Navegación entre perfiles (anterior/siguiente) | Se genera automáticamente con JavaScript |
| ✅ Enlace a verificación de cédula SEP y REDAM | En cada tarjeta y perfil |

---

## Pasos finales

```bash
# 1. Reconstruir el sitio
bundle exec jekyll build

# 2. Subir los cambios a GitHub
git add .
git commit -m "Agrega colaborador: [Nombre del profesional]"
git push
```

> ⏱ Espera ~1-2 minutos a que GitHub Pages lo publique.

¡Listo! El nuevo colaborador aparecerá automáticamente en la sección **"El Nudo"** con su tarjeta y perfil completo. 🧠
