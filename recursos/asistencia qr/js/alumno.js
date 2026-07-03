let alumnoActual = null;
let html5QrCode = null;
let escaneando = false;
let deviceId = obtenerDeviceId();


// ====== VARIABLES DE MONITOREO DE ASISTENCIA ======
let monitoreoActivo = false;
let asistenciaActualId = null;
let grupoActualId = null;
let grupoActualNombre = '';
let cambiosContador = 0;
let cambiosLimite = 3;
let monitorChannel = null;

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        await cargarDatosAlumno(session.user);
    }
});

// Escuchar cambios de autenticación
supabaseClient.auth.onAuthStateChange((event, session) => {
    // Si el alumno está en monitoreo, NO interrumpir — el SIGNED_IN se dispara
    // cada que Supabase renueva el token (~1h) y cargarDatosAlumno pisaría la
    // pantalla de espera.
    if (monitoreoActivo) return;
    
    if (event === 'SIGNED_IN' && session) {
        cargarDatosAlumno(session.user);
    } else if (event === 'SIGNED_OUT') {
        mostrarLogin();
    }
});

// ====== FUNCIONES DE LOGIN/REGISTRO ======
async function handleLogin(e) {
    e.preventDefault();
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
        await verificarYcargarAlumno(data.user);
    } catch (err) {
        console.error('Error en login:', err);
        document.getElementById('login-error').textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
        setLoading('btn-login', false, 'Entrar');
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
            redirectTo: window.location.origin + '/recursos/asistencia%20qr/alumno.html'
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
    try {
        const nombre = document.getElementById('reg-nombre').value;
        const matricula = document.getElementById('reg-matricula').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        
        document.getElementById('register-error').textContent = 'Registrando...';
        
        // 1. Crear usuario en Auth de Supabase (con metadatos para el trigger)
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'alumno',
                nombre: nombre,
                matricula: matricula
            }
        }
    });
    
    if (authError) {
        document.getElementById('register-error').textContent = authError.message;
        setLoading('btn-register', false, 'Registrarme');
        return;
    }
    
    // 2. Guardar/actualizar datos en tabla alumnos con el device_id real
    // Usamos upsert con onConflict porque el trigger ya pudo haber creado la fila
    const { error: dbError } = await supabaseClient
        .from('alumnos')
        .upsert({
            id: authData.user.id,
            email: email,
            nombre: nombre,
            matricula: matricula,
            device_id: deviceId
        }, { onConflict: 'id' });
    
    if (dbError) {
        console.error('Error al guardar alumno en BD:', dbError);
        mostrarToast('⚠️ Registro creado, pero hubo un problema al guardar datos extra. Al iniciar sesión se completarán.', 'warning');
        setLoading('btn-register', false, 'Registrarme');
        if (authData.session) {
            alumnoActual = authData.user;
            await cargarDatosAlumno(authData.user, 3);
        } else {
            showTab('login');
        }
        return;
    }
    
    // Si hay sesión (sin confirmación de email), cargar dashboard directamente
    if (authData.session) {
        alumnoActual = authData.user;
        setLoading('btn-register', false, 'Registrarme');
        await cargarDatosAlumno(authData.user, 3);
    } else {
        document.getElementById('register-error').textContent = '';
        // El INSERT funcionó pero no hay sesión (email confirmation) — pedir login
        setLoading('btn-register', false, 'Registrarme');
        mostrarToast('Registro exitoso. Revisa tu email para confirmar tu cuenta.', 'exito');
        showTab('login');
    }
    } catch (err) {
        console.error('Error en registro:', err);
        document.getElementById('register-error').textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
        setLoading('btn-register', false, 'Registrarme');
    }
}

async function handleLogout() {
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch (e) { /* ignore */ }
        html5QrCode = null;
        escaneando = false;
    }
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.warn('Error al cerrar sesión:', e);
    }
    mostrarLogin();
}

// ====== VERIFICACIÓN DE DEVICE ID ======
async function verificarYcargarAlumno(user) {
    // Buscar alumno
    let { data, error } = await supabaseClient
        .from('alumnos')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    
    const esPlaceholder = data && (data.nombre === 'Usuario Nuevo' || data.matricula === 'SIN_MATRICULA');
    
    // Si no existe la fila o tiene datos placeholder, crear/actualizar automáticamente
    if (error || !data || esPlaceholder) {
        const nombre = user.user_metadata?.nombre || data?.nombre || user.email?.split('@')[0] || 'Alumno';
        const matricula = user.user_metadata?.matricula || data?.matricula || 'SIN_MATRICULA';
        
        const { error: upsertError } = await supabaseClient
            .from('alumnos')
            .upsert({
                id: user.id,
                email: user.email || '',
                nombre: nombre,
                matricula: matricula,
                device_id: deviceId
            }, { onConflict: 'id' });
        
        if (upsertError) {
            document.getElementById('login-error').textContent = 'Error al cargar perfil. Contacta al administrador.';
            console.error('Error upsert alumnos:', upsertError);
            return;
        }
        
        // Usar datos en memoria y continuar al dashboard
        data = { id: user.id, email: user.email || '', nombre, matricula, device_id: deviceId };
    }
    
    // Verificar device_id — si cambió, actualizamos automáticamente con advertencia
    try {
        if (data.device_id && data.device_id !== deviceId) {
            console.warn('⚠️ Device ID cambiado. Se actualiza al nuevo dispositivo.');
            document.getElementById('login-error').textContent = '⚠️ Se detectó un cambio de dispositivo. Se ha actualizado el registro.';
            document.getElementById('login-error').style.color = '#e65100';
            await supabaseClient.from('alumnos').update({ device_id: deviceId }).eq('id', user.id);
        }
        
        if (!data.device_id) {
            await supabaseClient.from('alumnos').update({ device_id: deviceId }).eq('id', user.id);
        }
    } catch (e) {
        console.warn('⚠️ No se pudo actualizar device_id:', e);
    }
    
    alumnoActual = data;
    document.getElementById('alumno-nombre').textContent = `Hola, ${data.nombre}`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    // No recargar grupos si el alumno está en monitoreo activo
    if (monitoreoActivo) return;
    cargarGrupos();
}



