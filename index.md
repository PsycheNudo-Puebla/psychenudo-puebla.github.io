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
        <div class="identidad">
            <h2>Acerca de PsycheNudo Puebla</h2>
            <div class="bloque-identidad">
                <div class="bloque-texto">
                    <h3>Un Nudo de Conocimiento y Conexión</h3>
                    <p>En PsycheNudo Puebla, creemos firmemente en la intersección entre la academia, la tecnología y la responsabilidad social. Somos un punto de encuentro para profesionales y estudiantes de psicología, comprometidos con la difusión de conocimiento validado y la creación de una red de apoyo mutuo en la región.</p>
                    <p>Nuestra plataforma busca trascender las aulas, llevando la teoría a la práctica y fomentando un espacio para el diálogo ético y la innovación en el campo de la salud mental.</p>
                </div>
                <div class="mision-vision">
                    <div class="tarjeta-identidad">
                        <h3>Nuestra Misión</h3>
                        <p>Ser un epicentro para la divulgación científica y tecnológica en salud mental, conectando la formación universitaria con el compromiso social y ofreciendo recursos validados por profesionales éticos.</p>
                    </div>
                    <div class="tarjeta-identidad">
                        <h3>Nuestra Visión</h3>
                        <p>Promover una comunidad informada y conectada de profesionales en psicología en Puebla, impulsando prácticas innovadoras y éticas que impacten positivamente en el bienestar de la sociedad.</p>
                    </div>
                </div>
            </div>
        </div>

        <section id="mas-alla-escuelas" class="seccion">
            <h2>Más allá de las Escuelas</h2>
            <p>PsycheNudo Puebla es un proyecto que nace de la necesidad de expandir el conocimiento psicológico más allá de los confines académicos. Buscamos fomentar una cultura de aprendizaje continuo y colaboración entre la comunidad profesional, integrando las nuevas tecnologías como herramientas para el desarrollo y la difusión del saber. Nuestro objetivo es crear un puente entre la investigación y la aplicación práctica, beneficiando tanto a estudiantes como a profesionales y, en última instancia, a la sociedad poblana.</p>
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