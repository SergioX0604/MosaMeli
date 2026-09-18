// Usa la instancia global de Supabase
const sc = window.supabaseClient;

let todosLosPedidos = [];
let filtroActual = 'todos';

// ================== CARGAR PEDIDOS DEL USUARIO ==================
async function cargarMisPedidos() {
    const contenedor = document.getElementById('contenedorPedidos');

    // Verificar sesión
    const { data: { user } } = await sc.auth.getUser();
    
    if (!user) {
        mostrarSinSesion();
        return;
    }

    // Cargar pedidos del usuario
    const { data, error } = await sc
        .from('pedidos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('fecha', { ascending: false });

    if (error) {
        console.error('Error al cargar pedidos:', error);
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <div class="icono"><i class="fas fa-exclamation-triangle" style="color:#E57373;"></i></div>
                <h2>Error al cargar</h2>
                <p>No pudimos obtener tus pedidos. Intenta de nuevo más tarde.</p>
                <a href="index.html" class="btn-ir-tienda">
                    <i class="fas fa-home"></i> Volver a la tienda
                </a>
            </div>
        `;
        return;
    }

    if (!data || data.length === 0) {
        mostrarSinPedidos();
        return;
    }

    todosLosPedidos = data;
    
    // Mostrar filtros
    document.getElementById('filtrosPedidos').style.display = 'flex';
    
    renderizarPedidos(todosLosPedidos);
}

// ================== RENDERIZAR PEDIDOS ==================
function renderizarPedidos(pedidos) {
    const contenedor = document.getElementById('contenedorPedidos');
    
    if (pedidos.length === 0) {
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <div class="icono"><i class="fas fa-search"></i></div>
                <h2>No hay pedidos con este filtro</h2>
                <p>Prueba con otro estado o mira todos tus pedidos.</p>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = `
        <div class="pedidos-lista">
            ${pedidos.map(pedido => renderizarPedido(pedido)).join('')}
        </div>
    `;
}

// ================== RENDERIZAR UN PEDIDO ==================
function renderizarPedido(pedido) {
    const estado = pedido.estado || 'pedido_recibido';
    const { texto, clase, icono } = obtenerInfoEstado(estado);
    
    const total = Number(pedido.total) || 0;
    const fecha = pedido.fecha 
        ? new Date(pedido.fecha).toLocaleString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : 'Fecha no disponible';
    
    const items = pedido.items || [];
    const totalItems = items.length;
    
    return `
        <div class="pedido-item" data-estado="${estado}">
            <div class="pedido-top">
                <div class="pedido-codigo">
                    <strong>#${pedido.codigo_seguimiento || 'Sin código'}</strong>
                    <small><i class="far fa-calendar"></i> ${fecha}</small>
                </div>
                <div class="pedido-total-box">
                    <div class="total">S/ ${total.toFixed(2)}</div>
                    <small>${totalItems} producto${totalItems !== 1 ? 's' : ''}</small>
                </div>
            </div>
            
            <div class="pedido-estado-badge ${clase}">
                <i class="fas ${icono}"></i> ${texto}
            </div>
            
            <div class="pedido-items-lista">
                ${items.slice(0, 4).map(item => `<span>${item.nombre || 'Producto'}</span>`).join('')}
                ${items.length > 4 ? `<span>+${items.length - 4} más</span>` : ''}
            </div>
            
            <div class="pedido-footer-row">
                <span class="pedido-metodo-badge">
                    <i class="fas fa-credit-card"></i> ${pedido.metodo_pago || 'No especificado'}
                </span>
                <a href="seguimiento.html?codigo=${pedido.codigo_seguimiento}" 
                   class="btn-ver-detalle">
                    <i class="fas fa-route"></i> Ver seguimiento
                </a>
            </div>
        </div>
    `;
}

// ================== INFO DE ESTADOS ==================
function obtenerInfoEstado(estado) {
    const estados = {
        'pedido_recibido': { 
            texto: 'Pedido recibido', 
            clase: 'estado-recibido', 
            icono: 'fa-shopping-bag' 
        },
        'pago_verificado': { 
            texto: 'Pago verificado', 
            clase: 'estado-verificado', 
            icono: 'fa-check-circle' 
        },
        'en_preparacion': { 
            texto: 'En preparación', 
            clase: 'estado-preparacion', 
            icono: 'fa-box' 
        },
        'en_camino': { 
            texto: 'En camino', 
            clase: 'estado-camino', 
            icono: 'fa-truck' 
        },
        'entregado': { 
            texto: 'Entregado', 
            clase: 'estado-entregado', 
            icono: 'fa-home' 
        }
    };
    
    return estados[estado] || estados['pedido_recibido'];
}

// ================== FILTRAR PEDIDOS ==================
function filtrarPedidos(filtro, boton) {
    filtroActual = filtro;
    
    // Actualizar botón activo
    document.querySelectorAll('.filtro-pill').forEach(btn => btn.classList.remove('active'));
    if (boton) boton.classList.add('active');
    
    // Filtrar
    if (filtro === 'todos') {
        renderizarPedidos(todosLosPedidos);
    } else {
        const filtrados = todosLosPedidos.filter(p => p.estado === filtro);
        renderizarPedidos(filtrados);
    }
}

// ================== ESTADOS VACÍOS ==================
function mostrarSinSesion() {
    const contenedor = document.getElementById('contenedorPedidos');
    contenedor.innerHTML = `
        <div class="estado-vacio">
            <div class="icono"><i class="fas fa-user-lock"></i></div>
            <h2>Inicia sesión para ver tus pedidos</h2>
            <p>Necesitas iniciar sesión con tu cuenta para ver el historial de tus compras y el estado de cada pedido.</p>
            <a href="login.html" class="btn-ir-tienda">
                <i class="fas fa-sign-in-alt"></i> Iniciar sesión
            </a>
        </div>
    `;
}

function mostrarSinPedidos() {
    const contenedor = document.getElementById('contenedorPedidos');
    contenedor.innerHTML = `
        <div class="estado-vacio">
            <div class="icono"><i class="fas fa-shopping-bag"></i></div>
            <h2>Aún no tienes pedidos</h2>
            <p>Cuando realices tu primera compra, aquí podrás ver el estado y el historial completo de tus pedidos.</p>
            <a href="index.html" class="btn-ir-tienda">
                <i class="fas fa-store"></i> Ir a la tienda
            </a>
        </div>
    `;
}

// ================== INICIALIZACIÓN ==================
window.addEventListener('load', cargarMisPedidos);