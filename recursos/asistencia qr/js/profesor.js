let profesorActual = null;
let deviceId = obtenerDeviceId();
let sesionToken = null;
let sesionCheckInterval = null;
let estaIniciandoSesion = false;

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        await cargarDatosProfesor(session.user);
        iniciarChequeoSesion(session.user.id, 'profesores');
    }
});

// Escuchar cambios de autenticación
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        // Si el usuario está iniciando sesión manualmente, NO ejecutamos
        // cargarDatosProfesor aquí (handleLogin ya llama a verificarYcargarProfesor).
        // Así evitamos la doble generación de token de sesión.
        if (!estaIniciandoSesion) {
            cargarDatosProfesor(session.user);
        }
    } else if (event === 'SIGNED_OUT') {
        mostrarLogin();
    }
});

// ====== FUNCIONES DE LOGIN/REGISTRO ======
async function handleLogin(e) {
    e.preventDefault();
    estaIniciandoSesion = true;
    try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email, password
        });
        
        if (error) {
            document.getElementById('login-error').textContent = 'Email o contraseña incorrectos';
            return;
        }
        
        await verificarYcargarProfesor(data.user);
    } finally {
        estaIniciandoSesion = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    // 1. Crear usuario en Auth de Supabase (con metadatos para el trigger)
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'profesor',
                nombre: nombre
            }
        }
    });
    
    if (authError) {
        document.getElementById('register-error').textContent = authError.message;
        return;
    }
    
    // 2. Guardar/actualizar datos en tabla profesores con device_id
    // Usamos upsert porque el trigger ya pudo haber creado la fila automáticamente
    const { error: dbError } = await supabaseClient
        .from('profesores')
        .upsert({
            id: authData.user.id,
            email: email,
            nombre: nombre,
            device_id: deviceId
        });
    
    if (dbError) {
        // UPSERT falló — mostrar formulario completar perfil
        document.getElementById('register-error').textContent = '';
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('completar-perfil-form').classList.remove('hidden');
        document.getElementById('completar-error').textContent = '⚠️ El registro fue parcial. Completa tus datos.';
        document.getElementById('comp-nombre').value = nombre;
        return;
    }
    
    alert('Registro exitoso. Ya puedes iniciar sesión.');
    showTab('login');
}

// ====== VERIFICACIÓN DE DEVICE ID ======
async function verificarYcargarProfesor(user) {
    const { data, error } = await supabaseClient
        .from('profesores')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    
    if (error || !data) {
        // No hay fila en profesores — mostrar formulario para completar perfil
        document.getElementById('login-error').textContent = '';
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('completar-perfil-form').classList.remove('hidden');
        document.getElementById('completar-error').textContent = '';
        return;
    }
    
    // [Profesores] No bloqueamos por device_id.
    // El profesor necesita acceder desde cualquier dispositivo.
    // Solo actualizamos el device_id si es necesario (para trazabilidad).
    try {
        if (data.device_id !== deviceId) {
            await supabaseClient.from('profesores').update({ device_id: deviceId }).eq('id', user.id);
            console.log('📱 Device ID actualizado para el profesor');
        }
    } catch (e) {
        console.warn('⚠️ No se pudo actualizar device_id:', e);
    }
    
    // === TOKEN DE SESIÓN ACTIVA ===
    // Evitar múltiples sesiones simultáneas del mismo usuario
    sesionToken = generarSesionToken();
    sessionStorage.setItem('asistencia_qr_sesion_token', sesionToken);
    try {
        await supabaseClient.from('profesores').update({ sesion_token: sesionToken }).eq('id', user.id);
        iniciarChequeoSesion(user.id, 'profesores');
    } catch (e) {
        console.warn('⚠️ Control de sesión activa no disponible (columna sesion_token no existe en BD). El login continúa normalmente.');
    }
    
    profesorActual = data;
    document.getElementById('profesor-nombre').textContent = `Hola, ${data.nombre}`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    cargarGrupos();
    iniciarAutoScheduler();
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.warn('Error al cerrar sesión:', e);
    }
    detenerAutoScheduler();
    detenerChequeoSesion();
    mostrarLogin();
}

// ====== FUNCIONES DE UI ======
function showTab(tab, eventElement) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Si recibimos un elemento de evento, lo usamos; si no, buscamos el tab por texto
    if (eventElement && eventElement.target) {
        eventElement.target.classList.add('active');
    } else {
        // Buscar el tab activo por su texto
        document.querySelectorAll('.tab').forEach(t => {
            if (t.textContent.toLowerCase().includes(tab === 'login' ? 'iniciar' : 'registr')) {
                t.classList.add('active');
            }
        });
    }
    
    if (tab === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
}

function mostrarLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('completar-perfil-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('completar-error').textContent = '';
    document.getElementById('comp-nombre').value = '';
}

async function cargarDatosProfesor(user) {
    // Versión simple sin verificación de device (usada por onAuthStateChange)
    const { data, error } = await supabaseClient
        .from('profesores')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    
    if (error || !data) {
        // No hay fila — mostrar formulario completar
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('completar-perfil-form').classList.remove('hidden');
        document.getElementById('completar-error').textContent = '✏️ Completa tus datos para continuar.';
        return;
    }
    
    // [Profesores] Solo actualizamos device_id para trazabilidad, sin bloquear.
    try {
        if (data.device_id !== deviceId) {
            await supabaseClient.from('profesores').update({ device_id: deviceId }).eq('id', user.id);
            console.log('📱 Device ID actualizado para el profesor');
        }
    } catch (e) {
        console.warn('⚠️ No se pudo actualizar device_id:', e);
    }
    
    // === TOKEN DE SESIÓN ACTIVA ===
    sesionToken = generarSesionToken();
    sessionStorage.setItem('asistencia_qr_sesion_token', sesionToken);
    try {
        await supabaseClient.from('profesores').update({ sesion_token: sesionToken }).eq('id', user.id);
        iniciarChequeoSesion(user.id, 'profesores');
    } catch (e) {
        console.warn('⚠️ Control de sesión activa no disponible (columna sesion_token no existe en BD). El login continúa normalmente.');
    }
    
    profesorActual = data;
    document.getElementById('profesor-nombre').textContent = `Hola, ${data.nombre}`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    cargarGrupos();
    iniciarAutoScheduler();
}

// ====== GESTIÓN DE GRUPOS ======
async function cargarGrupos() {
    const { data, error } = await supabaseClient
        .from('grupos')
        .select('*')
        .eq('profesor_id', profesorActual.id)
        .order('creado_en', { ascending: false });
    
    const lista = document.getElementById('grupos-lista');
    
    if (error || !data || data.length === 0) {
        lista.innerHTML = '<p class="empty-state">No tienes grupos aún. Crea uno para empezar.</p>';
        return;
    }
    
    // Asignar código automático a grupos que no tengan uno
    for (const grupo of data) {
        if (!grupo.codigo_unico) {
            const nuevoCodigo = generarCodigoGrupo();
            await supabaseClient
                .from('grupos')
                .update({ codigo_unico: nuevoCodigo })
                .eq('id', grupo.id);
            grupo.codigo_unico = nuevoCodigo;
        }
    }
    
    lista.innerHTML = data.map(grupo => `
        <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong>${grupo.nombre}</strong>
                    <br><small>${grupo.materia || 'Sin materia'} • Límite: ${grupo.limite_salidas} salidas • ${grupo.numero_perdones} perdones</small>
                </div>
                <div class="list-item-actions" style="flex-shrink: 0;">
                    <button onclick="mostrarModalHorarios('${grupo.id}', '${grupo.nombre}')" class="btn-secondary" title="Configurar horarios y límites">📅</button>
                    <button onclick="generarQR('${grupo.id}', '${grupo.nombre}')" class="btn-qr">📷 QR</button>
                    <button onclick="exportarAsistencia('${grupo.id}', '${grupo.nombre}')" class="btn-secondary" title="Exportar asistencias">📊</button>
                    <button onclick="verGrupo('${grupo.id}')" class="btn-secondary">Ver</button>
                    <button onclick="eliminarGrupo('${grupo.id}')" class="btn-danger">Eliminar</button>
                </div>
            </div>
            <div style="background: #f0f4ff; border: 2px dashed #667eea; border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 0.8em; color: #667eea; font-weight: 600; margin-bottom: 4px;">🔑 CÓDIGO DEL GRUPO</div>
                <div style="font-size: 1.6em; font-family: monospace; letter-spacing: 4px; font-weight: 700; color: #333;">
                    ${grupo.codigo_unico || '---'}
                </div>
                <button onclick="copiarCodigo('${grupo.codigo_unico}')" style="margin-top: 6px; background: #667eea; color: white; border: none; border-radius: 8px; padding: 6px 16px; font-size: 0.85em; cursor: pointer;">
                    📋 Copiar código
                </button>
            </div>
        </div>
    `).join('');
}

