// Usa la instancia global de supabaseClient
const supabaseClient = window.supabaseClient;

// ================== VERIFICACIÓN DE ACCESO ==================
async function verificarAcceso() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
}

// ================== CARGAR PRODUCTOS ==================
async function cargarProductos() {
    const { data, error } = await supabaseClient.from('productos').select('*').order('id');
    if (error) {
        console.error(error);
        alert("Error al cargar productos");
        return;
    }

    const tbody = document.getElementById('tabla-productos');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color: #666;">📦 No hay productos en el inventario. Agrega el primero arriba.</td></tr>';
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
                <button class="btn-edit" onclick="openEditModal(${p.id})">Editar</button>
                <button class="btn-delete" onclick="eliminarProducto(${p.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// ================== AGREGAR PRODUCTO ==================
async function agregarProducto() {
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

    const { error } = await supabaseClient.from('productos').insert([
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

// ================== EDITAR PRODUCTO (MODAL) ==================
let editProductId = null;

async function openEditModal(id) {
    const { data, error } = await supabaseClient.from('productos').select('*').eq('id', id).single();
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
    if (!editProductId) return;

    const nombre = document.getElementById('edit-nombre').value;
    const categoria = document.getElementById('edit-categoria').value;
    const precio = document.getElementById('edit-precio').value;
    const precioOriginal = document.getElementById('edit-precioOriginal').value;
    const stock = document.getElementById('edit-stock').value;
    const imagen = document.getElementById('edit-imagen').value;

    const { error } = await supabaseClient.from('productos').update({
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
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) {
        alert("Error al eliminar: " + error.message);
        return;
    }

    cargarProductos();
}

// ================== INICIALIZACIÓN ==================
window.onload = async function() {
    await verificarAcceso();
    await cargarProductos();
};