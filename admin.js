// Usa la instancia global de Supabase
const sc = window.supabaseClient;

// ⚠️ CAMBIA ESTO POR TU CORREO DE ADMINISTRADOR
const ADMIN_EMAIL = 'espis0611@gmail.com';

// ================== VERIFICACIÓN DE ACCESO ==================
async function verificarAcceso() {
    const { data: { user } } = await sc.auth.getUser();
    
    // Sin sesión → redirigir a login
    if (!user) {
        localStorage.setItem('redirectAfterLogin', 'admin.html');
        window.location.href = 'login.html';
        return false;
    }
    
    // ✅ VERIFICAR QUE SEA EL ADMIN
    if (user.email !== ADMIN_EMAIL) {
        alert('⛔ Acceso denegado. Solo administradores pueden entrar aquí.');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
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
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color: #666;">📦 No hay productos en el inventario.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.nombre}</td>
            <td>${p.categoria}</td>
            <td>S/ ${Number(p.precio).toFixed(2)}</td>
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
    const nombre = document.getElementById('nombre').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const precio = parseFloat(document.getElementById('precio').value);
    const precioOriginal = parseFloat(document.getElementById('precioOriginal').value) || null;
    const imagen = document.getElementById('imagen').value.trim();
    const stock = parseInt(document.getElementById('stock').value);

    if (!nombre || !categoria || isNaN(precio) || isNaN(stock)) {
        alert("Por favor completa todos los campos obligatorios");
        return;
    }

    if (precio <= 0) {
        alert("El precio debe ser mayor a 0");
        return;
    }

    if (stock < 0) {
        alert("El stock no puede ser negativo");
        return;
    }

    const { error } = await sc.from('productos').insert([
        { 
            nombre, 
            categoria, 
            precio, 
            precio_original: precioOriginal, 
            imagen, 
            stock 
        }
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
    showToastAdmin("✅ Producto agregado");
}

// ================== EDITAR PRODUCTO ==================
let editProductId = null;

async function openEditModal(id) {
    const { data, error } = await sc.from('productos').select('*').eq('id', id).single();
    if (error) {
        alert("Error al obtener producto: " + error.message);
        return;
    }

    editProductId = id;
    document.getElementById('edit-nombre').value = data.nombre;
    document.getElementById('edit-categoria').value = data.categoria;
    document.getElementById('edit-precio').value = data.precio;
    document.getElementById('edit-precioOriginal').value = data.precio_original || '';
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

    const nombre = document.getElementById('edit-nombre').value.trim();
    const categoria = document.getElementById('edit-categoria').value.trim();
    const precio = parseFloat(document.getElementById('edit-precio').value);
    const precioOriginal = parseFloat(document.getElementById('edit-precioOriginal').value) || null;
    const stock = parseInt(document.getElementById('edit-stock').value);
    const imagen = document.getElementById('edit-imagen').value.trim();

    if (!nombre || !categoria || isNaN(precio) || isNaN(stock)) {
        alert("Por favor completa todos los campos");
        return;
    }

    const { error } = await sc.from('productos').update({
        nombre, 
        categoria, 
        precio, 
        precio_original: precioOriginal, 
        stock, 
        imagen
    }).eq('id', editProductId);

    if (error) {
        alert("Error al editar: " + error.message);
        return;
    }

    closeEditModal();
    cargarProductos();
    showToastAdmin("✅ Producto actualizado");
}

// ================== ELIMINAR PRODUCTO ==================
async function eliminarProducto(id) {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    const { error } = await sc.from('productos').delete().eq('id', id);
    if (error) {
        alert("Error al eliminar: " + error.message);
        return;
    }

    cargarProductos();
    showToastAdmin("🗑️ Producto eliminado");
}

// ================== GESTIÓN DE PEDIDOS ==================
async function cargarPedidos() {
    const { data, error } = await sc
        .from('pedidos')
        .select('*')
        .order('fecha', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const container = document.getElementById('pedidosList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:30px; color:#7A6A8C;">📦 No hay pedidos aún</p>';
        return;
    }

    container.innerHTML = data.map(pedido => {
        const estadoActual = pedido.estado || 'pedido_recibido';
        const total = Number(pedido.total) || 0;
        const costoDelivery = Number(pedido.costo_delivery) || 0;
        const distancia = Number(pedido.distancia_delivery) || 0;
        
        return `
            <div class="pedido-card">
                <div class="pedido-header">
                    <div>
                        <strong>#${pedido.codigo_seguimiento || 'Sin código'}</strong>
                        <p>${pedido.cliente_nombre || 'Cliente'} - ${pedido.cliente_email || ''}</p>
                    </div>
                    <div class="pedido-total">
                        Total: S/ ${total.toFixed(2)}
                        ${costoDelivery ? `<br><small style="font-size: 0.75rem; color: #7A6A8C;">(delivery: S/ ${costoDelivery.toFixed(2)} - ${distancia ? distancia.toFixed(1) + ' km' : ''})</small>` : ''}
                    </div>
                </div>
                
                <div class="pedido-estado">
                    <label>Estado:</label>
                    <select onchange="cambiarEstado(${pedido.id}, this.value)">
                        <option value="pedido_recibido" ${estadoActual === 'pedido_recibido' ? 'selected' : ''}>⏳ Pedido recibido</option>
                        <option value="pago_verificado" ${estadoActual === 'pago_verificado' ? 'selected' : ''}>✅ Pago verificado</option>
                        <option value="en_preparacion" ${estadoActual === 'en_preparacion' ? 'selected' : ''}>📦 En preparación</option>
                        <option value="en_camino" ${estadoActual === 'en_camino' ? 'selected' : ''}>🚚 En camino</option>
                        <option value="entregado" ${estadoActual === 'entregado' ? 'selected' : ''}>🏠 Entregado</option>
                    </select>
                </div>
                
                <div class="pedido-items">
                    ${(pedido.items || []).map(item => `<span>${item.nombre}</span>`).join('')}
                </div>
                
                <div class="pedido-footer">
                    <span class="pedido-metodo">💰 ${pedido.metodo_pago || 'No especificado'}</span>
                    <a href="seguimiento.html?codigo=${pedido.codigo_seguimiento}" target="_blank" class="btn-ver-pedido">
                        🔗 Ver seguimiento
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

async function cambiarEstado(pedidoId, nuevoEstado) {
    console.log('🔄 Intentando cambiar estado:', pedidoId, '→', nuevoEstado);
    
    const actualizaciones = { estado: nuevoEstado };
    const ahora = new Date().toISOString();
    
    if (nuevoEstado === 'pago_verificado') actualizaciones.fecha_pago_verificado = ahora;
    if (nuevoEstado === 'en_preparacion') actualizaciones.fecha_preparacion = ahora;
    if (nuevoEstado === 'en_camino') actualizaciones.fecha_envio = ahora;
    if (nuevoEstado === 'entregado') actualizaciones.fecha_entrega = ahora;

    const { data, error } = await sc
        .from('pedidos')
        .update(actualizaciones)
        .eq('id', pedidoId)
        .select();

    if (error) {
        console.error('❌ Error de Supabase:', error);
        alert('❌ Error al actualizar: ' + error.message);
        return;
    }

    console.log('✅ Estado actualizado en Supabase:', data);
    showToastAdmin('✅ Estado actualizado correctamente');
    
    await cargarPedidos();
    
    // Enviar correo sin bloquear
    try {
        const { data: pedido } = await sc
            .from('pedidos')
            .select('*')
            .eq('id', pedidoId)
            .single();

        if (pedido && pedido.cliente_email) {
            await sc.functions.invoke('notificar-estado', {
                body: {
                    cliente_email: pedido.cliente_email,
                    cliente_nombre: pedido.cliente_nombre,
                    codigo_seguimiento: pedido.codigo_seguimiento,
                    nuevo_estado: nuevoEstado,
                    pedido_id: pedido.id
                }
            });
            
            showToastAdmin('📧 Correo enviado al cliente');
        }
    } catch (emailError) {
        console.warn('⚠️ Correo no enviado:', emailError);
    }
}

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

    showToastAdmin('✅ Reseña aprobada y publicada');
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

    showToastAdmin('❌ Reseña rechazada');
    cargarResenasPendientes();
}

// ================== TOAST PARA ADMIN ==================
function showToastAdmin(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="event.stopPropagation(); this.parentElement.remove();">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================== INICIALIZACIÓN ==================
window.addEventListener('load', async function() {
    checkLoginStatus();
    await loadProducts();
    loadCart();
    initFilterEvents();
    setTimeout(() => initVolumeControl(), 500);
});

window.addEventListener('click', function(event) {
    const cartModal = document.getElementById('cartModal');
    const checkoutModal = document.getElementById('checkoutModal');
    const registerModal = document.getElementById('registerRequiredModal');
    const productModal = document.getElementById('productModal');
    const fullscreenModal = document.getElementById('imageFullscreenModal');
    const reviewModal = document.getElementById('reviewModal');
    
    if (event.target === cartModal) closeCart();
    if (event.target === checkoutModal) closeCheckout();
    if (event.target === registerModal) closeRegisterRequired();
    if (event.target === productModal) closeProductModal();
    if (event.target === fullscreenModal) closeFullscreenImage();
    if (event.target === reviewModal) cerrarModalResena();
});