// ====== FUNCIONES DE UI ======
function showTab(tab, eventElement) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    if (eventElement && eventElement.target) {
        eventElement.target.classList.add('active');
    } else {
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
    // No interrumpir monitoreo activo
    if (monitoreoActivo) return;
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

async function cargarDatosAlumno(user, intentos = 0) {
    let data, error;
    
    for (let i = 0; i <= intentos; i++) {
        const resultado = await supabaseClient
            .from('alumnos')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        data = resultado.data;
        error = resultado.error;
        
        if (data) break;
        if (i < intentos) await new Promise(r => setTimeout(r, 500));
    }
    
    const esPlaceholder = data && (data.nombre === 'Usuario Nuevo' || data.matricula === 'SIN_MATRICULA');
    
    if (error || !data || esPlaceholder) {
        const nombre = user.user_metadata?.nombre || data?.nombre || user.email?.split('@')[0] || 'Alumno';
        const matricula = user.user_metadata?.matricula || data?.matricula || 'SIN_MATRICULA';
        
        const { error: upsertError } = await supabaseClient
            .from('alumnos')
            .upsert({
                id: user.id,
                email: user.email || '',
                nombre: nombre,
                matricula: matricula,
                device_id: deviceId
            }, { onConflict: 'id' });
        
        if (upsertError) {
            console.error('Error upsert alumnos en cargarDatosAlumno:', upsertError);
            document.getElementById('login-error').textContent = 'Error al cargar perfil. Contacta al administrador.';
            return;
        }
        
        data = { id: user.id, email: user.email || '', nombre, matricula, device_id: deviceId };
    }
    
    // Sincronizar device_id si cambió (recarga en otro origen/equipo)
    try {
        if (data.device_id !== deviceId) {
            console.warn('⚠️ Device ID cambiado. Se actualiza al nuevo dispositivo.');
            await supabaseClient.from('alumnos').update({ device_id: deviceId }).eq('id', user.id);
        }
    } catch (e) {
        console.warn('⚠️ No se pudo actualizar device_id:', e);
    }
    
    alumnoActual = data;
    document.getElementById('alumno-nombre').textContent = `Hola, ${data.nombre}`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    // No recargar grupos si el alumno está en monitoreo activo
    if (monitoreoActivo) return;
    cargarGrupos();
}

// ====== GESTIÓN DE GRUPOS INSCRITOS ======
async function cargarGrupos() {
    // Obtener los grupos a los que el alumno está inscrito
    const { data: inscripciones, error: inscError } = await supabaseClient
        .from('grupo_alumnos')
        .select('grupo_id')
        .eq('alumno_id', alumnoActual.id);
    
    const lista = document.getElementById('grupos-lista');
    
    if (inscError || !inscripciones || inscripciones.length === 0) {
        lista.innerHTML = '<p class="empty-state">No estás inscrito en ningún grupo. Usa el código de invitación de tu profesor para unirte.</p>';
        document.getElementById('asistencia-lista').innerHTML = '<p class="empty-state">Selecciona un grupo para ver tu historial de asistencia.</p>';
        return;
    }
    
    const grupoIds = inscripciones.map(i => i.grupo_id);
    
    const { data: grupos, error: gruposError } = await supabaseClient
        .from('grupos')
        .select('*')
        .in('id', grupoIds)
        .order('creado_en', { ascending: false });
    
    if (gruposError || !grupos) {
        lista.innerHTML = '<p class="empty-state">Error al cargar grupos.</p>';
        return;
    }
    
    lista.innerHTML = grupos.map(grupo => `
        <div class="list-item">
            <div>
                <strong>${grupo.nombre}</strong>
                <br><small>${grupo.materia || 'Sin materia'}</small>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button onclick="verAsistencia('${grupo.id}', '${grupo.nombre}')" class="btn-secondary">Ver mi asistencia</button>
                <button onclick="salirDeGrupo('${grupo.id}', '${grupo.nombre.replace(/'/g, "\\'")}')" class="btn-danger" style="padding:6px 10px; background:#fff0f0; color:#c62828; border:1px solid #ffcdd2; border-radius:8px; cursor:pointer; font-size:0.8em; font-weight:600;">Salir del grupo</button>
            </div>
        </div>
    `).join('');
    
    // Revisar si hay una asistencia pendiente (no confirmada) y mostrar banner
    revisarAsistenciaPendiente();
}

// ====== REANUDAR MONITOREO (si se salió de la pantalla de espera) ======
async function revisarAsistenciaPendiente() {
    const banner = document.getElementById('reanudar-banner');
    if (!banner) return;
    banner.classList.add('hidden');
    banner.innerHTML = '';
    
    // Si ya está en monitoreo, no mostrar banner
    if (monitoreoActivo) return;
    
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const { data: asistenciaPendiente, error } = await supabaseClient
            .from('asistencia')
            .select('id, grupo_id, cambios_pantalla, sesion_codigo')
            .eq('alumno_id', alumnoActual.id)
            .eq('fecha', hoy)
            .eq('confirmada', false)
            .maybeSingle();
        
        if (error || !asistenciaPendiente) return;
        
        // Obtener nombre del grupo
        const { data: grupo } = await supabaseClient
            .from('grupos')
            .select('nombre, limite_salidas')
            .eq('id', asistenciaPendiente.grupo_id)
            .maybeSingle();
        
        if (!grupo) return;
        
        const limite = grupo.limite_salidas ?? 3;
        const cambiosActuales = asistenciaPendiente.cambios_pantalla || 0;
        
        // Asignar variables globales para que reanudarMonitoreo() pueda usarlas
        window._pendienteAsistenciaId = asistenciaPendiente.id;
        window._pendienteGrupoId = asistenciaPendiente.grupo_id;
        window._pendienteGrupoNombre = grupo.nombre;
        window._pendienteLimite = limite;
        window._pendienteCambios = cambiosActuales;
        
        banner.innerHTML = `
            <div style="background: #fff8e1; border: 1px solid #ffe082; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="font-size: 1.5em;">⏳</div>
                <div style="flex: 1; min-width: 150px;">
                    <strong style="color: #e65100;">Tienes una asistencia en curso</strong>
                    <br><small style="color: #666;">${grupo.nombre} — Cambios: ${cambiosActuales}/${limite}</small>
                </div>
                <button onclick="reanudarMonitoreo()" class="btn-primary" style="background: #e65100; white-space: nowrap; font-size: 0.9em;">🔁 Reanudar monitoreo</button>
            </div>
        `;
        banner.classList.remove('hidden');
    } catch (e) {
        console.warn('Error al revisar asistencia pendiente:', e);
    }
}

