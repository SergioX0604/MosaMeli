// Usa la instancia global de supabaseClient (definida en supabaseClient.js)
const authSupabase = window.supabaseClient;

// ================== AUTENTICACIÓN (GLOBAL) ==================
async function checkLoginStatus() {
    const { data: { user } } = await authSupabase.auth.getUser();
    const userName = document.getElementById('userName');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!userName || !loginBtn || !logoutBtn) return;

    if (user) {
        userName.textContent = `Hola, ${user.user_metadata?.username || user.email}`;
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
const isLoginPage = window.location.pathname.endsWith('login.html');

if (isLoginPage) {
    document.addEventListener('DOMContentLoaded', async function() {
        const { data: { user } } = await authSupabase.auth.getUser();
        if (user) {
            window.location.href = 'index.html';
            return;
        }

        const savedEmail = localStorage.getItem('mosameli_saved_email');
        if (savedEmail) {
            const emailInput = document.querySelector('#login-form input[name="email"]');
            if (emailInput) emailInput.value = savedEmail;
        }

        const registerForm = document.getElementById('register-form');
        const loginForm = document.getElementById('login-form');

    if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // ← ESTO ES CLAVE: evita que el formulario se envíe por URL
        let email = e.target.elements.email.value.trim();
        let password = e.target.elements.password.value;

        const { error } = await authSupabase.auth.signInWithPassword({ email, password });

        if (error) {
            document.getElementById('login-error').style.display = 'block';
        } else {
            document.getElementById('login-success').style.display = 'block';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    });
}

        // Login
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                let email = e.target.elements.email.value.trim();
                let password = e.target.elements.password.value;

                const { error } = await authSupabase.auth.signInWithPassword({ email, password });

                if (error) {
                    document.getElementById('login-error').style.display = 'block';
                } else {
                    document.getElementById('login-success').style.display = 'block';
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                }
            });
        }
    });
}

// ================== FUNCIONES DE LOS BOTONES ==================

// Iniciar sesión con Google
async function loginWithGoogle() {
    const { error } = await authSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/index.html'
        }
    });
    if (error) alert('Error al iniciar con Google: ' + error.message);
}

// Guardar correo (Clave de acceso)
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

// ¿Olvidaste tu contraseña?
async function forgotPassword() {
    const emailInput = document.querySelector('#login-form input[name="email"]');
    const email = emailInput.value.trim();

    if (!email) {
        alert('Por favor, escribe tu correo primero para enviarte el enlace de recuperación');
        emailInput.focus();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('El correo ingresado no es válido. Asegúrate de escribirlo completo (ejemplo@dominio.com)');
        emailInput.focus();
        return;
    }

    const { error } = await authSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Te hemos enviado un correo a ' + email + ' con las instrucciones para recuperar tu contraseña.');
    }
}

// Alternar Login/Registro
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

// Mostrar/ocultar contraseña
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