function copiarCodigo(codigo) {
    if (!codigo) return;
    navigator.clipboard.writeText(codigo).then(() => {
        alert('✅ Código copiado al portapapeles: ' + codigo);
    }).catch(() => {
        // Fallback para navegadores sin clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = codigo;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ Código copiado: ' + codigo);
    });
}

function showCreateGroupModal() {
    document.getElementById('modal-crear-grupo').classList.remove('hidden');
    generarNuevoCodigo();
    renderCrearHorariosRows();
}

function cerrarModal() {
    document.getElementById('modal-crear-grupo').classList.add('hidden');
    document.getElementById('form-crear-grupo').reset();
}

function generarNuevoCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('grupo-codigo').value = codigo;
    return codigo;
}

function obtenerUbicacionCrearGrupo() {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización.');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('crear-grupo-latitud').value = pos.coords.latitude.toFixed(6);
            document.getElementById('crear-grupo-longitud').value = pos.coords.longitude.toFixed(6);
        },
        (err) => alert('No se pudo obtener ubicación: ' + err.message),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function renderCrearHorariosRows() {
    const container = document.getElementById('crear-horarios-dias-container');
    if (!container) return;
    container.innerHTML = '';
    
    for (let dia = 0; dia <= 6; dia++) {
        const row = document.createElement('div');
        row.className = 'dia-horario-row';
        row.innerHTML = `
            <div class="dia-horario-label">${DIAS[dia]}</div>
            <div class="dia-horario-inputs">
                <input type="time" class="crear-hora-inicio" placeholder="Inicio" data-dia="${dia}">
                <span style="color:#999;">→</span>
                <input type="time" class="crear-hora-fin" placeholder="Fin" data-dia="${dia}">
            </div>
            <div style="display:flex;align-items:center;gap:2px;white-space:nowrap;">
                <span class="dia-limite-label">🟢</span>
                <input type="number" class="dia-limite-input crear-puntual-min" value="10" min="1" max="120" data-dia="${dia}">
                <span class="dia-limite-label">🟡</span>
                <input type="number" class="dia-limite-input crear-retardo-min" value="20" min="1" max="999" data-dia="${dia}">
            </div>
            <span class="dia-sin-clase" style="display:inline;">(sin clase)</span>
        `;
        
        const inicioInput = row.querySelector('.crear-hora-inicio');
        const finInput = row.querySelector('.crear-hora-fin');
        const sinClaseSpan = row.querySelector('.dia-sin-clase');
        
        inicioInput.addEventListener('change', () => {
            if (inicioInput.value && !finInput.value) {
                const [h, m] = inicioInput.value.split(':').map(Number);
                const fin = new Date();
                fin.setHours(h, m + 50, 0);
                finInput.value = `${fin.getHours().toString().padStart(2,'0')}:${fin.getMinutes().toString().padStart(2,'0')}`;
            }
            sinClaseSpan.style.display = (inicioInput.value || finInput.value) ? 'none' : '';
        });
        finInput.addEventListener('change', () => {
            sinClaseSpan.style.display = (inicioInput.value || finInput.value) ? 'none' : '';
        });
        
        container.appendChild(row);
    }
}

// Manejar el envío del formulario
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-crear-grupo');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('grupo-nombre').value;
            const materia = document.getElementById('grupo-materia').value;
            const limite = parseInt(document.getElementById('grupo-limite').value);
            const perdones = parseInt(document.getElementById('grupo-perdones').value);
            const codigoUnico = document.getElementById('grupo-codigo').value || generarCodigoGrupo();
            
            await crearGrupo(nombre, materia, limite, perdones, codigoUnico);
            cerrarModal();
        });
    }
});

// Generar un código único para el grupo
function generarCodigoGrupo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

async function crearGrupo(nombre, materia, limite, perdones, codigoUnico) {
    const { data: grupo, error } = await supabaseClient
        .from('grupos')
        .insert({
            profesor_id: profesorActual.id,
            nombre,
            materia,
            limite_salidas: limite || 3,
            numero_perdones: perdones || 2,
            codigo_unico: codigoUnico
        })
        .select()
        .maybeSingle();
    
    if (error) {
        alert('Error al crear grupo: ' + error.message);
        return;
    }
    
    // Guardar horarios del formulario de creación (cada día con sus límites)
    const horariosACrear = [];
    document.querySelectorAll('#crear-horarios-dias-container .dia-horario-row').forEach((row, dia) => {
        const inicio = row.querySelector('.crear-hora-inicio').value;
        const fin = row.querySelector('.crear-hora-fin').value;
        const puntual = parseInt(row.querySelector('.crear-puntual-min').value) || 10;
        const retardo = parseInt(row.querySelector('.crear-retardo-min').value) || 20;
        if (inicio && fin) {
            horariosACrear.push({ dia_semana: dia, hora_inicio: inicio, hora_fin: fin, puntual_minutos: puntual, retardo_minutos: retardo });
        }
    });
    
    let errores = 0;
    for (const h of horariosACrear) {
        const { error: err } = await supabaseClient
            .from('horarios')
            .insert({
                grupo_id: grupo.id,
                dia_semana: h.dia_semana,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                activo: true,
                creado_en: new Date().toISOString()
            });
        if (err) {
            console.error('Error creando horario:', err.message, err.details, err.code);
            errores++;
        }
    }
    
    // Guardar GPS
    const latitud = parseFloat(document.getElementById('crear-grupo-latitud').value) || null;
    const longitud = parseFloat(document.getElementById('crear-grupo-longitud').value) || null;
    const radio = parseInt(document.getElementById('crear-grupo-radio').value) || null;
    
    if (latitud && longitud) {
        await supabaseClient
            .from('grupos')
            .update({ latitud, longitud, radio_metros: radio || 100 })
            .eq('id', grupo.id);
    }
    
    if (errores > 0) {
        console.warn('Algunos horarios no se guardaron.');
    }
    
    cargarGrupos();
}