function reanudarMonitoreo() {
    if (window._pendienteAsistenciaId) {
        iniciarMonitoreo(
            window._pendienteAsistenciaId,
            window._pendienteGrupoId,
            window._pendienteGrupoNombre,
            window._pendienteLimite
        );
        // Sincronizar contador actual desde DB
        if (window._pendienteCambios > 0) {
            cambiosContador = window._pendienteCambios;
            document.getElementById('monitor-contador').textContent = cambiosContador;
            const pct = Math.min((cambiosContador / cambiosLimite) * 100, 100);
            document.getElementById('monitor-barra').style.width = pct + '%';
            if (pct >= 80) document.getElementById('monitor-barra').style.background = '#ff5722';
        }
    }
}

// ====== UNIRSE A GRUPO POR CÓDIGO ======
function showUnirseGrupoModal() {
    document.getElementById('modal-unirse-grupo').classList.remove('hidden');
    document.getElementById('unirse-error').textContent = '';
    document.getElementById('grupo-codigo').value = '';
}

function cerrarModal() {
    document.getElementById('modal-unirse-grupo').classList.add('hidden');
    document.getElementById('form-unirse-grupo').reset();
    document.getElementById('unirse-error').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-unirse-grupo');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const codigo = document.getElementById('grupo-codigo').value.trim().toUpperCase();
            
            if (!codigo) {
                document.getElementById('unirse-error').textContent = 'Ingresa un código válido.';
                return;
            }
            
            await unirseAGrupo(codigo);
        });
    }
});

async function unirseAGrupo(codigo) {
    const errorDiv = document.getElementById('unirse-error');
    
    // Buscar grupo por código
    const { data: grupo, error: busqError } = await supabaseClient
        .from('grupos')
        .select('*')
        .eq('codigo_unico', codigo)
        .maybeSingle();
    
    if (busqError || !grupo) {
        errorDiv.textContent = 'Código inválido. Verifica con tu profesor.';
        return;
    }
    
    // Verificar si ya está inscrito
    const { data: existente } = await supabaseClient
        .from('grupo_alumnos')
        .select('*')
        .eq('alumno_id', alumnoActual.id)
        .eq('grupo_id', grupo.id)
        .maybeSingle();
    
    if (existente) {
        // Si el alumno había abandonado, permitir re-inscripción
        if (existente.abandono_en) {
            const { error: rejoinError } = await supabaseClient
                .from('grupo_alumnos')
                .update({ abandono_en: null })
                .eq('id', existente.id);
            if (rejoinError) {
                errorDiv.textContent = 'Error al reactivar inscripción: ' + rejoinError.message;
                return;
            }
            mostrarToast(`✅ Has vuelto al grupo: ${grupo.nombre}`, 'exito');
            cerrarModal();
            cargarGrupos();
            return;
        }
        errorDiv.textContent = 'Ya estás inscrito en este grupo.';
        return;
    }
    
    // Inscribir alumno en el grupo
    const { error: insError } = await supabaseClient
        .from('grupo_alumnos')
        .insert({
            alumno_id: alumnoActual.id,
            grupo_id: grupo.id
        });
    
    if (insError) {
        errorDiv.textContent = 'Error al unirte al grupo: ' + insError.message;
        return;
    }
    
    mostrarToast(`✅ Te has unido al grupo: ${grupo.nombre}`, 'exito');
    cerrarModal();
    cargarGrupos();
}

// ====== SALIR DE UN GRUPO ======
async function salirDeGrupo(grupoId, grupoNombre) {
    const confirmacion = confirm(
        `¿Salir del grupo "${grupoNombre}"?\n\n` +
        `⚠️ Tus registros de asistencia anteriores se conservarán y el profesor podrá verlos.\n` +
        `❌ No podrás escanear el QR de este grupo a menos que el profesor te reinscriba.\n\n` +
        `¿Estás seguro de que deseas salir?`
    );
    if (!confirmacion) return;
    
    try {
        const { data: inscripcion, error: buscaError } = await supabaseClient
            .from('grupo_alumnos')
            .select('id, abandono_en')
            .eq('alumno_id', alumnoActual.id)
            .eq('grupo_id', grupoId)
            .maybeSingle();
        
        if (buscaError || !inscripcion) {
            mostrarToast('Error al buscar tu inscripción.', 'error');
            return;
        }
        
        // Intentar actualizar con abandono_en (columna nueva)
        const { error: updateError } = await supabaseClient
            .from('grupo_alumnos')
            .update({ abandono_en: new Date().toISOString() })
            .eq('id', inscripcion.id);
        
        if (updateError) {
            // Si la columna no existe (tabla antigua), hacer DELETE como fallback
            console.warn('UPDATE falló, intentando DELETE fallback:', updateError.message);
            const { error: delError } = await supabaseClient
                .from('grupo_alumnos')
                .delete()
                .eq('id', inscripcion.id);
            if (delError) {
                throw new Error('DELETE también falló: ' + delError.message);
            }
        }
        
        mostrarToast(`✅ Has salido del grupo "${grupoNombre}". Tus registros se conservan.`, 'exito');
        cargarGrupos();
        
        // Limpiar la vista de asistencia si estaba mostrando este grupo
        document.getElementById('asistencia-lista').innerHTML = '<p class="empty-state">Selecciona un grupo para ver tu historial de asistencia.</p>';
        
    } catch (err) {
        mostrarToast('Error al salir del grupo: ' + (err.message || 'desconocido'), 'error');
    }
}

