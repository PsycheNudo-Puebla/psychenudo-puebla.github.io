import os
import re

base_path = "/home/trabajo/Escritorio/TECLADO_HP/aplicaciones_linux/psychenudo-puebla .github.io/"

with open(base_path + "adrian-gonzalez.html", "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r"(<main class=\"container\">)(.*?)(</main>)", content, re.DOTALL)
if not match:
    print("Could not find main container")
    exit(1)

pre_main = content[:match.start(2)]
post_main = content[match.end(2):]

cv_main = """
        <section class="view-section active" style="margin-top: 2rem;">
            <h3>Curriculum Vitae</h3>
            <p><strong>Alfredo Adrián González Lazcano</strong><br>
            Bosques de San Sebastián, Puebla<br>
            📞 222 134 8932<br>
            ✉️ adrian.gonzalez.lazcano@gmail.com</p>
            
            <div class="section-divider"></div>

            <h3>Síntesis Profesional</h3>
            <p>Psicólogo clínico y docente con más de una década de experiencia. Especializado en fomentar el pensamiento crítico mediante estrategias pedagógicas reflexivas. En el área clínica, cuento con trayectoria en la atención a adultos, abordando procesos de duelo, trauma y violencia con un enfoque empático y personalizado, orientado a la sanación y el bienestar emocional.</p>
            
            <div class="section-divider"></div>

            <h3>Experiencia Profesional</h3>
            <ul>
                <li><strong>Docente</strong> — Universidad del Valle de Puebla<br>
                <span style="color: var(--text-light); font-size: 0.9em;">Ago 2024 – Actual</span><br>
                Cátedras de Teoría Psicoanalítica y Trastornos del Adulto. Asesoría académica y seguimiento del diseño curricular.</li>
                <li><strong>Docente</strong> — Instituto de Estudios Avanzados Universitarios<br>
                <span style="color: var(--text-light); font-size: 0.9em;">Ago 2019 – Actual</span><br>
                Impartición de Transdisciplina I y II, y Filosofía de la Psicología. Implementación de técnicas innovadoras de enseñanza y evaluación continua.</li>
                <li><strong>Docente</strong> — Universitario Cristóbal Colón<br>
                <span style="color: var(--text-light); font-size: 0.9em;">Ago 2012 – Actual</span><br>
                Especialista en Psicopatología, Psicoterapia e Intervención en Crisis. Desarrollo de recursos didácticos adaptados a las necesidades del estudiantado.</li>
                <li><strong>Terapeuta Clínico</strong> — Consultorio Privado<br>
                <span style="color: var(--text-light); font-size: 0.9em;">2010 – Actual</span><br>
                Consulta privada para adultos, facilitación de grupos de estudio y supervisión clínica.</li>
            </ul>

            <div class="section-divider"></div>

            <h3>Formación Académica</h3>
            <ul>
                <li><strong>Maestría en Psicoanálisis y Cultura</strong> (2011 – 2013)<br>
                Escuela Libre de Psicología, Puebla.</li>
                <li><strong>Licenciatura en Psicología General</strong> (2005 – 2009)<br>
                Universidad Popular Autónoma del Estado de Puebla (UPAEP).</li>
            </ul>

            <div class="section-divider"></div>

            <h3>Competencias y Herramientas</h3>
            <ul>
                <li><strong>Docencia:</strong> Planificación curricular, gestión de aula y atención a la diversidad.</li>
                <li><strong>Clínica:</strong> Psicoterapia de adultos, intervención en crisis y acompañamiento empático.</li>
                <li><strong>Tecnología:</strong> Integración de IA educativa (ChatGPT) y recursos digitales didácticos.</li>
            </ul>

            <div class="section-divider"></div>

            <h3>Idiomas y Otros</h3>
            <ul>
                <li><strong>Español:</strong> Nativo</li>
                <li><strong>Inglés:</strong> Intermedio</li>
                <li><strong>Referencias:</strong> Disponibles a solicitud.</li>
            </ul>
            
            <div class="hero-cta" style="margin-top: 2rem;">
                <a href="https://cal.com/adrian-gonzalez-mh0bym/sesion" class="btn-cta primary" target="_blank" rel="noopener noreferrer">📅 Agendar una sesión</a>
                <a href="https://wa.me/522221348932" class="btn-cta secondary" target="_blank" rel="noopener noreferrer">💬 Contactar por WhatsApp</a>
            </div>
        </section>
"""

semb_main = """
        <section class="view-section active" style="margin-top: 2rem;">
            <h3>Semblanza</h3>
            <p><strong>Mtro. Alfredo Adrián González Lazcano — Psicólogo, docente y psicoanalista</strong></p>
            <p>Hay trayectorias profesionales que se construyen desde la certeza; otras, desde la disposición a seguir preguntando. La de Alfredo Adrián González Lazcano pertenece a las segundas: más de quince años de recorrido entre la clínica, la docencia y la cultura, con la convicción de que la salud mental no es una receta técnica, sino una ética de la escucha.</p>
            
            <div class="section-divider"></div>

            <h3>Una formación entre la psicología y el psicoanálisis</h3>
            <p>Es Licenciado en Psicología General por la Universidad Popular Autónoma del Estado de Puebla (UPAEP) y Maestro en Psicoanálisis y Cultura por la Escuela Libre de Psicología. Esa doble raíz —el rigor universitario y la profundidad crítica del psicoanálisis— marca su manera de entender el malestar psíquico: no como un síntoma a eliminar, sino como un mensaje a descifrar.</p>
            <p>Cuenta con certificación por la Organización Panamericana de la Salud (OPS) en Prevención de Autolesión y Suicidio, y participa activamente en congresos de salud mental del Instituto Nacional de Psiquiatría Ramón de la Fuente Muñiz (INPRFM).</p>
            
            <div class="section-divider"></div>

            <h3>La clínica como consultorio de la palabra</h3>
            <p>Desde 2010 sostiene un consultorio privado donde acompaña a adultos en procesos de duelo, trauma y violencia. Su práctica se centra en el estudio de la subjetividad: el autoconocimiento, las dinámicas vinculares, la identidad y el deseo, y la gestión de la culpa, la angustia y el vacío.</p>
            <p>Lejos de las soluciones estandarizadas, apuesta por un encuadre seguro donde la asociación libre permite que emerjan los elementos inconscientes que configuran la realidad presente. El horizonte no es la adaptación, sino la autonomía: desanudar los patrones que se repiten y fortalecer la posición de cada persona frente a su propio deseo.</p>
            
            <div class="section-divider"></div>

            <h3>La docencia como forma de transmisión</h3>
            <p>La enseñanza es, para él, la otra cara de la clínica. Durante más de una década ha impartido cátedra en el Universitario Cristóbal Colón (Psicopatología, Psicoterapia e Intervención en Crisis), en el Instituto de Estudios Avanzados Universitarios (Transdisciplina y Filosofía de la Psicología) y, actualmente, en la Universidad del Valle de Puebla (Teoría Psicoanalítica y Trastornos del Adulto).</p>
            <p>En el aula promueve el pensamiento crítico mediante estrategias pedagógicas reflexivas, y no teme incorporar las nuevas tecnologías: integra herramientas de inteligencia artificial como recurso didáctico, tendiendo puentes entre la tradición del pensamiento y los lenguajes del presente.</p>
            
            <div class="section-divider"></div>

            <h3>El valor de la propia terapia</h3>
            <p>Si algo define su ética profesional es haber experimentado en carne propia aquello que ofrece: la psicoterapia como eje de transformación. El psicoanálisis le ha permitido tolerar la complejidad de la mente humana y cultivar una autenticidad que hoy es el pilar de su práctica.</p>
            <p>Fuera del consultorio y del aula, le apasiona la intersección entre arte, filosofía y tecnología; escribe sobre la condición humana y participa en seminarios de psicología profunda.</p>
            
            <div class="hero-cta" style="margin-top: 2rem;">
                <a href="https://cal.com/adrian-gonzalez-mh0bym/sesion" class="btn-cta primary" target="_blank" rel="noopener noreferrer">📅 Agenda una sesión</a>
                <a href="https://wa.me/522221348932" class="btn-cta secondary" target="_blank" rel="noopener noreferrer">💬 Escríbeme por WhatsApp</a>
            </div>
        </section>
"""

template_parts = pre_main.split("---", 2)
if len(template_parts) >= 3:
    base_pre_main = template_parts[2]
else:
    base_pre_main = pre_main

cv_pre_main = base_pre_main.replace("<title>Mtro. Alfredo Adrián González Lazcano | Psicólogo Clínico</title>", "<title>CV - Mtro. Alfredo Adrián González Lazcano</title>")
semb_pre_main = base_pre_main.replace("<title>Mtro. Alfredo Adrián González Lazcano | Psicólogo Clínico</title>", "<title>Semblanza - Mtro. Alfredo Adrián González Lazcano</title>")

cv_content = f"""---
layout: null
permalink: /adrian-gonzalez/cv/
---
{cv_pre_main}{cv_main}{post_main}"""

semb_content = f"""---
layout: null
permalink: /adrian-gonzalez/semblanza/
---
{semb_pre_main}{semb_main}{post_main}"""

with open(base_path + "adrian-gonzalez/cv.md", "w", encoding="utf-8") as f:
    f.write(cv_content)

with open(base_path + "adrian-gonzalez/semblanza.md", "w", encoding="utf-8") as f:
    f.write(semb_content)

print("HTML generation successful")
