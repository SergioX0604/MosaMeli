// Usa la instancia global
const authSupabase = window.supabaseClient;

// ================== AUTENTICACIÓN (GLOBAL) ==================
async function checkLoginStatus() {
    const { data: { user } } = await authSupabase.auth.getUser();
    const userName = document.getElementById('userName');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!userName || !loginBtn || !logoutBtn) return;

    if (user) {
        // Buscar username en la tabla perfiles
        const { data: perfil } = await authSupabase
            .from('perfiles')
            .select('username')
            .eq('id', user.id)
            .single();

        const nombreMostrar = perfil?.username || user.user_metadata?.username || user.email;
        userName.textContent = `Hola, ${nombreMostrar}`;
        userName.style.display = 'inline';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline';
    }
}

async function logout() {
    await authSupabase.auth.signOut();
    location.reload();
}

// ================== EVENTOS SOLO PARA LOGIN.HTML ==================
const isLoginPage = window.location.pathname.includes('login.html');

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
                const { error } = await authSupabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username } }
                });

                if (error) {
                    alert(error.message);
                } else {
                    document.getElementById('register-success').style.display = 'block';
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
            });
        }

        // ================== LOGIN ==================
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();

                let identifier = e.target.elements.email.value.trim();
                let password = e.target.elements.password.value;

                if (!identifier || !password) {
                    mostrarError('Completa todos los campos');
                    return;
                }

                // Detectar si es correo o username
                let email = identifier;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!emailRegex.test(identifier)) {
                    // Es un username → buscar su email en perfiles
                    const { data: perfil, error: errorBusqueda } = await authSupabase
                        .from('perfiles')
                        .select('email')
                        .eq('username', identifier)
                        .maybeSingle();

                    if (errorBusqueda || !perfil) {
                        mostrarError('Usuario no encontrado. Verifica tu nombre de usuario.');
                        return;
                    }
                    email = perfil.email;
                }

                // Iniciar sesión con el email resuelto
                const { error } = await authSupabase.auth.signInWithPassword({ email, password });

                if (error) {
                    mostrarError('Correo/usuario o contraseña incorrectos');
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
        alert('Primero escribe tu correo/usuario y contraseña para guardarlos');
        return;
    }
    localStorage.setItem('mosameli_saved_email', emailInput.value);
    alert('✅ Guardado. La próxima vez se autocompletará.');
}

async function forgotPassword() {
    const emailInput = document.querySelector('#login-form input[name="email"]');
    let identifier = emailInput.value.trim();

    if (!identifier) {
        alert('Por favor, escribe tu correo primero');
        emailInput.focus();
        return;
    }

    // Si escribió un username, buscar el email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
        const { data: perfil } = await authSupabase
            .from('perfiles')
            .select('email')
            .eq('username', identifier)
            .maybeSingle();

        if (!perfil) {
            alert('Usuario no encontrado');
            return;
        }
        identifier = perfil.email;
    }

    const { error } = await authSupabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Te hemos enviado un correo a ' + identifier);
    }
}

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