// ====== VER ASISTENCIA ======
async function verAsistencia(grupoId, grupoNombre) {
    const contenedor = document.getElementById('asistencia-lista');
    contenedor.innerHTML = '<p class="empty-state">Cargando asistencia...</p>';
    
    // 1. Obtener TODAS las asistencias del alumno (todos los grupos) para el total
    const { data: todasAsistencias, error: errTotal } = await supabaseClient
        .from('asistencia')
        .select('*, grupos!inner(id, nombre)')
        .eq('alumno_id', alumnoActual.id)
        .order('fecha', { ascending: false });
    
    if (errTotal) {
        contenedor.innerHTML = '<p class="empty-state">Error al cargar asistencia.</p>';
        return;
    }
    
    // 2. Obtener asistencias solo de este grupo (para el detalle)
    const asistencias = todasAsistencias ? todasAsistencias.filter(a => a.grupo_id === grupoId) : [];
    
    if (!todasAsistencias || todasAsistencias.length === 0) {
        contenedor.innerHTML = `
            <h3 style="margin-bottom: 10px; color: #667eea;">${grupoNombre}</h3>
            <p class="empty-state">Aún no tienes registros de asistencia en ningún grupo.</p>
        `;
        return;
    }
    
    // 3. Calcular totales globales (todos los grupos)
    const totalGlobal = todasAsistencias.length;
    const presentesGlobal = todasAsistencias.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
    const retardosGlobal = todasAsistencias.filter(a => a.tipo_asistencia === 'retardo').length;
    const ausentesGlobal = todasAsistencias.filter(a => a.estado === 'ausente').length;
    const justificadasGlobal = todasAsistencias.filter(a => a.estado === 'justificado').length;
    const pctAsistenciaGlobal = totalGlobal > 0 ? Math.round((presentesGlobal / totalGlobal) * 100) : 0;
    const pctAusenciaGlobal = totalGlobal > 0 ? Math.round((ausentesGlobal / totalGlobal) * 100) : 0;
    
    let alertaGlobal = '';
    if (pctAusenciaGlobal > 20) {
        alertaGlobal = '<div style="margin: 10px 0; padding: 10px 14px; background: #ffebee; border-left: 4px solid #c62828; border-radius: 8px; color: #c62828; font-weight: 500;">⚠️ Llevas <strong>' + ausentesGlobal + ' ausencias</strong> en total (' + pctAusenciaGlobal + '%). ¡Ponte al corriente!</div>';
    } else if (pctAusenciaGlobal > 10) {
        alertaGlobal = '<div style="margin: 10px 0; padding: 10px 14px; background: #fff3e0; border-left: 4px solid #e65100; border-radius: 8px; color: #e65100; font-weight: 500;">⚠️ Ya tienes <strong>' + ausentesGlobal + ' ausencias</strong> en total (' + pctAusenciaGlobal + '%). Cuida tu asistencia.</div>';
    }
    
    // 4. Totales de este grupo (para el detalle)
    const total = asistencias.length;
    const presentes = asistencias.filter(a => a.estado === 'presente' && a.tipo_asistencia !== 'retardo').length;
    const retardos = asistencias.filter(a => a.tipo_asistencia === 'retardo').length;
    const ausentes = asistencias.filter(a => a.estado === 'ausente').length;
    const justificadas = asistencias.filter(a => a.estado === 'justificado').length;
    
    // 5. Resumen por grupos (agrupar todas las asistencias por grupo)
    const gruposMap = {};
    todasAsistencias.forEach(a => {
        const gId = a.grupo_id;
        const gNom = a.grupos?.nombre || 'Grupo';
        if (!gruposMap[gId]) {
            gruposMap[gId] = { nombre: gNom, total: 0, ausentes: 0 };
        }
        gruposMap[gId].total++;
        if (a.estado === 'ausente') gruposMap[gId].ausentes++;
    });
    
    let htmlResumenGrupos = '';
    for (const gId in gruposMap) {
        const g = gruposMap[gId];
        const pctAus = g.total > 0 ? Math.round((g.ausentes / g.total) * 100) : 0;
        const colorBar = pctAus > 20 ? '#c62828' : pctAus > 10 ? '#e65100' : '#2e7d32';
        htmlResumenGrupos += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 0.9em;">
                <span>📚 ${g.nombre}</span>
                <span>${g.total} clases • <span style="color: ${colorBar}; font-weight: 600;">${g.ausentes} ausencias</span> (${pctAus}%)</span>
            </div>`;
    }
    
    contenedor.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 4px 0; color: white;">📊 Resumen General</h3>
            <div style="opacity: 0.85; font-size: 0.9em; margin-bottom: 14px;">Total de clases: <strong>${totalGlobal}</strong></div>
            <div class="stats-container">
                <div class="stat-box" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    <strong style="color: #a5d6a7; font-size: 1.3em;">${presentesGlobal}</strong>
                    <small style="color: rgba(255,255,255,0.9);">✅ Presentes</small>
                </div>
                <div class="stat-box" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    <strong style="color: #ffcc80; font-size: 1.3em;">${retardosGlobal}</strong>
                    <small style="color: rgba(255,255,255,0.9);">⚠️ Retardos</small>
                </div>
                <div class="stat-box" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    <strong style="color: #ef9a9a; font-size: 1.3em;">${ausentesGlobal}</strong>
                    <small style="color: rgba(255,255,255,0.9);">❌ Ausencias</small>
                </div>
                <div class="stat-box" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    <strong style="color: #fff59d; font-size: 1.3em;">${justificadasGlobal}</strong>
                    <small style="color: rgba(255,255,255,0.9);">🟡 Justificadas</small>
                </div>
            </div>
            <div style="margin-top: 12px; background: rgba(255,255,255,0.15); border-radius: 8px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 4px;">
                    <span>Asistencia total</span>
                    <span style="font-weight: 600;">${pctAsistenciaGlobal}%</span>
                </div>
                <div style="height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${pctAsistenciaGlobal}%; background: linear-gradient(90deg, #66bb6a, #a5d6a7); border-radius: 4px; transition: width 0.5s;"></div>
                </div>
            </div>
        </div>
        ${alertaGlobal}
        
        <div style="background: #f8f9ff; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; color: #555; font-size: 0.95em;">📋 Resumen por grupo</h4>
            ${htmlResumenGrupos}
        </div>
        
        <h4 style="margin: 16px 0 10px 0; color: #667eea;">📋 Detalle: ${grupoNombre}</h4>
        ${asistencias.length === 0 ? '<p class="empty-state">Sin registros en este grupo.</p>' : `
        <div class="stats-container" style="margin-bottom: 12px;">
            <div class="stat-box" style="background: #e8f5e9;">
                <strong style="color: #2e7d32;">${presentes}</strong>
                <small>Presentes</small>
            </div>
            <div class="stat-box" style="background: #fff3e0;">
                <strong style="color: #e65100;">${retardos}</strong>
                <small>Retardos</small>
            </div>
            <div class="stat-box" style="background: #ffebee;">
                <strong style="color: #c62828;">${ausentes}</strong>
                <small>Ausentes</small>
            </div>
            <div class="stat-box" style="background: #fff8e1;">
                <strong style="color: #f57f17;">${justificadas}</strong>
                <small>Justificadas</small>
            </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${asistencias.map(a => {
                let icono = '✅ Presente';
                let color = '#2e7d32';
                if (a.tipo_asistencia === 'sin_derecho') { icono = '❌ Llegó tarde (sin derecho)'; color = '#c62828'; }
                else if (a.tipo_asistencia === 'retardo') { icono = '⚠️ Retardo'; color = '#e65100'; }
                else if (a.estado === 'ausente') { icono = '❌ Ausente'; color = '#c62828'; }
                else if (a.estado === 'justificado') { icono = '🟡 Justificado'; color = '#f57f17'; }
                return `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>${new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span style="font-weight: 600; color: ${color};">${icono}</span>
                </div>`;
            }).join('')}
        </div>
        `}
    `;
}

// ====== ESCANEO DE QR ======
async function iniciarEscaneo() {
    const btn = document.getElementById('btn-escanear');
    const lectorDiv = document.getElementById('qr-reader');
    const resultadoDiv = document.getElementById('escaneo-resultado');
    
    if (escaneando) {
        // Detener escaneo
        if (html5QrCode) {
            await html5QrCode.stop();
            html5QrCode.clear();
        }
        lectorDiv.classList.add('hidden');
        btn.textContent = '📷 Escanear QR';
        escaneando = false;
        resultadoDiv.textContent = '';
        return;
    }
    
    resultadoDiv.textContent = '';
    lectorDiv.classList.remove('hidden');
    btn.textContent = '⏹️ Detener escaneo';
    
    try {
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // --- Configuración simple de cámara trasera ---
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                await html5QrCode.stop();
                lectorDiv.classList.add('hidden');
                btn.textContent = '📷 Escanear QR';
                escaneando = false;
                resultadoDiv.textContent = 'Procesando...';
                await procesarQR(decodedText, resultadoDiv);
            },
            () => { /* ignore */ }
        );
        
        // --- Corregir orientación si el video sale girado ---
        // En algunos dispositivos Android, la cámara trasera entrega el video
        // en landscape (horizontal) en lugar de portrait. Detectamos esto y
        // aplicamos una rotación CSS para que se vea correctamente.
        setTimeout(() => corregirRotacionCamara(), 500);
        
        escaneando = true;
    } catch (err) {
        const msg = err?.message || err?.toString() || 'Error desconocido';
        let userMsg = 'Error al acceder a la cámara: ' + msg;
        // Mensajes más útiles según el error
        if (msg.includes('NotAllowedError') || msg.includes('Permission denied') || msg.includes('permission')) {
            userMsg = '❌ Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador e intenta de nuevo.';
        } else if (msg.includes('NotFoundError') || msg.includes('No camera')) {
            userMsg = '❌ No se encontró una cámara en este dispositivo.';
        } else if (msg.includes('NotReadableError') || msg.includes('in use')) {
            userMsg = '❌ La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.';
        } else if (msg.includes('OverconstrainedError') || msg.includes('facingMode')) {
            userMsg = '❌ No se pudo activar la cámara trasera. Intenta con otra cámara.';
        }
        resultadoDiv.textContent = userMsg;
        resultadoDiv.style.color = '#e74c3c';
        resultadoDiv.style.fontWeight = 'bold';
        resultadoDiv.style.padding = '10px';
        resultadoDiv.style.backgroundColor = '#fef0f0';
        resultadoDiv.style.borderRadius = '8px';
        resultadoDiv.style.marginTop = '10px';
        lectorDiv.classList.add('hidden');
        btn.textContent = '📷 Escanear QR';
        escaneando = false;
    }
}

