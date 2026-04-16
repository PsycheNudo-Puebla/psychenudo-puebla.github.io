---
layout: default
---

<section id="mision" class="seccion">
    <h2>Nuestra Misión</h2>
    <p>Un espacio dedicado a la divulgación científica y tecnológica en el área de la salud mental. En <strong>PsycheNudo Puebla</strong>, conectamos la formación académica universitaria con la responsabilidad social, ofreciendo recursos validados y una red de profesionales éticos.</p>
</section>

<section id="red" class="seccion">
    <h2>Red de Profesionales (El Nudo)</h2>
    <p>Colaboradores validados para atención y orientación:</p>
    
    <div class="tarjeta-colega">
        <h3>Mtro. Adrián González</h3>
        <p>Psicólogo Clínico y Catedrático Universitario. Desarrollador de herramientas psicoeducativas.</p>
        <p><strong>Cédula Profesional:</strong> [Ingresa tu cédula aquí]</p>
        <a href="https://linkedin.com/in/tu-perfil" class="boton" target="_blank">Ver Perfil en LinkedIn</a>
    </div>
</section>

<section id="recursos" class="seccion">
    <h2>Proyectos Pedagógicos e Interactivos</h2>
    <p>Recursos digitales y aplicaciones desarrolladas por alumnos de psicología bajo supervisión académica.</p>
    <p><em>Próximamente: Galería de herramientas HTML/Python.</em></p>
</section>

<section id="comunidad" class="seccion">
    <h2>Comunidad Profesional</h2>
    <p>Únete a nuestras discusiones y comparte experiencias con colegas.</p>
    <a href="https://github.com/psychenudo-puebla/psychenudo-puebla.github.io/discussions" class="boton" target="_blank">Foro en GitHub Discussions</a>
    <a href="https://discord.gg/tu-servidor" class="boton" target="_blank">Chat en Discord</a> <!-- Reemplaza con enlace real -->
</section>

<section id="articulos" class="seccion">
    <h2>Biblioteca de Artículos</h2>
    <p>Textos de divulgación y reflexión clínica. Haz clic en el título para leer en pantalla.</p>
    <ul class="lista-articulos">
        {% for articulo in site.articulos %}
        <li>
            📄 <a href="{{ articulo.url }}">{{ articulo.title }}</a>
            <small>{{ articulo.autor }} · {{ articulo.fecha }} · {{ articulo.categoria }}</small>
        </li>
        {% endfor %}
    </ul>
</section>