async function eliminarGrupo(id) {
    if (!confirm('¿Eliminar este grupo? Se perderán todos los datos de alumnos y clases asociadas.')) return;
    
    // 1. Verificar sesión activa
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        alert('Error: Tu sesión ha expirado. Recarga la página y vuelve a iniciar sesión.');
        return;
    }
    
    const errores = [];
    
    const ignorarCodigo = (code) => ['PGRST116', '42501', '23503'].includes(code);
    
    // 2. Eliminar registros relacionados manualmente (por si no hay CASCADE)
    // 2a. Horarios
    const { error: errHorarios } = await supabaseClient
        .from('horarios')
        .delete()
        .eq('grupo_id', id);
    if (errHorarios && !ignorarCodigo(errHorarios.code)) {
        errores.push('horarios: ' + errHorarios.message);
    }
    
    // 2b. Sesiones de clase
    const { error: errSesiones } = await supabaseClient
        .from('sesiones_clase')
        .delete()
        .eq('grupo_id', id);
    if (errSesiones && !ignorarCodigo(errSesiones.code)) {
        errores.push('sesiones: ' + errSesiones.message);
    }
    
    // 2c. Asistencia
    const { error: errAsistencia } = await supabaseClient
        .from('asistencia')
        .delete()
        .eq('grupo_id', id);
    if (errAsistencia && !ignorarCodigo(errAsistencia.code)) {
        errores.push('asistencia: ' + errAsistencia.message);
    }
    
    // 2d. Grupo_alumnos
    const { error: errAlumnos } = await supabaseClient
        .from('grupo_alumnos')
        .delete()
        .eq('grupo_id', id);
    if (errAlumnos && !ignorarCodigo(errAlumnos.code)) {
        errores.push('alumnos del grupo: ' + errAlumnos.message);
    }
    
    // 3. Finalmente eliminar el grupo
    const { error } = await supabaseClient
        .from('grupos')
        .delete()
        .eq('id', id)
        .eq('profesor_id', profesorActual.id);
    
    if (error) {
        let mensaje = 'Error al eliminar el grupo: ' + error.message;
        if (error.details) mensaje += '\nDetalles: ' + error.details;
        if (error.code) mensaje += '\nCódigo: ' + error.code;
        if (error.hint) mensaje += '\nSugerencia: ' + error.hint;
        
        // Errores conocidos
        if (error.code === '42501' || (error.message && error.message.includes('policy'))) {
            mensaje += '\n\n🔧 Para solucionarlo, abre el SQL Editor de Supabase y ejecuta:\n\n'
                + 'CREATE POLICY "grupos_delete_own" ON grupos\n'
                + '    FOR DELETE\n'
                + '    USING (auth.uid() = profesor_id);\n\n'
                + 'Si el problema persiste, ejecuta todo el contenido de tu archivo sql/rls_policies.sql';
        } else if (error.code === '23503') {
            mensaje += '\n\n🔧 Hay registros relacionados que impiden eliminar el grupo. '
                + 'Faltan políticas DELETE o CASCADE.\n'
                + 'Ejecuta TODO este SQL en el Editor SQL de Supabase:\n\n'
                + '-- 1. Políticas DELETE faltantes\n'
                + 'DROP POLICY IF EXISTS "sesiones_clase_delete_profesor" ON sesiones_clase;\n'
                + 'CREATE POLICY "sesiones_clase_delete_profesor" ON sesiones_clase\n'
                + '    FOR DELETE USING (auth.uid() = profesor_id);\n'
                + 'DROP POLICY IF EXISTS "horarios_delete_profesor" ON horarios;\n'
                + 'CREATE POLICY "horarios_delete_profesor" ON horarios\n'
                + '    FOR DELETE USING (EXISTS (\n'
                + '        SELECT 1 FROM grupos WHERE grupos.id = horarios.grupo_id\n'
                + '        AND grupos.profesor_id = auth.uid()\n'
                + '    ));\n'
                + 'DROP POLICY IF EXISTS "asistencia_delete_profesor" ON asistencia;\n'
                + 'CREATE POLICY "asistencia_delete_profesor" ON asistencia\n'
                + '    FOR DELETE USING (EXISTS (\n'
                + '        SELECT 1 FROM grupos WHERE grupos.id = asistencia.grupo_id\n'
                + '        AND grupos.profesor_id = auth.uid()\n'
                + '    ));\n'
                + 'DROP POLICY IF EXISTS "grupo_alumnos_delete_profesor" ON grupo_alumnos;\n'
                + 'CREATE POLICY "grupo_alumnos_delete_profesor" ON grupo_alumnos\n'
                + '    FOR DELETE USING (EXISTS (\n'
                + '        SELECT 1 FROM grupos WHERE grupos.id = grupo_alumnos.grupo_id\n'
                + '        AND grupos.profesor_id = auth.uid()\n'
                + '    ));\n\n'
                + '-- 2. CASCADE en Foreign Keys\n'
                + 'ALTER TABLE horarios DROP CONSTRAINT IF EXISTS horarios_grupo_id_fkey,\n'
                + '    ADD FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE;\n'
                + 'ALTER TABLE sesiones_clase DROP CONSTRAINT IF EXISTS sesiones_clase_grupo_id_fkey,\n'
                + '    ADD FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE;\n'
                + 'ALTER TABLE grupo_alumnos DROP CONSTRAINT IF EXISTS grupo_alumnos_grupo_id_fkey,\n'
                + '    ADD FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE;\n'
                + 'ALTER TABLE asistencia DROP CONSTRAINT IF EXISTS asistencia_grupo_id_fkey,\n'
                + '    ADD FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE;';
        }
        
        alert(mensaje);
        
        if (errores.length > 0) {
            console.warn('Errores al limpiar tablas relacionadas:', errores);
        }
        return;
    }
    
    // Si hubo errores en tablas relacionadas pero el grupo se eliminó, mostrar advertencia
    if (errores.length > 0) {
        console.warn('Grupo eliminado, pero algunos datos relacionados no pudieron limpiarse:', errores);
    }
    
    cargarGrupos();
}

// ====== EXPORTAR ASISTENCIA A CSV ======
async function exportarAsistencia(grupoId, grupoNombre) {
    const btn = event?.target || document.querySelector(`button[onclick*="${grupoId}"]`);
    if (btn) btn.textContent = '⏳...';
    
    try {
        // 1. Obtener todos los alumnos del grupo
        const { data: alumnos, error: errAl } = await supabaseClient
            .from('grupo_alumnos')
            .select('alumno_id, alumnos!inner(id, nombre, email)')
            .eq('grupo_id', grupoId);
        
        if (errAl) throw errAl;
        if (!alumnos || alumnos.length === 0) {
            alert('No hay alumnos inscritos en este grupo.');
            if (btn) btn.textContent = '📊';
            return;
        }
        
        // 2. Obtener todas las fechas con asistencia (ordenadas ascendente)
        const { data: fechasData } = await supabaseClient
            .from('asistencia')
            .select('fecha')
            .eq('grupo_id', grupoId)
            .order('fecha', { ascending: true });
        
        const fechasSet = new Set();
        if (fechasData) fechasData.forEach(a => fechasSet.add(a.fecha));
        
        if (fechasSet.size === 0) {
            alert('Aún no hay registros de asistencia en este grupo.');
            if (btn) btn.textContent = '📊';
            return;
        }
        
        const fechas = Array.from(fechasSet);
        
        // 3. Obtener todos los registros de asistencia para este grupo
        const { data: asistencias, error: errAs } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('grupo_id', grupoId);
        
        if (errAs) throw errAs;
        
        // Indexar asistencias por alumno+fecha
        const asistenciaMap = {};
        if (asistencias) {
            asistencias.forEach(a => {
                const key = `${a.alumno_id}|${a.fecha}`;
                asistenciaMap[key] = a;
            });
        }
        
        // 4. Construir CSV
        const BOM = '\uFEFF'; // BOM para que Excel detecte UTF-8
        const separador = ',';
        
        // Encabezado: Nombre, Fecha1, Fecha2, ...
        let csv = BOM;
        csv += '"Nombre del alumno"';
        fechas.forEach(f => { csv += separador + '"' + f + '"'; });
        csv += ',"Presentes","Retardos","Ausencias","Justificadas"\r\n';
        
        // Por cada alumno
        for (const item of alumnos) {
            const alumno = item.alumnos;
            const nombre = (alumno.nombre || alumno.email || 'Sin nombre').replace(/"/g, '""');
            csv += '"' + nombre + '"';
            
            let countPresentes = 0, countRetardos = 0, countAusentes = 0, countJustificadas = 0;
            
            for (const fecha of fechas) {
                const key = `${item.alumno_id}|${fecha}`;
                const a = asistenciaMap[key];
                
                let estado = 'Sin registro';
                if (a) {
                    if (a.tipo_asistencia === 'sin_derecho') {
                        estado = 'Ausente (llegó tarde)';
                        countAusentes++;
                    } else if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') {
                        estado = 'Retardo';
                        countRetardos++;
                    } else if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente')) {
                        estado = 'Presente';
                        countPresentes++;
                    } else if (a.estado === 'ausente') {
                        if (a.cambios_pantalla && a.cambios_pantalla > 0) {
                            estado = 'Ausente (📱)';
                        } else {
                            estado = 'Ausente';
                        }
                        countAusentes++;
                    } else if (a.estado === 'justificado') {
                        estado = 'Justificado';
                        countJustificadas++;
                    } else if (a.estado === 'presente') {
                        // Presente sin tipo especificado
                        estado = 'Presente';
                        countPresentes++;
                    }
                }
                
                csv += separador + '"' + estado + '"';
            }
            
            // Totales
            csv += separador + '"' + countPresentes + '"';
            csv += separador + '"' + countRetardos + '"';
            csv += separador + '"' + countAusentes + '"';
            csv += separador + '"' + countJustificadas + '"';
            csv += '\r\n';
        }
        
        // 5. Descargar archivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nombreArchivo = `asistencias_${grupoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        if (btn) btn.textContent = '📊';
        
    } catch (err) {
        console.error('Error exportando:', err);
        alert('Error al exportar: ' + err.message);
        if (btn) btn.textContent = '📊';
    }
}

