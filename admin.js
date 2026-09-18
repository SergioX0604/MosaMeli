// Usa la instancia global de Supabase
const sc = window.supabaseClient;

// ⚠️ CAMBIA ESTO POR TU CORREO DE ADMINISTRADOR
const ADMIN_EMAIL = 'espis0611@gmail.com'; // ← Tu correo aquí

let esAdmin = false;

// ================== VERIFICACIÓN DE ACCESO ==================
async function verificarAcceso() {
    // Esperar a que Supabase esté listo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: { user }, error } = await sc.auth.getUser();
    
    if (error || !user) {
        console.log('No hay sesión activa, redirigiendo a login...');
        // Guardar la URL de destino para volver después del login
        localStorage.setItem('redirectAfterLogin', 'admin.html');
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar si es admin
    esAdmin = (user.email === ADMIN_EMAIL);
    console.log('Usuario autenticado:', user.email);
    console.log('¿Es admin?', esAdmin);
    
    // Configurar la UI según el rol
    configurarUI();
    
    return true;
}

function configurarUI() {
    const formAgregar = document.getElementById('form-agregar');
    const header = document.querySelector('.admin-header h1');
    
    if (esAdmin) {
        // Mostrar formulario de agregar
        if (formAgregar) formAgregar.style.display = 'block';
        if (header) header.innerHTML = '<img src="img/logo-mosameli.png" alt="MosaMeli" style="height:35px;background:white;padding:3px 8px;border-radius:8px;"> 🛠️ Administrador';
    } else {
        // Ocultar formulario de agregar (solo lectura)
        if (formAgregar) formAgregar.style.display = 'none';
        if (header) header.innerHTML = '<img src="img/logo-mosameli.png" alt="MosaMeli" style="height:35px;background:white;padding:3px 8px;border-radius:8px;"> 📦 Inventario (solo lectura)';
    }
}

// ================== CARGAR PRODUCTOS ==================
async function cargarProductos() {
    const { data, error } = await sc.from('productos').select('*').order('id');
    if (error) {
        console.error(error);
        alert("Error al cargar productos");
        return;
    }

    const tbody = document.getElementById('tabla-productos');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color: #666;">📦 No hay productos en el inventario.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.nombre}</td>
            <td>${p.categoria}</td>
            <td>S/ ${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>
                ${esAdmin ? `
                    <button class="btn-edit" onclick="openEditModal(${p.id})">Editar</button>
                    <button class="btn-delete" onclick="eliminarProducto(${p.id})">Eliminar</button>
                ` : '<span style="color:#999; font-size:0.85rem;">Solo lectura</span>'}
            </td>
        </tr>
    `).join('');
}

// ================== AGREGAR PRODUCTO (solo admin) ==================
async function agregarProducto() {
    if (!esAdmin) { alert('No tienes permisos'); return; }

    const nombre = document.getElementById('nombre').value;
    const categoria = document.getElementById('categoria').value;
    const precio = document.getElementById('precio').value;
    const precioOriginal = document.getElementById('precioOriginal').value;
    const imagen = document.getElementById('imagen').value;
    const stock = document.getElementById('stock').value;

    if (!nombre || !categoria || !precio || !stock) {
        alert("Por favor completa todos los campos obligatorios");
        return;
    }

    const { error } = await sc.from('productos').insert([
        { nombre, categoria, precio, precio_original: precioOriginal, imagen, stock }
    ]);

    if (error) {
        alert("Error al agregar: " + error.message);
        return;
    }

    document.getElementById('nombre').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('precioOriginal').value = '';
    document.getElementById('imagen').value = '';
    document.getElementById('stock').value = '';

    cargarProductos();
}

// ================== EDITAR PRODUCTO ==================
let editProductId = null;

async function openEditModal(id) {
    if (!esAdmin) { alert('No tienes permisos'); return; }
    
    const { data, error } = await sc.from('productos').select('*').eq('id', id).single();
    if (error) {
        alert("Error al obtener producto: " + error.message);
        return;
    }

    editProductId = id;
    document.getElementById('edit-nombre').value = data.nombre;
    document.getElementById('edit-categoria').value = data.categoria;
    document.getElementById('edit-precio').value = data.precio;
    document.getElementById('edit-precioOriginal').value = data.precio_original;
    document.getElementById('edit-stock').value = data.stock;
    document.getElementById('edit-imagen').value = data.imagen;

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editProductId = null;
}

async function saveEdit() {
    if (!editProductId || !esAdmin) return;

    const nombre = document.getElementById('edit-nombre').value;
    const categoria = document.getElementById('edit-categoria').value;
    const precio = document.getElementById('edit-precio').value;
    const precioOriginal = document.getElementById('edit-precioOriginal').value;
    const stock = document.getElementById('edit-stock').value;
    const imagen = document.getElementById('edit-imagen').value;

    const { error } = await sc.from('productos').update({
        nombre, categoria, precio, precio_original: precioOriginal, stock, imagen
    }).eq('id', editProductId);

    if (error) {
        alert("Error al editar: " + error.message);
        return;
    }

    closeEditModal();
    cargarProductos();
}

// ================== ELIMINAR PRODUCTO ==================
async function eliminarProducto(id) {
    if (!esAdmin) { alert('No tienes permisos'); return; }
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    const { error } = await sc.from('productos').delete().eq('id', id);
    if (error) {
        alert("Error al eliminar: " + error.message);
        return;
    }

    cargarProductos();
}

// ================== INICIALIZACIÓN ==================
window.onload = async function() {
    const tieneAcceso = await verificarAcceso();
    if (tieneAcceso) {
        await cargarProductos();
    }
};

// ================== GESTIÓN DE RESEÑAS ==================
async function cargarResenasPendientes() {
    const { data, error } = await sc
        .from('resenas')
        .select('*, productos(nombre)')
        .eq('aprobada', false)
        .order('fecha', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const container = document.getElementById('resenasPendientes');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:30px; color:#7A6A8C;">✅ No hay reseñas pendientes</p>';
        return;
    }

    container.innerHTML = data.map(resena => `
        <div class="resena-card">
            <div class="resena-header">
                <div>
                    <strong>${resena.usuario_nombre}</strong>
                    <span class="resena-producto">${resena.productos?.nombre || 'Producto'}</span>
                </div>
                <div class="resena-stars">${'★'.repeat(resena.calificacion)}${'☆'.repeat(5 - resena.calificacion)}</div>
            </div>
            <p class="resena-texto">"${resena.comentario || 'Sin comentario'}"</p>
            <div class="resena-actions">
                <button class="btn-approve" onclick="aprobarResena(${resena.id})">
                    ✅ Aprobar
                </button>
                <button class="btn-reject" onclick="rechazarResena(${resena.id})">
                    ❌ Rechazar
                </button>
            </div>
        </div>
    `).join('');
}

async function aprobarResena(id) {
    const { error } = await sc
        .from('resenas')
        .update({ aprobada: true })
        .eq('id', id);

    if (error) {
        alert('Error al aprobar: ' + error.message);
        return;
    }

    alert('✅ Reseña aprobada y publicada');
    cargarResenasPendientes();
}

async function rechazarResena(id) {
    if (!confirm('¿Seguro que quieres rechazar esta reseña?')) return;

    const { error } = await sc
        .from('resenas')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error al rechazar: ' + error.message);
        return;
    }

    alert('❌ Reseña rechazada');
    cargarResenasPendientes();
}

// Cargar reseñas al inicio
if (document.getElementById('resenasPendientes')) {
    cargarResenasPendientes();
}