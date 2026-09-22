// Usa la instancia global
const authSupabase = window.supabaseClient;

// ================== AUTENTICACIÓN (GLOBAL) ==================
async function checkLoginStatus() {
    const { data: { user } } = await authSupabase.auth.getUser();
    const userName = document.getElementById('userName');
    const menuUserName = document.getElementById('menuUserName');
    const menuUserEmail = document.getElementById('menuUserEmail');
    const menuMiPerfil = document.getElementById('menuMiPerfil');
    const menuLogin = document.getElementById('menuLogin');
    const menuAdmin = document.getElementById('menuAdmin');
    const menuLogout = document.getElementById('menuLogout');

    if (user) {
        // Obtener perfil
        const { data: perfil } = await authSupabase
            .from('perfiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

        let nombreMostrar = perfil?.username || 
                            user.user_metadata?.username || 
                            user.email.split('@')[0];

        nombreMostrar = nombreMostrar.replace(/_\d+$/, '');

        // Actualizar nombre en el header
        if (userName) userName.textContent = nombreMostrar;
        if (menuUserName) menuUserName.textContent = nombreMostrar;
        if (menuUserEmail) menuUserEmail.textContent = user.email;

        // Mostrar opciones de usuario logueado
        if (menuMiPerfil) menuMiPerfil.style.display = 'flex';
        if (menuLogout) menuLogout.style.display = 'flex';
        if (menuLogin) menuLogin.style.display = 'none';

        // Mostrar botón admin solo si es admin
        if (menuAdmin && user.email === 'espis0611@gmail.com') {
            menuAdmin.style.display = 'flex';
        }
    } else {
        // Usuario no logueado
        if (userName) userName.textContent = 'Invitado';
        if (menuUserName) menuUserName.textContent = 'Invitado';
        if (menuUserEmail) menuUserEmail.textContent = 'Inicia sesión para continuar';
        if (menuMiPerfil) menuMiPerfil.style.display = 'none';
        if (menuLogout) menuLogout.style.display = 'none';
        if (menuLogin) menuLogin.style.display = 'flex';
        if (menuAdmin) menuAdmin.style.display = 'none';
    }
}

async function logout() {
    await authSupabase.auth.signOut();
    location.reload();
}

// ================== EVENTOS SOLO PARA LOGIN.HTML ==================
const isLoginPage = window.location.pathname.includes('login');

if (isLoginPage) {
    document.addEventListener('DOMContentLoaded', async function() {
        // Si ya hay sesión activa, redirigir al catálogo
        const { data: { user } } = await authSupabase.auth.getUser();
        if (user) {
            window.location.href = 'index.html';
            return;
        }

        // Autocompletar si se guardó con "Clave de acceso"
        const savedEmail = localStorage.getItem('mosameli_saved_email');
        if (savedEmail) {
            const emailInput = document.querySelector('#login-form input[name="email"]');
            if (emailInput) emailInput.value = savedEmail;
        }

        const registerForm = document.getElementById('register-form');
        const loginForm = document.getElementById('login-form');

        // ================== REGISTRO ==================
        if (registerForm) {
            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                let username = e.target.elements.username.value.trim();
                let email = e.target.elements.email.value.trim();
                let password = e.target.elements.password.value;

                if (username.length < 3) { alert('El nombre debe tener al menos 3 caracteres'); return; }
                if (password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }

                // Verificar si el username ya existe
                const { data: existeUsername } = await authSupabase
                    .from('perfiles')
                    .select('username')
                    .eq('username', username)
                    .maybeSingle();

                if (existeUsername) {
                    alert('Ese nombre de usuario ya está en uso. Elige otro.');
                    return;
                }

                // Crear usuario en Supabase Auth
                const { data: signUpData, error } = await authSupabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username } }
                });

                if (error) {
                    alert(error.message);
                    return;
                }

                // Insertar perfil manualmente (respaldo del trigger)
                if (signUpData?.user) {
                    const { error: perfilError } = await authSupabase
                        .from('perfiles')
                        .upsert({
                            id: signUpData.user.id,
                            email: email,
                            username: username
                        }, { onConflict: 'id' });

                    if (perfilError) console.error('Error al crear perfil:', perfilError);
                }

                document.getElementById('register-success').style.display = 'block';
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            });
        }

        // ================== LOGIN (SOLO CON CORREO) ==================
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();

                let email = e.target.elements.email.value.trim();
                let password = e.target.elements.password.value;

                if (!email || !password) {
                    mostrarError('Completa todos los campos');
                    return;
                }

                // Validar formato de correo
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    mostrarError('Ingresa un correo electrónico válido');
                    return;
                }

                // Iniciar sesión con el correo
                const { error } = await authSupabase.auth.signInWithPassword({ email, password });

                if (error) {
                    mostrarError('Correo o contraseña incorrectos');
                } else {
                    document.getElementById('login-success').style.display = 'block';
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                }
            });
        }

        function mostrarError(mensaje) {
            const errorEl = document.getElementById('login-error');
            errorEl.textContent = mensaje;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 4000);
        }
    });
}