// ====== CORREGIR ROTACIÓN DE CÁMARA ======
// En algunos Android, la cámara trasera entrega el video en horizontal (landscape)
// aun cuando el dispositivo está en vertical (portrait). Esto hace que el video
// se vea girado 90°. Detectamos esto aplicamos estilos correctivos directamente.
function corregirRotacionCamara() {
    const video = document.querySelector('#qr-reader video');
    if (!video || !video.videoWidth || !video.videoHeight) {
        // Reintentar hasta que el video tenga dimensiones
        setTimeout(() => corregirRotacionCamara(), 300);
        return;
    }
    
    // Solo corregir si el dispositivo está en vertical (portrait) 
    // y el video viene en horizontal (landscape)
    const esPortrait = window.innerHeight > window.innerWidth;
    if (!esPortrait) return;
    if (video.videoWidth <= video.videoHeight) return;
    
    console.log('📷 Corrigiendo rotación — video ' + video.videoWidth + 'x' + video.videoHeight);
    
    const container = document.getElementById('qr-reader');
    if (!container) return;
    
    // Ajustar contenedor a formato cuadrado — así el canvas overlay (qrbox)
    // se renderiza en un espacio cuadrado y las esquinas de 250×250 se ven como cuadrado.
    container.style.aspectRatio = '1 / 1';
    container.style.maxHeight = '70vh';
    container.style.overflow = 'hidden';
    
    // Rotar el video 90° y escalar para que llene el contenedor cuadrado
    video.style.position = 'absolute';
    video.style.top = '50%';
    video.style.left = '50%';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.minWidth = 'auto';
    video.style.minHeight = 'auto';
    video.style.maxWidth = 'none';
    video.style.maxHeight = 'none';
    video.style.objectFit = 'cover';
    video.style.transform = `translate(-50%, -50%) rotate(90deg)`;
    video.style.transformOrigin = 'center center';
}