// ====== VER ASISTENCIAS DEL GRUPO ======
let verGrupoActualId = null;

async function verGrupo(grupoId) {
    verGrupoActualId = grupoId;
    
    // Cargar info del grupo
    const { data: grupo } = await supabaseClient
        .from('grupos')
        .select('nombre, materia')
        .eq('id', grupoId)
        .single();
    
    if (!grupo) return alert('Error al cargar grupo');
    
    document.getElementById('ver-grupo-info').textContent = `📚 ${grupo.nombre}${grupo.materia ? ' — ' + grupo.materia : ''}`;
    document.getElementById('modal-ver-grupo').classList.remove('hidden');
    document.getElementById('ver-grupo-contenido').innerHTML = '<p class="empty-state">Cargando...</p>';
    
    // Cargar alumnos y asistencias
    const [alumnosRes, asistenciasRes] = await Promise.all([
        supabaseClient
            .from('grupo_alumnos')
            .select('alumno_id, alumnos!inner(id, nombre, email)')
            .eq('grupo_id', grupoId),
        supabaseClient
            .from('asistencia')
            .select('*')
            .eq('grupo_id', grupoId)
            .order('fecha', { ascending: false })
    ]);
    
    const alumnos = alumnosRes.data || [];
    const asistencias = asistenciasRes.data || [];
    
    // Indexar asistencias por alumno_id
    const asistenciasPorAlumno = {};
    asistencias.forEach(a => {
        if (!asistenciasPorAlumno[a.alumno_id]) asistenciasPorAlumno[a.alumno_id] = [];
        asistenciasPorAlumno[a.alumno_id].push(a);
    });
    
    // Poblar dropdown de alumnos
    const select = document.getElementById('ver-filtro-alumno');
    select.innerHTML = '<option value="">— Todos los alumnos —</option>';
    alumnos.forEach(item => {
        const al = item.alumnos;
        select.innerHTML += `<option value="${item.alumno_id}">${al.nombre || al.email || 'Sin nombre'}</option>`;
    });
    
    // Guardar datos para el render
    select._alumnos = alumnos;
    select._asistenciasPorAlumno = asistenciasPorAlumno;
    select._todasAsistencias = asistencias;
    
    renderVerGrupo();
}