// ================== FUNCIONES DE LOS BOTONES ==================

async function loginWithGoogle() {
    const { error } = await authSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/index.html' }
    });
    if (error) alert('Error al iniciar con Google: ' + error.message);
}

function saveAccessKey() {
    const emailInput = document.querySelector('#login-form input[name="email"]');
    const passwordInput = document.querySelector('#login-form input[name="password"]');
    
    if (!emailInput.value || !passwordInput.value) {
        alert('Primero escribe tu correo y contraseña para guardarlos');
        return;
    }
    localStorage.setItem('mosameli_saved_email', emailInput.value);
    alert('✅ Correo guardado. La próxima vez se autocompletará.');
}

// ================== RECUPERAR CONTRASEÑA (MODAL) ==================
function mostrarModalRecuperar() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        const loginEmail = document.querySelector('#login-form input[name="email"]');
        if (loginEmail && loginEmail.value) {
            const input = document.getElementById('recover-email');
            if (input) input.value = loginEmail.value;
        }
    }
}

function cerrarModalRecuperar() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

async function enviarRecuperacion() {
    const emailInput = document.getElementById('recover-email');
    const mensaje = document.getElementById('recover-message');
    const btn = document.getElementById('recover-btn');
    
    let email = emailInput.value.trim();

    if (!email) {
        mensaje.textContent = 'Por favor, escribe tu correo electrónico';
        mensaje.style.color = '#D32F2F';
        mensaje.style.display = 'block';
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mensaje.textContent = 'Ingresa un correo electrónico válido';
        mensaje.style.color = '#D32F2F';
        mensaje.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const { error } = await authSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        mensaje.textContent = 'Error: ' + error.message;
        mensaje.style.color = '#D32F2F';
        mensaje.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Enviar enlace';
    } else {
        mensaje.textContent = '✅ Revisa tu correo. Te enviamos el enlace de recuperación.';
        mensaje.style.color = '#4CAF50';
        mensaje.style.display = 'block';
        btn.textContent = 'Enviado';
        setTimeout(() => {
            cerrarModalRecuperar();
            btn.disabled = false;
            btn.textContent = 'Enviar enlace';
            mensaje.style.display = 'none';
            emailInput.value = '';
        }, 3000);
    }
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (event.target === modal) {
        cerrarModalRecuperar();
    }
});

function toggleAuth(mode) {
    const registerSection = document.getElementById('register-section');
    const loginSection = document.getElementById('login-section');
    
    if (registerSection) registerSection.style.display = mode === 'register' ? 'block' : 'none';
    if (loginSection) loginSection.style.display = mode === 'login' ? 'block' : 'none';
    
    const registerSuccess = document.getElementById('register-success');
    const loginSuccess = document.getElementById('login-success');
    const loginError = document.getElementById('login-error');
    
    if (registerSuccess) registerSuccess.style.display = 'none';
    if (loginSuccess) loginSuccess.style.display = 'none';
    if (loginError) loginError.style.display = 'none';
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}