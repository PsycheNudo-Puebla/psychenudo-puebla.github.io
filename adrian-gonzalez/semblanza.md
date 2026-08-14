---
layout: null
permalink: /adrian-gonzalez/semblanza/
---
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Perfil profesional del Mtro. Alfredo Adrián González Lazcano, psicólogo clínico en Puebla. Especialista en Psicoanálisis y Cultura.">
    <meta name="keywords" content="psicólogo clínico Puebla, psicoanálisis, terapia individual, salud mental">
    <meta name="author" content="Mtro. Alfredo Adrián González Lazcano">
    <title>Semblanza - Mtro. Alfredo Adrián González Lazcano | Psicólogo Clínico</title>
    <link rel="icon" type="image/png" href="{{ '/assets/logo-adrian.png' | relative_url }}">
    <!-- Open Graph para compartir en redes -->
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="PsycheNudo Puebla">
    <meta property="og:title" content="Mtro. Alfredo Adrián González Lazcano | Psicólogo Clínico en Puebla">
    <meta property="og:description" content="Psicólogo clínico especialista en Psicoanálisis y Cultura. Terapia individual en Puebla. Agenda tu sesión en línea o presencial.">
    <meta property="og:url" content="{{ '/adrian-gonzalez/' | absolute_url }}">
    <meta property="og:image" content="{{ '/assets/logo-adrian.png' | absolute_url }}">
    <meta property="og:image:alt" content="Logo Adrian González - Psicólogo Clínico en Puebla">
    <meta property="og:locale" content="es_MX">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Mtro. Alfredo Adrián González Lazcano | Psicólogo Clínico en Puebla">
    <meta name="twitter:description" content="Psicólogo clínico especialista en Psicoanálisis y Cultura. Terapia individual en Puebla.">
    <meta name="twitter:image" content="{{ '/assets/logo-adrian.png' | absolute_url }}">
    <style>
        :root {
            /* Paleta profesional cálida - psicología del color */
            --primary: #5d2e46;
            --primary-dark: #3d1e2e;
            --primary-light: #8b5a6f;
            --accent: #c9a961;
            --accent-light: #e6d5a8;
            --bg-warm: #fdf8f3;
            --bg-card: #fffefc;
            --text-main: #2d2a28;
            --text-muted: #5a5550;
            --text-light: #8c8681;
            --shadow-soft: 0 4px 20px rgba(93, 46, 70, 0.08);
            --shadow-hover: 0 12px 40px rgba(93, 46, 70, 0.15);
            --radius: 16px;
            --radius-lg: 24px;
            --transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.75;
            color: var(--text-main);
            background-color: var(--bg-warm);
            background-image: 
                radial-gradient(circle at 20% 80%, rgba(201, 169, 97, 0.04) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(93, 46, 70, 0.03) 0%, transparent 50%),
                url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a961' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zm0-30V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            -webkit-font-smoothing: antialiased;
        }

        a { 
            color: var(--primary); 
            text-decoration: none; 
            transition: var(--transition);
            position: relative;
            font-weight: 500;
        }
        a:hover { color: var(--primary-dark); }
        a::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: -3px;
            left: 0;
            background: var(--accent);
            transition: var(--transition);
            border-radius: 2px;
        }
        a:hover::after { width: 100%; }

        .container { 
            width: min(94%, 1600px);
            margin: 0 auto; 
            padding: 0 32px; 
        }

        /* Header sin efecto glass */
        header {
            background: rgba(253, 248, 243, 0.85);
            border-bottom: 1px solid rgba(201, 169, 97, 0.2);
            position: static;
            z-index: 1000;
            padding: 1rem 0;
            transition: var(--transition);
        }
        header.scrolled {
            padding: 1rem 0;
            background: rgba(253, 248, 243, 0.95);
            box-shadow: var(--shadow-soft);
        }
        nav { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            gap: 1.5rem; 
        }
        .logo-brand {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }
        .logo-brand img {
            height: 100px;
            width: auto;
            transition: var(--transition);
        }
        .logo-brand img:hover {
            transform: scale(1.08);
        }
        .logo-text {
            display: flex;
            flex-direction: column;
            font-weight: 700;
            color: var(--primary);
        }
        .logo-text .name {
            font-size: 0.85rem;
            line-height: 1.2;
        }
        .nav-links { 
            display: flex; 
            gap: 2rem; 
            font-size: 0.95rem;
        }
        .nav-links a { 
            color: var(--text-muted); 
            padding: 0.4rem 0;
        }
        .nav-links a:hover { color: var(--primary); }
        .nav-links a::after { background: var(--accent); }

        /* Hero Section con impacto visual */
        .hero {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 3.5rem;
            padding: 4.5rem 0 3.5rem;
            position: relative;
        }
        .hero-cta {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 1.8rem;
        }
        .btn-cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            padding: 0.9rem 1.8rem;
            border-radius: 10px;
            font-weight: 600;
            font-size: 1rem;
            transition: var(--transition);
            border: 2px solid transparent;
        }
        .btn-cta.primary {
            background: linear-gradient(135deg, var(--accent), #b8964b);
            color: var(--primary-dark);
            box-shadow: 0 4px 15px rgba(201, 169, 97, 0.3);
        }
        .btn-cta.primary:hover {
            background: var(--bg-card);
            color: var(--accent);
            border-color: var(--accent);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(201, 169, 97, 0.4);
        }
        .btn-cta.secondary {
            background: var(--primary);
            color: #fff;
            box-shadow: 0 3px 10px rgba(93, 46, 70, 0.15);
        }
        .btn-cta.secondary:hover {
            background: var(--bg-card);
            color: var(--primary);
            border-color: var(--primary);
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(93, 46, 70, 0.2);
        }
        /* Botón Agendar en el header */
        .btn-nav-agendar {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 1.3rem;
            background: linear-gradient(135deg, var(--accent), #b8964b);
            color: var(--primary-dark);
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            box-shadow: 0 3px 10px rgba(201, 169, 97, 0.25);
            transition: var(--transition);
        }
        .btn-nav-agendar:hover {
            background: var(--primary);
            color: #fff;
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(93, 46, 70, 0.25);
        }
        .btn-nav-agendar::after { display: none; }
        .hero::before {
            content: '';
            position: absolute;
            top: -2rem;
            right: -2rem;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(201,169,97,0.15) 0%, transparent 70%);
            border-radius: 50%;
            z-index: 0;
            pointer-events: none;
        }
        
        .profile-photo {
            flex: 0 0 300px;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        @media (min-width: 1200px) {
            .profile-photo { flex-basis: 320px; }
        }
        .profile-photo::before {
            content: '';
            position: absolute;
            inset: -12px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            z-index: -1;
            opacity: 0.15;
            filter: blur(15px);
            animation: pulse 4s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.25; transform: scale(1.05); }
        }
        
        .profile-photo img {
            width: 100%;
            max-width: 300px;
            aspect-ratio: 1/1;
            object-fit: cover;
            border-radius: 50%;
            border: 5px solid var(--bg-card);
            box-shadow: var(--shadow-hover);
            transition: var(--transition);
        }
        @media (min-width: 1200px) {
            .profile-photo img { max-width: 320px; }
        }
        .profile-photo img:hover {
            transform: scale(1.03) rotate(1deg);
            box-shadow: 0 20px 50px rgba(93, 46, 70, 0.25);
        }
        
        .hero-text h1 { 
            font-size: 2.3rem; 
            color: var(--primary); 
            margin-bottom: 0.5rem;
            font-weight: 700;
            line-height: 1.15;
            position: relative;
            display: inline-block;
        }
        @media (min-width: 1200px) {
            .hero-text h1 { font-size: 2.7rem; }
        }
        .hero-text h1::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 60%;
            height: 4px;
            background: linear-gradient(90deg, var(--accent), transparent);
            border-radius: 2px;
        }
        .hero-text h2 { 
            font-size: 1.15rem; 
            color: var(--text-muted); 
            font-weight: 400; 
            margin: 1.4rem 0 1.5rem;
            padding-left: 1.2rem;
            border-left: 4px solid var(--accent);
        }

        /* Tarjetas con diseño premium */
        section {
            background: var(--bg-card);
            margin: 2rem 0;
            padding: 2.4rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-soft);
            transition: var(--transition);
            border: 1px solid rgba(201, 169, 97, 0.15);
            position: relative;
            overflow: hidden;
        }
        section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary));
            opacity: 0;
            transition: var(--transition);
        }
        section:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-hover);
            border-color: rgba(201, 169, 97, 0.35);
        }
        section:hover::before { opacity: 1; }
        
        h3 {
            color: var(--primary);
            margin: 0 0 1.4rem 0;
            padding-bottom: 0.8rem;
            border-bottom: 2px solid rgba(201, 169, 97, 0.4);
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 1.4rem;
            font-weight: 600;
        }
        h3::before {
            content: '✦';
            color: var(--accent);
            font-size: 1.3rem;
        }
        
        ul { 
            margin: 0 0 1.4rem 1.6rem; 
            list-style: none; 
        }
        li { 
            margin-bottom: 0.9rem; 
            padding-left: 1.8rem;
            position: relative;
            color: var(--text-muted);
        }
        li::before {
            content: '◦';
            position: absolute;
            left: 0;
            color: var(--accent);
            font-size: 1.8rem;
            top: -4px;
            font-weight: 300;
        }
        li strong { 
            color: var(--primary); 
            font-weight: 600;
        }
        
        p { 
            margin-bottom: 1.2rem; 
            color: var(--text-muted);
            font-size: 1.02rem;
        }
        .highlight { 
            font-weight: 600; 
            color: var(--primary);
            display: inline-block;
            margin-bottom: 0.5rem;
        }

        /* Grid Layout responsivo */
        .grid-2 { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 2.2rem; 
        }
        /* Fallback para iOS < 15 (sin soporte de aspect-ratio) */
        @supports not (aspect-ratio: 1 / 1) {
            .profile-photo img {
                height: 260px;
            }
        }

        /* Respetar usuarios con movimiento reducido */
        @media (prefers-reduced-motion: reduce) {
            section, .grid-2 { animation: none !important; opacity: 1 !important; }
            * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
            html { scroll-behavior: auto; }
        }

        /* Location Box con estilo cálido */
        .location-box {
            background: linear-gradient(145deg, #fffefc 0%, #faf7f2 100%);
            border: 2px dashed rgba(201, 169, 97, 0.5);
            border-radius: var(--radius);
            padding: 2rem;
            text-align: center;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: var(--transition);
            position: relative;
        }
        .location-box::before {
            content: '📍';
            font-size: 2.5rem;
            margin-bottom: 0.8rem;
            display: block;
        }
        .location-box:hover {
            border-color: var(--accent);
            background: linear-gradient(145deg, #fffcf7 0%, #f9f4ed 100%);
            transform: translateY(-3px);
            box-shadow: var(--shadow-hover);
        }
        .location-box .address { 
            font-weight: 600; 
            margin: 0.4rem 0; 
            color: var(--primary);
            font-size: 1.1rem;
            line-height: 1.4;
        }
        .location-box a.btn-map {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1.4rem;
            padding: 0.8rem 1.6rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: #fff;
            border-radius: 10px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(93, 46, 70, 0.25);
            transition: var(--transition);
            border: 2px solid transparent;
        }
        .location-box a.btn-map:hover { 
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(93, 46, 70, 0.35);
            color: #fff;
            border-color: var(--accent);
        }

        /* Social Links con personalidad */
        .social-links { 
            display: flex; 
            gap: 1rem; 
            margin-top: 1.4rem; 
            flex-wrap: wrap; 
        }
        .social-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.7rem;
            padding: 0.85rem 1.5rem;
            background: var(--primary);
            color: #fff;
            border-radius: 10px;
            font-weight: 500;
            transition: var(--transition);
            border: 2px solid transparent;
            box-shadow: 0 3px 10px rgba(93, 46, 70, 0.15);
        }
        .social-btn:hover { 
            background: var(--bg-card);
            color: var(--primary);
            border-color: var(--primary);
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(93, 46, 70, 0.2);
        }
        .social-btn.primary {
            background: linear-gradient(135deg, var(--accent), #b8964b);
            color: var(--primary-dark);
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(201, 169, 97, 0.3);
        }
        .social-btn.primary:hover {
            background: var(--bg-card);
            color: var(--accent);
            border-color: var(--accent);
            box-shadow: 0 8px 25px rgba(201, 169, 97, 0.4);
        }

        /* Verification Buttons elegantes */
        .verificacion-enlaces {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
            margin-top: 1.5rem;
            padding-top: 1.2rem;
            border-top: 1px solid rgba(201, 169, 97, 0.25);
        }
        .boton-verificacion {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.55rem 1.1rem;
            background: rgba(201, 169, 97, 0.12);
            color: var(--primary-dark);
            border: 1px solid rgba(201, 169, 97, 0.35);
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            transition: var(--transition);
        }
        .boton-verificacion:hover { 
            background: var(--primary); 
            color: #fff; 
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(93, 46, 70, 0.15);
        }

        /* Footer con calidez */
        footer {
            text-align: center;
            padding: 3.5rem 0 2.5rem;
            color: var(--text-light);
            border-top: 1px solid rgba(201, 169, 97, 0.25);
            margin-top: 3.5rem;
            background: linear-gradient(to top, rgba(253,248,243,0.9) 0%, transparent 100%);
        }
        .footer-logo {
            height: 70px;
            width: auto;
            margin-bottom: 0.5rem;
            opacity: 0.7;
            transition: var(--transition);
        }
        .footer-logo:hover {
            opacity: 1;
            transform: scale(1.05);
        }
        blockquote {
            font-style: italic;
            border-left: 4px solid var(--accent);
            padding-left: 1.5rem;
            margin: 2rem auto;
            max-width: 680px;
            color: var(--primary);
            font-size: 1.15rem;
            line-height: 1.6;
            background: rgba(201, 169, 97, 0.06);
            padding: 1.2rem 1.5rem 1.2rem 2rem;
            border-radius: 0 12px 12px 0;
        }

        /* Estilos para el calendario embebido */
        .calendar-embed {
            width: 100%;
            height: 600px;
            border-radius: var(--radius);
            overflow: hidden;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(201, 169, 97, 0.2);
        }

        /* Animaciones de entrada suaves */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(25px); }
            to { opacity: 1; transform: translateY(0); }
        }
        section {
            animation: fadeInUp 0.6s ease-out forwards;
            opacity: 0;
        }
        section:nth-child(1) { animation-delay: 0.1s; opacity: 1; }
        section:nth-child(2) { animation-delay: 0.2s; }
        section:nth-child(3) { animation-delay: 0.3s; }
        section:nth-child(4) { animation-delay: 0.4s; }
        .grid-2 { animation: fadeInUp 0.6s ease-out 0.5s forwards; opacity: 0; }

        /* Separador decorativo entre secciones */
        .section-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(201,169,97,0.4), transparent);
            margin: 2.5rem 0;
            position: relative;
        }
        .section-divider::before {
            content: '✦';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-warm);
            padding: 0 1rem;
            color: var(--accent);
            font-size: 1.2rem;
        }

        /* Utilidades */
        .text-center { text-align: center; }
        .mt-2 { margin-top: 2rem; }
        .mb-1 { margin-bottom: 1rem; }
        .accent-text { color: var(--accent); font-weight: 600; }

        /* Sistema de Vistas */
        .view-section {
            display: block;
            animation: fadeInUp 0.6s ease-out forwards;
        }
        /* Mantenemos el flex para el hero */
        section.hero {
            display: flex;
        }
        /* Botón Volver */
        .btn-back {
            display: none;
            align-items: center;
            gap: 0.5rem;
            padding: 0.8rem 1.6rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: #fff;
            border-radius: 10px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(93, 46, 70, 0.25);
            transition: var(--transition);
            border: 2px solid transparent;
            cursor: pointer;
            margin-bottom: 2rem;
            font-size: 0.95rem;
        }
        .btn-back.show {
            display: inline-flex;
        }
        .btn-back:hover { 
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(93, 46, 70, 0.35);
        }

        /* Navigation en modo vista */
        nav.view-mode {
            justify-content: center;
            flex-direction: column;
            gap: 1rem;
        }
        nav.view-mode .nav-links {
            justify-content: center;
            flex-wrap: wrap;
        }

        /* ====== Ajustes móviles (al final para prioridad sobre reglas base) ====== */
        /* Texto legible en tarjetas anchas (desktop) */
        @media (min-width: 1200px) {
            section:not(.hero) > h3,
            section:not(.hero) > p,
            section:not(.hero) > ul {
                max-width: 980px;
                margin-left: auto;
                margin-right: auto;
            }
            section:not(.hero) > .verificacion-enlaces {
                justify-content: center;
            }
        }
        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; gap: 1.4rem; } 
            section {
                padding: 1.6rem;
            }
            .hero { 
                flex-direction: column; 
                text-align: center; 
                padding: 2.5rem 1.6rem 2rem;
            }
            .hero-text h1::after { left: 50%; transform: translateX(-50%); }
            .hero-text h2 {
                border-left: none;
                border-bottom: 4px solid var(--accent);
                padding-left: 0;
                padding-bottom: 1rem;
                display: inline-block;
            }
            .logo-brand {
                flex-direction: column;
                gap: 0.4rem;
            }
            .logo-brand img {
                height: 80px;
            }
            .logo-text .name {
                font-size: 0.7rem;
                text-align: center;
            }
            .nav-links { 
                gap: 0.8rem; 
                font-size: 0.9rem;
                flex-wrap: wrap;
                justify-content: center;
            }
            .nav-links a {
                min-height: 44px;
                min-width: 44px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .btn-nav-agendar {
                min-height: 44px;
            }
            .hero-cta {
                justify-content: center;
            }
            .btn-cta {
                min-height: 44px;
                font-size: 0.95rem;
                padding: 0.75rem 1.2rem;
            }
            nav { 
                justify-content: center; 
                flex-direction: column;
                gap: 0.6rem;
            }
            .social-btn,
            .btn-map,
            .boton-verificacion {
                min-height: 44px;
            }
            .social-btn {
                justify-content: center;
                font-size: 0.95rem;
                padding: 0.75rem 1.1rem;
            }
            .calendar-embed { height: 520px; }
        }
    </style>