function renderVerGrupo() {
    const select = document.getElementById('ver-filtro-alumno');
    const filtroAlumnoId = select.value;
    const alumnos = select._alumnos || [];
    const asistenciasPorAlumno = select._asistenciasPorAlumno || {};
    const todasAsistencias = select._todasAsistencias || [];
    const container = document.getElementById('ver-grupo-contenido');
    
    // Generar fechas únicas ordenadas
    const fechasSet = new Set();
    todasAsistencias.forEach(a => fechasSet.add(a.fecha));
    const fechas = Array.from(fechasSet).sort((a, b) => a < b ? 1 : -1); // más reciente primero
    
    // Totales del grupo
    const totalPresentes = todasAsistencias.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
    const totalRetardos = todasAsistencias.filter(a => a.tipo_asistencia === 'retardo').length;
    const totalAusentes = todasAsistencias.filter(a => a.estado === 'ausente').length;
    const totalJustificadas = todasAsistencias.filter(a => a.estado === 'justificado').length;
    
    let html = `
        <div class="stats-container" style="margin-bottom: 14px;">
            <div class="stat-box" style="background: #e8f5e9;">
                <strong style="color: #2e7d32;">${totalPresentes}</strong>
                <small>Presentes</small>
            </div>
            <div class="stat-box" style="background: #fff3e0;">
                <strong style="color: #e65100;">${totalRetardos}</strong>
                <small>Retardos</small>
            </div>
            <div class="stat-box" style="background: #ffebee;">
                <strong style="color: #c62828;">${totalAusentes}</strong>
                <small>Ausencias</small>
            </div>
            <div class="stat-box" style="background: #fff8e1;">
                <strong style="color: #f57f17;">${totalJustificadas}</strong>
                <small>Justificadas</small>
            </div>
        </div>`;
    
    if (filtroAlumnoId === '') {
        // ====== VISTA: TODOS LOS ALUMNOS ======
        if (alumnos.length === 0) {
            html += '<p class="empty-state">No hay alumnos inscritos en este grupo.</p>';
        } else {
            html += '<div style="overflow-x:auto;"><table style="width:100%; border-collapse: collapse; font-size:0.85em;">';
            html += '<thead><tr style="background:#f0f4ff; position:sticky; top:0;">';
            html += '<th style="padding:10px 8px; text-align:left; border-bottom:2px solid #667eea;">Alumno</th>';
            html += '<th style="padding:10px 8px; text-align:center; border-bottom:2px solid #667eea;">✅</th>';
            html += '<th style="padding:10px 8px; text-align:center; border-bottom:2px solid #667eea;">⚠️</th>';
            html += '<th style="padding:10px 8px; text-align:center; border-bottom:2px solid #667eea;">❌</th>';
            html += '<th style="padding:10px 8px; text-align:center; border-bottom:2px solid #667eea;">🟡</th>';
            html += '<th style="padding:10px 8px; text-align:center; border-bottom:2px solid #667eea;">% Asist</th>';
            html += '</tr></thead><tbody>';
            
            for (const item of alumnos) {
                const al = item.alumnos;
                const list = asistenciasPorAlumno[item.alumno_id] || [];
                const p = list.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
                const r = list.filter(a => a.tipo_asistencia === 'retardo').length;
                const au = list.filter(a => a.estado === 'ausente').length;
                const j = list.filter(a => a.estado === 'justificado').length;
                const total = p + r + au + j;
                const pct = total > 0 ? Math.round(((p) / total) * 100) : 0;
                const colorPct = pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828';
                
                html += `<tr style="border-bottom:1px solid #f0f0f0;">
                    <td style="padding:10px 8px; font-weight:600;">${al.nombre || al.email || 'Sin nombre'}</td>
                    <td style="padding:10px 8px; text-align:center; color:#2e7d32;">${p}</td>
                    <td style="padding:10px 8px; text-align:center; color:#e65100;">${r}</td>
                    <td style="padding:10px 8px; text-align:center; color:#c62828;">${au}</td>
                    <td style="padding:10px 8px; text-align:center; color:#f57f17;">${j}</td>
                    <td style="padding:10px 8px; text-align:center; font-weight:700; color:${colorPct};">${pct}%</td>
                </tr>`;
            }
            
            html += '</tbody></table></div>';
        }
    } else {
        // ====== VISTA: ALUMNO ESPECÍFICO ======
        const alumno = alumnos.find(item => item.alumno_id === filtroAlumnoId)?.alumnos;
        if (!alumno) {
            html += '<p class="empty-state">Alumno no encontrado.</p>';
        } else {
            const list = asistenciasPorAlumno[filtroAlumnoId] || [];
            const p = list.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
            const r = list.filter(a => a.tipo_asistencia === 'retardo').length;
            const au = list.filter(a => a.estado === 'ausente').length;
            const j = list.filter(a => a.estado === 'justificado').length;
            
            html += `
                <h4 style="margin:0 0 10px; color:#333;">👤 ${alumno.nombre || alumno.email || 'Sin nombre'}</h4>
                <div class="stats-container" style="margin-bottom: 12px;">
                    <div class="stat-box" style="background: #e8f5e9;">
                        <strong style="color: #2e7d32;">${p}</strong>
                        <small>Presentes</small>
                    </div>
                    <div class="stat-box" style="background: #fff3e0;">
                        <strong style="color: #e65100;">${r}</strong>
                        <small>Retardos</small>
                    </div>
                    <div class="stat-box" style="background: #ffebee;">
                        <strong style="color: #c62828;">${au}</strong>
                        <small>Ausencias</small>
                    </div>
                    <div class="stat-box" style="background: #fff8e1;">
                        <strong style="color: #f57f17;">${j}</strong>
                        <small>Justificadas</small>
                    </div>
                </div>
                <div style="max-height: 350px; overflow-y: auto;">
                    ${list.length === 0 ? '<p class="empty-state">Sin registros de asistencia.</p>' : list.map(a => {
                        let icono = '✅ Presente';
                        let color = '#2e7d32';
                        if (a.tipo_asistencia === 'sin_derecho') { icono = '⚠️ Llegó tarde (sin derecho)'; color = '#c62828'; }
                        else if (a.tipo_asistencia === 'retardo') { icono = '⚠️ Retardo'; color = '#e65100'; }
                        else if (a.estado === 'ausente') { 
                            if (a.cambios_pantalla && a.cambios_pantalla > 0) {
                                icono = '❌ Ausente (📱)';
                            } else {
                                icono = '❌ Ausente';
                            }
                            color = '#c62828'; 
                        }
                        else if (a.estado === 'justificado') { icono = '🟡 Justificado'; color = '#f57f17'; }
                        return `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                            <span>${new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span style="font-weight: 600; color: ${color};">${icono}</span>
                        </div>`;
                    }).join('')}
                </div>`;
        }
    }
    
    container.innerHTML = html;
}

function cerrarModalVer() {
    document.getElementById('modal-ver-grupo').classList.add('hidden');
    verGrupoActualId = null;
}

// ====== GENERACIÓN DE QR PARA ASISTENCIA ======
let qrTimerInterval = null;
let sesionActivaId = null;
let qrDynamicInterval = null;
let qrGrupoActualId = null;
let qrVentanaActual = 'puntual';

async function generarQR(grupoId, grupoNombre) {
    const modal = document.getElementById('modal-qr-asistencia');
    const titulo = document.getElementById('qr-modal-titulo');
    const qrContainer = document.getElementById('qrcode');
    const sesionInfo = document.getElementById('qr-sesion-info');
    const countdownEl = document.getElementById('qr-countdown');
    const ventanaEl = document.getElementById('qr-ventana');
    
    qrGrupoActualId = grupoId;
    titulo.textContent = `📷 ${grupoNombre}`;
    qrContainer.innerHTML = '';
    sesionInfo.textContent = 'Creando sesión...';
    countdownEl.textContent = '';
    ventanaEl.textContent = '';
    modal.classList.remove('hidden');
    
    // Limpiar timers anteriores
    if (qrTimerInterval) { clearInterval(qrTimerInterval); qrTimerInterval = null; }
    if (qrDynamicInterval) { clearInterval(qrDynamicInterval); qrDynamicInterval = null; }
    
    // Verificar ventana de tiempo según horario (si existe)
    const ventanaInfo = await calcularVentanaActual(grupoId);
    qrVentanaActual = ventanaInfo.ventana; // 'puntual', 'retardo', 'cerrado', 'libre'
    
    if (qrVentanaActual === 'cerrado') {
        ventanaEl.textContent = '🔴 CLASE CERRADA - La clase ya terminó';
        ventanaEl.className = 'qr-ventana qr-ventana-cerrado';
        qrContainer.innerHTML = '<p style="color:#999;padding:40px;">⏰ Clase finalizada</p>';
        sesionInfo.textContent = 'La clase ha terminado.';
        return;
    }
    
    if (qrVentanaActual === 'sin_derecho') {
        ventanaEl.textContent = '🔴 SIN DERECHO (solo registro, cuenta como ausencia)';
        ventanaEl.className = 'qr-ventana qr-ventana-cerrado';
    } else if (qrVentanaActual === 'retardo') {
        ventanaEl.textContent = '⚠️ VENTANA: RETARDO (llegas tarde)';
        ventanaEl.className = 'qr-ventana qr-ventana-retardo';
    } else if (qrVentanaActual === 'puntual') {
        ventanaEl.textContent = '✅ VENTANA: A TIEMPO (asistencia normal)';
        ventanaEl.className = 'qr-ventana qr-ventana-puntual';
    } else {
        ventanaEl.textContent = '📷 VENTANA LIBRE (sin horario fijo)';
        ventanaEl.className = 'qr-ventana qr-ventana-libre';
    }
    
    // 1. Cerrar sesiones activas anteriores de este grupo
    await supabaseClient
        .from('sesiones_clase')
        .update({ activa: false })
        .eq('grupo_id', grupoId)
        .eq('activa', true);
    
    // 2. Crear nueva sesión
    const codigoSesion = generarCodigoSesion();
    console.log('Creando sesión:', { grupoId, profesorId: profesorActual?.id, codigoSesion });
    const { data: sesion, error } = await supabaseClient
        .from('sesiones_clase')
        .insert({
            grupo_id: grupoId,
            profesor_id: profesorActual.id,
            codigo_sesion: codigoSesion,
            activa: true,
            creado_en: new Date().toISOString()
        })
        .select()
        .maybeSingle();
    
    if (error || !sesion) {
        console.error('Error al crear sesión:', error, sesion);
        alert('Error al crear sesión: ' + (error?.message || 'No se pudo crear la sesión.'));
        cerrarQR();
        return;
    }
    
    sesionActivaId = sesion.id;
    
    // 3. Generar QR inicial
    generarQRCode(qrContainer, grupoId, codigoSesion);
    
    sesionInfo.textContent = `Sesión: ${codigoSesion} • ${new Date().toLocaleTimeString()}`;
    
    // 4. Iniciar QR dinámico (refresca cada 10s con nuevo timestamp)
    qrDynamicInterval = setInterval(() => {
        if (!sesionActivaId) { clearInterval(qrDynamicInterval); qrDynamicInterval = null; return; }
        qrContainer.innerHTML = '';
        generarQRCode(qrContainer, grupoId, codigoSesion);
        sesionInfo.textContent = `Sesión: ${codigoSesion} • ${new Date().toLocaleTimeString()} • QR actualizado`;
    }, 10000);
    
    // 5. Iniciar monitoreo en vivo del profesor
    // Obtener perdones del grupo
    let perdonesMax = 2;
    try {
        const { data: g } = await supabaseClient.from('grupos').select('numero_perdones').eq('id', grupoId).single();
        if (g && g.numero_perdones != null) perdonesMax = g.numero_perdones;
    } catch (e) { /* usar default */ }
    iniciarMonitoreoProfesor(grupoId, sesion.id, perdonesMax);
    
    // 6. Contador regresivo (120s o hasta fin de ventana)
    const segundosMaximos = await calcularSegundosMaximos(grupoId);
    let segundosRestantes = segundosMaximos;
    actualizarCountdown(countdownEl, segundosRestantes);
    
    qrTimerInterval = setInterval(async () => {
        segundosRestantes--;
        actualizarCountdown(countdownEl, segundosRestantes);
        
        // Verificar cambios en la ventana de tiempo
        if (qrDynamicInterval && grupoId) {
            const vInfo = await calcularVentanaActual(grupoId);
            
            // Si la clase ya pasó del horario de fin → cerrar todo
            if (vInfo.ventana === 'cerrado' && qrVentanaActual !== 'cerrado') {
                clearInterval(qrDynamicInterval); qrDynamicInterval = null;
                clearInterval(qrTimerInterval); qrTimerInterval = null;
                await finalizarSesion(grupoId);
                countdownEl.textContent = '⏰ Clase finalizada';
                ventanaEl.textContent = '🔴 CLASE CERRADA';
                ventanaEl.className = 'qr-ventana qr-ventana-cerrado';
                qrContainer.innerHTML = '<p style="color:#999;padding:40px;">⏰ Clase finalizada</p>';
                sesionInfo.textContent = 'La clase ha terminado.';
                return;
            }
            
            // Actualizar indicador de ventana si cambió
            if (vInfo.ventana !== qrVentanaActual) {
                qrVentanaActual = vInfo.ventana;
                if (qrVentanaActual === 'sin_derecho') {
                    ventanaEl.textContent = '🔴 SIN DERECHO (solo registro, cuenta como ausencia)';
                    ventanaEl.className = 'qr-ventana qr-ventana-cerrado';
                } else if (qrVentanaActual === 'retardo') {
                    ventanaEl.textContent = '⚠️ VENTANA: RETARDO (llegas tarde)';
                    ventanaEl.className = 'qr-ventana qr-ventana-retardo';
                }
            }
        }
        
        if (segundosRestantes <= 0) {
            clearInterval(qrTimerInterval);
            qrTimerInterval = null;
            await finalizarSesion(grupoId);
            countdownEl.textContent = '⏰ Clase finalizada';
            ventanaEl.textContent = '🔴 CLASE CERRADA';
            ventanaEl.className = 'qr-ventana qr-ventana-cerrado';
            qrContainer.innerHTML = '<p style="color:#999;padding:40px;">⏰ Clase finalizada</p>';
            sesionInfo.textContent = 'La clase ha terminado.';
        }
    }, 1000);
}

function generarQRCode(container, grupoId, codigoSesion) {
    const ts = Date.now();
    const datosQR = JSON.stringify({
        grupo_id: grupoId,
        codigo_sesion: codigoSesion,
        ts: ts
    });
    
    try {
        new QRCode(container, {
            text: datosQR,
            width: 220,
            height: 220,
            colorDark: '#333333',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (err) {
        console.error('Error generando QR:', err);
    }
}

async function calcularVentanaActual(grupoId) {
    // Verificar si hay horario para hoy
    const hoy = new Date().getDay(); // 0=Dom, 1=Lun...
    const ahora = new Date();
    const horaActual = `${ahora.getHours().toString().padStart(2,'0')}:${ahora.getMinutes().toString().padStart(2,'0')}`;
    
    const { data: horarios } = await supabaseClient
        .from('horarios')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('dia_semana', hoy)
        .eq('activo', true);
    
    if (!horarios || horarios.length === 0) {
        return { ventana: 'libre' }; // Sin horario, QR libre
    }
    
    // Buscar el horario que aplica ahora
    for (const h of horarios) {
        const inicio = h.hora_inicio.substring(0, 5);
        const fin = h.hora_fin.substring(0, 5);
        
        if (horaActual >= inicio && horaActual <= fin) {
            // Calcular minutos desde inicio
            const [hI, mI] = inicio.split(':').map(Number);
            const [hA, mA] = horaActual.split(':').map(Number);
            const minutosDesdeInicio = (hA - hI) * 60 + (mA - mI);
            
            // Usar límites configurados por día (desde el horario)
            const puntualMin = h.puntual_minutos ?? 10;
            const retardoMin = h.retardo_minutos ?? 20;
            
            if (minutosDesdeInicio <= puntualMin) {
                return { ventana: 'puntual', horario: h };
            } else if (minutosDesdeInicio <= retardoMin) {
                return { ventana: 'retardo', horario: h };
            } else {
                return { ventana: 'sin_derecho', horario: h }; // Dentro del horario pero pasado el retardo
            }
        }
    }
    
    return { ventana: 'cerrado' };
}

async function calcularSegundosMaximos(grupoId) {
    const v = await calcularVentanaActual(grupoId);
    if (v.ventana === 'libre') return 7200; // 2 horas por defecto si no hay horario
    
    if (v.horario) {
        const ahora = new Date();
        const [hF, mF] = v.horario.hora_fin.substring(0, 5).split(':').map(Number);
        const fin = new Date(ahora);
        fin.setHours(hF, mF, 0);
        const segundosHastaFin = Math.floor((fin - ahora) / 1000);
        if (segundosHastaFin <= 0) return 60; // Ya casi termina, dar 1 minuto
        return segundosHastaFin; // El QR dura hasta el fin de la clase
    }
    return 7200;
}

function actualizarCountdown(el, segundos) {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    el.textContent = `⏱️ ${min}:${seg.toString().padStart(2, '0')}`;
    
    if (segundos <= 30) {
        el.style.color = '#ef4444';
    } else if (segundos <= 60) {
        el.style.color = '#f59e0b';
    } else {
        el.style.color = '#2e7d32';
    }
}

function generarCodigoSesion() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

async function finalizarSesion(grupoId) {
    if (sesionActivaId) {
        await supabaseClient
            .from('sesiones_clase')
            .update({ activa: false })
            .eq('id', sesionActivaId);
        sesionActivaId = null;
    }
}

function cerrarQR() {
    if (qrTimerInterval) {
        clearInterval(qrTimerInterval);
        qrTimerInterval = null;
    }
    if (qrDynamicInterval) {
        clearInterval(qrDynamicInterval);
        qrDynamicInterval = null;
    }
    qrGrupoActualId = null;
    document.getElementById('modal-qr-asistencia').classList.add('hidden');
    // NOTA: ya no cerramos el monitoreo ni desactivamos la sesión
    // El profesor puede seguir viendo a los alumnos aunque cierre el QR
}

// ====== MONITOREO EN VIVO (PROFESOR) ======
let monitorGrupoId = null;
let monitorSesionId = null;
let monitorProfChannel = null;
let monitorPerdonesUsados = 0;
let monitorPerdonesMax = 2;
let monitorAlumnosSet = new Set();

async function iniciarMonitoreoProfesor(grupoId, sesionId, perdonesMax) {
    monitorGrupoId = grupoId;
    monitorSesionId = sesionId;
    monitorPerdonesMax = perdonesMax || 2;
    monitorPerdonesUsados = 0;
    monitorAlumnosSet = new Set();
    
    const panel = document.getElementById('monitoreo-panel');
    panel.classList.remove('hidden');
    
    // Obtener nombre del grupo
    const { data: g } = await supabaseClient.from('grupos').select('nombre').eq('id', grupoId).maybeSingle();
    document.getElementById('monitoreo-grupo-nombre').textContent = g?.nombre || 'Grupo';
    document.getElementById('monitoreo-perdones-max').textContent = monitorPerdonesMax;
    actualizarMonitorPerdonesUI();
    
    document.getElementById('monitoreo-lista').innerHTML = '<p class="empty-state">Cargando alumnos...</p>';
    document.getElementById('monitoreo-alumnos-count').textContent = '0';
    
    // Cargar asistencias existentes de hoy
    await cargarAsistenciasActivas();
    
    // Suscripción en tiempo real a cambios en asistencia del grupo de hoy
    const hoy = new Date().toISOString().split('T')[0];
    
    if (monitorProfChannel) {
        supabaseClient.removeChannel(monitorProfChannel);
    }
    
    monitorProfChannel = supabaseClient.channel('monitor-prof-' + grupoId)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'asistencia', filter: `grupo_id=eq.${grupoId}` },
            async (payload) => {
                // Verificar si es de hoy
                const fecha = payload.new?.fecha || payload.old?.fecha;
                if (fecha !== hoy) return;
                await cargarAsistenciasActivas();
            }
        )
        .subscribe();
}

async function cargarAsistenciasActivas() {
    if (!monitorGrupoId) return;
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data: asistencias } = await supabaseClient
        .from('asistencia')
        .select('*, alumnos!inner(nombre, email, matricula)')
        .eq('grupo_id', monitorGrupoId)
        .eq('fecha', hoy)
        .order('creado_en', { ascending: true });
    
    const lista = document.getElementById('monitoreo-lista');
    
    if (!asistencias || asistencias.length === 0) {
        lista.innerHTML = '<p class="empty-state">📱 Esperando que los alumnos escaneen el QR...</p>';
        document.getElementById('monitoreo-alumnos-count').textContent = '0';
        return;
    }
    
    document.getElementById('monitoreo-alumnos-count').textContent = asistencias.length;
    
    lista.innerHTML = asistencias.map(a => {
        const nombre = a.alumnos?.nombre || 'Alumno';
        const cambios = a.cambios_pantalla || 0;
        const confirmada = a.confirmada;
        const perdonada = a.perdonada;
        const retardo = a.tipo_asistencia === 'retardo';
        
        let statusClass = 'status-pending';
        let statusText = '🔵 Pendiente';
        let btnPardon = '';
        
        if (confirmada) {
            statusClass = 'status-confirmed';
            statusText = retardo ? '⚠️ Confirmada (retardo)' : '✅ Confirmada';
        } else if (perdonada) {
            statusClass = 'status-pardoned';
            statusText = '🙏 Perdonado';
        } else if (cambios >= monitorPerdonesMax) {
            statusClass = 'status-violated';
            statusText = '⚠️ Excedido';
            if (monitorPerdonesUsados < monitorPerdonesMax) {
                btnPardon = `<button onclick="perdonarAlumno('${a.id}')" class="btn-pardon">🙏 Perdonar</button>`;
            }
        } else if (retardo) {
            statusText = '🟡 Retardo';
        } else {
            statusText = '🔵 En clase';
        }
        
        return `
            <div class="list-item" style="padding: 10px 14px;">
                <div style="flex:1; min-width:0;">
                    <strong style="font-size:0.95em;">${nombre}</strong>
                    <br><small style="color:#666;">${a.alumnos?.matricula || a.alumnos?.email || ''}</small>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="text-align:center; min-width:40px;">
                        <div style="font-weight:800; font-size:1.2em; ${cambios >= monitorPerdonesMax ? 'color:#c62828;' : cambios > 0 ? 'color:#e65100;' : 'color:#2e7d32;'}">${cambios}</div>
                        <div style="font-size:0.6em; color:#999;">cambios</div>
                    </div>
                    <div style="font-size:0.8em; ${statusClass === 'status-violated' ? 'color:#c62828;' : statusClass === 'status-confirmed' ? 'color:#2e7d32;' : 'color:#666;'}">
                        ${statusText}
                    </div>
                    ${btnPardon}
                </div>
            </div>
        `;
    }).join('');
}

async function perdonarAlumno(asistenciaId) {
    if (!asistenciaId || monitorPerdonesUsados >= monitorPerdonesMax) return;
    
    const { error } = await supabaseClient
        .from('asistencia')
        .update({ perdonada: true })
        .eq('id', asistenciaId);
    
    if (error) {
        alert('Error al perdonar: ' + error.message);
        return;
    }
    
    monitorPerdonesUsados++;
    actualizarMonitorPerdonesUI();
    await cargarAsistenciasActivas();
}

function actualizarMonitorPerdonesUI() {
    document.getElementById('monitoreo-perdones-usados').textContent = monitorPerdonesUsados;
    const max = monitorPerdonesMax;
    const usado = monitorPerdonesUsados;
    const badge = document.getElementById('monitoreo-estado-badge');
    if (usado >= max) {
        badge.textContent = 'SIN PERDONES';
        badge.style.background = '#ef4444';
    } else {
        badge.textContent = 'ACTIVO';
        badge.style.background = '#4caf50';
    }
}

function cerrarMonitoreo() {
    if (monitorProfChannel) {
        supabaseClient.removeChannel(monitorProfChannel);
        monitorProfChannel = null;
    }
    // Desactivar sesión activa en Supabase
    if (monitorSesionId) {
        supabaseClient.from('sesiones_clase').update({ activa: false }).eq('id', monitorSesionId);
        monitorSesionId = null;
    }
    monitorGrupoId = null;
    monitorPerdonesUsados = 0;
    monitorAlumnosSet = new Set();
    document.getElementById('monitoreo-panel').classList.add('hidden');
}

// ====== COMPLETAR PERFIL (profesor - mismo fix que alumno) ======
async function completarPerfil(e) {
    e.preventDefault();
    const nombre = document.getElementById('comp-nombre').value.trim();
    const errorDiv = document.getElementById('completar-error');
    errorDiv.textContent = 'Guardando...';
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        errorDiv.textContent = 'Error: No hay sesión activa.';
        return;
    }
    
    const { error: dbError } = await supabaseClient
        .from('profesores')
        .upsert({
            id: user.id,
            email: user.email || '',
            nombre: nombre,
            device_id: deviceId
        });
    
    if (dbError) {
        errorDiv.textContent = 'Error al guardar: ' + dbError.message;
        return;
    }
    
    profesorActual = { id: user.id, nombre, email: user.email || '', device_id: deviceId };
    document.getElementById('profesor-nombre').textContent = `Hola, ${nombre}`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('completar-perfil-form').classList.add('hidden');
    cargarGrupos();
}