async function procesarQR(qrData, resultadoDiv) {
    try {
        let datos;
        try {
            datos = JSON.parse(qrData);
        } catch {
            resultadoDiv.textContent = '❌ Código QR inválido.';
            return;
        }
        
        if (!datos.grupo_id && !datos.codigo_sesion) {
            resultadoDiv.textContent = '❌ QR no reconocido.';
            return;
        }
        
        const grupoId = datos.grupo_id;
        const codigoSesion = datos.codigo_sesion || '';
        const ts = datos.ts || 0;
        
        // === VALIDACIÓN DE TIMESTAMP (anti-screenshot) ===
        const ahora = Date.now();
        const diffMs = Math.abs(ahora - ts);
        if (ts > 0 && diffMs > 15000) { // 15 segundos de tolerancia
            resultadoDiv.textContent = '❌ QR expirado (timestamp inválido). Escanea directamente del profesor.';
            return;
        }
        
        // Verificar membresía
        const { data: inscripcion } = await supabaseClient
            .from('grupo_alumnos')
            .select('*')
            .eq('alumno_id', alumnoActual.id)
            .eq('grupo_id', grupoId)
            .maybeSingle();
        if (!inscripcion) {
            resultadoDiv.textContent = '❌ No estás inscrito en este grupo.';
            return;
        }
        // Verificar que el alumno no haya abandonado el grupo
        if (inscripcion.abandono_en) {
            resultadoDiv.textContent = '❌ Ya no perteneces a este grupo. Contacta a tu profesor para reinscribirte.';
            return;
        }
        
        // === VALIDACIÓN GPS (priorizar GPS por horario, fallback a grupo) ===
        const { data: grupo } = await supabaseClient
            .from('grupos')
            .select('latitud, longitud, radio_metros, nombre, limite_salidas')
            .eq('id', grupoId)
            .maybeSingle();
        
        // Buscar el horario actual para usar su GPS específico (cada horario puede tener su propio salón)
        const diaHoy = new Date().getDay();
        const fechaActual = new Date();
        const horaActualStr = `${fechaActual.getHours().toString().padStart(2,'0')}:${fechaActual.getMinutes().toString().padStart(2,'0')}`;
        const { data: horariosHoy } = await supabaseClient
            .from('horarios')
            .select('hora_inicio, hora_fin, latitud, longitud, radio_metros')
            .eq('grupo_id', grupoId)
            .eq('dia_semana', diaHoy)
            .eq('activo', true);

        let horarioGps = null;
        if (horariosHoy) {
            for (const h of horariosHoy) {
                const hInicio = h.hora_inicio?.substring(0,5);
                const hFin = h.hora_fin?.substring(0,5);
                if (hInicio && hFin && horaActualStr >= hInicio && horaActualStr <= hFin) {
                    horarioGps = h;
                    break;
                }
            }
        }

        // Usar GPS del horario si existe, sino el del grupo (backward compat)
        const gpsLat = horarioGps?.latitud ?? grupo?.latitud;
        const gpsLng = horarioGps?.longitud ?? grupo?.longitud;
        const gpsRadio = horarioGps?.radio_metros ?? grupo?.radio_metros ?? 50;

        if (gpsLat && gpsLng) {
            try {
                const gpsOk = await verificarGPS(gpsLat, gpsLng, gpsRadio);
                if (!gpsOk) {
                    resultadoDiv.textContent = '❌ Debes estar en el salón de clase para escanear. GPS no coincide.';
                    return;
                }
            } catch (gpsErr) {
                resultadoDiv.textContent = '❌ Activa tu ubicación (GPS) para escanear.';
                return;
            }
        }
        
        const limiteCambios = grupo?.limite_salidas ?? 3;
        
        // Verificar sesión activa
        const { data: sesion } = await supabaseClient
            .from('sesiones_clase')
            .select('*')
            .eq('grupo_id', grupoId)
            .eq('activa', true)
            .maybeSingle();
        if (!sesion) {
            resultadoDiv.textContent = '❌ No hay clase activa.';
            return;
        }
        if (sesion.codigo_sesion !== codigoSesion) {
            resultadoDiv.textContent = '❌ QR expirado.';
            return;
        }
        
        const hoy = new Date().toISOString().split('T')[0];
        
        // Verificar si ya hay registro para esta sesión (código QR único)
        const { data: asistenciaHoy } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('alumno_id', alumnoActual.id)
            .eq('sesion_codigo', codigoSesion)
            .maybeSingle();
        
        if (asistenciaHoy) {
            // Reanudar monitoreo si no está confirmada
            if (!asistenciaHoy.confirmada) {
                resultadoDiv.textContent = '⚠️ Reanudando monitoreo...';
                const nomG = grupo?.nombre || 'Grupo';
                setTimeout(() => iniciarMonitoreo(asistenciaHoy.id, grupoId, nomG, limiteCambios), 500);
                return;
            }
            resultadoDiv.textContent = '⚠️ Ya registraste asistencia para esta sesión.';
            return;
        }
        
        // === DETERMINAR VENTANA DE TIEMPO ===
        let tipoAsistencia = 'presente';
        let estadoAsistencia = 'presente';
        const ventanaInfo = await calcularVentanaAlumno(grupoId);
        if (ventanaInfo === 'cerrado') {
            resultadoDiv.textContent = '❌ Fuera del horario de clase. La ventana de asistencia está cerrada.';
            return;
        } else if (ventanaInfo === 'sin_derecho') {
            tipoAsistencia = 'sin_derecho';
            estadoAsistencia = 'ausente';
            window._tipoAsistenciaActual = 'sin_derecho';
        } else if (ventanaInfo === 'retardo') {
            tipoAsistencia = 'retardo';
        }
        
        const nomGrupo = grupo?.nombre || 'Grupo';
        
        // Insertar con columnas de monitoreo
        const { data: nueva, error: asisError } = await supabaseClient
            .from('asistencia')
            .insert({
                alumno_id: alumnoActual.id,
                grupo_id: grupoId,
                fecha: hoy,
                estado: estadoAsistencia,
                tipo_asistencia: tipoAsistencia,
                sesion_codigo: codigoSesion,
                cambios_pantalla: 0,
                confirmada: false,
                perdonada: false
            })
            .select()
            .maybeSingle();
        
        if (asisError || !nueva) {
            resultadoDiv.textContent = '❌ Error al registrar: ' + (asisError?.message || '');
            return;
        }
        
        if (tipoAsistencia === 'sin_derecho') {
            resultadoDiv.textContent = '⚠️ Llegaste muy tarde. Registrado como AUSENCIA sin derecho.';
            resultadoDiv.style.color = '#c62828';
        } else if (tipoAsistencia === 'retardo') {
            resultadoDiv.textContent = '⚠️ ¡Asistencia registrada como RETARDO!';
            resultadoDiv.style.color = '#e65100';
        } else {
            resultadoDiv.textContent = '✅ ¡Asistencia registrada!';
            resultadoDiv.style.color = '#2e7d32';
        }
        
        setTimeout(() => iniciarMonitoreo(nueva.id, grupoId, nomGrupo, limiteCambios), 500);
        
    } catch (err) {
        resultadoDiv.textContent = '❌ Error: ' + err.message;
    }
}

async function nombreGrupo(grupoId) {
    const { data } = await supabaseClient.from('grupos').select('nombre').eq('id', grupoId).maybeSingle();
    return data?.nombre || 'Grupo';
}