</head>
<body>

    <header>
        <div class="container">
            <nav>
                <div class="logo-brand">
                    <img src="{{ '/assets/logo-adrian.png' | relative_url }}" 
                         alt="Logo Adrian González"
                         onerror="this.style.display='none'">
                    <div class="logo-text">
                        <div class="name">Mtro. Alfredo Adrián<br>González Lazcano</div>
                    </div>
                </div>
                <div class="nav-links">
                    <a href="/adrian-gonzalez/">Inicio</a>
                    <a href="/adrian-gonzalez/#practica">Práctica</a>
                    <a href="/adrian-gonzalez/#experiencia">Experiencia</a>
                    <a href="/adrian-gonzalez/#ubicacion">Ubicación</a>
                    <a href="/adrian-gonzalez/#redes">Contacto</a>
                    <a href="/adrian-gonzalez/cv/">CV</a>
                    <a href="/adrian-gonzalez/semblanza/">Semblanza</a>
                    <a href="https://cal.com/adrian-gonzalez-mh0bym/sesion" class="btn-nav-agendar" target="_blank" rel="noopener noreferrer">📅 Agendar</a>
                </div>
            </nav>
        </div>
    </header>

    <main class="container">
        <section class="view-section active" style="margin-top: 2rem;">
            <h3>Semblanza</h3>
            <p><strong>Mtro. Alfredo Adrián González Lazcano — Psicólogo, docente y psicoanalista</strong></p>
            <p>Hay trayectorias profesionales que se construyen desde la certeza; otras, desde la disposición a seguir preguntando. La de Alfredo Adrián González Lazcano pertenece a las segundas: más de quince años de recorrido entre la clínica, la docencia y la cultura, con la convicción de que la salud mental no es una receta técnica, sino una ética de la escucha.</p>
            
            <div class="section-divider"></div>

            <h3>Una formación entre la psicología y el psicoanálisis</h3>
            <p>Es Licenciado en Psicología General por la Universidad Popular Autónoma del Estado de Puebla (UPAEP) y Maestro en Psicoanálisis y Cultura por la Escuela Libre de Psicología. Esa doble raíz —el rigor universitario y la profundidad crítica del psicoanálisis— marca su manera de entender el malestar psíquico: no como un síntoma a eliminar, sino como un mensaje a descifrar.</p>
            <p>Cuenta con capacitación por la Organización Panamericana de la Salud (OPS) en Prevención de Autolesión y Suicidio, y mantiene una constante actualización profesional mediante su asistencia regular a los congresos de salud mental organizados por el Instituto Nacional de Psiquiatría Ramón de la Fuente Muñiz (INPRFM).</p>
            <h3>Divulgación y proyecto digital</h3>
            <p>Actualmente dirige y desarrolla el espacio <strong>Psychenudo</strong>, un proyecto digital enfocado en la divulgación, la reflexión clínica y la creación de recursos para la comunidad de la salud mental, donde articula la clínica de orientación psicoanalítica con herramientas tecnológicas aplicadas a la educación y la práctica profesional.</p>
            
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
    </main>

    <!-- Footer -->
    <footer>
        <div class="container">
            <img src="{{ '/assets/logo-adrian.png' | relative_url }}" alt="Logo Adrian González" class="footer-logo">
            <blockquote>«“Yo he hecho eso”, dice mi memoria.  “Yo no puedo haber hecho eso” — dice mi orgullo y permanece inflexible. Al final — la memoria cede.»<br><small>— Friedrich Nietzsche</small></blockquote>
            <p style="margin-top: 1.8rem; font-size: 0.85rem; color: var(--text-light);">
                © 2026 Mtro. Alfredo Adrián González Lazcano • Puebla, México
            </p>
        </div>
    </footer>

    <script>
        // Header scroll effect
        window.addEventListener('scroll', function() {
            const header = document.querySelector('header');
            if (window.scrollY > 40) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    </script>
</body>
</html>
