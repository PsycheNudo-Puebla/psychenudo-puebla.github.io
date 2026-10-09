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

template_parts = pre_main.split("---", 2)
if len(template_parts) >= 3:
    base_pre_main = template_parts[2]
else:
    base_pre_main = pre_main

cv_pre_main = base_pre_main.replace("<title>Mtro. Alfredo Adrián González Lazcano | Psicólogo Clínico</title>", "<title>CV - Mtro. Alfredo Adrián González Lazcano</title>")

cv_content = f"""---
layout: null
permalink: /adrian-gonzalez/cv/
---
{cv_pre_main}{cv_main}{post_main}"""

with open(base_path + "adrian-gonzalez/cv.md", "w", encoding="utf-8") as f:
    f.write(cv_content)

print("HTML generation successful")
