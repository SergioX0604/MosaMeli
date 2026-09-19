// Usa la instancia global de Supabase
const sc = window.supabaseClient;

// ⚠️ CAMBIA ESTO POR TU CORREO DE ADMINISTRADOR
const ADMIN_EMAIL = 'espis0611@gmail.com';

// Configuración de zonas (para reportes)
const CONFIG_DELIVERY_ZONAS = [
    { radio: 2,  costo: 5.00,  color: '#4CAF50', nombre: 'Zona 1 - Chaclacayo Centro' },
    { radio: 4,  costo: 7.00,  color: '#FFC107', nombre: 'Zona 2 - Chaclacayo Cercano' },
    { radio: 7,  costo: 10.00, color: '#FF9800', nombre: 'Zona 3 - Chaclacayo Alto' },
    { radio: 10, costo: 15.00, color: '#F44336', nombre: 'Zona 4 - Chosica / Ricardo Palma' }
];

// ================== VERIFICACIÓN DE ACCESO ==================
async function verificarAcceso() {
    const { data: { user } } = await sc.auth.getUser();
    
    if (!user) {
        localStorage.setItem('redirectAfterLogin', 'admin.html');
        window.location.href = 'login.html';
        return false;
    }
    
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
        const costoReal = Number(pedido.costo_real_delivery) || 0;
        const distancia = Number(pedido.distancia_delivery) || 0;
        const margen = costoDelivery - costoReal;
        
        const bloqueCostos = costoDelivery > 0 ? `
            <div class="costos-delivery" style="background: #F5F0FA; border-radius: 10px; padding: 12px; margin: 10px 0; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #7A6A8C;">💰 Cobrado al cliente:</span>
                    <strong style="color: #4CAF50;">S/ ${costoDelivery.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #7A6A8C;">⛽ Costo real:</span>
                    <strong style="color: #E57373;">S/ ${costoReal.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px solid #EDE4F5; margin-top: 4px; padding-top: 6px;">
                    <span style="color: #7A6A8C; font-weight: 600;">📊 Margen:</span>
                    <strong class="${margen >= 0 ? 'margen-positivo' : 'margen-negativo'}">
                        S/ ${margen.toFixed(2)}
                    </strong>
                </div>
                
                <div class="costo-real-editable">
                    <i class="fas fa-edit"></i>
                    <span>Costo real: S/</span>
                    <input type="number" 
                           step="0.01" 
                           min="0" 
                           value="${costoReal.toFixed(2)}" 
                           id="costo-real-${pedido.id}"
                           placeholder="0.00">
                    <button onclick="guardarCostoReal(${pedido.id})">
                        Guardar
                    </button>
                </div>
            </div>
        ` : '';
        
        const bloqueNotas = pedido.notas_delivery ? `
            <div class="notas-pedido">
                <i class="fas fa-pencil-alt"></i>
                <div>
                    <strong>Notas del cliente:</strong><br>
                    ${pedido.notas_delivery}
                </div>
            </div>
        ` : '';
        
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
                
                ${bloqueNotas}
                
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
                
                ${bloqueCostos}
                
                <div class="pedido-footer">
                    <span class="pedido-metodo">💰 ${pedido.metodo_pago || 'No especificado'}</span>
                    <a href="seguimiento.html?codigo=${pedido.codigo_seguimiento}" target="_blank" class="btn-ver-pedido">
                        🔗 Ver seguimiento
                    </a>
                </div>
            </div>
        `;
    }).join('');
    
    if (document.getElementById('reportesCards')) {
        cargarReportes();
    }
}

async function cambiarEstado(pedidoId, nuevoEstado) {
    const actualizaciones = { estado: nuevoEstado };
    const ahora = new Date().toISOString();
    
    if (nuevoEstado === 'pago_verificado') actualizaciones.fecha_pago_verificado = ahora;
    if (nuevoEstado === 'en_preparacion') actualizaciones.fecha_preparacion = ahora;
    if (nuevoEstado === 'en_camino') actualizaciones.fecha_envio = ahora;
    if (nuevoEstado === 'entregado') actualizaciones.fecha_entrega = ahora;

    const { error } = await sc
        .from('pedidos')
        .update(actualizaciones)
        .eq('id', pedidoId)
        .select();

    if (error) {
        console.error('❌ Error de Supabase:', error);
        alert('❌ Error al actualizar: ' + error.message);
        return;
    }

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

// ================== GUARDAR COSTO REAL (#16) ==================
async function guardarCostoReal(pedidoId) {
    const input = document.getElementById(`costo-real-${pedidoId}`);
    if (!input) return;
    
    const valor = parseFloat(input.value);
    if (isNaN(valor) || valor < 0) {
        alert('Ingresa un valor válido');
        return;
    }
    
    const { error } = await sc
        .from('pedidos')
        .update({ costo_real_delivery: valor })
        .eq('id', pedidoId);
    
    if (error) {
        alert('Error al guardar: ' + error.message);
        return;
    }
    
    showToastAdmin('✅ Costo real actualizado');
    cargarPedidos();
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

// ================== REPORTES (#17) ==================
let periodoActual = 'mes';

function cambiarPeriodo(periodo, boton) {
    periodoActual = periodo;
    
    document.querySelectorAll('.filtro-fecha').forEach(btn => btn.classList.remove('active'));
    if (boton) boton.classList.add('active');
    
    cargarReportes();
}

async function cargarReportes() {
    const { data, error } = await sc
        .from('pedidos')
        .select('*')
        .order('fecha', { ascending: false });

    if (error || !data) return;
    
    const ahora = new Date();
    let fechaLimite = null;
    
    if (periodoActual === 'hoy') {
        fechaLimite = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    } else if (periodoActual === 'semana') {
        fechaLimite = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodoActual === 'mes') {
        fechaLimite = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const pedidosFiltrados = fechaLimite 
        ? data.filter(p => new Date(p.fecha) >= fechaLimite)
        : data;
    
    const totalPedidos = pedidosFiltrados.length;
    const totalIngresos = pedidosFiltrados.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const totalDeliveryCobrado = pedidosFiltrados.reduce((sum, p) => sum + (Number(p.costo_delivery) || 0), 0);
    const totalCostoReal = pedidosFiltrados.reduce((sum, p) => sum + (Number(p.costo_real_delivery) || 0), 0);
    const margenDelivery = totalDeliveryCobrado - totalCostoReal;
    const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0;
    
    const elTotalPedidos = document.getElementById('totalPedidos');
    if (elTotalPedidos) elTotalPedidos.textContent = totalPedidos;
    
    const elTotalIngresos = document.getElementById('totalIngresos');
    if (elTotalIngresos) elTotalIngresos.textContent = `S/ ${totalIngresos.toFixed(2)}`;
    
    const elTotalDeliveryCobrado = document.getElementById('totalDeliveryCobrado');
    if (elTotalDeliveryCobrado) elTotalDeliveryCobrado.textContent = `S/ ${totalDeliveryCobrado.toFixed(2)}`;
    
    const elTotalCostoReal = document.getElementById('totalCostoReal');
    if (elTotalCostoReal) elTotalCostoReal.textContent = `S/ ${totalCostoReal.toFixed(2)}`;
    
    const margenEl = document.getElementById('margenDelivery');
    if (margenEl) {
        margenEl.textContent = `S/ ${margenDelivery.toFixed(2)}`;
        margenEl.className = `reporte-valor ${margenDelivery >= 0 ? 'margen-positivo' : 'margen-negativo'}`;
    }
    
    const elTicketPromedio = document.getElementById('ticketPromedio');
    if (elTicketPromedio) elTicketPromedio.textContent = `S/ ${ticketPromedio.toFixed(2)}`;
    
    renderizarReporteZonas(pedidosFiltrados);
    renderizarReporteEstados(pedidosFiltrados);
}

function renderizarReporteZonas(pedidos) {
    const container = document.getElementById('reporteZonas');
    if (!container) return;
    
    const zonas = {};
    
    pedidos.forEach(p => {
        const dist = Number(p.distancia_delivery) || 0;
        let zonaKey = 'Sin zona';
        
        for (const z of CONFIG_DELIVERY_ZONAS) {
            if (dist <= z.radio) {
                zonaKey = z.nombre;
                break;
            }
        }
        
        if (dist > 10) zonaKey = 'Fuera de cobertura';
        
        if (!zonas[zonaKey]) {
            zonas[zonaKey] = { cantidad: 0, montoDelivery: 0 };
        }
        
        zonas[zonaKey].cantidad++;
        zonas[zonaKey].montoDelivery += Number(p.costo_delivery) || 0;
    });
    
    const zonasArray = Object.entries(zonas).sort((a, b) => b[1].cantidad - a[1].cantidad);
    
    if (zonasArray.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#7A6A8C; padding:15px;">Sin datos</p>';
        return;
    }
    
    container.innerHTML = zonasArray.map(([nombre, datos]) => {
        const zonaConfig = CONFIG_DELIVERY_ZONAS.find(z => z.nombre === nombre);
        const color = zonaConfig ? zonaConfig.color : '#B0A5BD';
        
        return `
            <div class="zona-reporte-item">
                <div class="zona-reporte-color" style="background: ${color};"></div>
                <div class="zona-reporte-nombre">${nombre}</div>
                <div class="zona-reporte-cantidad">${datos.cantidad} pedido${datos.cantidad !== 1 ? 's' : ''}</div>
                <div class="zona-reporte-monto">S/ ${datos.montoDelivery.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

function renderizarReporteEstados(pedidos) {
    const container = document.getElementById('reporteEstados');
    if (!container) return;
    
    const estados = {
        'pedido_recibido': { emoji: '⏳', nombre: 'Recibidos', color: '#FF9800' },
        'pago_verificado': { emoji: '✅', nombre: 'Verificados', color: '#4CAF50' },
        'en_preparacion': { emoji: '📦', nombre: 'En preparación', color: '#2196F3' },
        'en_camino': { emoji: '🚚', nombre: 'En camino', color: '#9C27B0' },
        'entregado': { emoji: '🏠', nombre: 'Entregados', color: '#1B5E20' }
    };
    
    const conteo = {};
    Object.keys(estados).forEach(k => conteo[k] = 0);
    
    pedidos.forEach(p => {
        const estado = p.estado || 'pedido_recibido';
        if (conteo[estado] !== undefined) conteo[estado]++;
    });
    
    container.innerHTML = Object.entries(estados).map(([key, info]) => `
        <div class="zona-reporte-item">
            <div class="zona-reporte-color" style="background: ${info.color};"></div>
            <div class="zona-reporte-nombre">${info.emoji} ${info.nombre}</div>
            <div class="zona-reporte-cantidad">${conteo[key]}</div>
        </div>
    `).join('');
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
    const tieneAcceso = await verificarAcceso();
    if (tieneAcceso) {
        await cargarProductos();
        if (document.getElementById('pedidosList')) cargarPedidos();
        if (document.getElementById('resenasPendientes')) cargarResenasPendientes();
        if (document.getElementById('reportesCards')) cargarReportes();
    }
});