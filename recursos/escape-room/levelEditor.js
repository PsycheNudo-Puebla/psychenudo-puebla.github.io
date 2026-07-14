/*
 * Level Creator — editor de sets de preguntas para docentes.
 * Produce un JSON con la misma estructura que psicometria.json:
 *   { "levels": [ { id, type, title, ...camposPorTipo } ] }
 * El motor (processJSONData) ya consume cualquier set válido.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'escapeRoomCustomSet';
    const LEVEL_TYPES = ['date', 'atomic', 'art', 'tower', 'snakes', 'bridge', 'dragon', 'tennis', 'maze'];
    const TYPE_LABELS = {
        date: 'Fecha / Clave (Biblioteca)',
        atomic: 'Rasgos (Estatuas)',
        art: 'Arte / Estilo (Cuadros)',
        tower: 'Torre (Ordenar letras)',
        snakes: 'Serpientes (Salas A/B)',
        bridge: 'Puente (Verdadero/Falso)',
        dragon: 'Dragón (Opciones)',
        tennis: 'Tenis (Opciones)',
        maze: 'Laberinto (V/F)'
    };

    let editorData = { name: 'Mis Niveles', levels: [] };
    let overlay, levelsRoot;

    /* ---------- Plantillas por tipo ---------- */
    function defaultLevel(type) {
        const base = { id: 1, type: type, title: '' };
        switch (type) {
            case 'date':
                return Object.assign(base, {
                    object: '', pistaLibrero: '', claveCIE: '', discoveryYear: '',
                    longitudClave: 3, bookshelfHints: ['', '']
                });
            case 'atomic':
                return Object.assign(base, {
                    challenges: [{ prompt: '', targetValue: 0, items: [{ name: '', val: 0, shape: 'statue', color: '#3cbcfc' }] }]
                });
            case 'art':
                return Object.assign(base, {
                    targetStyle: '', description: '',
                    paintings: [{ name: '', description: '', style: '' }]
                });
            case 'tower':
                return Object.assign(base, {
                    description: '',
                    items: [{ id: 1, name: '', color: '#3cbcfc', size: 1 }]
                });
            case 'snakes':
                return Object.assign(base, {
                    description: '',
                    roomA: [{ name: '', desc: '', correct: false }],
                    roomB: [{ name: '', desc: '', correct: false }]
                });
            case 'bridge':
            case 'maze':
                return Object.assign(base, { questions: [{ prompt: '', correct: 'V' }] });
            case 'dragon':
            case 'tennis':
                return Object.assign(base, { questions: [{ question: '', options: ['', '', ''], correct: 0 }] });
        }
        return base;
    }

    /* ---------- Helpers de UI ---------- */
    function el(tag, attrs, children) {
        const e = document.createElement(tag);
        if (attrs) for (const k in attrs) {
            if (k === 'class') e.className = attrs[k];
            else if (k === 'text') e.textContent = attrs[k];
            else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
            else if (k === 'html') e.innerHTML = attrs[k];
            else e.setAttribute(k, attrs[k]);
        }
        if (children) (Array.isArray(children) ? children : [children]).forEach(c => { if (c) e.appendChild(c); });
        return e;
    }

    function field(parent, label, type, value, onChange, extra) {
        const wrap = el('div', { class: 'ed-field' });
        wrap.appendChild(el('label', { text: label }));
        const input = el('input', Object.assign({ type: type, value: value == null ? '' : value, class: 'ed-input' }, extra || {}));
        input.addEventListener('input', () => onChange(input.value));
        wrap.appendChild(input);
        parent.appendChild(wrap);
        return input;
    }

    function selectField(parent, label, value, options, onChange) {
        const wrap = el('div', { class: 'ed-field' });
        wrap.appendChild(el('label', { text: label }));
        const sel = el('select', { class: 'ed-input' });
        options.forEach(o => {
            const opt = el('option', { value: o.value, text: o.text });
            if (o.value === value) opt.selected = true;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', () => onChange(sel.value));
        wrap.appendChild(sel);
        parent.appendChild(wrap);
        return sel;
    }

    function checkboxField(parent, label, checked, onChange) {
        const wrap = el('div', { class: 'ed-field ed-inline' });
        const inp = el('input', { type: 'checkbox' });
        inp.checked = !!checked;
        inp.addEventListener('change', () => onChange(inp.checked));
        wrap.appendChild(inp);
        wrap.appendChild(el('label', { text: label }));
        parent.appendChild(wrap);
        return inp;
    }

    function button(label, onClick, cls) {
        return el('button', { class: 'ed-btn ' + (cls || ''), text: label, onclick: onClick });
    }

    /* ---------- Editores de listas (preguntas / items / etc) ---------- */
    function arrayBlock(parent, opts) {
        // opts: { title, items, makeDefault, rowRenderer, addLabel }
        const section = el('div', { class: 'ed-subblock' });
        section.appendChild(el('div', { class: 'ed-subtitle', text: opts.title }));
        const list = el('div', { class: 'ed-list' });
        opts.items.forEach((item, i) => {
            const row = el('div', { class: 'ed-row' });
            const head = el('div', { class: 'ed-rowhead' });
            head.appendChild(el('span', { text: (opts.title + ' #' + (i + 1)) }));
            head.appendChild(button('✕', () => { opts.items.splice(i, 1); renderLevels(); }, 'ed-danger ed-mini'));
            row.appendChild(head);
            opts.rowRenderer(row, item);
            list.appendChild(row);
        });
        section.appendChild(list);
        section.appendChild(button(opts.addLabel || '+ Añadir', () => { opts.items.push(opts.makeDefault()); renderLevels(); }, 'ed-add'));
        parent.appendChild(section);
    }

    function stringListBlock(parent, title, arr) {
        arrayBlock(parent, {
            title: title, items: arr, makeDefault: () => '', addLabel: '+ Añadir pista',
            rowRenderer: (row, item) => {
                const idx = arr.indexOf(item);
                field(row, 'Texto', 'text', item, v => { arr[idx] = v; });
            }
        });
    }

    /* ---------- Render por tipo ---------- */
    function renderTypeFields(card, lvl) {
        switch (lvl.type) {
            case 'date':
                field(card, 'Objeto / Reporte', 'text', lvl.object, v => lvl.object = v);
                field(card, 'Pista del librero', 'text', lvl.pistaLibrero, v => lvl.pistaLibrero = v);
                field(card, 'Clave CIE', 'text', lvl.claveCIE, v => lvl.claveCIE = v);
                field(card, 'Año de descubrimiento', 'text', lvl.discoveryYear, v => lvl.discoveryYear = v);
                field(card, 'Longitud de clave', 'number', lvl.longitudClave, v => lvl.longitudClave = parseInt(v, 10) || 0);
                stringListBlock(card, 'Pistas del librero', lvl.bookshelfHints);
                break;
            case 'atomic':
                arrayBlock(card, {
                    title: 'Retos', items: lvl.challenges, makeDefault: () => ({ prompt: '', targetValue: 0, items: [{ name: '', val: 0, shape: 'statue', color: '#3cbcfc' }] }), addLabel: '+ Añadir reto',
                    rowRenderer: (row, ch) => {
                        const ci = lvl.challenges.indexOf(ch);
                        field(row, 'Enunciado', 'text', ch.prompt, v => lvl.challenges[ci].prompt = v);
                        field(row, 'Valor objetivo', 'number', ch.targetValue, v => lvl.challenges[ci].targetValue = parseInt(v, 10) || 0);
                        arrayBlock(row, {
                            title: 'Estatuas', items: ch.items, makeDefault: () => ({ name: '', val: 0, shape: 'statue', color: '#3cbcfc' }), addLabel: '+ Añadir estatua',
                            rowRenderer: (r2, it) => {
                                const ii = ch.items.indexOf(it);
                                field(r2, 'Nombre', 'text', it.name, v => ch.items[ii].name = v);
                                field(r2, 'Valor', 'number', it.val, v => ch.items[ii].val = parseInt(v, 10) || 0);
                                field(r2, 'Color (hex)', 'text', it.color, v => ch.items[ii].color = v);
                            }
                        });
                    }
                });
                break;
            case 'art':
                field(card, 'Estilo objetivo', 'text', lvl.targetStyle, v => lvl.targetStyle = v);
                field(card, 'Descripción', 'text', lvl.description, v => lvl.description = v);
                arrayBlock(card, {
                    title: 'Cuadros', items: lvl.paintings, makeDefault: () => ({ name: '', description: '', style: '' }), addLabel: '+ Añadir cuadro',
                    rowRenderer: (row, p) => {
                        const pi = lvl.paintings.indexOf(p);
                        field(row, 'Nombre', 'text', p.name, v => lvl.paintings[pi].name = v);
                        field(row, 'Descripción', 'text', p.description, v => lvl.paintings[pi].description = v);
                        field(row, 'Estilo', 'text', p.style, v => lvl.paintings[pi].style = v);
                    }
                });
                break;
            case 'tower':
                field(card, 'Descripción', 'text', lvl.description, v => lvl.description = v);
                arrayBlock(card, {
                    title: 'Letras / Bloques', items: lvl.items, makeDefault: () => ({ id: lvl.items.length + 1, name: '', color: '#3cbcfc', size: 1 }), addLabel: '+ Añadir bloque',
                    rowRenderer: (row, it) => {
                        const ii = lvl.items.indexOf(it);
                        field(row, 'Nombre', 'text', it.name, v => lvl.items[ii].name = v);
                        field(row, 'Color (hex)', 'text', it.color, v => lvl.items[ii].color = v);
                        field(row, 'Tamaño', 'number', it.size, v => lvl.items[ii].size = parseInt(v, 10) || 1);
                    }
                });
                break;
            case 'snakes':
                field(card, 'Descripción', 'text', lvl.description, v => lvl.description = v);
                arrayBlock(card, {
                    title: 'Sala A', items: lvl.roomA, makeDefault: () => ({ name: '', desc: '', correct: false }), addLabel: '+ Añadir opción',
                    rowRenderer: (row, o) => {
                        const i = lvl.roomA.indexOf(o);
                        field(row, 'Nombre', 'text', o.name, v => lvl.roomA[i].name = v);
                        field(row, 'Descripción', 'text', o.desc, v => lvl.roomA[i].desc = v);
                        checkboxField(row, '¿Correcta?', o.correct, v => lvl.roomA[i].correct = v);
                    }
                });
                arrayBlock(card, {
                    title: 'Sala B', items: lvl.roomB, makeDefault: () => ({ name: '', desc: '', correct: false }), addLabel: '+ Añadir opción',
                    rowRenderer: (row, o) => {
                        const i = lvl.roomB.indexOf(o);
                        field(row, 'Nombre', 'text', o.name, v => lvl.roomB[i].name = v);
                        field(row, 'Descripción', 'text', o.desc, v => lvl.roomB[i].desc = v);
                        checkboxField(row, '¿Correcta?', o.correct, v => lvl.roomB[i].correct = v);
                    }
                });
                break;
            case 'bridge':
            case 'maze':
                arrayBlock(card, {
                    title: 'Preguntas (V/F)', items: lvl.questions, makeDefault: () => ({ prompt: '', correct: 'V' }), addLabel: '+ Añadir pregunta',
                    rowRenderer: (row, q) => {
                        const qi = lvl.questions.indexOf(q);
                        field(row, 'Enunciado', 'text', q.prompt, v => lvl.questions[qi].prompt = v);
                        selectField(row, 'Respuesta', q.correct, [{ value: 'V', text: 'Verdadero' }, { value: 'F', text: 'Falso' }], v => lvl.questions[qi].correct = v);
                    }
                });
                break;
            case 'dragon':
            case 'tennis':
                arrayBlock(card, {
                    title: 'Preguntas (opciones)', items: lvl.questions, makeDefault: () => ({ question: '', options: ['', '', ''], correct: 0 }), addLabel: '+ Añadir pregunta',
                    rowRenderer: (row, q) => {
                        const qi = lvl.questions.indexOf(q);
                        field(row, 'Pregunta', 'text', q.question, v => lvl.questions[qi].question = v);
                        const optsWrap = el('div', { class: 'ed-subblock' });
                        optsWrap.appendChild(el('div', { class: 'ed-subtitle', text: 'Opciones' }));
                        q.options.forEach((opt, oi) => {
                            const orow = el('div', { class: 'ed-inline' });
                            const radio = el('input', { type: 'radio', name: 'correct_' + qi });
                            radio.checked = (q.correct === oi);
                            radio.addEventListener('change', () => { lvl.questions[qi].correct = oi; });
                            orow.appendChild(radio);
                            const inp = el('input', { type: 'text', value: opt, class: 'ed-input' });
                            inp.addEventListener('input', () => lvl.questions[qi].options[oi] = inp.value);
                            orow.appendChild(inp);
                            optsWrap.appendChild(orow);
                        });
                        row.appendChild(optsWrap);
                    }
                });
                break;
        }
    }

    /* ---------- Render de niveles ---------- */
    function renderLevels() {
        levelsRoot.innerHTML = '';
        editorData.levels.forEach((lvl, idx) => {
            const card = el('div', { class: 'ed-card' });
            const head = el('div', { class: 'ed-cardhead' });
            head.appendChild(el('span', { class: 'ed-cnum', text: 'NIVEL ' + (idx + 1) }));
            head.appendChild(button('Eliminar nivel', () => { editorData.levels.splice(idx, 1); renderLevels(); }, 'ed-danger'));
            card.appendChild(head);

            field(card, 'Título del nivel', 'text', lvl.title, v => lvl.title = v);
            selectField(card, 'Tipo de nivel', lvl.type, LEVEL_TYPES.map(t => ({ value: t, text: TYPE_LABELS[t] })), v => {
                const keepTitle = lvl.title;
                const fresh = defaultLevel(v);
                fresh.title = keepTitle;
                editorData.levels[idx] = fresh;
                renderLevels();
            });

            renderTypeFields(card, lvl);
            levelsRoot.appendChild(card);
        });
    }

    /* ---------- Validación ---------- */
    function validate() {
        const problems = [];
        if (!editorData.name.trim()) problems.push('Falta el nombre del set.');
        if (editorData.levels.length === 0) problems.push('Agrega al menos un nivel.');
        editorData.levels.forEach((lvl, i) => {
            if (!lvl.title.trim()) problems.push('Nivel ' + (i + 1) + ': falta el título.');
            if (['bridge', 'maze'].includes(lvl.type) && (!lvl.questions || lvl.questions.length === 0))
                problems.push('Nivel ' + (i + 1) + ': necesita al menos una pregunta.');
            if (['dragon', 'tennis'].includes(lvl.type) && (!lvl.questions || lvl.questions.length === 0))
                problems.push('Nivel ' + (i + 1) + ': necesita al menos una pregunta.');
        });
        return problems;
    }

    function buildPayload() {
        const levels = editorData.levels.map((lvl, i) => {
            const copy = JSON.parse(JSON.stringify(lvl));
            copy.id = i + 1;
            return copy;
        });
        return { levels: levels };
    }

    /* ---------- Acciones ---------- */
    function saveLocal() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(editorData)); flash('Guardado en este navegador ✓'); }
        catch (e) { alert('No se pudo guardar: ' + e.message); }
    }
    function loadLocal() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { alert('No hay ningún set guardado.'); return; }
        try { editorData = JSON.parse(raw); refreshName(); renderLevels(); flash('Cargado desde el navegador ✓'); }
        catch (e) { alert('El set guardado está corrupto.'); }
    }
    function exportJSON() {
        const problems = validate();
        if (problems.length) { alert('Corrige:\n- ' + problems.join('\n- ')); return; }
        const data = buildPayload();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = el('a', { href: url, download: (editorData.name.trim() || 'niveles') + '.json' });
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }
    function importJSON(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.levels || !Array.isArray(data.levels)) throw new Error('Falta el arreglo "levels".');
                editorData.levels = data.levels.map(l => {
                    if (!l.type) l.type = 'bridge';
                    if (!l.title) l.title = '';
                    return l;
                });
                if (data.name) editorData.name = data.name;
                refreshName(); renderLevels();
                flash('JSON importado ✓');
            } catch (err) { alert('JSON inválido: ' + err.message); }
        };
        reader.readAsText(file);
    }
    function playSet() {
        const problems = validate();
        if (problems.length) { alert('Corrige:\n- ' + problems.join('\n- ')); return; }
        closeOverlay();
        window.processJSONData(buildPayload(), (editorData.name.trim() || 'Mis Niveles') + '.json');
    }

    function flash(msg) {
        let bar = document.getElementById('ed-flash');
        if (!bar) { bar = el('div', { id: 'ed-flash' }); overlay.appendChild(bar); }
        bar.textContent = msg;
        bar.classList.add('show');
        clearTimeout(bar._t);
        bar._t = setTimeout(() => bar.classList.remove('show'), 2200);
    }

    function refreshName() {
        const inp = document.getElementById('ed-setname');
        if (inp) inp.value = editorData.name;
    }

    /* ---------- Overlay ---------- */
    function buildOverlay() {
        overlay = el('div', { id: 'editor-overlay' });
        const panel = el('div', { class: 'ed-panel' });

        const top = el('div', { class: 'ed-top' });
        top.appendChild(el('h2', { text: '🛠 CREADOR DE NIVELES' }));
        top.appendChild(button('✕ Cerrar', closeOverlay, 'ed-danger'));
        panel.appendChild(top);

        const nameRow = el('div', { class: 'ed-namerow' });
        nameRow.appendChild(el('label', { text: 'Nombre del set:' }));
        const nameInp = el('input', { id: 'ed-setname', type: 'text', value: editorData.name, class: 'ed-input' });
        nameInp.addEventListener('input', () => editorData.name = nameInp.value);
        nameRow.appendChild(nameInp);
        panel.appendChild(nameRow);

        const toolbar = el('div', { class: 'ed-toolbar' });
        toolbar.appendChild(button('💾 Guardar', saveLocal, 'ed-gold'));
        toolbar.appendChild(button('📂 Cargar', loadLocal, 'ed-gold'));
        toolbar.appendChild(button('⬇ Exportar JSON', exportJSON, 'ed-gold'));
        const imp = el('input', { type: 'file', accept: '.json', id: 'ed-import', style: 'display:none;' });
        imp.addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); });
        toolbar.appendChild(button('⬆ Importar JSON', () => imp.click(), 'ed-gold'));
        toolbar.appendChild(imp);
        toolbar.appendChild(button('▶ Jugar', playSet, 'ed-play'));
        panel.appendChild(toolbar);

        levelsRoot = el('div', { class: 'ed-levels' });
        panel.appendChild(levelsRoot);

        const addRow = el('div', { class: 'ed-addrow' });
        LEVEL_TYPES.forEach(t => {
            addRow.appendChild(button('+ ' + TYPE_LABELS[t], () => { editorData.levels.push(defaultLevel(t)); renderLevels(); }, 'ed-add'));
        });
        panel.appendChild(addRow);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    }

    function openOverlay() {
        if (!overlay) buildOverlay();
        refreshName();
        renderLevels();
        overlay.classList.add('show');
        document.body.classList.remove('menu-visible');
    }
    function closeOverlay() {
        if (overlay) overlay.classList.remove('show');
        document.body.classList.add('menu-visible');
    }

    /* ---------- Estilos ---------- */
    function injectStyles() {
        const css = `
        #editor-overlay { position: fixed; inset: 0; z-index: 2000; display: none;
            background: rgba(0,0,0,0.85); overflow-y: auto; padding: 20px; }
        #editor-overlay.show { display: block; }
        .ed-panel { max-width: 880px; margin: 0 auto; background: linear-gradient(180deg,#2a1c10,#140d08);
            border: 3px solid #5a3a1e; border-radius: 12px; box-shadow: 0 0 0 2px #f8b800, 0 10px 30px rgba(0,0,0,.6);
            padding: 18px 22px 28px; color: #e8d8b0; font-family: 'Press Start 2P', cursive; font-size: 12px; }
        .ed-top { display:flex; justify-content: space-between; align-items:center; }
        .ed-top h2 { color:#f8b800; margin:0; font-size: 16px; }
        .ed-namerow { display:flex; gap:10px; align-items:center; margin:14px 0; }
        .ed-namerow label { color:#f8b800; font-size: 11px; }
        .ed-toolbar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 16px; }
        .ed-levels { display:flex; flex-direction:column; gap:14px; }
        .ed-card { border:2px solid #5a3a1e; border-radius:10px; padding:14px; background: rgba(255,255,255,.03); }
        .ed-cardhead { display:flex; justify-content: space-between; align-items:center; margin-bottom:10px; }
        .ed-cnum { color:#f8b800; font-size: 13px; }
        .ed-field { display:flex; flex-direction:column; margin:8px 0; }
        .ed-field label { font-size: 10px; color:#cbb78a; margin-bottom:4px; }
        .ed-input { font-family: inherit; font-size: 11px; padding:8px; border-radius:6px; border:1px solid #5a3a1e;
            background:#1b120a; color:#fff; }
        .ed-inline { display:flex; align-items:center; gap:8px; }
        .ed-inline label { font-size: 10px; }
        .ed-subblock { border:1px dashed #5a3a1e; border-radius:8px; padding:10px; margin:10px 0; }
        .ed-subtitle { color:#36c6c6; font-size:10px; margin-bottom:8px; }
        .ed-list { display:flex; flex-direction:column; gap:10px; }
        .ed-row { border:1px solid #3a2a18; border-radius:8px; padding:10px; background: rgba(0,0,0,.25); }
        .ed-rowhead { display:flex; justify-content: space-between; align-items:center; margin-bottom:6px; font-size:10px; color:#ffd23f; }
        .ed-btn { font-family: inherit; cursor:pointer; border:none; border-radius:8px; padding:9px 12px; font-size:11px; color:#000; background:#a80020; }
        .ed-btn:hover { filter: brightness(1.1); }
        .ed-gold { background:#f8b800; }
        .ed-play { background:#39d98a; }
        .ed-add { background:#3cbcfc; }
        .ed-danger { background:#a80020; color:#fff; }
        .ed-mini { padding:4px 8px; font-size:10px; }
        .ed-addrow { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
        #ed-flash { position:fixed; bottom:20px; left:50%; transform: translateX(-50%);
            background:#39d98a; color:#000; padding:10px 16px; border-radius:8px; font-size:11px;
            opacity:0; transition: opacity .3s; pointer-events:none; }
        #ed-flash.show { opacity:1; }
        `;
        const style = el('style', { text: css });
        document.head.appendChild(style);
    }

    /* ---------- Init ---------- */
    function init() {
        injectStyles();
        const menu = document.getElementById('menu');
        if (!menu) return;
        const openBtn = el('button', { id: 'openEditorBtn', class: 'btn', text: '🛠 CREAR MIS NIVELES', onclick: openOverlay });
        openBtn.style.background = '#39d98a';
        openBtn.style.marginTop = '24px';
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput) jsonInput.parentNode.insertBefore(openBtn, jsonInput.nextSibling);
        else menu.appendChild(openBtn);

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { try { editorData = JSON.parse(saved); } catch (e) {} }
    }

    window.addEventListener('load', init);
})();