// ====== HORARIOS DE CLASE (por día) ======
let horariosGrupoActual = null;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function mostrarModalHorarios(grupoId, grupoNombre) {
    horariosGrupoActual = grupoId;
    document.getElementById('horarios-grupo-info').textContent = `Configurando horarios para: ${grupoNombre}`;
    document.getElementById('modal-horarios').classList.remove('hidden');
    
    // Cargar GPS y perdones del grupo
    supabaseClient
        .from('grupos')
        .select('latitud, longitud, radio_metros, numero_perdones')
        .eq('id', grupoId)
        .single()
        .then(({ data: grupo }) => {
            if (grupo) {
                document.getElementById('horario-latitud').value = grupo.latitud || '';
                document.getElementById('horario-longitud').value = grupo.longitud || '';
                document.getElementById('horario-radio').value = grupo.radio_metros || 100;
                document.getElementById('horario-perdones').value = grupo.numero_perdones ?? 2;
            }
        });
    
    generarFilasHorarios(grupoId);
}

function cerrarModalHorarios() {
    document.getElementById('modal-horarios').classList.add('hidden');
    horariosGrupoActual = null;
}

async function generarFilasHorarios(grupoId) {
    const container = document.getElementById('horarios-dias-container');
    container.innerHTML = '';
    
    // Cargar horarios existentes del grupo
    const { data: horarios } = await supabaseClient
        .from('horarios')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('activo', true);
    
    const horarioMap = {};
    if (horarios) {
        horarios.forEach(h => { horarioMap[h.dia_semana] = h; });
    }
    
    for (let dia = 0; dia <= 6; dia++) {
        const existente = horarioMap[dia];
        const row = document.createElement('div');
        row.className = 'dia-horario-row';
        const pMin = existente ? (existente.puntual_minutos ?? 10) : 10;
        const rMin = existente ? (existente.retardo_minutos ?? 20) : 20;
        row.innerHTML = `
            <div class="dia-horario-label">${DIAS[dia]}</div>
            <div class="dia-horario-inputs">
                <input type="time" class="hora-inicio-dia" value="${existente ? existente.hora_inicio.substring(0,5) : ''}" placeholder="Inicio" data-dia="${dia}">
                <span style="color:#999;">→</span>
                <input type="time" class="hora-fin-dia" value="${existente ? existente.hora_fin.substring(0,5) : ''}" placeholder="Fin" data-dia="${dia}">
            </div>
            <div style="display:flex;align-items:center;gap:2px;white-space:nowrap;">
                <span class="dia-limite-label">🟢</span>
                <input type="number" class="dia-limite-input edit-puntual-min" value="${pMin}" min="1" max="120" data-dia="${dia}">
                <span class="dia-limite-label">🟡</span>
                <input type="number" class="dia-limite-input edit-retardo-min" value="${rMin}" min="1" max="999" data-dia="${dia}">
            </div>
            <span class="dia-sin-clase" style="${existente ? 'display:none;' : ''}">(sin clase)</span>
            <button class="btn-copy-horario" onclick="copiarHorarioDia(${dia})" title="Copiar horario a todos los días">📋</button>
        `;
        
        // Auto-completar hora_fin cuando cambia hora_inicio (+50 min)
        const inicioInput = row.querySelector('.hora-inicio-dia');
        const finInput = row.querySelector('.hora-fin-dia');
        const sinClaseSpan = row.querySelector('.dia-sin-clase');
        
        inicioInput.addEventListener('change', () => {
            if (inicioInput.value && !finInput.value) {
                const [h, m] = inicioInput.value.split(':').map(Number);
                const fin = new Date();
                fin.setHours(h, m + 50, 0);
                finInput.value = `${fin.getHours().toString().padStart(2,'0')}:${fin.getMinutes().toString().padStart(2,'0')}`;
            }
            sinClaseSpan.style.display = (inicioInput.value || finInput.value) ? 'none' : '';
        });
        
        finInput.addEventListener('change', () => {
            sinClaseSpan.style.display = (inicioInput.value || finInput.value) ? 'none' : '';
        });
        
        container.appendChild(row);
    }
}