// ====== GPS: Verificar ubicación del alumno ======
function verificarGPS(latSalon, lonSalon, radioMetros) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GPS no disponible'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const distancia = calcularDistancia(
                    pos.coords.latitude, pos.coords.longitude,
                    latSalon, lonSalon
                );
                if (distancia <= radioMetros) {
                    resolve(true);
                } else {
                    console.log(`📍 GPS: distancia ${distancia.toFixed(0)}m (máx ${radioMetros}m)`);
                    resolve(false);
                }
            },
            (err) => {
                reject(err);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    });
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    // Fórmula de Haversine
    const R = 6371000; // radio Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ====== VENTANA DE TIEMPO (horario fijo) ======
async function calcularVentanaAlumno(grupoId) {
    const hoy = new Date().getDay();
    const ahora = new Date();
    const horaActual = `${ahora.getHours().toString().padStart(2,'0')}:${ahora.getMinutes().toString().padStart(2,'0')}`;
    
    const { data: horarios } = await supabaseClient
        .from('horarios')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('dia_semana', hoy)
        .eq('activo', true);
    
    if (!horarios || horarios.length === 0) {
        return 'libre'; // Sin horario fijo, permitir
    }
    
    for (const h of horarios) {
        const inicio = h.hora_inicio.substring(0, 5);
        const fin = h.hora_fin.substring(0, 5);
        
        if (horaActual >= inicio && horaActual <= fin) {
            const [hI, mI] = inicio.split(':').map(Number);
            const [hA, mA] = horaActual.split(':').map(Number);
            const minutosDesdeInicio = (hA - hI) * 60 + (mA - mI);
            
            const puntualMin = h.puntual_minutos ?? 10;
            const retardoMin = h.retardo_minutos ?? 20;
            
            if (minutosDesdeInicio <= puntualMin) return 'puntual';
            if (minutosDesdeInicio <= retardoMin) return 'retardo';
            return 'sin_derecho'; // Llegó después del retardo, pero aún en horario
        }
    }
    
    return 'cerrado';
}

// ====== MONITOREO DE ASISTENCIA ======
let cambioEnProgreso = false;
let monitorInterval = null;

function iniciarMonitoreo(asistenciaId, grupoId, grupoNombre, limite) {
    monitoreoActivo = true;
    asistenciaActualId = asistenciaId;
    grupoActualId = grupoId;
    grupoActualNombre = grupoNombre;
    cambiosLimite = limite || 3;
    cambiosContador = 0;
    
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('monitor-view').classList.remove('hidden');
    document.getElementById('monitor-grupo').textContent = `📚 ${grupoNombre}`;
    document.getElementById('monitor-limite').textContent = cambiosLimite;
    document.getElementById('monitor-historial').innerHTML = '<div style="color: #999;">Cargando...</div>';
    
    // Registrar momento del escaneo
    window._inicioMonitoreo = Date.now();
    window._confirmarDesde = null;
    
    // Ocultar botón confirmar hasta 5 min antes de que termine la clase
    const btnConfirmar = document.getElementById('btn-confirmar-asistencia');
    btnConfirmar.style.display = 'none';
    document.getElementById('espera-confirmar').style.display = '';
    window._btnConfirmarMostrado = false;
    
    // Obtener horario de hoy para saber hora_fin
    const hoy = new Date().getDay();
    supabaseClient
        .from('horarios')
        .select('hora_fin')
        .eq('grupo_id', grupoId)
        .eq('dia_semana', hoy)
        .eq('activo', true)
        .then(({ data: horarios }) => {
            if (horarios && horarios.length > 0) {
                const horaFin = horarios[0].hora_fin.substring(0, 5);
                const [hf, mf] = horaFin.split(':').map(Number);
                const finDate = new Date();
                finDate.setHours(hf, mf, 0, 0);
                window._confirmarDesde = new Date(finDate.getTime() - 5 * 60 * 1000);
                window._horaFinStr = horaFin;
                
                // Si es sin_derecho, mostrar mensaje diferente y ocultar espera
                if (window._tipoAsistenciaActual === 'sin_derecho') {
                    const st = document.getElementById('monitor-estado');
                    st.innerHTML = '⚠️ <strong>Llegaste tarde.</strong> Registrado como ausencia. Debes permanecer en clase.';
                    st.style.background = '#ffebee';
                    st.style.color = '#c62828';
                    document.getElementById('espera-confirmar').style.display = 'none';
                } else {
                    const st = document.getElementById('monitor-estado');
                    st.innerHTML = `⏳ Clase hasta las <strong>${horaFin}</strong>. Podrás confirmar 5 minutos antes.`;
                    st.style.background = '#e3f2fd';
                    st.style.color = '#1565c0';
                }
            } else {
                // Sin horario fijo: NO mostrar botón, esperar a que termine la clase o el profesor perdone
                const st = document.getElementById('monitor-estado');
                st.innerHTML = '✅ Asistencia registrada. ¡Mantén la app abierta!';
                st.style.background = '#e8f5e9';
                st.style.color = '#2e7d32';
            }
        });
    
    // Canal en tiempo real para detectar perdón
    monitorChannel = supabaseClient
        .channel('monitor-asistencia')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'asistencia', filter: `id=eq.${asistenciaId}` }, (payload) => {
            if (payload.new.perdonada && !payload.new.confirmada) {
                const st = document.getElementById('monitor-estado');
                st.innerHTML = '🙏 <strong>¡Perdonado!</strong> Ya puedes confirmar.';
                st.style.background = '#e8f5e9'; st.style.color = '#2e7d32';
                // Mostrar botón si está perdonado aunque no haya llegado el tiempo
                if (!window._btnConfirmarMostrado) {
                    window._btnConfirmarMostrado = true;
                    document.getElementById('btn-confirmar-asistencia').style.display = '';
                    document.getElementById('espera-confirmar').style.display = 'none';
                }
            }
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Canal de monitoreo conectado');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('⚠️ Canal de monitoreo:', status, err);
            }
        });
    
    // Verificar cada 5s: cuándo mostrar botón y si la sesión terminó
    if (monitorInterval) clearInterval(monitorInterval);
    monitorInterval = setInterval(async () => {
        if (!monitoreoActivo || !grupoActualId) { clearInterval(monitorInterval); return; }
        const ahora = new Date();
        
        // 1. Mostrar botón solo si: han pasado 2 min desde el escaneo Y es 5 min antes del fin
        const minutosDesdeEscaneo = (ahora - window._inicioMonitoreo) / 60000;
        if (minutosDesdeEscaneo >= 1 && window._confirmarDesde && ahora >= window._confirmarDesde && !window._btnConfirmarMostrado) {
            window._btnConfirmarMostrado = true;
            document.getElementById('btn-confirmar-asistencia').style.display = '';
            document.getElementById('espera-confirmar').style.display = 'none';
            const st = document.getElementById('monitor-estado');
            st.innerHTML = '✅ <strong>Ya puedes confirmar tu asistencia.</strong>';
            st.style.background = '#e8f5e9';
            st.style.color = '#2e7d32';
        }
        
        // 2. Verificar si la sesión aún está activa
        const { data: sesion } = await supabaseClient
            .from('sesiones_clase')
            .select('activa').eq('grupo_id', grupoActualId).eq('activa', true).maybeSingle();
        if (!sesion) {
            clearInterval(monitorInterval);
            const mins = (new Date() - window._inicioMonitoreo) / 60000;
            if (!window._btnConfirmarMostrado && mins >= 1 && window._tipoAsistenciaActual !== 'sin_derecho') {
                window._btnConfirmarMostrado = true;
                document.getElementById('btn-confirmar-asistencia').style.display = '';
                document.getElementById('espera-confirmar').style.display = 'none';
            } else if (window._tipoAsistenciaActual === 'sin_derecho') {
                document.getElementById('espera-confirmar').style.display = 'none';
            }
            const st = document.getElementById('monitor-estado');
            if (window._tipoAsistenciaActual === 'sin_derecho') {
                st.innerHTML = '⏰ <strong>Clase terminada.</strong> No registraste asistencia por llegar tarde.';
                st.style.background = '#ffebee';
                st.style.color = '#c62828';
            } else {
                st.innerHTML = '⏰ <strong>Clase terminada.</strong> Confirma tu asistencia.';
            }
            st.style.background = '#e3f2fd'; st.style.color = '#1565c0';
        }
    }, 5000);
    
    // Event listeners para detectar cambios de pantalla
    document.addEventListener('visibilitychange', manejarVisibilidad);
    window.addEventListener('blur', manejarBlur);
    
    // Cargar contador existente (por si se reanuda monitoreo)
    cargarContadorExistente();
}

