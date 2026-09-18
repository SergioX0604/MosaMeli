// Usa la instancia global de Supabase
const sc = window.supabaseClient;

// ⚠️ CAMBIA ESTO POR TU CORREO DE ADMINISTRADOR
const ADMIN_EMAIL = 'espis0611@gmail.com';

// ================== VERIFICACIÓN DE ACCESO ==================
async function verificarAcceso() {
    const { data: { user } } = await sc.auth.getUser();
    if (!user) {
        localStorage.setItem('redirectAfterLogin', 'admin.html');
        window.location.href = 'login.html';
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

    const nombre = document.getElementById('edit-nombre').value;
    const categoria = document.getElementById('edit-categoria').value;
    const precio = document.getElementById('edit-precio').value;
    const precioOriginal = document.getElementById('edit-precioOriginal').value;
    const stock = document.getElementById('edit-stock').value;
    const imagen = document.getElementById('edit-imagen').value;

    const { error } = await sc.from('productos').update({
        nombre, categoria, precio, precio_original: precioOriginal || null, stock, imagen
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
        
        return `
            <div class="pedido-card">
                <div class="pedido-header">
                    <div>
                        <strong>#${pedido.codigo_seguimiento || 'Sin código'}</strong>
                        <p>${pedido.cliente_nombre || 'Cliente'} - ${pedido.cliente_email || ''}</p>
                    </div>
                    <div class="pedido-total">
                        Total: S/ ${pedido.total.toFixed(2)}
                        ${pedido.costo_delivery ? `<br><small style="font-size: 0.75rem; color: #7A6A8C;">(delivery: S/ ${pedido.costo_delivery.toFixed(2)} - ${pedido.distancia_delivery ? pedido.distancia_delivery.toFixed(1) + ' km' : ''})</small>` : ''}
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
    
    // PASO 1: Actualizar el estado en Supabase
    const actualizaciones = { estado: nuevoEstado };
    const ahora = new Date().toISOString();
    
    if (nuevoEstado === 'pago_verificado') actualizaciones.fecha_pago_verificado = ahora;
    if (nuevoEstado === 'en_preparacion') actualizaciones.fecha_preparacion = ahora;
    if (nuevoEstado === 'en_camino') actualizaciones.fecha_envio = ahora;
    if (nuevoEstado === 'entregado') actualizaciones.fecha_entrega = ahora;

    console.log('📤 Enviando a Supabase:', actualizaciones);

    const { data, error } = await sc
        .from('pedidos')
        .update(actualizaciones)
        .eq('id', pedidoId)
        .select();

    // Si la actualización falla, mostrar error y detener
    if (error) {
        console.error('❌ Error de Supabase:', error);
        alert('❌ Error al actualizar: ' + error.message);
        return;
    }

    console.log('✅ Estado actualizado en Supabase:', data);
    showToastAdmin('✅ Estado actualizado correctamente');
    
    // PASO 2: Recargar la lista (para que se vea el cambio inmediatamente)
    await cargarPedidos();
    
    // PASO 3: Intentar enviar el correo SIN bloquear el flujo
    try {
        const { data: pedido } = await sc
            .from('pedidos')
            .select('*')
            .eq('id', pedidoId)
            .single();

        if (pedido && pedido.cliente_email) {
            console.log('📧 Enviando correo a:', pedido.cliente_email);
            
            await sc.functions.invoke('notificar-estado', {
                body: {
                    cliente_email: pedido.cliente_email,
                    cliente_nombre: pedido.cliente_nombre,
                    codigo_seguimiento: pedido.codigo_seguimiento,
                    nuevo_estado: nuevoEstado,
                    pedido_id: pedido.id
                }
            });
            
            console.log('📧 Correo enviado');
            showToastAdmin('📧 Correo enviado al cliente');
        }
    } catch (emailError) {
        // Si falla el correo, NO detenemos nada. El estado ya se guardó.
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
window.onload = async function() {
    const tieneAcceso = await verificarAcceso();
    if (tieneAcceso) {
        await cargarProductos();
        if (document.getElementById('pedidosList')) cargarPedidos();
        if (document.getElementById('resenasPendientes')) cargarResenasPendientes();
    }
};