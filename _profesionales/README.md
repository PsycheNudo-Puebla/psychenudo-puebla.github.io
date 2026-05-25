# Cómo Agregar Profesionales a la Red

Para agregar un nuevo colega a la red de PsycheNudo Puebla, sigue estos pasos:

## 1. Crear archivo Markdown

En la carpeta `_profesionales/`, crea un archivo con el formato:
```
nombre-colegas.md
```

## 2. Front Matter (Encabezado YAML)

```yaml
---
layout: perfil
nombre: "Mtra. Carolina Vázquez"
especialidad: "Psicología Organizacional"
invitado_por: "Mtro. Adrián González"
external_url: "https://linkedin.com/in/carolina-vazquez"
cedula: "12345678"
---
```

### Campos requeridos:
- **nombre**: Nombre completo del profesional
- **especialidad**: Área de especialización
- **invitado_por**: Quién lo invitó al nudo
- **cedula**: Número de cédula profesional
- **external_url**: LinkedIn, blog o sitio web personal (opcional)
- **url_personal**: Ruta interna a una página personalizada (ej. `/adrian-gonzalez/`) (opcional)
- **calendario_url**: Enlace a la agenda de citas de Google Calendar o herramienta similar (opcional)

## 3. Contenido

Después del front matter, agrega una biografía profesional breve (2-4 párrafos).

## 4. Ejemplo completo

Ver `ejemplo-colega.md` como referencia.

## 5. Enviar cambios

- Fork del repositorio
- Crea una rama: `git checkout -b agregar-colega-nombre`
- Commit y push
- Crea un Pull Request

O contacta directamente a través de [GitHub Discussions](https://github.com/PsycheNudo-Puebla/psychenudo-puebla.github.io/discussions).