function detenerMonitoreo() {
    monitoreoActivo = false;
    document.removeEventListener('visibilitychange', manejarVisibilidad);
    window.removeEventListener('blur', manejarBlur);
    if (monitorChannel) { supabaseClient.removeChannel(monitorChannel); monitorChannel = null; }
    if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
    asistenciaActualId = null;
    grupoActualId = null;
}

async function cargarContadorExistente() {
    if (!asistenciaActualId) return;
    const { data } = await supabaseClient
        .from('asistencia').select('cambios_pantalla,confirmada,perdonada').eq('id', asistenciaActualId).maybeSingle();
    if (!data) return;
    cambiosContador = data.cambios_pantalla || 0;
    if (data.confirmada) { mostrarConfirmada(); return; }
    if (data.perdonada) document.getElementById('monitor-estado').innerHTML = '🙏 Perdonado por el profesor.';
    actualizarMonitorUI();
}

function manejarVisibilidad() {
    if (document.visibilityState === 'hidden' && monitoreoActivo && !cambioEnProgreso) {
        incrementarCambio();
    }
}
function manejarBlur() {
    if (monitoreoActivo && !cambioEnProgreso) incrementarCambio();
}

async function incrementarCambio() {
    if (!asistenciaActualId || cambiosContador >= cambiosLimite) return;
    cambioEnProgreso = true;
    cambiosContador++;
    await supabaseClient.from('asistencia').update({ cambios_pantalla: cambiosContador, ultimo_cambio: new Date().toISOString() }).eq('id', asistenciaActualId);
    actualizarMonitorUI();
    cambioEnProgreso = false;
    if (cambiosContador >= cambiosLimite) {
        const st = document.getElementById('monitor-estado');
        st.innerHTML = '⚠️ Límite alcanzado. <strong>Espera que el profesor te perdone</strong> para confirmar.';
        st.style.background = '#fff3e0'; st.style.color = '#e65100';
    }
}

function actualizarMonitorUI() {
    document.getElementById('monitor-contador').textContent = cambiosContador;
    const pct = Math.min((cambiosContador / cambiosLimite) * 100, 100);
    const barra = document.getElementById('monitor-barra');
    barra.style.width = pct + '%';
    const icono = document.getElementById('monitor-icon');
    const cont = document.getElementById('monitor-contador');
    if (cambiosContador === 0) { barra.style.background = '#4caf50'; cont.style.color = '#333'; icono.textContent = '📱'; }
    else if (cambiosContador < cambiosLimite) { barra.style.background = '#ff9800'; cont.style.color = '#e65100'; icono.textContent = '👀'; }
    else { barra.style.background = '#f44336'; cont.style.color = '#c62828'; icono.textContent = '⚠️'; }
    
    const hist = document.getElementById('monitor-historial');
    if (cambiosContador > 0) {
        let items = '';
        for (let i = 1; i <= cambiosContador; i++) items += `<div style="padding:3px 0;">🔴 Cambio #${i}</div>`;
        hist.innerHTML = `<div style="font-weight:600;color:#333;">📋 Historial:</div>${items}`;
    } else {
        hist.innerHTML = '<div style="color:#999;">Sin cambios. ✅</div>';
    }
}

async function confirmarAsistencia() {
    if (!asistenciaActualId) return;
    if (cambiosContador >= cambiosLimite) {
        const { data: a } = await supabaseClient.from('asistencia').select('perdonada').eq('id', asistenciaActualId).maybeSingle();
        if (!a?.perdonada) {
            mostrarToast('⚠️ Has excedido el límite. El profesor debe perdonarte primero.', 'warning');
            return;
        }
    }
    await supabaseClient.from('asistencia').update({ confirmada: true }).eq('id', asistenciaActualId);
    mostrarConfirmada();
}

function mostrarConfirmada() {
    monitoreoActivo = false;
    document.getElementById('monitor-icon').textContent = '✅';
    document.getElementById('monitor-estado').innerHTML = '🎉 <strong>¡Asistencia confirmada!</strong>';
    document.getElementById('monitor-estado').style.background = '#e8f5e9';
    document.getElementById('monitor-estado').style.color = '#2e7d32';
    const btn = document.getElementById('btn-confirmar-asistencia');
    btn.textContent = '✅ Confirmada';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.onclick = null;
    detenerMonitoreo();
    setTimeout(() => {
        document.getElementById('monitor-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        cargarGrupos();
    }, 2000);
}

