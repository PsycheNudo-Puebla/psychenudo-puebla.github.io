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
    setLoading('btn-login', true);
    try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email, password
        });
        
        if (error) {
            document.getElementById('login-error').textContent = 'Email o contraseña incorrectos';
            setLoading('btn-login', false, 'Entrar');
            return;
        }
        
        setLoading('btn-login', false, 'Entrar');
        await verificarYcargarProfesor(data.user);
    } finally {
        estaIniciandoSesion = false;
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
        mostrarToast('Ingresa tu email en el campo de arriba primero.', 'warning');
        return;
    }
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/recursos/asistencia%20qr/profesor.html'
        });
        if (error) {
            mostrarToast('Error: ' + error.message, 'error');
        } else {
            mostrarToast('📧 Revisa tu email para restablecer la contraseña.', 'exito');
        }
    } catch (err) {
        mostrarToast('Error al enviar correo: ' + err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    setLoading('btn-register', true);
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
        setLoading('btn-register', false, 'Registrarme');
        return;
    }
    
    // 2. Guardar/actualizar datos en tabla profesores con device_id
    // Usamos upsert con onConflict porque el trigger ya pudo haber creado la fila
    const { error: dbError } = await supabaseClient
        .from('profesores')
        .upsert({
            id: authData.user.id,
            email: email,
            nombre: nombre,
            device_id: deviceId
        }, { onConflict: 'id' });
    
    if (dbError) {
        // UPSERT falló — mostrar formulario completar perfil
        document.getElementById('register-error').textContent = '';
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('completar-perfil-form').classList.remove('hidden');
        document.getElementById('completar-error').textContent = '⚠️ El registro fue parcial. Completa tus datos.';
        document.getElementById('comp-nombre').value = nombre;
        setLoading('btn-register', false, 'Registrarme');
        return;
    }
    
    setLoading('btn-register', false, 'Registrarme');
    mostrarToast('Registro exitoso. Ya puedes iniciar sesión.', 'exito');
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
    
    // Si el registro tiene datos placeholder del trigger, pedir completar perfil
    if (data.nombre === 'Usuario Nuevo') {
        document.getElementById('login-error').textContent = '';
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('completar-perfil-form').classList.remove('hidden');
        document.getElementById('completar-error').textContent = '✏️ Tu cuenta ya existe pero necesita datos adicionales. Complétalos para continuar.';
        document.getElementById('comp-nombre').value = data.nombre === 'Usuario Nuevo' ? '' : data.nombre;
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
    
    // Si el registro tiene datos placeholder del trigger, pedir completar perfil
    if (data.nombre === 'Usuario Nuevo') {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('completar-perfil-form').classList.remove('hidden');
        document.getElementById('completar-error').textContent = '✏️ Tu cuenta ya existe pero necesita datos adicionales. Complétalos para continuar.';
        document.getElementById('comp-nombre').value = '';
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
        <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px; cursor:pointer;" onclick="seleccionarGrupo('${grupo.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex:1;">
                    <strong style="font-size:1.15em; color:#333;">${grupo.nombre}</strong>
                    <br><small style="color:#888;">${grupo.materia || 'Sin materia'} · Límite: ${grupo.limite_salidas} salidas · ${grupo.numero_perdones} perdones</small>
                </div>
                <div class="list-item-actions" style="flex-shrink:0; gap:4px;" onclick="event.stopPropagation();">
                    <button onclick="mostrarEditarGrupo('${grupo.id}')" class="btn-secondary" title="Editar grupo y horarios">✏️</button>
                    <button onclick="eliminarGrupo('${grupo.id}')" class="btn-danger" title="Eliminar grupo">🗑️</button>
                </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <div style="background:#f5f7ff; border-radius:8px; padding:6px 12px; font-size:0.8em; font-family:monospace; letter-spacing:2px; color:#667eea; display:flex; align-items:center; gap:6px;">
                    🔑 ${grupo.codigo_unico || '---'}
                    <span onclick="event.stopPropagation(); copiarCodigo('${grupo.codigo_unico}')" style="cursor:pointer; color:#999; font-size:1.1em;" title="Copiar código">📋</span>
                </div>
                <div id="grupo-horario-resumen-${grupo.id}" style="flex:1; font-size:0.8em; color:#888; display:flex; align-items:center;">
                    Cargando horarios...
                </div>
            </div>
        </div>
    `).join('');
    
    // Cargar resumen de horarios para cada grupo
    data.forEach(grupo => cargarResumenHorarios(grupo.id));
}

function copiarCodigo(codigo) {
    if (!codigo) return;
    navigator.clipboard.writeText(codigo).then(() => {
        mostrarToast('✅ Código copiado: ' + codigo, 'exito');
    }).catch(() => {
        // Fallback para navegadores sin clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = codigo;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        mostrarToast('✅ Código copiado: ' + codigo, 'exito');
    });
}

async function cargarResumenHorarios(grupoId) {
    const container = document.getElementById(`grupo-horario-resumen-${grupoId}`);
    if (!container) return;
    try {
        const { data, error } = await supabaseClient
            .from('horarios')
            .select('*')
            .eq('grupo_id', grupoId)
            .order('dia_semana', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            container.innerHTML = `<span style="color:#999;">⏰ Sin horarios configurados</span>`;
            return;
        }
        const diasNum = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const agrupados = {};
        data.forEach(h => {
            if (!agrupados[h.dia_semana]) agrupados[h.dia_semana] = [];
            agrupados[h.dia_semana].push(h);
        });
        let html = `<div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        for (let d = 0; d <= 6; d++) {
            if (agrupados[d]) {
                const horariosDia = agrupados[d].map(h =>
                    `${h.hora_inicio.substring(0,5)}-${h.hora_fin.substring(0,5)}`
                ).join(', ');
                html += `<span style="background:#e8edf5; padding:2px 8px; border-radius:8px; font-size:0.85em;">
                    <strong>${diasNum[d]}</strong> ${horariosDia}
                </span>`;
            }
        }
        html += `</div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<span style="color:#999;">⏰ Sin horarios</span>`;
    }
}

// ====== NAVEGACIÓN MASTER-DETAIL ======
let grupoSeleccionadoId = null;

function seleccionarGrupo(grupoId) {
    grupoSeleccionadoId = grupoId;
    document.getElementById('grupos-list-view').classList.add('hidden');
    document.getElementById('grupo-detalle-view').classList.remove('hidden');
    renderDetalleGrupo(grupoId);
}

function volverALista() {
    grupoSeleccionadoId = null;
    document.getElementById('grupo-detalle-view').classList.add('hidden');
    document.getElementById('grupos-list-view').classList.remove('hidden');
    // Ocultar monitoreo al volver
    document.getElementById('monitoreo-panel').classList.add('hidden');
    if (monitorProfChannel) {
        supabaseClient.removeChannel(monitorProfChannel);
        monitorProfChannel = null;
    }
    if (monitorPollInterval) {
        clearTimeout(monitorPollInterval);
        monitorPollInterval = null;
    }
    monitorGrupoId = null;
    cargarGrupos();
}

async function renderDetalleGrupo(grupoId) {
    const { data: grupo, error } = await supabaseClient
        .from('grupos')
        .select('*')
        .eq('id', grupoId)
        .maybeSingle();
    if (error || !grupo) { volverALista(); return; }
    
    // Cabecera
    document.getElementById('detalle-grupo-nombre').textContent = grupo.nombre;
    document.getElementById('detalle-grupo-materia').textContent = grupo.materia || 'Sin materia';
    document.getElementById('detalle-grupo-codigo').textContent = grupo.codigo_unico || '---';
    
    // Horarios
    cargarDetalleHorarios(grupoId);
    
    // Botones
    const btnQR = document.getElementById('detalle-btn-qr');
    const btnMonitoreo = document.getElementById('detalle-btn-monitoreo');
    const btnExportar = document.getElementById('detalle-btn-exportar');
    const btnVer = document.getElementById('detalle-btn-ver');
    const btnEditar = document.getElementById('detalle-btn-editar');
    
    // Reemplazar onclick para que usen el grupo actual
    btnQR.onclick = () => generarQR(grupoId, grupo.nombre);
    btnMonitoreo.onclick = () => reabrirMonitoreo(grupoId);
    btnExportar.onclick = () => exportarAsistencia(grupoId, grupo.nombre);
    btnVer.onclick = () => verGrupo(grupoId);
    btnEditar.onclick = () => mostrarEditarGrupo(grupoId);
}

async function cargarDetalleHorarios(grupoId) {
    const container = document.getElementById('detalle-grupo-horarios');
    try {
        const { data, error } = await supabaseClient
            .from('horarios')
            .select('*')
            .eq('grupo_id', grupoId)
            .order('dia_semana', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            container.innerHTML = `<span style="color:#999;">⏰ Sin horarios configurados</span>`;
            return;
        }
        const diasNum = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const agrupados = {};
        data.forEach(h => {
            if (!agrupados[h.dia_semana]) agrupados[h.dia_semana] = [];
            agrupados[h.dia_semana].push(h);
        });
        let html = `<strong style="font-size:0.85em;">📅 Horarios:</strong> `;
        for (let d = 0; d <= 6; d++) {
            if (agrupados[d]) {
                const horariosDia = agrupados[d].map(h =>
                    `${h.hora_inicio.substring(0,5)}-${h.hora_fin.substring(0,5)}`
                ).join(', ');
                html += `<span style="background:#e8edf5; padding:2px 8px; border-radius:8px; font-size:0.85em; margin:2px;">
                    <strong>${diasNum[d]}</strong> ${horariosDia}
                </span>`;
            }
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<span style="color:#999;">⏰ Sin horarios</span>`;
    }
}

function showCreateGroupModal() {
    document.getElementById('modal-crear-grupo').classList.remove('hidden');
    generarNuevoCodigo();
    renderCrearHorariosRows();
}

function cerrarModal() {
    document.getElementById('modal-crear-grupo').classList.add('hidden');
    document.getElementById('form-crear-grupo').reset();
    // Limpiar estado de edición
    const form = document.getElementById('form-crear-grupo');
    delete form.dataset.editando;
    const titulo = document.getElementById('modal-crear-grupo-title') || document.querySelector('#modal-crear-grupo h2');
    if (titulo) titulo.textContent = '📚 Crear nuevo grupo';
    const btnGuardar = document.getElementById('btn-guardar-grupo');
    if (btnGuardar) btnGuardar.textContent = '✅ Crear grupo';
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
        mostrarToast('Tu navegador no soporta geolocalización.', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('crear-grupo-latitud').value = pos.coords.latitude.toFixed(6);
            document.getElementById('crear-grupo-longitud').value = pos.coords.longitude.toFixed(6);
        },
        (err) => mostrarToast('No se pudo obtener ubicación: ' + err.message, 'error'),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Estado local para los horarios del formulario de crear/editar grupo
let horariosFormularioCrear = [];

function renderCrearHorariosRows() {
    const container = document.getElementById('crear-horarios-dias-container');
    if (!container) return;
    horariosFormularioCrear = [];
    renderHorariosCreados();
}

function renderHorariosCreados() {
    const container = document.getElementById('crear-horarios-dias-container');
    if (!container) return;
    
    let html = `
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:end; margin-bottom:12px; padding:12px; background:#f8f9fc; border-radius:10px;">
            <div>
                <label style="font-size:0.8em; color:#555;">Día</label>
                <select id="nuevo-horario-dia" style="padding:8px 10px; border:1px solid #ddd; border-radius:6px;">
                    ${DIAS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="font-size:0.8em; color:#555;">Inicio</label>
                <input type="time" id="nuevo-horario-inicio" style="padding:8px 10px; border:1px solid #ddd; border-radius:6px;">
            </div>
            <div>
                <label style="font-size:0.8em; color:#555;">Fin</label>
                <input type="time" id="nuevo-horario-fin" style="padding:8px 10px; border:1px solid #ddd; border-radius:6px;">
            </div>
            <div>
                <label style="font-size:0.8em; color:#555;">🟢 Puntual (min)</label>
                <input type="number" id="nuevo-horario-puntual" value="10" min="1" max="120" style="padding:8px 10px; border:1px solid #ddd; border-radius:6px; width:70px;">
            </div>
            <div>
                <label style="font-size:0.8em; color:#555;">🟡 Retardo (min)</label>
                <input type="number" id="nuevo-horario-retardo" value="20" min="1" max="999" style="padding:8px 10px; border:1px solid #ddd; border-radius:6px; width:70px;">
            </div>
            <div>
                <button onclick="agregarHorarioFormulario()" style="padding:8px 16px; background:#667eea; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
                    ➕ Agregar horario
                </button>
            </div>
        </div>
        <div id="lista-horarios-creados" style="display:flex; flex-direction:column; gap:6px;"></div>
    `;
    container.innerHTML = html;
    actualizarListaHorariosCreados();
}

function agregarHorarioFormulario() {
    const dia = parseInt(document.getElementById('nuevo-horario-dia').value);
    const inicio = document.getElementById('nuevo-horario-inicio').value;
    const fin = document.getElementById('nuevo-horario-fin').value;
    const puntual = parseInt(document.getElementById('nuevo-horario-puntual').value) || 10;
    const retardo = parseInt(document.getElementById('nuevo-horario-retardo').value) || 20;
    
    if (!inicio || !fin) {
        mostrarToast('Selecciona hora de inicio y fin del horario.', 'warning');
        return;
    }
    
    horariosFormularioCrear.push({ dia, inicio, fin, puntual, retardo });
    actualizarListaHorariosCreados();
    
    // Reset solo los inputs de tiempo para el siguiente horario
    document.getElementById('nuevo-horario-inicio').value = '';
    document.getElementById('nuevo-horario-fin').value = '';
}

function eliminarHorarioFormulario(index) {
    horariosFormularioCrear.splice(index, 1);
    actualizarListaHorariosCreados();
}

function actualizarListaHorariosCreados() {
    const lista = document.getElementById('lista-horarios-creados');
    if (!lista) return;
    if (horariosFormularioCrear.length === 0) {
        lista.innerHTML = `<span style="color:#999; font-size:0.9em; padding:8px;">No hay horarios agregados. Usa el formulario de arriba para añadir.</span>`;
        return;
    }
    const diasCorto = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    lista.innerHTML = horariosFormularioCrear.map((h, i) => `
        <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:white; border:1px solid #e0e4f0; border-radius:8px;">
            <span style="font-weight:600; min-width:50px;">${diasCorto[h.dia]}</span>
            <span>${h.inicio.substring(0,5)} → ${h.fin.substring(0,5)}</span>
            <span style="color:#666; font-size:0.85em;">🟢${h.puntual}min 🟡${h.retardo}min</span>
            <button onclick="eliminarHorarioFormulario(${i})" style="margin-left:auto; background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.2em;">✕</button>
        </div>
    `).join('');
}

// Manejar el envío del formulario
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
        mostrarToast('Error al crear grupo: ' + error.message, 'error');
        return;
    }
    
    // Guardar horarios usando el array del formulario (con soporte multi-sesión)
    let errores = 0;
    for (const h of horariosFormularioCrear) {
        const { error: err } = await supabaseClient
            .from('horarios')
            .insert({
                grupo_id: grupo.id,
                dia_semana: h.dia,
                hora_inicio: h.inicio,
                hora_fin: h.fin,
                puntual_minutos: h.puntual,
                retardo_minutos: h.retardo,
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
            .update({ latitud, longitud, radio_metros: radio || 50 })
            .eq('id', grupo.id);
    }
    
    if (errores > 0) {
        console.warn('Algunos horarios no se guardaron.');
    }
    
    setLoading('btn-guardar-grupo', false, '✅ Crear grupo');
    cargarGrupos();
    // Ir al detalle del grupo recién creado
    seleccionarGrupo(grupo.id);
}

async function mostrarEditarGrupo(grupoId) {
    // Obtener datos del grupo
    const { data: grupo, error } = await supabaseClient
        .from('grupos')
        .select('*')
        .eq('id', grupoId)
        .maybeSingle();
    if (error || !grupo) { mostrarToast('Error al cargar grupo', 'error'); return; }
    
    // Obtener horarios actuales
    const { data: horariosExistentes } = await supabaseClient
        .from('horarios')
        .select('*')
        .eq('grupo_id', grupoId);
    
    // Pre-poblar el modal de crear grupo con los datos existentes
    document.getElementById('grupo-nombre').value = grupo.nombre || '';
    document.getElementById('grupo-materia').value = grupo.materia || '';
    document.getElementById('grupo-limite').value = grupo.limite_salidas || 3;
    document.getElementById('grupo-perdones').value = grupo.numero_perdones || 2;
    document.getElementById('grupo-codigo').value = grupo.codigo_unico || '';
    if (grupo.latitud) {
        document.getElementById('crear-grupo-latitud').value = grupo.latitud || '';
        document.getElementById('crear-grupo-longitud').value = grupo.longitud || '';
        document.getElementById('crear-grupo-radio').value = grupo.radio_metros || 50;
    }
    
    // Cargar horarios existentes en el formulario
    renderCrearHorariosRows();
    horariosFormularioCrear = (horariosExistentes || []).map(h => ({
        dia: h.dia_semana,
        inicio: h.hora_inicio.substring(0,5),
        fin: h.hora_fin.substring(0,5),
        puntual: h.puntual_minutos || 10,
        retardo: h.retardo_minutos || 20
    }));
    actualizarListaHorariosCreados();
    
    // Mostrar modal y cambiar comportamiento del form
    const form = document.getElementById('form-crear-grupo');
    const titulo = document.getElementById('modal-crear-grupo-title') || document.querySelector('#modal-crear-grupo h2');
    if (titulo) titulo.textContent = '✏️ Editar grupo';
    
    // Guardar referencia al grupo que se está editando
    form.dataset.editando = grupoId;
    const btnGuardar = document.getElementById('btn-guardar-grupo');
    if (btnGuardar) btnGuardar.textContent = '💾 Guardar cambios';
    
    document.getElementById('modal-crear-grupo').classList.remove('hidden');
}

// Hook: cuando se guarda el formulario, si estamos editando llamar a guardarEdicion
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-crear-grupo');
    if (form) {
        // Reemplazar el submit para soportar edición
        const submitHandler = async (e) => {
            e.preventDefault();
            const editandoId = form.dataset.editando;
            const nombre = document.getElementById('grupo-nombre').value;
            const materia = document.getElementById('grupo-materia').value;
            const limite = parseInt(document.getElementById('grupo-limite').value);
            const perdones = parseInt(document.getElementById('grupo-perdones').value);
            const codigoUnico = document.getElementById('grupo-codigo').value || generarCodigoGrupo();
            
            if (editandoId) {
                await guardarEdicionGrupo(editandoId, nombre, materia, limite, perdones, codigoUnico);
            } else {
                setLoading('btn-guardar-grupo', true);
                await crearGrupo(nombre, materia, limite, perdones, codigoUnico);
            }
            cerrarModal();
        };
        // Reemplazar el listener anterior
        form.removeEventListener('submit', submitHandler);
        form.addEventListener('submit', submitHandler);
    }
});

async function guardarEdicionGrupo(id, nombre, materia, limite, perdones, codigoUnico) {
    setLoading('btn-guardar-grupo', true);
    // Actualizar datos del grupo
    const { error } = await supabaseClient
        .from('grupos')
        .update({ nombre, materia, limite_salidas: limite, numero_perdones: perdones, codigo_unico: codigoUnico })
        .eq('id', id);
    if (error) { mostrarToast('Error al actualizar grupo: ' + error.message, 'error'); setLoading('btn-guardar-grupo', false, 'Guardar cambios'); return; }
    
    // Guardar GPS si cambió
    const latitud = parseFloat(document.getElementById('crear-grupo-latitud').value) || null;
    const longitud = parseFloat(document.getElementById('crear-grupo-longitud').value) || null;
    const radio = parseInt(document.getElementById('crear-grupo-radio').value) || null;
    if (latitud && longitud) {
        await supabaseClient.from('grupos').update({ latitud, longitud, radio_metros: radio || 50 }).eq('id', id);
    }
    
    // Reemplazar horarios: borrar existentes y crear los nuevos
    await supabaseClient.from('horarios').delete().eq('grupo_id', id);
    
    for (const h of horariosFormularioCrear) {
        const { error: err } = await supabaseClient
            .from('horarios')
            .insert({
                grupo_id: id,
                dia_semana: h.dia,
                hora_inicio: h.inicio,
                hora_fin: h.fin,
                puntual_minutos: h.puntual,
                retardo_minutos: h.retardo,
                activo: true,
                creado_en: new Date().toISOString()
            });
        if (err) console.error('Error actualizando horario:', err.message);
    }
    
    // Limpiar estado de edición
    const form = document.getElementById('form-crear-grupo');
    delete form.dataset.editando;
    const titulo = document.getElementById('modal-crear-grupo-title') || document.querySelector('#modal-crear-grupo h2');
    if (titulo) titulo.textContent = '📚 Crear nuevo grupo';
    
    setLoading('btn-guardar-grupo', false, 'Guardar cambios');
    cargarGrupos();
    // Si estamos en la vista detalle, refrescarla
    if (grupoSeleccionadoId === id) {
        renderDetalleGrupo(id);
    }
}

async function eliminarGrupo(id) {
    if (!confirm('¿Eliminar este grupo? Se perderán todos los datos de alumnos y clases asociadas.')) return;
    
    // 1. Verificar sesión activa
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        mostrarToast('Error: Tu sesión ha expirado. Recarga la página y vuelve a iniciar sesión.', 'error');
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
        
        mostrarToast('No se pudo eliminar el grupo por políticas de seguridad. Revisa la consola.', 'error');
        console.warn(mensaje);
        
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
    // Si estábamos en el detalle de este grupo, volver a la lista
    if (grupoSeleccionadoId === id) {
        volverALista();
    }
}

// ====== EXPORTAR ASISTENCIA A EXCEL (.xls) CON COLORES ======
async function exportarAsistencia(grupoId, grupoNombre) {
    const btn = document.getElementById('detalle-btn-exportar');
    if (btn) btn.textContent = '⏳...';
    
    try {
        // 1. Obtener todos los alumnos del grupo
        const { data: alumnos, error: errAl } = await supabaseClient
            .from('grupo_alumnos')
            .select('alumno_id, alumnos!inner(id, nombre, email)')
            .eq('grupo_id', grupoId);
        
        if (errAl) throw errAl;
        if (!alumnos || alumnos.length === 0) {
            mostrarToast('No hay alumnos inscritos en este grupo.', 'warning');
            if (btn) btn.textContent = '📊';
            return;
        }
        
        // 2. Obtener todas las fechas con asistencia
        const { data: fechasData } = await supabaseClient
            .from('asistencia')
            .select('fecha')
            .eq('grupo_id', grupoId)
            .order('fecha', { ascending: true });
        
        const fechasSet = new Set();
        if (fechasData) fechasData.forEach(a => fechasSet.add(a.fecha));
        
        if (fechasSet.size === 0) {
            mostrarToast('Aún no hay registros de asistencia en este grupo.', 'warning');
            if (btn) btn.textContent = '📊';
            return;
        }
        
        const fechas = Array.from(fechasSet);
        
        // 3. Obtener todos los registros de asistencia
        const { data: asistencias, error: errAs } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('grupo_id', grupoId);
        
        if (errAs) throw errAs;
        
        const asistenciaMap = {};
        if (asistencias) {
            asistencias.forEach(a => {
                const key = `${a.alumno_id}|${a.fecha}`;
                asistenciaMap[key] = a;
            });
        }
        
        // 4. Helper para obtener estado y estilo
        function getEstadoCelda(a) {
            if (!a) return { texto: '—', estilo: 'SinReg' };
            if (a.tipo_asistencia === 'sin_derecho') return { texto: 'SD', estilo: 'SinDer' };
            if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') return { texto: 'Retardo', estilo: 'Retardo' };
            if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3) {
                return { texto: 'SD', estilo: 'SinDer' };
            }
            if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente')) return { texto: 'Presente', estilo: 'Presente' };
            if (a.estado === 'ausente') return { texto: 'Ausente', estilo: 'Ausente' };
            if (a.estado === 'justificado') return { texto: 'Justificado', estilo: 'Justif' };
            return { texto: a.estado || '?', estilo: 'SinReg' };
        }
        
        function escXML(s) {
            return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        
        function formatearFecha(f) {
            const d = new Date(f + 'T12:00:00');
            return d.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
        }
        
        // 5. Construir XML Spreadsheet 2003
        let xls = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xls += '<?mso-application progid="Excel.Sheet"?>\n';
        xls += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xls += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xls += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xls += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xls += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        
        // Document properties
        xls += '<DocumentProperties><Author>Sistema de Asistencia QR</Author>';
        xls += '<LastAuthor>Profesor</LastAuthor>';
        xls += '<Created>' + new Date().toISOString() + '</Created>';
        xls += '</DocumentProperties>\n';
        
        // === STYLES ===
        xls += '<Styles>\n';
        // Título
        xls += '<Style ss:ID="Titulo"><Font ss:Bold="1" ss:Size="16" ss:Color="#1a1a2e"/></Style>\n';
        xls += '<Style ss:ID="SubTitulo"><Font ss:Size="11" ss:Color="#666666"/></Style>\n';
        // Headers
        xls += '<Style ss:ID="Header"><Font ss:Bold="1" ss:Size="10" ss:Color="#FFFFFF"/>';
        xls += '<Interior ss:Color="#1a1a2e" ss:Pattern="Solid"/>';
        xls += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
        xls += '<Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
        // Summary headers colored
        ['#2e7d32','#e65100','#c62828','#f57f17','#7b1fa2'].forEach((c, i) => {
            const names = ['HeaderP','HeaderR','HeaderA','HeaderJ','HeaderPant'];
            xls += '<Style ss:ID="' + names[i] + '"><Font ss:Bold="1" ss:Size="10" ss:Color="#FFFFFF"/>';
            xls += '<Interior ss:Color="' + c + '" ss:Pattern="Solid"/>';
            xls += '<Alignment ss:Horizontal="Center"/></Style>\n';
        });
        // Cell styles for each status
        const estilos = [
            {id:'Presente', bg:'#e8f5e9', font:'#2e7d32'},
            {id:'Retardo', bg:'#fff3e0', font:'#e65100'},
            {id:'Ausente', bg:'#ffebee', font:'#c62828'},
            {id:'SinDer', bg:'#f3e5f5', font:'#7b1fa2'},
            {id:'Justif', bg:'#fff8e1', font:'#f57f17'},
            {id:'SinReg', bg:'#fafafa', font:'#cccccc'},
            {id:'TotP', bg:'#f0faf0', font:'#2e7d32'},
            {id:'TotR', bg:'#fff8f0', font:'#e65100'},
            {id:'TotA', bg:'#fff0f0', font:'#c62828'},
            {id:'TotJ', bg:'#fffef0', font:'#f57f17'},
            {id:'TotPant', bg:'#faf0ff', font:'#7b1fa2'},
            {id:'BoldName', bg:'#ffffff', font:'#1a1a2e'}
        ];
        estilos.forEach(s => {
            xls += '<Style ss:ID="' + s.id + '"><Font ss:Color="' + s.font + '" ss:Bold="1" ss:Size="10"/>';
            xls += '<Interior ss:Color="' + s.bg + '" ss:Pattern="Solid"/>';
            xls += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            xls += '</Style>\n';
        });
        // Date header style
        xls += '<Style ss:ID="FechaHeader"><Font ss:Bold="1" ss:Size="9" ss:Color="#333333"/>';
        xls += '<Interior ss:Color="#f0f4ff" ss:Pattern="Solid"/>';
        xls += '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n';
        // Normal cell
        xls += '<Style ss:ID="NormalCell"><Font ss:Size="10"/><Alignment ss:Horizontal="Left"/></Style>\n';
        xls += '</Styles>\n';
        
        // === SHEET 1: ASISTENCIAS ===
        xls += '<Worksheet ss:Name="Asistencias">\n';
        xls += '<Table>\n';
        
        // Column widths
        xls += '<Column ss:AutoFitWidth="1" ss:Width="220"/>'; // Nombre
        fechas.forEach(() => { xls += '<Column ss:AutoFitWidth="1" ss:Width="90"/>'; });
        xls += '<Column ss:AutoFitWidth="1" ss:Width="70"/>'; // Presentes
        xls += '<Column ss:AutoFitWidth="1" ss:Width="65"/>'; // Retardos
        xls += '<Column ss:AutoFitWidth="1" ss:Width="65"/>'; // Ausencias
        xls += '<Column ss:AutoFitWidth="1" ss:Width="75"/>'; // Justificadas
        xls += '<Column ss:AutoFitWidth="1" ss:Width="65"/>'; // 📱 Pantalla
        xls += '\n';
        
        // === FILA TÍTULO ===
        xls += '<Row><Cell ss:StyleID="Titulo" ss:MergeAcross="' + (fechas.length + 4) + '"><Data ss:Type="String">📊 Reporte de Asistencias — ' + escXML(grupoNombre) + '</Data></Cell></Row>\n';
        xls += '<Row><Cell ss:StyleID="SubTitulo" ss:MergeAcross="' + (fechas.length + 4) + '"><Data ss:Type="String">' + fechas.length + ' sesiones · ' + alumnos.length + ' alumnos · Generado: ' + new Date().toLocaleString('es-MX') + '</Data></Cell></Row>\n';
        xls += '<Row></Row>\n'; // Espacio
        
        // === FILA ENCABEZADOS ===
        xls += '<Row>\n';
        xls += '<Cell ss:StyleID="Header"><Data ss:Type="String">Alumno</Data></Cell>\n';
        fechas.forEach(f => {
            xls += '<Cell ss:StyleID="FechaHeader"><Data ss:Type="String">' + escXML(formatearFecha(f)) + '</Data></Cell>\n';
        });
        xls += '<Cell ss:StyleID="HeaderP"><Data ss:Type="String">✅ Presentes</Data></Cell>\n';
        xls += '<Cell ss:StyleID="HeaderR"><Data ss:Type="String">⚠️ Retardos</Data></Cell>\n';
        xls += '<Cell ss:StyleID="HeaderA"><Data ss:Type="String">❌ Ausencias</Data></Cell>\n';
        xls += '<Cell ss:StyleID="HeaderJ"><Data ss:Type="String">🟡 Justificadas</Data></Cell>\n';
        xls += '<Cell ss:StyleID="HeaderPant"><Data ss:Type="String">📱 Pantalla</Data></Cell>\n';
        xls += '</Row>\n';
        
        // === DATOS POR ALUMNO ===
        for (const item of alumnos) {
            const alumno = item.alumnos;
            const nombre = (alumno.nombre || alumno.email || 'Sin nombre');
            xls += '<Row>\n';
            xls += '<Cell ss:StyleID="BoldName"><Data ss:Type="String">' + escXML(nombre) + '</Data></Cell>\n';
            
            function esSDExcel(a) {
                return a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3;
            }
            
            let cP = 0, cR = 0, cA = 0, cJ = 0, cPant = 0;
            
            for (const fecha of fechas) {
                const key = `${item.alumno_id}|${fecha}`;
                const a = asistenciaMap[key];
                const estado = getEstadoCelda(a);
                const texto = estado.texto;
                xls += '<Cell ss:StyleID="' + estado.estilo + '"><Data ss:Type="String">' + escXML(texto) + '</Data></Cell>\n';
                
                if (a) {
                    if (a.tipo_asistencia === 'sin_derecho') { cA++; cPant += (a.cambios_pantalla || 0); }
                    else if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') { cR++; cPant += (a.cambios_pantalla || 0); }
                    else if (esSDExcel(a)) { cA++; cPant += (a.cambios_pantalla || 0); }
                    else if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente')) { cP++; cPant += (a.cambios_pantalla || 0); }
                    else if (a.estado === 'ausente') { cA++; cPant += (a.cambios_pantalla || 0); }
                    else if (a.estado === 'justificado') { cJ++; }
                }
            }
            
            xls += '<Cell ss:StyleID="TotP"><Data ss:Type="Number">' + cP + '</Data></Cell>\n';
            xls += '<Cell ss:StyleID="TotR"><Data ss:Type="Number">' + cR + '</Data></Cell>\n';
            xls += '<Cell ss:StyleID="TotA"><Data ss:Type="Number">' + cA + '</Data></Cell>\n';
            xls += '<Cell ss:StyleID="TotJ"><Data ss:Type="Number">' + cJ + '</Data></Cell>\n';
            xls += '<Cell ss:StyleID="TotPant"><Data ss:Type="Number">' + cPant + '</Data></Cell>\n';
            xls += '</Row>\n';
        }
        
        xls += '</Table>\n</Worksheet>\n';
        
        // === SHEET 2: LEYENDA ===
        xls += '<Worksheet ss:Name="Leyenda">\n<Table>\n';
        xls += '<Column ss:AutoFitWidth="1" ss:Width="300"/>\n';
        xls += '<Row><Cell ss:StyleID="Titulo"><Data ss:Type="String">🎯 Leyenda de colores y columnas</Data></Cell></Row>\n<Row></Row>\n';
        xls += '<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Columna</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Significado</Data></Cell></Row>\n';
        const leyenda = [
            ['✅ Presentes', 'Número de asistencias puntuales (llegó a tiempo)'],
            ['⚠️ Retardos', 'Número de retardos (llegó tarde pero dentro del margen)'],
            ['❌ Ausencias', 'Número de ausencias (no asistió o llegó sin derecho)'],
            ['🟡 Justificadas', 'Faltas justificadas por el profesor'],
            ['📱 Pantalla', 'Suma total de cambios de pantalla (abandonó la app)'],
            ['', ''],
            ['Color de celda', 'Significado'],
            ['Verde claro', '✅ Presente — Asistencia puntual'],
            ['Naranja claro', '⚠️ Retardo — Llegó tarde pero con derecho'],
            ['Rojo claro', '❌ Ausente — No asistió o llegó sin derecho'],
            ['Púrpura claro', '📱 SD (Sin derecho) — Llegó muy tarde o tuvo 3+ cambios de pantalla'],
            ['Amarillo claro', '🟡 Justificado — Falta justificada'],
            ['Blanco/gris', '— Sin registro ese día']
        ];
        leyenda.forEach(l => {
            xls += '<Row><Cell ss:StyleID="NormalCell"><Data ss:Type="String">' + escXML(l[0]) + '</Data></Cell>';
            xls += '<Cell ss:StyleID="NormalCell"><Data ss:Type="String">' + escXML(l[1]) + '</Data></Cell></Row>\n';
        });
        xls += '</Table>\n</Worksheet>\n';
        
        xls += '</Workbook>';
        
        // 5. Descargar como .xls
        const blob = new Blob([xls], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nombreArchivo = `asistencias_${grupoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        if (btn) btn.textContent = '📊';
        mostrarToast(`✅ Excel generado: ${fechas.length} sesiones, ${alumnos.length} alumnos`, 'exito');
        
    } catch (err) {
        console.error('Error exportando:', err);
        mostrarToast('Error al exportar: ' + err.message, 'error');
        if (btn) btn.textContent = '📊';
    }
}

// ====== VER ASISTENCIAS DEL GRUPO (REDISEÑADO) ======
let verGrupoActualId = null;

async function verGrupo(grupoId) {
    verGrupoActualId = grupoId;
    
    // Cargar info del grupo
    const { data: grupo } = await supabaseClient
        .from('grupos')
        .select('nombre, materia')
        .eq('id', grupoId)
        .single();
    
    if (!grupo) return mostrarToast('Error al cargar grupo', 'error');
    
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
    
    // Obtener fechas únicas
    const fechasSet = new Set();
    asistencias.forEach(a => fechasSet.add(a.fecha));
    const todasFechas = Array.from(fechasSet).sort((a, b) => a < b ? 1 : -1);
    
    // Poblar dropdown de alumnos
    const select = document.getElementById('ver-filtro-alumno');
    select.innerHTML = '<option value="">— Todos los alumnos —</option>';
    alumnos.forEach(item => {
        const al = item.alumnos;
        select.innerHTML += `<option value="${item.alumno_id}">${al.nombre || al.email || 'Sin nombre'}</option>`;
    });
    
    // Resetear filtros de fecha
    document.getElementById('ver-buscar-alumno').value = '';
    if (todasFechas.length > 0) {
        document.getElementById('ver-filtro-desde').value = todasFechas[todasFechas.length - 1];
        document.getElementById('ver-filtro-hasta').value = todasFechas[0];
    } else {
        document.getElementById('ver-filtro-desde').value = '';
        document.getElementById('ver-filtro-hasta').value = '';
    }
    
    // Guardar datos para el render
    const store = document.getElementById('ver-filtro-alumno');
    store._alumnos = alumnos;
    store._asistenciasPorAlumno = asistenciasPorAlumno;
    store._todasAsistencias = asistencias;
    store._todasFechas = todasFechas;
    
    // Vincular búsqueda al filtro
    document.getElementById('ver-buscar-alumno').oninput = function() {
        const q = this.value.toLowerCase().trim();
        const opts = document.getElementById('ver-filtro-alumno');
        for (const opt of opts.options) {
            if (opt.value === '') continue;
            opt.style.display = opt.text.toLowerCase().includes(q) ? '' : 'none';
        }
        // Auto-seleccionar si solo hay uno visible
        const visibles = Array.from(opts.options).filter(o => o.style.display !== 'none' && o.value !== '');
        if (visibles.length === 1) opts.value = visibles[0].value;
    };
    
    renderVerGrupo();
}

function renderVerGrupo() {
    const select = document.getElementById('ver-filtro-alumno');
    const filtroAlumnoId = select.value;
    const buscarTexto = (document.getElementById('ver-buscar-alumno').value || '').toLowerCase().trim();
    const filtroDesde = document.getElementById('ver-filtro-desde').value;
    const filtroHasta = document.getElementById('ver-filtro-hasta').value;
    const alumnos = select._alumnos || [];
    const asistenciasPorAlumno = select._asistenciasPorAlumno || {};
    const todasAsistencias = select._todasAsistencias || [];
    const todasFechas = select._todasFechas || [];
    const container = document.getElementById('ver-grupo-contenido');
    
    // Aplicar filtro de fechas
    let fechas = todasFechas;
    if (filtroDesde) fechas = fechas.filter(f => f >= filtroDesde);
    if (filtroHasta) fechas = fechas.filter(f => f <= filtroHasta);
    
    // Si hay búsqueda y no hay selección, filtrar alumnos
    let alumnosFiltrados = alumnos;
    if (buscarTexto && !filtroAlumnoId) {
        alumnosFiltrados = alumnos.filter(item => {
            const al = item.alumnos;
            const nombre = (al.nombre || al.email || '').toLowerCase();
            return nombre.includes(buscarTexto);
        });
    }
    
    function estadoIcono(a) {
        if (!a) return { icono: '—', texto: 'Sin registro', bg: '#fafafa', color: '#ccc' };
        if (a.tipo_asistencia === 'sin_derecho') return { icono: '📱', texto: 'SD', bg: '#f3e5f5', color: '#7b1fa2' };
        if (a.estado === 'presente' && a.tipo_asistencia === 'retardo') return { icono: '⚠️', texto: 'Retardo', bg: '#fff3e0', color: '#e65100' };
        if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3) {
            return { icono: '📱', texto: 'SD', bg: '#f3e5f5', color: '#7b1fa2' };
        }
        if (a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente')) return { icono: '✅', texto: 'Presente', bg: '#e8f5e9', color: '#2e7d32' };
        if (a.estado === 'ausente') return { icono: '❌', texto: 'Ausente', bg: '#ffebee', color: '#c62828' };
        if (a.estado === 'justificado') return { icono: '🟡', texto: 'Justificado', bg: '#fff8e1', color: '#f57f17' };
        return { icono: '❓', texto: a.estado || '?', bg: '#f5f5f5', color: '#666' };
    }
    
    function formatearFecha(fechaStr) {
        const d = new Date(fechaStr + 'T12:00:00');
        return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    
    // Calcular totales del grupo (con filtro de fechas)
    function filtrarAsistencias(lista) {
        if (!filtroDesde && !filtroHasta) return lista;
        return lista.filter(a => {
            if (filtroDesde && a.fecha < filtroDesde) return false;
            if (filtroHasta && a.fecha > filtroHasta) return false;
            return true;
        });
    }
    
    function esSD(a) {
        return a.estado === 'presente' && (!a.tipo_asistencia || a.tipo_asistencia === 'presente') && (a.cambios_pantalla || 0) >= 3;
    }
    
    const asistenciasFiltradas = filtrarAsistencias(todasAsistencias);
    const totalPresentes = asistenciasFiltradas.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo' && !esSD(a)).length;
    const totalRetardos = asistenciasFiltradas.filter(a => a.tipo_asistencia === 'retardo').length;
    const totalAusentes = asistenciasFiltradas.filter(a => a.estado === 'ausente' || esSD(a)).length;
    const totalJustificadas = asistenciasFiltradas.filter(a => a.estado === 'justificado').length;
    const totalPantalla = asistenciasFiltradas.reduce((sum, a) => sum + (a.cambios_pantalla || 0), 0);
    
    let html = `
        <div class="stats-container" style="margin-bottom: 14px; flex-wrap:wrap;">
            <div class="stat-box" style="background:#e8f5e9; flex:1; min-width:70px;">
                <strong style="color:#2e7d32;">${totalPresentes}</strong>
                <small>✅ Presentes</small>
            </div>
            <div class="stat-box" style="background:#fff3e0; flex:1; min-width:70px;">
                <strong style="color:#e65100;">${totalRetardos}</strong>
                <small>⚠️ Retardos</small>
            </div>
            <div class="stat-box" style="background:#ffebee; flex:1; min-width:70px;">
                <strong style="color:#c62828;">${totalAusentes}</strong>
                <small>❌ Ausencias</small>
            </div>
            <div class="stat-box" style="background:#fff8e1; flex:1; min-width:70px;">
                <strong style="color:#f57f17;">${totalJustificadas}</strong>
                <small>🟡 Justificadas</small>
            </div>
            <div class="stat-box" style="background:#f3e5f5; flex:1; min-width:70px;">
                <strong style="color:#7b1fa2;">${totalPantalla}</strong>
                <small>📱 Pantalla</small>
            </div>
        </div>`;
    
    if (fechas.length === 0) {
        html += '<p class="empty-state">📅 No hay asistencias en el rango de fechas seleccionado.</p>';
        container.innerHTML = html;
        return;
    }
    
    if (filtroAlumnoId === '' && !buscarTexto) {
        // ====== VISTA: TODOS LOS ALUMNOS (TABLA COMPACTA CON COLORES) ======
        if (alumnosFiltrados.length === 0) {
            html += '<p class="empty-state">No hay alumnos inscritos en este grupo.</p>';
        } else {
            // Leyenda
            html += '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; font-size:0.75em;">';
            html += '<span style="background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:12px;">✅ Presente</span>';
            html += '<span style="background:#fff3e0; color:#e65100; padding:2px 8px; border-radius:12px;">⚠️ Retardo</span>';
            html += '<span style="background:#ffebee; color:#c62828; padding:2px 8px; border-radius:12px;">❌ Ausente</span>';
            html += '<span style="background:#fff8e1; color:#f57f17; padding:2px 8px; border-radius:12px;">🟡 Justificado</span>';
            html += '<span style="background:#f3e5f5; color:#7b1fa2; padding:2px 8px; border-radius:12px;">📱 SD (Sin derecho — 3+ cambios de pantalla)</span>';
            if (fechas.length > 7) html += '<span style="color:#999;"> (' + fechas.length + ' sesiones — despliega horizontalmente)</span>';
            html += '</div>';
            
            html += '<div style="overflow-x:auto; max-height:400px; overflow-y:auto;">';
            html += '<table style="width:100%; border-collapse:collapse; font-size:0.8em;">';
            html += '<thead><tr style="background:#1a1a2e; color:white; position:sticky; top:0; z-index:2;">';
            html += '<th style="padding:8px 6px; text-align:left; min-width:140px; position:sticky; left:0; background:#1a1a2e; z-index:3;">Alumno</th>';
            fechas.forEach(f => {
                const partes = formatearFecha(f).split(' ');
                html += `<th style="padding:8px 4px; text-align:center; font-size:0.7em; font-weight:400; line-height:1.3;">
                    ${partes[0]}<br>${partes[1]}
                </th>`;
            });
            html += '<th style="padding:8px 4px; text-align:center; background:#2e7d32;">✅</th>';
            html += '<th style="padding:8px 4px; text-align:center; background:#e65100;">⚠️</th>';
            html += '<th style="padding:8px 4px; text-align:center; background:#c62828;">❌</th>';
            html += '<th style="padding:8px 4px; text-align:center; background:#f57f17;">🟡</th>';
            html += '<th style="padding:8px 4px; text-align:center; background:#7b1fa2;">📱</th>';
            html += '<th style="padding:8px 4px; text-align:center; background:#1a1a2e;">%</th>';
            html += '</tr></thead><tbody>';
            
            for (const item of alumnosFiltrados) {
                const al = item.alumnos;
                const list = asistenciasPorAlumno[item.alumno_id] || [];
                const listFiltrada = filtrarAsistencias(list);
                const p = listFiltrada.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo' && !esSD(a)).length;
                const r = listFiltrada.filter(a => a.tipo_asistencia === 'retardo').length;
                const au = listFiltrada.filter(a => a.estado === 'ausente' || esSD(a)).length;
                const j = listFiltrada.filter(a => a.estado === 'justificado').length;
                const pant = listFiltrada.reduce((sum, a) => sum + (a.cambios_pantalla || 0), 0);
                const total = p + r + au + j;
                const pct = total > 0 ? Math.round(((p + r) / total) * 100) : 0;
                const colorPct = pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828';
                
                html += `<tr style="border-bottom:1px solid #f0f0f0;">`;
                html += `<td style="padding:6px 6px; font-weight:600; position:sticky; left:0; background:white; z-index:1;">${al.nombre || al.email || 'Sin nombre'}</td>`;
                
                // Celdas de fechas con color
                for (const fecha of fechas) {
                    const a = list.find(x => x.fecha === fecha);
                    if (a) {
                        const ei = estadoIcono(a);
                        html += `<td style="padding:4px 2px; text-align:center; background:${ei.bg}; color:${ei.color}; border-radius:3px; font-size:0.8em; font-weight:600;">
                            ${ei.icono}
                        </td>`;
                    } else {
                        html += `<td style="padding:4px 2px; text-align:center; color:#ddd; font-size:0.7em;">—</td>`;
                    }
                }
                
                html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#2e7d32; background:#f0faf0;">${p}</td>`;
                html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#e65100; background:#fff8f0;">${r}</td>`;
                html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#c62828; background:#fff0f0;">${au}</td>`;
                html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#f57f17; background:#fffef0;">${j}</td>`;
                html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:#7b1fa2; background:#faf0ff;">${pant}</td>`;
                html += `<td style="padding:6px 4px; text-align:center; font-weight:700; color:${colorPct};">${pct}%</td>`;
                html += `</tr>`;
            }
            
            html += '</tbody></table></div>';
        }
    } else {
        // ====== VISTA: ALUMNO ESPECÍFICO (DETALLE CON TODAS LAS FECHAS) ======
        // Determinar qué alumno(s) mostrar
        let alumnosMostrar = [];
        if (filtroAlumnoId) {
            const found = alumnos.find(item => item.alumno_id === filtroAlumnoId);
            if (found) alumnosMostrar = [found];
        } else if (buscarTexto) {
            alumnosMostrar = alumnosFiltrados;
        }
        
        if (alumnosMostrar.length === 0) {
            html += '<p class="empty-state">Selecciona un alumno para ver su detalle.</p>';
        } else {
            for (const item of alumnosMostrar) {
                const al = item.alumnos;
                const list = asistenciasPorAlumno[item.alumno_id] || [];
                const listFiltrada = filtrarAsistencias(list);
                const p = listFiltrada.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo' && !esSD(a)).length;
                const r = listFiltrada.filter(a => a.tipo_asistencia === 'retardo').length;
                const au = listFiltrada.filter(a => a.estado === 'ausente' || esSD(a)).length;
                const j = listFiltrada.filter(a => a.estado === 'justificado').length;
                const pant = listFiltrada.reduce((sum, a) => sum + (a.cambios_pantalla || 0), 0);
                const total = p + r + au + j;
                const pct = total > 0 ? Math.round(((p + r) / total) * 100) : 0;
                
                html += `
                <div style="background:white; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0; color:#1a1a2e;">👤 ${al.nombre || al.email || 'Sin nombre'}</h4>
                        <span style="font-size:1.2em; font-weight:700; color:${pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828'};">${pct}%</span>
                    </div>
                    <div class="stats-container" style="margin-bottom:10px;">
                        <div class="stat-box" style="background:#e8f5e9; flex:1;">
                            <strong style="color:#2e7d32;">${p}</strong>
                            <small>✅ Presentes</small>
                        </div>
                        <div class="stat-box" style="background:#fff3e0; flex:1;">
                            <strong style="color:#e65100;">${r}</strong>
                            <small>⚠️ Retardos</small>
                        </div>
                        <div class="stat-box" style="background:#ffebee; flex:1;">
                            <strong style="color:#c62828;">${au}</strong>
                            <small>❌ Ausencias</small>
                        </div>
                        <div class="stat-box" style="background:#fff8e1; flex:1;">
                            <strong style="color:#f57f17;">${j}</strong>
                            <small>🟡 Justificadas</small>
                        </div>
                        <div class="stat-box" style="background:#f3e5f5; flex:1;">
                            <strong style="color:#7b1fa2;">${pant}</strong>
                            <small>📱 Pantalla</small>
                        </div>
                    </div>
                    <div style="max-height:400px; overflow-y:auto;">
                        ${listFiltrada.length === 0 ? '<p class="empty-state">Sin registros en este rango.</p>' :
                            listFiltrada.sort((a,b) => a.fecha < b.fecha ? 1 : -1).map(a => {
                            const ei = estadoIcono(a);
                            const fechaStr = new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            // Barra de cambios de pantalla
                            let cambiosHTML = '';
                            if (a.cambios_pantalla && a.cambios_pantalla > 0) {
                                const ancho = Math.min((a.cambios_pantalla / 3) * 100, 100);
                                cambiosHTML = `
                                    <div style="margin-top:4px; font-size:0.75em; color:#888;">
                                        📱 Cambios de pantalla:
                                        <div style="height:4px; background:#eee; border-radius:2px; margin-top:2px;">
                                            <div style="height:100%; width:${ancho}%; background:${ancho >= 100 ? '#c62828' : '#ff9800'}; border-radius:2px;"></div>
                                        </div>
                                        <span style="color:${ancho >= 100 ? '#c62828' : '#ff9800'};">${a.cambios_pantalla}/3</span>
                                    </div>`;
                            }
                            return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #f0f0f0; background:${ei.bg}; border-radius:8px; margin-bottom:4px;">
                                <div>
                                    <div style="font-weight:600; color:#333;">${fechaStr}</div>
                                    ${cambiosHTML}
                                </div>
                                <span style="font-weight:700; color:${ei.color}; font-size:1.1em; white-space:nowrap;">
                                    ${ei.icono} ${ei.texto}
                                </span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            }
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
        ventanaEl.className = 'qr-ventana qr-ventana-sin_derecho';
    } else if (qrVentanaActual === 'retardo') {
        ventanaEl.textContent = '⚠️ VENTANA: RETARDO (llegas tarde)';
        ventanaEl.className = 'qr-ventana qr-ventana-retardo';
    } else if (qrVentanaActual === 'puntual') {
        ventanaEl.textContent = '✅ VENTANA: A TIEMPO (asistencia normal)';
        ventanaEl.className = 'qr-ventana qr-ventana-puntual';
    } else if (qrVentanaActual === 'libre') {
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
        mostrarToast('Error al crear sesión: ' + (error?.message || 'No se pudo crear la sesión.'), 'error');
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
    // Guardar referencia para poder reabrir el monitoreo después
    monitoreoActivoPorGrupo[grupoId] = { sesionId: sesion.id, grupoNombre, perdonesMax };
    
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
                    ventanaEl.className = 'qr-ventana qr-ventana-sin_derecho';
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
        return { ventana: 'cerrado' }; // Sin horario configurado → no se puede abrir QR
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
    if (v.ventana === 'cerrado') return 0; // No hay clase activa
    
    if (v.horario) {
        const ahora = new Date();
        const [hF, mF] = v.horario.hora_fin.substring(0, 5).split(':').map(Number);
        const fin = new Date(ahora);
        fin.setHours(hF, mF, 0);
        const segundosHastaFin = Math.floor((fin - ahora) / 1000);
        if (segundosHastaFin <= 0) return 60;
        return segundosHastaFin;
    }
    return 0;
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
    // Limpiar tracking de monitoreo para este grupo
    delete monitoreoActivoPorGrupo[grupoId];
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
    
    // Refrescar inmediatamente el monitoreo para mostrar datos actuales
    if (monitorGrupoId) {
        cargarAsistenciasActivas();
    }
}

// ====== MONITOREO EN VIVO (PROFESOR) ======
let monitorGrupoId = null;
let monitorSesionId = null;
let monitorProfChannel = null;
let monitorPollInterval = null;
let monitorPerdonesUsados = 0;
let monitorPerdonesMax = 2;
let monitorAlumnosSet = new Set();
let monitoreoActivoPorGrupo = {}; // { grupoId: { sesionId, grupoNombre, perdonesMax } }

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

    // Polling de respaldo: refresca cada 3s por si la suscripción en tiempo real falla
    // Usamos setTimeout recursivo con await y try-catch para evitar que errores silenciosos maten el ciclo
    if (monitorPollInterval) {
        clearTimeout(monitorPollInterval);
        monitorPollInterval = null;
    }
    (function programarPolling() {
        if (!monitorGrupoId) return;
        monitorPollInterval = setTimeout(async () => {
            try {
                if (monitorGrupoId) {
                    await cargarAsistenciasActivas();
                }
            } catch (e) {
                console.warn('⚠️ Error en polling de monitoreo:', e);
            }
            programarPolling();
        }, 3000);
    })();
}

// Refrescar monitoreo cuando el usuario vuelve a la pestaña (si estaba en segundo plano)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && monitorGrupoId) {
        cargarAsistenciasActivas();
    }
});

async function cargarAsistenciasActivas() {
    if (!monitorGrupoId) return;
    try {
        const hoy = new Date().toISOString().split('T')[0];
        
        const { data: asistencias, error } = await supabaseClient
            .from('asistencia')
            .select('*, alumnos!inner(nombre, email, matricula)')
            .eq('grupo_id', monitorGrupoId)
            .eq('fecha', hoy)
            .order('creado_en', { ascending: true });
        
        if (error) {
            console.warn('⚠️ Error al cargar asistencias:', error.message);
            return;
        }
        
        const lista = document.getElementById('monitoreo-lista');
        if (!lista) return;
        
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
    } catch (e) {
        console.warn('⚠️ Error en cargarAsistenciasActivas:', e);
    }
}

async function perdonarAlumno(asistenciaId) {
    if (!asistenciaId || monitorPerdonesUsados >= monitorPerdonesMax) return;
    
    const { error } = await supabaseClient
        .from('asistencia')
        .update({ perdonada: true })
        .eq('id', asistenciaId);
    
    if (error) {
        mostrarToast('Error al perdonar: ' + error.message, 'error');
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
    if (monitorPollInterval) {
        clearTimeout(monitorPollInterval);
        monitorPollInterval = null;
    }
    // NO desactivamos la sesión en BD — la clase sigue activa
    // Solo limpiamos las variables locales de monitoreo
    monitorGrupoId = null;
    monitorSesionId = null;
    monitorPerdonesUsados = 0;
    monitorAlumnosSet = new Set();
    document.getElementById('monitoreo-panel').classList.add('hidden');
}

/** Reabrir panel de monitoreo para un grupo que tenga sesión activa */
async function reabrirMonitoreo(grupoId) {
    // Si estamos en la lista, ir al detalle primero
    const detalleView = document.getElementById('grupo-detalle-view');
    if (detalleView.classList.contains('hidden')) {
        seleccionarGrupo(grupoId);
    }
    
    const info = monitoreoActivoPorGrupo[grupoId];
    if (!info) {
        mostrarToast('No hay una sesión activa para este grupo. Abre el QR primero.', 'warning');
        return;
    }
    // Verificar que la sesión siga activa en BD
    const { data: sesion } = await supabaseClient
        .from('sesiones_clase')
        .select('id, activa')
        .eq('id', info.sesionId)
        .maybeSingle();
    
    if (!sesion || !sesion.activa) {
        delete monitoreoActivoPorGrupo[grupoId];
        mostrarToast('La sesión de esta clase ya finalizó. Genera un nuevo QR para comenzar.', 'warning');
        return;
    }
    
    await iniciarMonitoreoProfesor(grupoId, info.sesionId, info.perdonesMax);
}

// ====== COMPLETAR PERFIL (profesor - mismo fix que alumno) ======
async function completarPerfil(e) {
    e.preventDefault();
    setLoading('btn-completar-perfil', true);
    const nombre = document.getElementById('comp-nombre').value.trim();
    const errorDiv = document.getElementById('completar-error');
    errorDiv.textContent = 'Guardando...';
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        errorDiv.textContent = 'Error: No hay sesión activa.';
        setLoading('btn-completar-perfil', false, 'Guardar y continuar');
        return;
    }
    
    const { error: dbError } = await supabaseClient
        .from('profesores')
        .upsert({
            id: user.id,
            email: user.email || '',
            nombre: nombre,
            device_id: deviceId
        }, { onConflict: 'id' });
    
    if (dbError) {
        errorDiv.textContent = 'Error al guardar: ' + dbError.message;
        setLoading('btn-completar-perfil', false, 'Guardar y continuar');
        return;
    }
    
    profesorActual = { id: user.id, nombre, email: user.email || '', device_id: deviceId };
    document.getElementById('profesor-nombre').textContent = `Hola, ${nombre}`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('completar-perfil-form').classList.add('hidden');
    cargarGrupos();
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ====== GPS ======
function obtenerUbicacionActual() {
    if (!navigator.geolocation) {
        mostrarToast('Tu navegador no soporta geolocalización.', 'error');
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
            mostrarToast('No se pudo obtener la ubicación: ' + err.message, 'error');
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
    try {
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
    } catch (e) {
        console.error('Error en verificarHorarios:', e);
    }
}

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
                mostrarToast('⚠️ Tu sesión fue cerrada porque iniciaste sesión desde otro dispositivo.', 'warning');
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