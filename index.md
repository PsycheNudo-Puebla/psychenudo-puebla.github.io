---
layout: default
---

<div class="tabs-panel">
    <div class="tabs">
        <button class="tab active" onclick="openTab(event, 'mision')">Misión</button>
        <button class="tab" onclick="openTab(event, 'red')">El Nudo</button>
        <button class="tab" onclick="openTab(event, 'recursos')">Recursos</button>
        <button class="tab" onclick="openTab(event, 'articulos')">Biblioteca</button>
    </div>

    <div id="mision" class="tab-content active">
        <section class="seccion">
            <h2>Nuestra Misión</h2>
            <p>Un espacio dedicado a la divulgación científica y tecnológica en el área de la salud mental. En <strong>PsycheNudo Puebla</strong>, conectamos la formación académica universitaria con la responsabilidad social, ofreciendo recursos validados y una red de profesionales éticos.</p>
        </section>

        <section id="comunidad" class="seccion">
            <h2>Comunidad Profesional</h2>
            <p>Únete a nuestras discusiones y comparte experiencias con colegas.</p>
            <a href="https://github.com/psychenudo-puebla/psychenudo-puebla.github.io/discussions" class="boton" target="_blank">Foro en GitHub Discussions</a>
            <a href="https://discord.gg/tu-servidor" class="boton" target="_blank">Chat en Discord</a>
        </section>
    </div>

    <div id="red" class="tab-content">
        <section class="seccion">
            <h2>Red de Profesionales (El Nudo)</h2>
            <p>Colaboradores validados para atención y orientación:</p>
            
            <div class="grid-colegas">
                {% for colega in site.profesionales %}
                <div class="tarjeta-colega">
                    <h3>{{ colega.nombre }}</h3>
                    <span class="especialidad-colega">{{ colega.especialidad }}</span>
                    <p>{{ colega.content | strip_html | truncatewords: 25 }}</p>
                    <p><strong>Cédula:</strong> {{ colega.cedula }}</p>
                    {% if colega.external_url %}
                    <a href="{{ colega.external_url }}" class="boton" target="_blank">Ver Perfil</a>
                    {% endif %}
                </div>
                {% endfor %}
            </div>
        </section>
    </div>

    <div id="recursos" class="tab-content">
        <section class="seccion">
            <h2>Proyectos Pedagógicos e Interactivos</h2>
            <p>Recursos digitales y aplicaciones desarrolladas por alumnos de psicología bajo supervisión académica.</p>
            <p><em>Próximamente: Galería de herramientas HTML/Python.</em></p>
        </section>
    </div>

    <div id="articulos" class="tab-content">
        <section class="seccion">
            <h2>Biblioteca de Artículos</h2>
            <p>Textos de divulgación y reflexión clínica. Haz clic en el título para leer en pantalla.</p>
            <ul class="lista-articulos">
                {% for articulo in site.articulos %}
                <li>
                    📄 <a href="{{ articulo.url }}">{{ articulo.title }}</a>
                    <small>{{ articulo.autor }} · {{ articulo.date | date: "%d/%m/%Y" }} · {{ articulo.categoria }}</small>
                </li>
                {% endfor %}
            </ul>
        </section>
    </div>
</div>