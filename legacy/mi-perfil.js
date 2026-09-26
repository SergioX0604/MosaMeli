// Usa la instancia global de Supabase
const sc = window.supabaseClient;
let usuarioActual = null;

// ================== INICIALIZACIÓN ==================
window.addEventListener('load', async function() {
    const { data: { user } } = await sc.auth.getUser();
    
    if (!user) {
        // Si no hay sesión, redirigir a login
        window.location.href = 'login.html';
        return;
    }
    
    usuarioActual = user;
    
    // Cargar datos del perfil
    await cargarPerfil(user);
    
    // Cargar contenido de las tabs
    cargarPedidos(user);
    cargarResenas(user);
    cargarFavoritos(user);
});

// ================== CARGAR PERFIL ==================
async function cargarPerfil(user) {
    const { data: perfil } = await sc
        .from('perfiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
    
    let nombre = perfil?.username || user.email.split('@')[0];
    nombre = nombre.replace(/_\d+$/, '');
    
    document.getElementById('perfilNombre').textContent = nombre;
    document.getElementById('perfilEmail').textContent = user.email;
    document.getElementById('perfilAvatar').textContent = nombre.charAt(0).toUpperCase();
}

// ================== CAMBIAR TABS ==================
function cambiarTab(tab, boton) {
    // Actualizar botón activo
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');
    
    // Mostrar tab correspondiente
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// ================== CARGAR PEDIDOS ==================
async function cargarPedidos(user) {
    const contenedor = document.getElementById('tab-pedidos');
    
    const { data, error } = await sc
        .from('pedidos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('fecha', { ascending: false });
    
    if (error || !data || data.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <h3>Aún no tienes pedidos</h3>
                <p>Cuando realices tu primera compra, aquí verás el historial completo.</p>
                <a href="index.html" class="btn-action">
                    <i class="fas fa-store"></i> Ir a la tienda
                </a>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = data.map(pedido => {
        const estado = pedido.estado || 'pedido_recibido';
        const { texto, clase, icono } = infoEstado(estado);
        const fecha = new Date(pedido.fecha).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        
        return `
            <div class="pedido-item" onclick="window.location.href='seguimiento.html?codigo=${pedido.codigo_seguimiento}'">
                <div class="pedido-header">
                    <div>
                        <div class="pedido-codigo">#${pedido.codigo_seguimiento}</div>
                        <div class="pedido-fecha"><i class="far fa-calendar"></i> ${fecha}</div>
                    </div>
                    <div class="pedido-total">S/ ${Number(pedido.total).toFixed(2)}</div>
                </div>
                <div class="pedido-estado ${clase}">
                    <i class="fas ${icono}"></i> ${texto}
                </div>
            </div>
        `;
    }).join('');
}

function infoEstado(estado) {
    const estados = {
        'pedido_recibido': { texto: 'Pedido recibido', clase: 'estado-recibido', icono: 'fa-clock' },
        'pago_verificado': { texto: 'Pago verificado', clase: 'estado-verificado', icono: 'fa-check-circle' },
        'en_preparacion': { texto: 'En preparación', clase: 'estado-preparacion', icono: 'fa-box' },
        'en_camino': { texto: 'En camino', clase: 'estado-camino', icono: 'fa-truck' },
        'entregado': { texto: 'Entregado', clase: 'estado-entregado', icono: 'fa-home' }
    };
    return estados[estado] || estados['pedido_recibido'];
}

// ================== CARGAR RESEÑAS ==================
async function cargarResenas(user) {
    const contenedor = document.getElementById('tab-resenas');
    
    const { data, error } = await sc
        .from('resenas')
        .select('*, productos(nombre, imagen)')
        .eq('usuario_id', user.id)
        .order('fecha', { ascending: false });
    
    if (error || !data || data.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h3>Aún no has escrito reseñas</h3>
                <p>Comparte tu opinión sobre los productos que compraste y ayuda a otros clientes.</p>
                <a href="index.html" class="btn-action">
                    <i class="fas fa-pen"></i> Escribir mi primera reseña
                </a>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = data.map(resena => {
        const estrellas = '★'.repeat(resena.calificacion) + '☆'.repeat(5 - resena.calificacion);
        const fecha = new Date(resena.fecha).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
        const aprobada = resena.aprobada 
            ? '<span style="color: #4CAF50; font-size: 0.7rem; font-weight: 600;">✅ Publicada</span>'
            : '<span style="color: #FF9800; font-size: 0.7rem; font-weight: 600;">⏳ Pendiente</span>';
        
        return `
            <div class="resena-item">
                <div class="resena-header">
                    <div class="resena-producto">
                        ${resena.productos?.nombre || 'Producto'}
                    </div>
                    <div class="resena-stars">${estrellas}</div>
                </div>
                <p class="resena-texto">"${resena.comentario || 'Sin comentario'}"</p>
                <div class="resena-fecha">
                    <i class="far fa-calendar"></i> ${fecha} · ${aprobada}
                </div>
            </div>
        `;
    }).join('');
}

// ================== CARGAR FAVORITOS ==================
async function cargarFavoritos(user) {
    const contenedor = document.getElementById('tab-favoritos');
    
    // Los favoritos se guardan en localStorage por ahora
    const favoritos = JSON.parse(localStorage.getItem('mosameli_favoritos') || '[]');
    
    if (favoritos.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>Aún no tienes favoritos</h3>
                <p>Toca el ícono ⭐ en cualquier producto para guardarlo aquí y encontrarlo fácilmente.</p>
                <a href="index.html" class="btn-action">
                    <i class="fas fa-store"></i> Explorar productos
                </a>
            </div>
        `;
        return;
    }
    
    // Cargar detalles de los productos favoritos
    const { data, error } = await sc
        .from('productos')
        .select('*')
        .in('id', favoritos);
    
    if (error || !data || data.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>No pudimos cargar tus favoritos</h3>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = `
        <div class="favoritos-grid">
            ${data.map(p => `
                <div class="favorito-card" onclick="window.location.href='index.html';">
                    <img src="${p.imagen}" alt="${p.nombre}">
                    <div class="favorito-info">
                        <h4>${p.nombre}</h4>
                        <div class="favorito-precio">S/ ${Number(p.precio).toFixed(2)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}