function copiarHorarioDia(origen) {
    const rows = document.querySelectorAll('#horarios-dias-container .dia-horario-row');
    if (rows.length === 0) return;
    const origenRow = rows[origen];
    const inicioOrig = origenRow.querySelector('.hora-inicio-dia').value;
    const finOrig = origenRow.querySelector('.hora-fin-dia').value;
    const puntualOrig = origenRow.querySelector('.edit-puntual-min').value;
    const retardoOrig = origenRow.querySelector('.edit-retardo-min').value;
    
    if (!inicioOrig) {
        alert('Primero configura el horario del día ' + DIAS[origen]);
        return;
    }
    
    rows.forEach((row, i) => {
        if (i !== origen) {
            row.querySelector('.hora-inicio-dia').value = inicioOrig;
            row.querySelector('.hora-fin-dia').value = finOrig;
            row.querySelector('.edit-puntual-min').value = puntualOrig;
            row.querySelector('.edit-retardo-min').value = retardoOrig;
            row.querySelector('.dia-sin-clase').style.display = 'none';
        }
    });
    
    alert(`✅ Horario de ${DIAS[origen]} copiado a todos los días.`);
}

async function guardarHorarios() {
    if (!horariosGrupoActual) return;
    
    const rows = document.querySelectorAll('#horarios-dias-container .dia-horario-row');
    let horariosAGuardar = [];
    
    rows.forEach((row, dia) => {
        const inicio = row.querySelector('.hora-inicio-dia').value;
        const fin = row.querySelector('.hora-fin-dia').value;
        const puntual = parseInt(row.querySelector('.edit-puntual-min').value) || 10;
        const retardo = parseInt(row.querySelector('.edit-retardo-min').value) || 20;
        if (inicio && fin) {
            // Normalizar formato TIME (PostgreSQL espera HH:MM:SS)
            const horaInicio = inicio.length === 5 ? inicio + ':00' : inicio;
            const horaFin = fin.length === 5 ? fin + ':00' : fin;
            horariosAGuardar.push({ dia_semana: dia, hora_inicio: horaInicio, hora_fin: horaFin, puntual_minutos: puntual, retardo_minutos: retardo });
        }
    });
    
    if (horariosAGuardar.length === 0) {
        alert('Configura al menos un día con horario.');
        return;
    }
    
    // Guardar GPS en el grupo (si se configuró)
    const latitud = parseFloat(document.getElementById('horario-latitud').value) || null;
    const longitud = parseFloat(document.getElementById('horario-longitud').value) || null;
    const radio = parseInt(document.getElementById('horario-radio').value) || null;
    const perdones = parseInt(document.getElementById('horario-perdones').value) ?? 2;
    
    const updateData = { numero_perdones: perdones };
    if (latitud && longitud) {
        updateData.latitud = latitud;
        updateData.longitud = longitud;
        updateData.radio_metros = radio || 100;
    }
    const { error: errGrupo } = await supabaseClient
        .from('grupos')
        .update(updateData)
        .eq('id', horariosGrupoActual);
    if (errGrupo) {
        console.error('Error actualizando grupo:', JSON.stringify(errGrupo));
    }
    
    // Desactivar horarios anteriores
    const { error: errDesactivar } = await supabaseClient
        .from('horarios')
        .update({ activo: false })
        .eq('grupo_id', horariosGrupoActual)
        .eq('activo', true);
    if (errDesactivar) {
        console.error('Error desactivando horarios:', JSON.stringify(errDesactivar));
    }
    
    // Insertar nuevos horarios (cada día con sus límites)
    let errores = 0;
    for (const h of horariosAGuardar) {
        const { error } = await supabaseClient
            .from('horarios')
            .insert({
                grupo_id: horariosGrupoActual,
                dia_semana: h.dia_semana,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                activo: true,
                creado_en: new Date().toISOString()
            });
        if (error) {
            console.error('Error guardando horario - mensaje:', error.message, 'detalles:', error.details, 'codigo:', error.code, 'hint:', error.hint);
            errores++;
        }
    }
    
    if (errores > 0) {
        alert('⚠️ Algunos horarios no se guardaron. Revisa la consola.');
    } else {
        alert('✅ Horarios guardados correctamente.');
    }
    
    cerrarModalHorarios();
    cargarGrupos();
}

// ====== GPS ======
function obtenerUbicacionActual() {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización.');
        return;
    }
    
    document.getElementById('horario-latitud').placeholder = 'Obteniendo...';
    document.getElementById('horario-longitud').placeholder = 'Obteniendo...';
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('horario-latitud').value = pos.coords.latitude.toFixed(6);
            document.getElementById('horario-longitud').value = pos.coords.longitude.toFixed(6);
            document.getElementById('horario-latitud').placeholder = 'Latitud';
            document.getElementById('horario-longitud').placeholder = 'Longitud';
        },
        (err) => {
            alert('No se pudo obtener la ubicación: ' + err.message);
            document.getElementById('horario-latitud').placeholder = 'Latitud';
            document.getElementById('horario-longitud').placeholder = 'Longitud';
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ====== AUTO-SCHEDULER (genera QR automático según horarios) ======
let autoSchedulerInterval = null;

function iniciarAutoScheduler() {
    if (autoSchedulerInterval) return;
    autoSchedulerInterval = setInterval(verificarHorarios, 30000); // cada 30s
}

function detenerAutoScheduler() {
    if (autoSchedulerInterval) {
        clearInterval(autoSchedulerInterval);
        autoSchedulerInterval = null;
    }
}

async function verificarHorarios() {
    if (!profesorActual || !profesorActual.id) return;
    
    const hoy = new Date().getDay();
    const ahora = new Date();
    const horaActual = `${ahora.getHours().toString().padStart(2,'0')}:${ahora.getMinutes().toString().padStart(2,'0')}`;
    
    // Obtener todos los grupos del profesor
    const { data: grupos } = await supabaseClient
        .from('grupos')
        .select('id, nombre')
        .eq('profesor_id', profesorActual.id);
    
    if (!grupos || grupos.length === 0) return;
    
    const grupoIds = grupos.map(g => g.id);
    
    // Obtener horarios activos para hoy
    const { data: horarios } = await supabaseClient
        .from('horarios')
        .select('*, grupos!inner(nombre)')
        .in('grupo_id', grupoIds)
        .eq('dia_semana', hoy)
        .eq('activo', true);
    
    if (!horarios || horarios.length === 0) return;
    
    for (const h of horarios) {
        const inicio = h.hora_inicio.substring(0, 5);
        const fin = h.hora_fin.substring(0, 5);
        
        // Solo abrir si estamos dentro del horario de clase
        if (horaActual >= inicio && horaActual <= fin) {
            // Verificar si ya hay sesión activa para este grupo
            const { data: sesionActiva } = await supabaseClient
                .from('sesiones_clase')
                .select('id')
                .eq('grupo_id', h.grupo_id)
                .eq('activa', true)
                .maybeSingle();
            
            if (!sesionActiva) {
                // Auto-generar QR
                const grupo = grupos.find(g => g.id === h.grupo_id);
                if (grupo) {
                    console.log('⏰ Auto-generando QR para:', grupo.nombre);
                    await generarQR(h.grupo_id, grupo.nombre);
                }
            }
        } else if (horaActual > fin) {
            // Cerrar sesiones vencidas
            await supabaseClient
                .from('sesiones_clase')
                .update({ activa: false })
                .eq('grupo_id', h.grupo_id)
                .eq('activa', true);
        }
    }
}

// Iniciar auto-scheduler cuando carga el dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Ya existe un DOMContentLoaded arriba, pero este solo inicia el scheduler
    // Se iniciará después del login exitoso
});

// ====== CONTROL DE SESIÓN ACTIVA ======
// Evita que un mismo usuario tenga sesión en varios navegadores/dispositivos

function iniciarChequeoSesion(userId, tabla) {
    detenerChequeoSesion();
    sesionCheckInterval = setInterval(async () => {
        const tokenGuardado = sessionStorage.getItem('asistencia_qr_sesion_token');
        if (!tokenGuardado) return;
        
        try {
            const { data } = await supabaseClient
                .from(tabla)
                .select('sesion_token')
                .eq('id', userId)
                .maybeSingle();
            
            if (data && data.sesion_token && data.sesion_token !== tokenGuardado) {
                detenerChequeoSesion();
                alert('⚠️ Tu sesión fue cerrada porque iniciaste sesión desde otro navegador o dispositivo.');
                try {
                    await supabaseClient.auth.signOut();
                } catch (e) {
                    console.warn('Error al cerrar sesión (posiblemente ya expiró):', e);
                }
                mostrarLogin();
            }
        } catch (e) {
            console.warn('Error al verificar sesión activa:', e);
        }
    }, 5000);
}

function detenerChequeoSesion() {
    if (sesionCheckInterval) {
        clearInterval(sesionCheckInterval);
        sesionCheckInterval = null;
    }
}