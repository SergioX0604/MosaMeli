// Usa la instancia global de Supabase
const sc = window.supabaseClient;

// Variables globales
let productos = [];
let carrito = [];
let metodoPagoElegido = null;
let categoriasActivas = [];
let filtroPrecioMax = 300;
let soloDisponibles = false;

// ================== CONFIGURACIÓN DE HORARIOS Y ENTREGAS ==================
const CONFIG_ENTREGAS = {
    // Horario de atención (formato 24h)
    horarioAtencion: {
        apertura: 10,  // 10:00 am
        cierre: 20     // 8:00 pm
    },
    
    // Día de entregas (0=domingo, 1=lunes, ..., 6=sábado)
    diaDeEntrega: 6,  // Sábado
    
    // Días mínimos de preparación
    diasPreparacion: 2
};

// ================== CONFIGURACIÓN DE DELIVERY ==================
const CONFIG_DELIVERY = {
    // ⚠️ Coordenadas desplazadas para proteger la ubicación exacta del negocio
    // Se movió ~600m del punto exacto para difuminar la ubicación
    origen: {
        lat: -11.9726,       // Coordenada desplazada (NO la exacta)
        lng: -76.7790,       // Coordenada desplazada (NO la exacta)
        nombre: 'Zona de cobertura MosaMeli - Chaclacayo'
    },
    
    // Zonas de delivery por radio
    zonas: [
        { radio: 2,  costo: 5.00,  color: '#4CAF50', nombre: 'Zona 1 - Chaclacayo Centro' },
        { radio: 4,  costo: 7.00,  color: '#FFC107', nombre: 'Zona 2 - Chaclacayo Cercano' },
        { radio: 7,  costo: 10.00, color: '#FF9800', nombre: 'Zona 3 - Chaclacayo Alto' },
        { radio: 10, costo: 15.00, color: '#F44336', nombre: 'Zona 4 - Chosica / Ricardo Palma' }
    ],
    
        // Regalo sorpresa desde este monto
    regaloDesde: 150.00
};

let mapaDelivery = null;
let marcadorCliente = null;
let circulosZonas = [];
let costoDeliverySeleccionado = 0;
let distanciaDelivery = 0;
let direccionClienteSeleccionada = '';
let notasDeliveryActual = '';
let direccionesGuardadasUsuario = [];
let direccionPrincipalUsuario = null;

// Variables del modal de producto
let productoActual = null;
let imagenActualIndex = 0;
let cantidadProducto = 1;
window.mediaProducto = [];

// Variables de velocidad
let velocidadActual = 1;

// Variables de volumen
let isDraggingVolume = false;
let volumeEventsInitialized = false;

// Variables de reseñas
let ratingSeleccionado = 0;

// ================== DATOS DE PAGO ==================
const DATOS_PAGO = {
    plin: {
        qr: 'https://res.cloudinary.com/uj9d2ddz/image/upload/q_auto,f_auto,w_400/v1789582950/PLIN.jpg',
        titular: 'Melissa Judith Morillas Salinas'
    },
    yape: {
        qr: null,
        titular: 'Sergio Antonio Sebastián Espinal Morillas'
    },
    transferencia: {
        banco: 'Interbank',
        tipoCuenta: 'Cuenta de Ahorros',
        numeroCuenta: '200 3042372035',
        cci: '00320001304237203533',
        titular: 'Melissa Judith Morillas Salinas'
    }
};

// ================== CARGAR PRODUCTOS ==================
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '<p style="text-align:center; padding:50px; grid-column: 1/-1;">Cargando productos...</p>';

    const { data, error } = await sc.from('productos').select('*').order('id');
    if (error) {
        console.error(error);
        grid.innerHTML = `<p style="text-align:center; padding:50px; grid-column: 1/-1;">❌ No se pudo conectar</p>`;
        return;
    }

    productos = data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        precio: p.precio,
        imagen: p.imagen,
        stock: p.stock,
        descripcion: p.descripcion,
        caracteristicas: p.caracteristicas,
        imagenes_extra: p.imagenes_extra,
        video_url: p.video_url,
        marca: p.marca,
        garantia: p.garantia
    }));
    renderProductos();
}

// ================== RENDER PRODUCTOS ==================
function renderProductos() {
    const grid = document.getElementById('productGrid');
    const title = document.getElementById('categoryTitle');
    const count = document.getElementById('productCount');

    let productosFiltrados = productos;
    if (categoriasActivas.length > 0) productosFiltrados = productosFiltrados.filter(p => categoriasActivas.includes(p.categoria));
    productosFiltrados = productosFiltrados.filter(p => p.precio <= filtroPrecioMax);
    if (soloDisponibles) productosFiltrados = productosFiltrados.filter(p => p.stock > 0);

    if (categoriasActivas.length === 0) title.textContent = 'Todos los productos';
    else if (categoriasActivas.length === 1) {
        const nombre = categoriasActivas[0];
        title.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    } else title.textContent = 'Varios productos';
    count.textContent = `${productosFiltrados.length} productos`;

        grid.innerHTML = productosFiltrados.map(p => `
        <div class="product-card">
            <button class="btn-favorito" onclick="event.stopPropagation(); toggleFavorito(${p.id}, this)" title="Añadir a favoritos">
                <i class="far fa-star"></i>
            </button>
            <img src="${p.imagen}" class="product-image" onclick="abrirProducto(${p.id})" style="cursor:pointer;">
            <div class="product-info">
                <h3>${p.nombre}</h3>
                <div class="price-container">
                    <span class="current-price">S/ ${p.precio.toFixed(2)}</span>
                </div>
                <p class="shipping-info"><i class="fas fa-gift"></i> Regalo sorpresa</p>
                <button class="btn-buy-now" onclick="buyNow(${p.id})">Comprar ahora</button>
                <button class="btn-add-cart" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>
            </div>
        </div>
    `).join('');

    // Marcar los que ya son favoritos
    actualizarEstrellasFavoritos();

    if (productosFiltrados.length === 0) grid.innerHTML = '<p style="text-align:center; padding:50px; grid-column: 1/-1;">No se encontraron productos 😔</p>';
}

// ================== FILTROS ==================
function syncFilterUI() {
    document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.remove('active');
        const onclick = btn.getAttribute('onclick') || '';
        if (categoriasActivas.length === 0 && onclick.includes('showAll()')) btn.classList.add('active');
        else if (onclick.includes('showCategory')) {
            const match = onclick.match(/'([^']+)'/);
            if (match && categoriasActivas.includes(match[1])) btn.classList.add('active');
        }
    });
    document.querySelectorAll('.filter-cat').forEach(checkbox => {
        checkbox.checked = categoriasActivas.includes(checkbox.value);
    });
}

function showAll() { categoriasActivas = []; syncFilterUI(); renderProductos(); }

function showCategory(categoria) {
    const index = categoriasActivas.indexOf(categoria);
    if (index > -1) categoriasActivas.splice(index, 1);
    else categoriasActivas.push(categoria);
    syncFilterUI();
    renderProductos();
}

function clearFilters() {
    categoriasActivas = [];
    filtroPrecioMax = 300;
    soloDisponibles = false;
    document.querySelectorAll('.filter-cat').forEach(checkbox => checkbox.checked = false);
    document.getElementById('filterStock').checked = false;
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange) priceRange.value = 300;
    if (priceValue) priceValue.textContent = '300';
    syncFilterUI();
    renderProductos();
}

function searchProducts() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    const grid = document.getElementById('productGrid');
    const title = document.getElementById('categoryTitle');
    const count = document.getElementById('productCount');

    const resultados = productos.filter(p => p.nombre.toLowerCase().includes(query) || p.categoria.toLowerCase().includes(query));
    title.textContent = `Resultados para "${query}"`;
    count.textContent = `${resultados.length} productos`;

    grid.innerHTML = resultados.map(p => `
        <div class="product-card">
            <img src="${p.imagen}" class="product-image" onclick="abrirProducto(${p.id})" style="cursor:pointer;">
            <div class="product-info">
                <h3>${p.nombre}</h3>
                <div class="price-container">
                    <span class="current-price">S/ ${p.precio.toFixed(2)}</span>
                </div>
                <button class="btn-buy-now" onclick="buyNow(${p.id})">Comprar ahora</button>
                <button class="btn-add-cart" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>
            </div>
        </div>
    `).join('');

    if (resultados.length === 0) grid.innerHTML = '<p style="text-align:center; padding:50px;">No se encontraron productos</p>';
}

function initFilterEvents() {
    document.querySelectorAll('.filter-cat').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) categoriasActivas.push(e.target.value);
            else {
                const index = categoriasActivas.indexOf(e.target.value);
                if (index > -1) categoriasActivas.splice(index, 1);
            }
            syncFilterUI();
            renderProductos();
        });
    });

    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            filtroPrecioMax = parseInt(e.target.value);
            priceValue.textContent = filtroPrecioMax;
            renderProductos();
        });
    }

    const filterStock = document.getElementById('filterStock');
    if (filterStock) {
        filterStock.addEventListener('change', (e) => {
            soloDisponibles = e.target.checked;
            renderProductos();
        });
    }
}

function toggleFilters() {
    const sidebar = document.getElementById('filtersSidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('visible');
    const btn = document.querySelector('.mobile-filter-btn');
    if (!btn) return;
    btn.innerHTML = sidebar.classList.contains('visible')
        ? '<i class="fas fa-times"></i> Ocultar filtros'
        : '<i class="fas fa-filter"></i> Mostrar filtros';
}

// ================== CARRITO ==================
function getCartKey() { return 'cart_guest'; }
function saveCart() { localStorage.setItem(getCartKey(), JSON.stringify(carrito)); updateCartCount(); }
function loadCart() { const c = localStorage.getItem(getCartKey()); if (c) { carrito = JSON.parse(c); updateCartCount(); } }

function addToCart(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) { showToast("Producto no encontrado"); return; }
    if (producto.stock <= 0) { showToast("Producto agotado"); return; }
    
    // ✅ Validar cuántas unidades ya están en el carrito
    const enCarrito = carrito.filter(i => i.id === productoId).length;
    if (enCarrito >= producto.stock) {
        showToast(`⚠️ Solo hay ${producto.stock} unidades disponibles`);
        return;
    }
    
    carrito.push(producto);
    saveCart();
    showToast(`✅ ${producto.nombre} agregado`);
}

function buyNow(productoId) {
    const producto = productos.find(p => p.id === productoId);
    carrito = [producto];
    saveCart();
    viewCart();
}

function viewCart() {
    const modal = document.getElementById('cartModal');
    const itemsDiv = document.getElementById('cartItems');
    
    if (carrito.length === 0) {
        itemsDiv.innerHTML = '<p style="text-align:center; padding:20px;">Tu carrito está vacío</p>';
        modal.style.display = 'flex';
        return;
    }
    
    const subtotal = totalCarrito();
    const total = subtotal + costoDeliverySeleccionado;
    const faltante = calcularFaltanteRegalo();
    
    itemsDiv.innerHTML = carrito.map((item, index) => `
        <div class="cart-item">
            <span>${item.nombre}</span>
            <span>S/ ${item.precio.toFixed(2)}</span>
            <button onclick="removeFromCart(${index})"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('');
    
        // Aviso de regalo sorpresa 🎁
    let avisoRegalo = '';
    if (faltante !== null && faltante > 0) {
        avisoRegalo = `
            <div style="background: linear-gradient(135deg, #FFF8E1 0%, #FFF3C4 100%); 
                        border-left: 4px solid #FFC107; border-radius: 10px; 
                        padding: 12px 15px; margin-top: 12px; 
                        display: flex; align-items: center; gap: 10px;
                        font-size: 0.85rem; color: #F57C00;">
                <i class="fas fa-gift" style="font-size: 1.3rem;"></i>
                <span>Te faltan <strong>S/ ${faltante.toFixed(2)}</strong> para recibir un <strong>regalo sorpresa</strong> 🎁</span>
            </div>
        `;
    } else if (faltante === null) {
        avisoRegalo = `
            <div style="background: linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%); 
                        border-left: 4px solid #9C27B0; border-radius: 10px; 
                        padding: 12px 15px; margin-top: 12px; 
                        display: flex; align-items: center; gap: 10px;
                        font-size: 0.85rem; color: #6A1B9A;">
                <i class="fas fa-gift" style="font-size: 1.3rem;"></i>
                <span>¡Felicidades! Tienes un <strong>regalo sorpresa</strong> 🎁</span>
            </div>
        `;
    }
    
    // 🆕 #13 - Aviso de validación de zona
    let avisoZona = '';
    const validacion = validarZonaAntesDeCheckout();
    if (!validacion.valido) {
        const onclickAccion = validacion.accion ? `onclick="${validacion.accion}" style="cursor:pointer;"` : '';
        avisoZona = `
            <div class="aviso-zona ${validacion.tipo}" ${onclickAccion}>
                <i class="fas fa-${validacion.tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${validacion.mensaje}</span>
            </div>
        `;
    }
    
    // 🆕 Mostrar notas si existen
    let mostrarNotas = '';
    if (notasDeliveryActual) {
        mostrarNotas = `
            <div style="background: #F5F0FA; border-radius: 10px; padding: 10px 15px; 
                        margin-top: 10px; font-size: 0.8rem; color: #7A6A8C;
                        display: flex; align-items: flex-start; gap: 8px;">
                <i class="fas fa-pencil-alt" style="color: #9B7FD4; margin-top: 2px;"></i>
                <div>
                    <strong style="color: #7E57C2;">Notas para el repartidor:</strong><br>
                    ${notasDeliveryActual}
                </div>
            </div>
        `;
    }
    
    itemsDiv.innerHTML += `
        <div class="cart-summary">
            <div class="linea">
                <span>Subtotal</span>
                <span>S/ ${subtotal.toFixed(2)}</span>
            </div>
            <div class="linea">
                <span>Delivery</span>
                <span>${costoDeliverySeleccionado > 0 ? `S/ ${costoDeliverySeleccionado.toFixed(2)}` : 'Por calcular'}</span>
            </div>
            <div class="linea total">
                <span>Total</span>
                <span>S/ ${total.toFixed(2)}</span>
            </div>
        </div>
        ${avisoRegalo}
        ${avisoZona}
        ${mostrarNotas}
        <button class="btn-ver-mapa" onclick="abrirMapa()">
            <i class="fas fa-map-marked-alt"></i> Ver mapa de delivery
        </button>
    `;
    
    modal.style.display = 'flex';
}

function removeFromCart(index) { carrito.splice(index, 1); saveCart(); viewCart(); }
function updateCartCount() { document.getElementById('cartCount').textContent = carrito.length; }
function totalCarrito() { return carrito.reduce((sum, item) => sum + item.precio, 0); }
function closeCart() { document.getElementById('cartModal').style.display = 'none'; }

// ================== MODAL DE DETALLE DE PRODUCTO ==================
async function abrirProducto(productoId) {
    productoActual = productos.find(p => p.id === productoId);
    if (!productoActual) return;
    
    cantidadProducto = 1;
    document.getElementById('productQuantity').value = 1;
    
    document.getElementById('productDetailName').textContent = productoActual.nombre;
    document.getElementById('productBrand').textContent = productoActual.marca || 'MosaMeli';
    document.getElementById('productDetailPrice').textContent = `S/ ${productoActual.precio.toFixed(2)}`;
    
    document.getElementById('productDescription').textContent = 
        productoActual.descripcion || 'Producto de alta calidad seleccionado por MosaMeli.';
    
    const featuresDiv = document.getElementById('productFeatures');
    if (productoActual.caracteristicas) {
        const features = typeof productoActual.caracteristicas === 'string' 
            ? JSON.parse(productoActual.caracteristicas) 
            : productoActual.caracteristicas;
        featuresDiv.innerHTML = Object.entries(features).map(([key, value]) => `
            <div class="feature-item">
                <strong>${key}</strong>
                <span>${value}</span>
            </div>
        `).join('');
    } else {
        featuresDiv.innerHTML = '';
    }
    
    document.getElementById('productWarranty').textContent = productoActual.garantia || 'Garantía de 30 días';
    
    const media = [];
    media.push({ tipo: 'imagen', url: productoActual.imagen });
    
    if (productoActual.imagenes_extra) {
        const extras = typeof productoActual.imagenes_extra === 'string'
            ? JSON.parse(productoActual.imagenes_extra)
            : productoActual.imagenes_extra;
        extras.forEach(url => media.push({ tipo: 'imagen', url: url }));
    }
    
    if (productoActual.video_url) {
        media.push({ tipo: 'video', url: productoActual.video_url });
    }
    
    window.mediaProducto = media;
    imagenActualIndex = 0;
    
    mostrarMedia(0);
    
    const thumbnails = document.getElementById('productThumbnails');
    thumbnails.innerHTML = media.map((item, i) => {
        if (item.tipo === 'video') {
            return `
                <div class="thumbnail video-thumb ${i === 0 ? 'active' : ''}" onclick="mostrarMedia(${i})">
                    <video src="${item.url}" muted preload="metadata"></video>
                    <div class="play-icon"><i class="fas fa-play"></i></div>
                </div>
            `;
        } else {
            return `
                <div class="thumbnail ${i === 0 ? 'active' : ''}" onclick="mostrarMedia(${i})">
                    <img src="${item.url}" alt="Miniatura ${i + 1}">
                </div>
            `;
        }
    }).join('');
    
    await cargarResenas(productoActual.id);
    
    document.getElementById('productModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => initImageZoom(), 100);
}

function mostrarMedia(index) {
    if (!window.mediaProducto.length) return;
    imagenActualIndex = index;
    
    const item = window.mediaProducto[index];
    const img = document.getElementById('productMainImage');
    const wrapper = document.getElementById('videoWrapper');
    const video = document.getElementById('productVideo');
    const container = document.getElementById('imageZoomContainer');
    
    const volContainer = document.querySelector('.volume-slider-container');
    if (volContainer) volContainer.classList.remove('volume-active');
    
    if (item.tipo === 'video') {
        img.style.display = 'none';
        wrapper.style.display = 'flex';
        video.src = item.url;
        video.load();
        video.playbackRate = velocidadActual;
        container.style.cursor = 'default';
        
        setTimeout(() => initVideoControls(), 100);
    } else {
        wrapper.style.display = 'none';
        video.pause();
        video.src = '';
        img.style.display = 'block';
        img.src = item.url;
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center center';
        container.style.cursor = 'zoom-in';
    }
    
    document.querySelectorAll('.thumbnail').forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });
}

function prevImage() {
    if (!window.mediaProducto.length) return;
    const newIndex = (imagenActualIndex - 1 + window.mediaProducto.length) % window.mediaProducto.length;
    mostrarMedia(newIndex);
}

function nextImage() {
    if (!window.mediaProducto.length) return;
    const newIndex = (imagenActualIndex + 1) % window.mediaProducto.length;
    mostrarMedia(newIndex);
}

function increaseQuantity() {
    cantidadProducto++;
    document.getElementById('productQuantity').value = cantidadProducto;
}

function decreaseQuantity() {
    if (cantidadProducto > 1) {
        cantidadProducto--;
        document.getElementById('productQuantity').value = cantidadProducto;
    }
}

function addToCartFromModal() {
    if (!productoActual) return;
    
    // ✅ Validar stock total
    const enCarrito = carrito.filter(i => i.id === productoActual.id).length;
    const totalSolicitado = enCarrito + cantidadProducto;
    
    if (totalSolicitado > productoActual.stock) {
        showToast(`⚠️ Solo hay ${productoActual.stock} unidades disponibles`);
        return;
    }
    
    for (let i = 0; i < cantidadProducto; i++) {
        carrito.push(productoActual);
    }
    saveCart();
    showToast(`✅ ${cantidadProducto} x ${productoActual.nombre}`);
    closeProductModal();
}

function buyNowFromModal() {
    if (!productoActual) return;
    
    if (cantidadProducto > productoActual.stock) {
        showToast(`⚠️ Solo hay ${productoActual.stock} unidades disponibles`);
        return;
    }
    
    carrito = [];
    for (let i = 0; i < cantidadProducto; i++) {
        carrito.push(productoActual);
    }
    saveCart();
    closeProductModal();
    viewCart();
}

function closeProductModal() {
    const video = document.getElementById('productVideo');
    if (video) {
        video.pause();
        video.src = '';
    }
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    productoActual = null;
}

// ================== SISTEMA DE RESEÑAS ==================
async function cargarResenas(productoId) {
    const { data, error } = await sc
        .from('resenas')
        .select('*')
        .eq('producto_id', productoId)
        .eq('aprobada', true)
        .order('fecha', { ascending: false });

    if (error) {
        console.error('Error al cargar reseñas:', error);
        return;
    }

    const reviewsList = document.getElementById('reviewsList');
    const averageRating = document.getElementById('averageRating');
    const averageStars = document.getElementById('averageStars');
    const reviewsCount = document.getElementById('reviewsCount');

    if (!data || data.length === 0) {
        reviewsList.innerHTML = '<p class="no-reviews">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';
        averageRating.textContent = '0.0';
        averageStars.textContent = '☆☆☆☆☆';
        reviewsCount.textContent = '0';
        return;
    }

    const total = data.reduce((sum, r) => sum + r.calificacion, 0);
    const promedio = (total / data.length).toFixed(1);
    
    averageRating.textContent = promedio;
    averageStars.textContent = generarEstrellas(Math.round(promedio));
    reviewsCount.textContent = data.length;

    reviewsList.innerHTML = data.map(resena => `
        <div class="review-item">
            <div class="review-header">
                <span class="review-author">
                    <i class="fas fa-user-circle"></i> ${resena.usuario_nombre}
                </span>
                <span class="review-stars">${generarEstrellas(resena.calificacion)}</span>
            </div>
            <p class="review-text">${resena.comentario || 'Sin comentario'}</p>
            <p class="review-date">${formatearFecha(resena.fecha)}</p>
        </div>
    `).join('');
}

function generarEstrellas(cantidad) {
    let estrellas = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= cantidad) estrellas += '★';
        else estrellas += '☆';
    }
    return estrellas;
}

function formatearFecha(fecha) {
    const d = new Date(fecha);
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('es-PE', opciones);
}

function abrirModalResena() {
    if (!productoActual) return;
    
    sc.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
            closeProductModal();
            mostrarModalRegistroObligatorio();
            return;
        }
        
        ratingSeleccionado = 0;
        document.getElementById('reviewText').value = '';
        document.getElementById('charCount').textContent = '0';
        document.querySelectorAll('#starsInput i').forEach(star => {
            star.classList.remove('fas', 'active');
            star.classList.add('far');
        });
        
        document.getElementById('reviewModal').style.display = 'flex';
    });
}

function cerrarModalResena() {
    document.getElementById('reviewModal').style.display = 'none';
}

function setRating(rating) {
    ratingSeleccionado = rating;
    const stars = document.querySelectorAll('#starsInput i');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas', 'active');
        } else {
            star.classList.remove('fas', 'active');
            star.classList.add('far');
        }
    });
}

document.addEventListener('input', (e) => {
    if (e.target.id === 'reviewText') {
        document.getElementById('charCount').textContent = e.target.value.length;
    }
});

async function enviarResena() {
    if (!productoActual) return;
    
    if (ratingSeleccionado === 0) {
        showToast("⚠️ Selecciona una calificación con estrellas");
        return;
    }
    
    const comentario = document.getElementById('reviewText').value.trim();
    
    if (comentario.length < 10) {
        showToast("⚠️ Escribe al menos 10 caracteres en tu reseña");
        return;
    }

    const btn = document.getElementById('btnSubmitReview');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const { data: { user } } = await sc.auth.getUser();
        if (!user) {
            closeModalResena();
            mostrarModalRegistroObligatorio();
            return;
        }

        const { data: perfil } = await sc
            .from('perfiles')
            .select('username')
            .eq('id', user.id)
            .single();

        const usuarioNombre = perfil?.username || user.email.split('@')[0];

        const { error } = await sc.from('resenas').insert([{
            producto_id: productoActual.id,
            usuario_id: user.id,
            usuario_nombre: usuarioNombre,
            calificacion: ratingSeleccionado,
            comentario: comentario,
            aprobada: false
        }]);

        if (error) throw error;

        document.querySelector('.review-modal-content').innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #7E57C2; margin-bottom: 15px;">¡Gracias por tu reseña!</h2>
                <p style="color: #4A3A5C; line-height: 1.6; margin-bottom: 20px;">
                    Tu opinión es muy valiosa para nosotros. 
                    Será revisada por nuestro equipo antes de publicarse.
                </p>
            </div>
        `;

        setTimeout(() => {
            cerrarModalResena();
            setTimeout(() => {
                if (productoActual) {
                    abrirProducto(productoActual.id);
                }
            }, 300);
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        showToast("❌ Error al enviar reseña: " + error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar reseña';
    }
}

// ================== CONTROLES DE VIDEO ==================
function initVideoControls() {
    const video = document.getElementById('productVideo');
    const wrapper = document.getElementById('videoWrapper');
    const progressBar = document.getElementById('progressBar');
    const videoTime = document.getElementById('videoTime');
    const playPauseIcon = document.getElementById('playPauseIcon');
    
    if (!video || !wrapper) return;
    
    video.removeEventListener('timeupdate', handleTimeUpdate);
    video.removeEventListener('play', handleVideoPlay);
    video.removeEventListener('pause', handleVideoPause);
    video.removeEventListener('loadedmetadata', handleVideoLoaded);
    video.removeEventListener('click', togglePlayPause);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('loadedmetadata', handleVideoLoaded);
    video.addEventListener('click', togglePlayPause);
    
    function handleTimeUpdate() {
        if (video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressBar.style.width = percent + '%';
            videoTime.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
        }
    }
    
    function handleVideoPlay() {
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
    }
    
    function handleVideoPause() {
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    }
    
    function handleVideoLoaded() {
        videoTime.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
    }
    
    let hideTimeout;
    wrapper.addEventListener('mousemove', () => {
        wrapper.classList.add('controls-visible');
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (!video.paused) {
                wrapper.classList.remove('controls-visible');
            }
        }, 3000);
    });
    
    wrapper.addEventListener('mouseleave', () => {
        if (!video.paused) {
            wrapper.classList.remove('controls-visible');
        }
    });
    
    video.volume = 1;
    video.muted = false;
    actualizarSliderVolumen(1);
    actualizarIconoVolumen(1);
    
    const volContainer = document.querySelector('.volume-slider-container');
    if (volContainer) volContainer.classList.remove('volume-active');
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function togglePlayPause() {
    const video = document.getElementById('productVideo');
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function seekVideo(e) {
    const video = document.getElementById('productVideo');
    const progress = e.currentTarget;
    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
}

function toggleFullscreen() {
    const wrapper = document.getElementById('videoWrapper');
    if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// ================== VELOCIDAD ==================
function toggleSpeedMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('speedMenu');
    menu.classList.toggle('active');
}

function setSpeed(speed) {
    const video = document.getElementById('productVideo');
    const label = document.getElementById('speedLabel');
    const options = document.querySelectorAll('.speed-option');
    
    velocidadActual = speed;
    video.playbackRate = speed;
    label.textContent = speed + 'x';
    
    options.forEach(opt => {
        opt.classList.remove('active');
        if (parseFloat(opt.textContent) === speed) {
            opt.classList.add('active');
        }
    });
    
    document.getElementById('speedMenu').classList.remove('active');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('speedMenu');
    const selector = document.querySelector('.speed-selector');
    if (menu && selector && !selector.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// ================== CONTROL DE VOLUMEN ==================
function initVolumeControl() {
    if (volumeEventsInitialized) return;
    volumeEventsInitialized = true;
    
    const slider = document.getElementById('volumeSlider');
    const container = document.querySelector('.volume-slider-container');
    const volumeControl = document.querySelector('.volume-control');
    
    if (!slider || !container || !volumeControl) return;
    
    slider.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDraggingVolume = true;
        setVolumeFromClick(e);
        container.classList.add('volume-active');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDraggingVolume) {
            e.preventDefault();
            setVolumeFromClick(e);
            container.classList.add('volume-active');
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDraggingVolume) {
            isDraggingVolume = false;
            setTimeout(() => {
                if (!container.matches(':hover') && !volumeControl.matches(':hover')) {
                    container.classList.remove('volume-active');
                }
            }, 500);
        }
    });
    
    container.addEventListener('mouseenter', () => {
        container.classList.add('volume-active');
    });
    
    container.addEventListener('mouseleave', () => {
        if (!isDraggingVolume) {
            setTimeout(() => {
                if (!container.matches(':hover') && !volumeControl.matches(':hover')) {
                    container.classList.remove('volume-active');
                }
            }, 300);
        }
    });
    
    volumeControl.addEventListener('mouseenter', () => {
        container.classList.add('volume-active');
    });
    
    volumeControl.addEventListener('mouseleave', () => {
        if (!isDraggingVolume) {
            setTimeout(() => {
                if (!container.matches(':hover') && !volumeControl.matches(':hover')) {
                    container.classList.remove('volume-active');
                }
            }, 300);
        }
    });
    
    slider.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDraggingVolume = true;
        setVolumeFromTouch(e);
        container.classList.add('volume-active');
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (isDraggingVolume) {
            e.preventDefault();
            setVolumeFromTouch(e);
        }
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
        if (isDraggingVolume) {
            isDraggingVolume = false;
            setTimeout(() => {
                container.classList.remove('volume-active');
            }, 1500);
        }
    });
}

function toggleMute() {
    const video = document.getElementById('productVideo');
    const icon = document.getElementById('volumeIcon');
    const container = document.querySelector('.volume-slider-container');
    
    video.muted = !video.muted;
    
    if (video.muted) {
        icon.classList.remove('fa-volume-up', 'fa-volume-down');
        icon.classList.add('fa-volume-mute');
        actualizarSliderVolumen(0);
    } else {
        icon.classList.remove('fa-volume-mute');
        if (video.volume > 0.5) {
            icon.classList.add('fa-volume-up');
        } else {
            icon.classList.add('fa-volume-down');
        }
        actualizarSliderVolumen(video.volume);
    }
    
    if (container) container.classList.add('volume-active');
}

function setVolumeFromClick(e) {
    const video = document.getElementById('productVideo');
    const slider = document.getElementById('volumeSlider');
    const rect = slider.getBoundingClientRect();
    
    const clickY = e.clientY - rect.top;
    const volume = Math.max(0, Math.min(1, 1 - (clickY / rect.height)));
    
    video.volume = volume;
    video.muted = volume === 0;
    actualizarSliderVolumen(volume);
    actualizarIconoVolumen(volume);
}

function setVolumeFromTouch(e) {
    const video = document.getElementById('productVideo');
    const slider = document.getElementById('volumeSlider');
    const rect = slider.getBoundingClientRect();
    const touch = e.touches[0];
    
    const clickY = touch.clientY - rect.top;
    const volume = Math.max(0, Math.min(1, 1 - (clickY / rect.height)));
    
    video.volume = volume;
    video.muted = volume === 0;
    actualizarSliderVolumen(volume);
    actualizarIconoVolumen(volume);
}

function actualizarSliderVolumen(volume) {
    const fill = document.getElementById('volumeFill');
    const thumb = document.getElementById('volumeThumb');
    const percent = document.getElementById('volumePercent');
    
    if (!fill || !thumb || !percent) return;
    
    const percentValue = Math.round(volume * 100);
    fill.style.height = percentValue + '%';
    thumb.style.bottom = percentValue + '%';
    percent.textContent = percentValue + '%';
}

function actualizarIconoVolumen(volume) {
    const icon = document.getElementById('volumeIcon');
    if (!icon) return;
    
    icon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-mute');
    
    if (volume === 0) {
        icon.classList.add('fa-volume-mute');
    } else if (volume < 0.5) {
        icon.classList.add('fa-volume-down');
    } else {
        icon.classList.add('fa-volume-up');
    }
}

// ================== ZOOM EN IMÁGENES ==================
let zoomLevel = 1;

function initImageZoom() {
    const container = document.getElementById('imageZoomContainer');
    const img = document.getElementById('productMainImage');
    if (!container || !img) return;
    
    container.removeEventListener('mousemove', handleMouseMove);
    container.removeEventListener('mouseleave', handleMouseLeave);
    container.removeEventListener('click', handleImageClick);
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleImageClick);
    
    let lastTap = 0;
    container.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            openFullscreenImage();
        }
        lastTap = currentTime;
    });
}

function handleMouseMove(e) {
    const container = document.getElementById('imageZoomContainer');
    const img = document.getElementById('productMainImage');
    
    if (img.style.display === 'none') return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(1.8)';
    container.style.cursor = 'zoom-out';
}

function handleMouseLeave() {
    const img = document.getElementById('productMainImage');
    const container = document.getElementById('imageZoomContainer');
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = 'center center';
    container.style.cursor = 'zoom-in';
}

function handleImageClick() {
    const img = document.getElementById('productMainImage');
    if (img.style.display === 'none') return;
    openFullscreenImage();
}

// ================== PANTALLA COMPLETA ==================
function openFullscreenImage() {
    const img = document.getElementById('productMainImage');
    const modal = document.getElementById('imageFullscreenModal');
    const fullscreenImg = document.getElementById('fullscreenImage');
    
    if (img.style.display === 'none' || !img.src) return;
    
    fullscreenImg.src = img.src;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    zoomLevel = 1;
    fullscreenImg.style.transform = 'scale(1)';
}

function closeFullscreenImage() {
    const modal = document.getElementById('imageFullscreenModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    zoomLevel = 1;
}

function zoomIn(e) {
    if (e) e.stopPropagation();
    zoomLevel = Math.min(zoomLevel + 0.3, 3);
    updateFullscreenTransform();
}

function zoomOut(e) {
    if (e) e.stopPropagation();
    zoomLevel = Math.max(zoomLevel - 0.3, 0.5);
    updateFullscreenTransform();
}

function resetZoom(e) {
    if (e) e.stopPropagation();
    zoomLevel = 1;
    updateFullscreenTransform();
}

function updateFullscreenTransform() {
    const img = document.getElementById('fullscreenImage');
    img.style.transform = `scale(${zoomLevel})`;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeFullscreenImage();
        closeProductModal();
        cerrarModalResena();
    }
});

// ================== CHECKOUT ==================
async function openCheckout() {
    if (carrito.length === 0) { showToast("Tu carrito está vacío"); return; }
    
    const { data: { user } } = await sc.auth.getUser();
    if (!user) { closeCart(); mostrarModalRegistroObligatorio(); return; }
    
    closeCart();
    document.getElementById('opciones-pago').style.display = 'block';
    document.getElementById('instrucciones-pago').style.display = 'none';
    document.getElementById('checkoutModal').style.display = 'flex';
}

function mostrarModalRegistroObligatorio() {
    document.getElementById('registerRequiredModal').style.display = 'flex';
}

function closeRegisterRequired() {
    document.getElementById('registerRequiredModal').style.display = 'none';
}

function irARegistro() { window.location.href = 'login.html?action=register'; }
function irALogin() { window.location.href = 'login.html'; }

function seleccionarMetodo(metodo) {
    metodoPagoElegido = metodo;
    document.getElementById('opciones-pago').style.display = 'none';
    document.getElementById('instrucciones-pago').style.display = 'block';

    const titulo = document.getElementById('titulo-instrucciones');
    const detalle = document.getElementById('detalle-instrucciones');
    const total = totalCarrito().toFixed(2);

    // Aviso de transparencia común
    const avisoConfianza = `
        <div class="trust-badge">
            <div class="trust-icon"><i class="fas fa-shield-alt"></i></div>
            <div class="trust-text">
                <strong>Pago 100% seguro a MosaMeli</strong>
                <p>Tu pago se procesa directamente a nombre de <strong>${metodo === 'transferencia' ? DATOS_PAGO.transferencia.titular : DATOS_PAGO[metodo].titular}</strong>, titular de MosaMeli. No compartimos tus datos con terceros.</p>
            </div>
        </div>
    `;

    if (metodo === 'plin') {
        titulo.textContent = '📱 Paga con Plin';
        detalle.innerHTML = avisoConfianza + `
            <p class="qr-instructions">Total a pagar:</p>
            <p class="qr-total">S/ ${total}</p>
            <p class="qr-instructions">1. Abre <strong>Plin</strong></p>
            <p class="qr-instructions">2. Escanea este código QR:</p>
            <div class="qr-container">
                <img src="${DATOS_PAGO.plin.qr}" alt="QR de Plin">
            </div>
            <p class="qr-instructions">3. Ingresa el monto: <strong>S/ ${total}</strong></p>
            <p class="qr-instructions">4. Confirma el pago</p>
            <div class="aviso-pago">
                <i class="fas fa-info-circle"></i>
                Verificaremos tu pago en las próximas 24 horas. Recibirás un correo con tu código de seguimiento.
            </div>
        `;
    } else if (metodo === 'yape') {
        if (DATOS_PAGO.yape.qr) {
            titulo.textContent = '💜 Paga con Yape';
            detalle.innerHTML = avisoConfianza + `
                <p class="qr-instructions">Total a pagar:</p>
                <p class="qr-total">S/ ${total}</p>
                <p class="qr-instructions">1. Abre <strong>Yape</strong></p>
                <p class="qr-instructions">2. Escanea este código QR:</p>
                <div class="qr-container">
                    <img src="${DATOS_PAGO.yape.qr}" alt="QR de Yape">
                </div>
                <p class="qr-instructions">3. Ingresa el monto: <strong>S/ ${total}</strong></p>
                <p class="qr-instructions">4. Confirma el pago</p>
                <div class="aviso-pago">
                    <i class="fas fa-info-circle"></i>
                    Verificaremos tu pago en las próximas 24 horas.
                </div>
            `;
        } else {
            titulo.textContent = '💜 Paga con Yape';
            detalle.innerHTML = avisoConfianza + `
                <div class="aviso-pago">
                    <i class="fas fa-clock"></i>
                    <strong>Estamos habilitando Yape.</strong>
                    Por el momento, usa <strong>Plin</strong> o <strong>Transferencia</strong>.
                </div>
            `;
        }
    } else if (metodo === 'transferencia') {
        titulo.textContent = '🏦 Transferencia Interbank';
        detalle.innerHTML = avisoConfianza + `
            <p class="qr-instructions">Total a transferir:</p>
            <p class="qr-total">S/ ${total}</p>
            
            <div class="datos-bancarios">
                <h4><i class="fas fa-university"></i> Datos de la cuenta</h4>
                <div class="dato-item">
                    <span>Banco</span>
                    <span>${DATOS_PAGO.transferencia.banco}</span>
                </div>
                <div class="dato-item">
                    <span>Tipo de cuenta</span>
                    <span>${DATOS_PAGO.transferencia.tipoCuenta}</span>
                </div>
                <div class="dato-item">
                    <span>Número de cuenta</span>
                    <span>${DATOS_PAGO.transferencia.numeroCuenta}</span>
                </div>
                <div class="dato-item">
                    <span>CCI</span>
                    <span>${DATOS_PAGO.transferencia.cci}
                        <button class="btn-copy" onclick="copiarDato('${DATOS_PAGO.transferencia.cci}')">Copiar</button>
                    </span>
                </div>
                <div class="dato-item">
                    <span>Titular</span>
                    <span>${DATOS_PAGO.transferencia.titular}</span>
                </div>
            </div>
            
            <div class="aviso-pago">
                <i class="fas fa-info-circle"></i>
                Verificaremos tu transferencia en las próximas 24 horas.
            </div>
        `;
    }
}

function copiarDato(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        showToast("✅ Copiado al portapapeles");
    });
}

async function confirmarPago() {
    // ✅ Validar carrito
    if (carrito.length === 0) { 
        showToast("Tu carrito está vacío"); 
        return; 
    }
    
    // ✅ Validar método de pago
    if (!metodoPagoElegido) {
        showToast("⚠️ Selecciona un método de pago");
        volverOpciones();
        return;
    }
    
    // ✅ Validar delivery (siempre obligatorio ahora)
    if (!direccionClienteSeleccionada) {
        showToast("⚠️ Por favor, selecciona tu ubicación en el mapa de delivery");
        abrirMapa();
        return;
    }

    // ✅ Validar sesión
    const { data: { user } } = await sc.auth.getUser();
    if (!user) { 
        closeCheckout(); 
        mostrarModalRegistroObligatorio(); 
        return; 
    }
    
    // ✅ VALIDAR STOCK ANTES DE PROCESAR
    const cantidades = {};
    carrito.forEach(item => {
        cantidades[item.id] = (cantidades[item.id] || 0) + 1;
    });
    
    for (const [id, cantidad] of Object.entries(cantidades)) {
        const producto = productos.find(p => p.id == id);
        if (!producto) {
            showToast(`⚠️ Un producto ya no está disponible`);
            return;
        }
        if (producto.stock < cantidad) {
            showToast(`⚠️ Stock insuficiente para ${producto.nombre} (quedan ${producto.stock})`);
            return;
        }
    }
    
    // Obtener perfil
    const { data: perfil } = await sc.from('perfiles')
        .select('username')
        .eq('id', user.id)
        .single();
    
    const clienteNombre = perfil?.username || user.email.split('@')[0];
    const subtotal = totalCarrito();
    const totalFinal = subtotal + costoDeliverySeleccionado;
    
    // Generar código de seguimiento
    const codigoSeguimiento = 'MOSA-' + 
        new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + 
        Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // Insertar pedido
    const { data: pedido, error } = await sc.from('pedidos').insert([
        { 
            usuario_id: user.id, 
            items: carrito, 
            total: totalFinal,
            metodo_pago: metodoPagoElegido,
            estado: 'pedido_recibido',
            codigo_seguimiento: codigoSeguimiento,
            cliente_nombre: clienteNombre,
            cliente_email: user.email,
            costo_delivery: costoDeliverySeleccionado,
            distancia_delivery: distanciaDelivery,
            direccion_cliente: direccionClienteSeleccionada,
            notas_delivery: notasDeliveryActual || null,
            tiene_regalo: totalFinal >= CONFIG_DELIVERY.regaloDesde
        }
    ]).select().single();
    if (error) { 
        showToast("Error al guardar pedido: " + error.message); 
        return; 
    }

    // ✅ DESCONTAR STOCK CORRECTAMENTE (agrupado por producto)
    for (const [id, cantidad] of Object.entries(cantidades)) {
        const producto = productos.find(p => p.id == id);
        if (producto) {
            await sc.from('productos')
                .update({ stock: producto.stock - cantidad })
                .eq('id', id);
        }
    }

    // Enviar correo de confirmación
    try {
        await sc.functions.invoke('enviar-confirmacion', {
            body: {
                cliente_email: user.email,
                cliente_nombre: clienteNombre,
                pedido_id: pedido.id,
                codigo_seguimiento: codigoSeguimiento,
                items: carrito,
                total: totalFinal,
                subtotal: subtotal,                          // ✅
                costo_delivery: costoDeliverySeleccionado,   // ✅
                metodo_pago: metodoPagoElegido,
                direccion: direccionClienteSeleccionada,     // ✅
                tiene_regalo: totalFinal >= CONFIG_DELIVERY.regaloDesde  // ✅
            }
        });
    } catch (e) {
        console.error("Error al enviar correo:", e);
    }

    // Obtener información del mensaje según horario
    const infoEntrega = obtenerMensajeEntrega();
    
    // Mostrar mensaje de éxito
    const detalle = document.getElementById('detalle-instrucciones');
    detalle.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div style="font-size: 4rem; margin-bottom: 20px;">${infoEntrega.emoji}</div>
            <h3 style="color: #7E57C2; margin-bottom: 15px;">${infoEntrega.titulo}</h3>
            <p style="color: #4A3A5C; line-height: 1.6; margin-bottom: 20px;">
                ${infoEntrega.mensaje}
            </p>
            <div style="background: #F5F0FA; border-radius: 12px; padding: 15px; margin: 20px 0;">
                <p style="color: #7A6A8C; font-size: 0.85rem; margin-bottom: 5px;">
                    Tu código de seguimiento:
                </p>
                <p style="color: #7E57C2; font-size: 1.2rem; font-weight: 700; letter-spacing: 1px;">
                    ${codigoSeguimiento}
                </p>
                <button class="btn-copy" onclick="copiarDato('${codigoSeguimiento}')" style="margin-top: 10px;">
                    📋 Copiar código
                </button>
            </div>
            <p style="color: #7A6A8C; font-size: 0.85rem;">
                📧 Te enviamos un correo con el enlace de seguimiento.
            </p>
        </div>
    `;
    
    document.querySelector('.confirmar-pago-btn').style.display = 'none';
    document.querySelector('.volver-btn').textContent = 'Cerrar';

    // Limpiar carrito y delivery
    carrito = [];
    saveCart();
    costoDeliverySeleccionado = 0;
    distanciaDelivery = 0;
    direccionClienteSeleccionada = '';
    metodoPagoElegido = null;
    notasDeliveryActual = '';
    
    setTimeout(() => {
        document.getElementById('checkoutModal').style.display = 'none';
        loadProducts();
        document.querySelector('.confirmar-pago-btn').style.display = 'block';
        document.querySelector('.volver-btn').textContent = 'Volver';
    }, 8000);
}

function volverOpciones() {
    document.getElementById('opciones-pago').style.display = 'block';
    document.getElementById('instrucciones-pago').style.display = 'none';
}

function closeCheckout() { 
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.style.display = 'none';
    
    const btnConfirmar = document.querySelector('.confirmar-pago-btn');
    if (btnConfirmar) btnConfirmar.style.display = 'block';
    
    const btnVolver = document.querySelector('.volver-btn');
    if (btnVolver) btnVolver.textContent = 'Volver';
    
    // Resetear método de pago al cerrar
    metodoPagoElegido = null;
}

// ================== TOAST ==================
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="event.stopPropagation(); this.parentElement.remove();">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);
    const timeout = setTimeout(() => { cerrarToast(toast); }, 4000);
    toast.addEventListener('click', () => {
        clearTimeout(timeout);
        cerrarToast(toast);
    });
}

function cerrarToast(toast) {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
}

// ================== SISTEMA DE MAPA DE DELIVERY ==================
let routingControl = null;
let direccionTextoActual = '';

function abrirMapa() {
    document.getElementById('mapModal').style.display = 'flex';
    
    // Resetear el botón de confirmar
    const btnConfirmar = document.getElementById('btnConfirmarUbicacion');
    if (btnConfirmar) btnConfirmar.style.display = 'flex';
    
    setTimeout(() => {
        initMapa();
        cargarDireccionesGuardadas();
        
        // 🆕 Mostrar mensaje de ayuda
        setTimeout(() => mostrarMensajeAyuda(), 500);
        
        // 🆕 Configurar ocultar mensaje al interactuar
        setTimeout(() => configurarOcultarMensajeAlInteractuar(), 600);
        
        setTimeout(() => intentarGeolocalizacion(), 800);
    }, 100);
}

function cerrarMapa() {
    document.getElementById('mapModal').style.display = 'none';
}

// Detectar si es móvil
function esDispositivoMovil() {
    return window.innerWidth <= 768 || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0);
}

function initMapa() {
    if (mapaDelivery) {
        mapaDelivery.invalidateSize();
        return;
    }
    
    const origen = CONFIG_DELIVERY.origen;
    const esMovil = esDispositivoMovil();
    
    // Crear el mapa
    mapaDelivery = L.map('map', {
        zoomControl: !esMovil,           // En móvil sin botones +/- (más limpio)
        attributionControl: true
    }).setView([origen.lat, origen.lng], 13);
    
    // Tiles de CartoDB
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    }).addTo(mapaDelivery);
    
    // Círculo centro (privacidad)
    L.circle([origen.lat, origen.lng], {
        radius: 500,
        color: '#7E57C2',
        fillColor: '#9B7FD4',
        fillOpacity: 0.3,
        weight: 3
    }).addTo(mapaDelivery).bindPopup(`
        <div style="text-align: center;">
            <strong style="color: #7E57C2;">Zona de cobertura MosaMeli</strong><br>
            <small style="color: #666;">Chaclacayo, Lima</small>
        </div>
    `);
    
    // Zonas
    CONFIG_DELIVERY.zonas.slice().reverse().forEach(zona => {
        const circulo = L.circle([origen.lat, origen.lng], {
            radius: zona.radio * 1000,
            color: zona.color,
            fillColor: zona.color,
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(mapaDelivery);
        
        circulo.bindPopup(`
            <div style="text-align: center;">
                <strong style="color: ${zona.color};">${zona.nombre}</strong><br>
                Hasta ${zona.radio} km<br>
                <strong style="color: #7E57C2;">Costo: S/ ${zona.costo.toFixed(2)}</strong>
            </div>
        `);
        circulosZonas.push(circulo);
    });
    
    setTimeout(() => mapaDelivery.invalidateSize(), 300);
    
    // ================== COMPORTAMIENTO SEGÚN DISPOSITIVO ==================
    if (esMovil) {
        // 📱 MÓVIL: pin fijo al centro, arrastrar mapa
        mapaDelivery.on('move', function() {
            document.getElementById('deliveryResult').style.display = 'none';
            document.getElementById('badgeZona').style.display = 'none';
        });
    } else {
        // 💻 DESKTOP: comportamiento actual (clic para colocar)
        mapaDelivery.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            direccionTextoActual = '';
            document.getElementById('direccionSeleccionada').style.display = 'none';
            colocarMarcador(lat, lng, false);
        });
    }
}

// ================== 🆕 CONFIRMAR UBICACIÓN EN MÓVIL ==================
function confirmarUbicacionCentral() {
    if (!mapaDelivery) return;
    
    // Obtener el centro del mapa
    const centro = mapaDelivery.getCenter();
    const lat = centro.lat;
    const lng = centro.lng;
    
    // Ocultar el botón momentáneamente
    document.getElementById('btnConfirmarUbicacion').style.display = 'none';
    
    // Procesar la ubicación
    direccionTextoActual = '';
    document.getElementById('direccionSeleccionada').style.display = 'none';
    
    // Procesar ubicación (sin crear marcador, solo calcular)
    procesarUbicacionMovil(lat, lng);
}

// ================== PROCESAR UBICACIÓN EN MÓVIL (sin marcador visible) ==================
async function procesarUbicacionMovil(lat, lng) {
    const origen = CONFIG_DELIVERY.origen;
    
    // Mostrar spinner
    document.getElementById('calculandoRuta').style.display = 'flex';
    document.getElementById('badgeZona').style.display = 'none';
    document.getElementById('deliveryResult').style.display = 'none';
    
    // Calcular distancia en línea recta
    const distanciaRecta = calcularDistancia(origen.lat, origen.lng, lat, lng);
    
    // Intentar obtener ruta real
    let distanciaReal = distanciaRecta;
    let tiempoEstimado = null;
    
    try {
        const ruta = await obtenerRutaReal(origen.lat, origen.lng, lat, lng);
        if (ruta) {
            distanciaReal = ruta.distancia;
            tiempoEstimado = ruta.tiempo;
        }
    } catch (e) {
        console.log('No se pudo obtener ruta real');
    }
    
    document.getElementById('calculandoRuta').style.display = 'none';
    
    // Guardar variables globales
    distanciaDelivery = distanciaReal;
    direccionClienteSeleccionada = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Calcular costo según zona
    const { costo, zonaNombre, color } = calcularCostoDelivery(distanciaReal);
    
    // 🆕 #7 - Recargo nocturno
    const { recargo } = calcularRecargo();
    
    costoDeliverySeleccionado = costo + recargo;
    
    // 🆕 #19 - Mostrar badge de zona
    const badge = document.getElementById('badgeZona');
    const textoZona = document.getElementById('textoZona');
    const precioZona = document.getElementById('precioZona');
    
    if (distanciaReal > 10) {
        // Fuera de cobertura
        textoZona.textContent = 'Fuera de cobertura';
        precioZona.textContent = '❌';
        badge.querySelector('.badge-zona-inner').style.background = 'linear-gradient(135deg, #E57373 0%, #D32F2F 100%)';
        badge.style.display = 'flex';
        costoDeliverySeleccionado = 0;
        direccionClienteSeleccionada = '';
    } else {
        textoZona.textContent = zonaNombre;
        if (recargo > 0) {
            precioZona.textContent = `S/ ${costo.toFixed(2)} + S/ ${recargo.toFixed(2)}`;
        } else {
            precioZona.textContent = `S/ ${costo.toFixed(2)}`;
        }
        badge.querySelector('.badge-zona-inner').style.background = color 
            ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` 
            : 'linear-gradient(135deg, #9B7FD4 0%, #F5A6B8 100%)';
        badge.style.display = 'flex';
    }
    
    // Mostrar resultado
    const resultDiv = document.getElementById('deliveryResult');
    const costDiv = document.getElementById('deliveryCost');
    const tiempoDiv = document.getElementById('deliveryTiempo');
    
        if (distanciaReal > 10) {
        costDiv.innerHTML = `<span style="color: #D32F2F;">Fuera de cobertura</span>`;
        tiempoDiv.innerHTML = `<i class="fas fa-phone"></i> Contáctanos por WhatsApp al 937 309 837`;
    } else {
        let texto = `S/ ${costoDeliverySeleccionado.toFixed(2)}`;
        if (recargo > 0) {
            texto += ` <small style="font-size: 0.75rem;">(incluye recargo nocturno S/ ${recargo.toFixed(2)})</small>`;
        }
        costDiv.innerHTML = texto;
        tiempoDiv.innerHTML = `<i class="fas fa-clock"></i> ${tiempoEstimado || estimarTiempo(distanciaReal)}`;
    }
    
    resultDiv.style.display = 'block';
    
    // Mostrar la dirección como texto (usando reverse geocoding gratuito)
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MosaMeli/1.0' } });
        const data = await res.json();
        
        if (data && data.display_name) {
            document.getElementById('textoDireccionSeleccionada').textContent = data.display_name;
            document.getElementById('direccionSeleccionada').style.display = 'flex';
        } else {
            document.getElementById('textoDireccionSeleccionada').textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
            document.getElementById('direccionSeleccionada').style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('textoDireccionSeleccionada').textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        document.getElementById('direccionSeleccionada').style.display = 'flex';
    }
    
    // Volver a mostrar el botón de confirmar
    document.getElementById('btnConfirmarUbicacion').style.display = 'flex';
}

// ================== GEOLOCALIZACIÓN AUTOMÁTICA (#1) ==================
function intentarGeolocalizacion() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            
            // Solo centrar si está dentro de un rango razonable (20 km del origen)
            const distancia = calcularDistancia(
                CONFIG_DELIVERY.origen.lat, 
                CONFIG_DELIVERY.origen.lng, 
                latitude, 
                longitude
            );
            
            if (distancia <= 20 && mapaDelivery) {
                mapaDelivery.setView([latitude, longitude], 15);
                // Colocar marcador automáticamente
                setTimeout(() => {
                    if (!marcadorCliente) {
                        colocarMarcador(latitude, longitude, true);
                    }
                }, 500);
            }
        },
        (err) => console.log('Geolocalización no disponible:', err.message),
        { timeout: 5000, enableHighAccuracy: false }
    );
}

// ================== BUSCAR POR DIRECCIÓN (#2) ==================
let timeoutBusqueda = null;

document.addEventListener('input', (e) => {
    if (e.target.id === 'buscarDireccion') {
        clearTimeout(timeoutBusqueda);
        const query = e.target.value.trim();
        
        if (query.length < 4) {
            document.getElementById('sugerenciasDireccion').style.display = 'none';
            return;
        }
        
        timeoutBusqueda = setTimeout(() => buscarSugerencias(query), 500);
    }
});

async function buscarSugerencias(query) {
    try {
        // Sesgar la búsqueda a Chaclacayo (viewbox)
        const origen = CONFIG_DELIVERY.origen;
        const viewbox = `${origen.lng - 0.1},${origen.lat - 0.1},${origen.lng + 0.1},${origen.lat + 0.1}`;
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=0&limit=5&addressdetails=1&accept-language=es`;
        
        const res = await fetch(url, {
            headers: { 'User-Agent': 'MosaMeli/1.0' }
        });
        const data = await res.json();
        
        const contenedor = document.getElementById('sugerenciasDireccion');
        
        if (!data || data.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencia-item" style="color: #7A6A8C; cursor: default;">
                    <i class="fas fa-info-circle"></i>
                    <span>No encontramos esa dirección. Prueba con otra o haz clic en el mapa.</span>
                </div>
            `;
            contenedor.style.display = 'block';
            return;
        }
        
        contenedor.innerHTML = data.map(item => `
            <div class="sugerencia-item" onclick='seleccionarSugerencia(${item.lat}, ${item.lon}, ${JSON.stringify(item.display_name)})'>
                <i class="fas fa-map-marker-alt"></i>
                <span>${item.display_name}</span>
            </div>
        `).join('');
        
        contenedor.style.display = 'block';
    } catch (err) {
        console.error('Error buscando dirección:', err);
    }
}

function seleccionarSugerencia(lat, lng, direccion) {
    document.getElementById('sugerenciasDireccion').style.display = 'none';
    document.getElementById('buscarDireccion').value = '';
    
    direccionTextoActual = direccion;
    
    mapaDelivery.setView([lat, lng], 16);
    colocarMarcador(parseFloat(lat), parseFloat(lng), false);
}

async function buscarDireccion() {
    const query = document.getElementById('buscarDireccion').value.trim();
    if (!query) return;
    await buscarSugerencias(query);
}

function usarMiUbicacion() {
    if (!navigator.geolocation) {
        showToast("⚠️ Tu navegador no soporta geolocalización");
        return;
    }
    
    const btn = document.getElementById('btnMiUbicacion');
    if (btn) btn.classList.add('cargando');
    
    showToast("📍 Obteniendo tu ubicación...");
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            
            if (btn) btn.classList.remove('cargando');
            
            // Ocultar mensaje de ayuda
            ocultarMensajeAyuda();
            
            // Centrar mapa
            if (mapaDelivery) {
                mapaDelivery.setView([latitude, longitude], 16);
                
                if (esDispositivoMovil()) {
                    // En móvil: procesar después de centrar
                    setTimeout(() => procesarUbicacionMovil(latitude, longitude), 500);
                } else {
                    // En desktop: colocar marcador
                    setTimeout(() => colocarMarcador(latitude, longitude, true), 300);
                }
            }
            
            showToast("✅ Ubicación detectada");
        },
        (err) => {
            if (btn) btn.classList.remove('cargando');
            showToast("❌ No pudimos obtener tu ubicación. Marca en el mapa.");
            console.error(err);
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

// ================== COLOCAR MARCADOR ARRASTRABLE (#4) ==================
function colocarMarcador(lat, lng, esAutomatico = false) {
    const origen = CONFIG_DELIVERY.origen;
    
    if (marcadorCliente) {
        mapaDelivery.removeLayer(marcadorCliente);
    }
    
    const iconoCliente = L.divIcon({
        className: 'custom-icon-cliente',
        html: '<div style="background: #F44336; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 12px rgba(244,67,54,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    
    marcadorCliente = L.marker([lat, lng], { 
        icon: iconoCliente,
        draggable: true
    }).addTo(mapaDelivery);
    
    marcadorCliente.on('dragend', function(e) {
        const nuevaPos = e.target.getLatLng();
        procesarUbicacion(nuevaPos.lat, nuevaPos.lng, false);
    });
    
    procesarUbicacion(lat, lng, esAutomatico);
    
    // 🆕 Guardar dirección automáticamente
    if (direccionTextoActual) {
        guardarDireccionActual(lat, lng, direccionTextoActual);
    }
}

// ================== PROCESAR UBICACIÓN (con ruta real #5 y spinner #20) ==================
async function procesarUbicacion(lat, lng, esAutomatico) {
    const origen = CONFIG_DELIVERY.origen;
    
    // 🆕 #20 - Mostrar spinner
    document.getElementById('calculandoRuta').style.display = 'flex';
    document.getElementById('badgeZona').style.display = 'none';
    document.getElementById('deliveryResult').style.display = 'none';
    
    // Calcular distancia en línea recta
    const distanciaRecta = calcularDistancia(origen.lat, origen.lng, lat, lng);
    
    // 🆕 #5 - Intentar obtener ruta real
    let distanciaReal = distanciaRecta;
    let tiempoEstimado = null;
    
    try {
        const ruta = await obtenerRutaReal(origen.lat, origen.lng, lat, lng);
        if (ruta) {
            distanciaReal = ruta.distancia;
            tiempoEstimado = ruta.tiempo;
        }
    } catch (e) {
        console.log('No se pudo obtener ruta real, usando línea recta');
    }
    
    // Ocultar spinner
    document.getElementById('calculandoRuta').style.display = 'none';
    
    // Guardar variables globales
    distanciaDelivery = distanciaReal;
    direccionClienteSeleccionada = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Calcular costo según zona
    const { costo, zonaNombre, color } = calcularCostoDelivery(distanciaReal);
    
    // 🆕 #7 - Recargo nocturno
    const { recargo } = calcularRecargo();
    
    costoDeliverySeleccionado = costo + recargo;
    
    // 🆕 #19 - Mostrar badge de zona
    const badge = document.getElementById('badgeZona');
    const textoZona = document.getElementById('textoZona');
    const precioZona = document.getElementById('precioZona');
    
    if (distanciaReal > 10) {
        // Fuera de cobertura
        textoZona.textContent = 'Fuera de cobertura';
        precioZona.textContent = '❌';
        badge.querySelector('.badge-zona-inner').style.background = 'linear-gradient(135deg, #E57373 0%, #D32F2F 100%)';
        badge.style.display = 'flex';
        costoDeliverySeleccionado = 0;
        direccionClienteSeleccionada = '';
    } else {
        textoZona.textContent = zonaNombre;
        if (recargo > 0) {
            precioZona.textContent = `S/ ${costo.toFixed(2)} + S/ ${recargo.toFixed(2)}`;
        } else {
            precioZona.textContent = `S/ ${costo.toFixed(2)}`;
        }
        badge.querySelector('.badge-zona-inner').style.background = color 
            ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` 
            : 'linear-gradient(135deg, #9B7FD4 0%, #F5A6B8 100%)';
        badge.style.display = 'flex';
    }
    
    // Mostrar resultado final
    const resultDiv = document.getElementById('deliveryResult');
    const costDiv = document.getElementById('deliveryCost');
    const tiempoDiv = document.getElementById('deliveryTiempo');
    
        if (distanciaReal > 10) {
        costDiv.innerHTML = `<span style="color: #D32F2F;">Fuera de cobertura</span>`;
        tiempoDiv.innerHTML = `<i class="fas fa-phone"></i> Contáctanos por WhatsApp al 937 309 837`;
    } else {
        let texto = `S/ ${costoDeliverySeleccionado.toFixed(2)}`;
        if (recargo > 0) {
            texto += ` <small style="font-size: 0.75rem;">(incluye recargo nocturno S/ ${recargo.toFixed(2)})</small>`;
        }
        costDiv.innerHTML = texto;
        tiempoDiv.innerHTML = `<i class="fas fa-clock"></i> ${tiempoEstimado || estimarTiempo(distanciaReal)}`;
    }
    
    resultDiv.style.display = 'block';
    
    // Actualizar el texto de dirección
    if (direccionTextoActual) {
        document.getElementById('textoDireccionSeleccionada').textContent = direccionTextoActual;
        document.getElementById('direccionSeleccionada').style.display = 'flex';
    } else if (esAutomatico) {
        document.getElementById('textoDireccionSeleccionada').textContent = 'Tu ubicación actual';
        document.getElementById('direccionSeleccionada').style.display = 'flex';
    }
}

// ================== RUTA REAL CON OSRM (#5) ==================
async function obtenerRutaReal(lat1, lng1, lat2, lng2) {
    try {
        // OSRM público (gratis)
        const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            return null;
        }
        
        const ruta = data.routes[0];
        const distanciaKm = ruta.distance / 1000;
        const tiempoMin = Math.round(ruta.duration / 60);
        
        // Dibujar ruta en el mapa
        if (routingControl) {
            mapaDelivery.removeLayer(routingControl);
        }
        
        const coordenadas = ruta.geometry.coordinates.map(c => [c[1], c[0]]);
        
        routingControl = L.polyline(coordenadas, {
            color: '#9B7FD4',
            weight: 5,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(mapaDelivery);
        
        // Ajustar vista para mostrar toda la ruta
        mapaDelivery.fitBounds(routingControl.getBounds(), { padding: [30, 30] });
        
        return {
            distancia: distanciaKm,
            tiempo: tiempoMin < 60 
                ? `${tiempoMin} min` 
                : `${Math.floor(tiempoMin / 60)}h ${tiempoMin % 60}min`
        };
    } catch (err) {
        console.error('Error obteniendo ruta:', err);
        return null;
    }
}

// ================== ESTIMAR TIEMPO (fallback) ==================
function estimarTiempo(distancia) {
    const minutos = Math.round(15 + (distancia * 5));
    return `~${minutos} min`;
}

// ================== CÁLCULO DE COSTOS ==================
function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calcularCostoDelivery(distancia) {
    for (const zona of CONFIG_DELIVERY.zonas) {
        if (distancia <= zona.radio) {
            return { 
                costo: zona.costo, 
                zonaNombre: zona.nombre,
                color: zona.color
            };
        }
    }
    return { costo: 0, zonaNombre: 'Fuera de cobertura', color: '#E57373' };
}

// 🆕 #7 - Recargo nocturno
function calcularRecargo() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const dia = ahora.getDay(); // 0 = domingo
    
    // Recargo nocturno: después de las 8pm o antes de las 7am
    const esNocturno = hora >= 20 || hora < 7;
    // Recargo dominical
    const esDomingo = dia === 0;
    
    let recargo = 0;
    if (esNocturno) recargo += 3.00;
    if (esDomingo) recargo += 2.00;
    
    return { 
        recargo, 
        aplicaRecargo: recargo > 0,
        esNocturno,
        esDomingo
    };
}

// ================== APLICAR DELIVERY ==================
function aplicarDelivery() {
    if (!direccionClienteSeleccionada) {
        showToast("⚠️ Primero selecciona tu ubicación en el mapa");
        return;
    }
    
    // 🆕 Guardar notas de delivery
    const notasInput = document.getElementById('notasDelivery');
    notasDeliveryActual = notasInput ? notasInput.value.trim() : '';
    
    cerrarMapa();
    viewCart();
    showToast(`✅ Delivery aplicado: S/ ${costoDeliverySeleccionado.toFixed(2)}`);
}

function mostrarResumenCarrito() {
    viewCart();
}

// ================== 🆕 #10 y #11 - DIRECCIONES GUARDADAS ==================
async function cargarDireccionesGuardadas() {
    const { data: { user } } = await sc.auth.getUser();
    if (!user) return;
    
    const { data: perfil } = await sc
        .from('perfiles')
        .select('direccion_principal, direcciones_guardadas')
        .eq('id', user.id)
        .single();
    
    if (perfil) {
        direccionPrincipalUsuario = perfil.direccion_principal || null;
        direccionesGuardadasUsuario = perfil.direcciones_guardadas || [];
        renderizarDireccionesGuardadas();
    }
}

function renderizarDireccionesGuardadas() {
    const contenedor = document.getElementById('direccionesGuardadas');
    if (!contenedor) return;
    
    const todasLasDirecciones = [];
    
    // Agregar la principal primero (si existe)
    if (direccionPrincipalUsuario) {
        todasLasDirecciones.push({
            texto: direccionPrincipalUsuario.texto,
            lat: direccionPrincipalUsuario.lat,
            lng: direccionPrincipalUsuario.lng,
            esPrincipal: true
        });
    }
    
    // Agregar las guardadas
    direccionesGuardadasUsuario.forEach(dir => {
        // Evitar duplicados
        const yaExiste = todasLasDirecciones.some(d => 
            d.lat === dir.lat && d.lng === dir.lng
        );
        if (!yaExiste) todasLasDirecciones.push(dir);
    });
    
    if (todasLasDirecciones.length === 0) {
        contenedor.style.display = 'none';
        return;
    }
    
    contenedor.style.display = 'block';
    contenedor.innerHTML = `
        <h4><i class="fas fa-bookmark"></i> Tus direcciones guardadas</h4>
        ${todasLasDirecciones.map((dir, i) => `
            <div class="direccion-guardada-item" onclick="usarDireccionGuardada(${dir.lat}, ${dir.lng}, ${JSON.stringify(dir.texto)})">
                <i class="fas fa-${dir.esPrincipal ? 'star' : 'map-marker-alt'}"></i>
                <span class="texto-direccion">${dir.texto}</span>
                ${!dir.esPrincipal ? `
                    <button class="btn-eliminar-dir" onclick="event.stopPropagation(); eliminarDireccionGuardada(${i})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `).join('')}
    `;
}

async function usarDireccionGuardada(lat, lng, texto) {
    direccionTextoActual = texto;
    document.getElementById('buscarDireccion').value = '';
    document.getElementById('sugerenciasDireccion').style.display = 'none';
    
    if (esDispositivoMovil()) {
        // En móvil: mover mapa al centro y procesar
        mapaDelivery.setView([lat, lng], 16);
        setTimeout(() => {
            procesarUbicacionMovil(lat, lng);
        }, 400);
    } else {
        // En desktop: comportamiento normal
        mapaDelivery.setView([lat, lng], 16);
        colocarMarcador(lat, lng, false);
    }
}

function seleccionarSugerencia(lat, lng, direccion) {
    document.getElementById('sugerenciasDireccion').style.display = 'none';
    document.getElementById('buscarDireccion').value = '';
    
    direccionTextoActual = direccion;
    
    if (esDispositivoMovil()) {
        mapaDelivery.setView([lat, lng], 16);
        setTimeout(() => {
            procesarUbicacionMovil(parseFloat(lat), parseFloat(lng));
        }, 400);
    } else {
        mapaDelivery.setView([lat, lng], 16);
        colocarMarcador(parseFloat(lat), parseFloat(lng), false);
    }
}

async function eliminarDireccionGuardada(index) {
    if (!confirm('¿Eliminar esta dirección guardada?')) return;
    
    direccionesGuardadasUsuario.splice(index, 1);
    
    const { data: { user } } = await sc.auth.getUser();
    if (!user) return;
    
    await sc.from('perfiles')
        .update({ direcciones_guardadas: direccionesGuardadasUsuario })
        .eq('id', user.id);
    
    renderizarDireccionesGuardadas();
    showToast('🗑️ Dirección eliminada');
}

async function guardarDireccionActual(lat, lng, texto) {
    const { data: { user } } = await sc.auth.getUser();
    if (!user) return;
    
    // Si es la primera dirección, guardarla como principal
    if (!direccionPrincipalUsuario) {
        direccionPrincipalUsuario = { lat, lng, texto };
        await sc.from('perfiles')
            .update({ 
                direccion_principal: { lat, lng, texto },
                direcciones_guardadas: []
            })
            .eq('id', user.id);
        return;
    }
    
    // Verificar si ya existe
    const yaExiste = 
        (direccionPrincipalUsuario.lat === lat && direccionPrincipalUsuario.lng === lng) ||
        direccionesGuardadasUsuario.some(d => d.lat === lat && d.lng === lng);
    
    if (yaExiste) return;
    
    // Agregar al historial (máximo 5)
    direccionesGuardadasUsuario.unshift({ lat, lng, texto });
    if (direccionesGuardadasUsuario.length > 5) {
        direccionesGuardadasUsuario = direccionesGuardadasUsuario.slice(0, 5);
    }
    
    await sc.from('perfiles')
        .update({ direcciones_guardadas: direccionesGuardadasUsuario })
        .eq('id', user.id);
    
    renderizarDireccionesGuardadas();
}

// ================== 🆕 #14 - NOTAS DE DELIVERY ==================
document.addEventListener('input', (e) => {
    if (e.target.id === 'notasDelivery') {
        const contador = document.getElementById('contadorNotas');
        if (contador) contador.textContent = e.target.value.length;
    }
});

// ================== 🆕 #13 - VALIDAR ZONA ANTES DEL CHECKOUT ==================
function validarZonaAntesDeCheckout() {
    // Si no hay dirección seleccionada
    if (!direccionClienteSeleccionada) {
        return {
            valido: false,
            mensaje: '📍 Aún no has seleccionado tu ubicación de delivery. Haz clic aquí para elegirla en el mapa.',
            tipo: 'warning',
            accion: 'abrirMapa()'
        };
    }
    
    // Si está fuera de cobertura
    if (distanciaDelivery > 10) {
        return {
            valido: false,
            mensaje: '❌ Tu dirección está fuera de nuestra zona de cobertura (máx. 10 km). Contáctanos por WhatsApp al 937 309 837.',
            tipo: 'error'
        };
    }
    
    return { valido: true };
}

// ================== 🆕 #6 - AVISO DE REGALO GRATIS ==================
function calcularFaltanteRegalo() {
    const subtotal = totalCarrito();
    const regaloDesde = CONFIG_DELIVERY.regaloDesde;
    
    if (subtotal >= regaloDesde) return null;
    
    return regaloDesde - subtotal;
}   

// ================== 🆕 MENSAJE DE AYUDA EN EL MAPA ==================
function mostrarMensajeAyuda() {
    const mensaje = document.getElementById('mensajeAyudaMapa');
    if (!mensaje) return;
    
    // Verificar si es la primera vez que abre el mapa
    const yaVioAyuda = localStorage.getItem('mosameli_mapa_ayuda_vista');
    
    if (!yaVioAyuda && esDispositivoMovil()) {
        // Mostrar el mensaje
        mensaje.style.display = 'flex';
        mensaje.classList.remove('oculto');
        
        // Ocultarlo después de 4 segundos
        setTimeout(() => {
            ocultarMensajeAyuda();
            // Guardar que ya lo vio
            localStorage.setItem('mosameli_mapa_ayuda_vista', 'true');
        }, 4000);
    }
}

function ocultarMensajeAyuda() {
    const mensaje = document.getElementById('mensajeAyudaMapa');
    if (!mensaje) return;
    
    mensaje.classList.add('oculto');
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 400);
}

// Ocultar mensaje cuando el usuario interactúa con el mapa
function configurarOcultarMensajeAlInteractuar() {
    if (!mapaDelivery) return;
    
    mapaDelivery.on('movestart', () => {
        ocultarMensajeAyuda();
    });
    
    mapaDelivery.on('click', () => {
        ocultarMensajeAyuda();
    });
}

// ================== MENÚ DESPLEGABLE DE USUARIO (MÓVIL) ==================
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (!menu) return;
    menu.classList.toggle('active');
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    const userInfo = document.querySelector('.user-info');
    
    if (menu && menu.classList.contains('active') && userInfo && !userInfo.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// ================== INICIALIZACIÓN ==================
window.addEventListener('load', async function() {
    checkLoginStatus();
    await loadProducts();
    loadCart();
    initFilterEvents();
    setTimeout(() => initVolumeControl(), 500);
    
    // 🆕 Mostrar indicador de horario (permanente)
    setTimeout(() => actualizarIndicadorHorario(), 300);
    
    // 🆕 Mostrar mensaje de bienvenida (temporal)
    setTimeout(() => mostrarMensajeBienvenida(), 500);
        // 🆕 Inicializar scroll infinito de categorías
    setTimeout(() => inicializarScrollCategorias(), 300);
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

// ================== CERRAR SUGERENCIAS AL HACER CLIC FUERA ==================
document.addEventListener('click', (e) => {
    const sugerencias = document.getElementById('sugerenciasDireccion');
    const buscador = document.querySelector('.buscador-direccion');
    
    if (sugerencias && buscador && !buscador.contains(e.target)) {
        sugerencias.style.display = 'none';
    }
});
// ================== 🆕 RESET DEL MENSAJE DE AYUDA (para pruebas) ==================
// Ejecuta resetAyudaMapa() en la consola si quieres ver el mensaje otra vez
function resetAyudaMapa() {
    localStorage.removeItem('mosameli_mapa_ayuda_vista');
    console.log('✅ Ayuda del mapa reseteada. Recarga la página y abre el mapa.');
}

// ================== FUNCIONES DE HORARIOS Y ENTREGAS ==================

function estaDentroDeHorario() {
    const ahora = new Date();
    const hora = ahora.getHours();
    return hora >= CONFIG_ENTREGAS.horarioAtencion.apertura && 
        hora < CONFIG_ENTREGAS.horarioAtencion.cierre;
}

function obtenerProximoDiaEntrega() {
    const ahora = new Date();
    const diaActual = ahora.getDay();
    const diaEntrega = CONFIG_ENTREGAS.diaDeEntrega;
    
    // Calcular días hasta el próximo día de entrega
    let diasHasta = (diaEntrega - diaActual + 7) % 7;
    
    // Si ya pasó la hora de cierre hoy y el día de entrega es hoy, saltar a la próxima semana
    if (diasHasta === 0 && !estaDentroDeHorario()) {
        diasHasta = 7;
    }
    
    // Si es hoy pero ya cerró, sumar 7 días
    if (diasHasta === 0 && ahora.getHours() >= CONFIG_ENTREGAS.horarioAtencion.cierre) {
        diasHasta = 7;
    }
    
    // Asegurar mínimo de días de preparación
    if (diasHasta < CONFIG_ENTREGAS.diasPreparacion) {
        diasHasta += 7;
    }
    
    const proximaEntrega = new Date(ahora);
    proximaEntrega.setDate(ahora.getDate() + diasHasta);
    
    return proximaEntrega;
}

function formatearFechaEntrega(fecha) {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
}

function obtenerMensajeEntrega() {
    const proximaEntrega = obtenerProximoDiaEntrega();
    const fechaFormateada = formatearFechaEntrega(proximaEntrega);
    const dentroDeHorario = estaDentroDeHorario();
    
    // Mensaje base SIEMPRE
    let mensaje = `Te llegará a tu correo registrado el seguimiento de tu pedido.<br><br>
                📅 <strong>Recibirás tu pedido el ${fechaFormateada}</strong>.`;
    
    // Si está fuera de horario, agregar aviso al inicio
    if (!dentroDeHorario) {
        mensaje = `Tu pedido será procesado en el próximo horario de atención (10am - 8pm).<br><br>
                ${mensaje}`;
    }
    
    return {
        titulo: dentroDeHorario ? '¡Pedido confirmado!' : '¡Pedido registrado!',
        mensaje: mensaje,
        emoji: dentroDeHorario ? '🎉' : '📧'
    };
}

function actualizarIndicadorHorario() {
    const indicador = document.getElementById('indicadorHorario');
    if (!indicador) return;
    
    const abierto = estaDentroDeHorario();
    const emoji = indicador.querySelector('.horario-emoji');
    const estado = indicador.querySelector('.horario-estado');
    
    if (abierto) {
        // ☀️ ✓ Abierto
        emoji.textContent = '☀️';
        estado.textContent = '✓';
        indicador.classList.remove('cerrado');
        indicador.classList.add('abierto');
        indicador.title = 'Estamos abiertos (10am - 8pm)';
    } else {
        // 🌙 ✗ Cerrado
        emoji.textContent = '🌙';
        estado.textContent = '✗';
        indicador.classList.remove('abierto');
        indicador.classList.add('cerrado');
        indicador.title = 'Fuera de horario (10am - 8pm)';
    }
}

function mostrarMensajeBienvenida() {
    const mensaje = document.getElementById('mensajeBienvenida');
    if (!mensaje) return;
    
    // Mostrar siempre al entrar
    mensaje.style.display = 'flex';
    
    // Pequeño delay para que la animación se vea
    setTimeout(() => {
        mensaje.classList.add('visible');
    }, 100);
    
    // Ocultar automáticamente después de 4 segundos
    setTimeout(() => {
        mensaje.classList.remove('visible');
        setTimeout(() => {
            mensaje.style.display = 'none';
        }, 500);
    }, 4000);
}

function mostrarMensajeBienvenida() {
    const mensaje = document.getElementById('mensajeBienvenida');
    if (!mensaje) return;
    
    mensaje.style.display = 'flex';
    
    setTimeout(() => {
        mensaje.classList.add('visible');
    }, 100);
    
    // Función para ocultar
    const ocultar = () => {
        mensaje.classList.remove('visible');
        setTimeout(() => {
            mensaje.style.display = 'none';
        }, 400);
        document.removeEventListener('click', ocultar);
        document.removeEventListener('touchstart', ocultar);
    };
    
    // Ocultar al primer clic/touch del usuario
    document.addEventListener('click', ocultar, { once: true });
    document.addEventListener('touchstart', ocultar, { once: true });
    
    // Ocultar automáticamente después de 3 segundos
    setTimeout(ocultar, 3000);
}

// ================== FAVORITOS ==================
function toggleFavorito(productoId, boton) {
    let favoritos = JSON.parse(localStorage.getItem('mosameli_favoritos') || '[]');
    const index = favoritos.indexOf(productoId);
    
    if (index > -1) {
        favoritos.splice(index, 1);
        boton.querySelector('i').className = 'far fa-star';
        showToast('💔 Eliminado de favoritos');
    } else {
        favoritos.push(productoId);
        boton.querySelector('i').className = 'fas fa-star';
        showToast('⭐ Añadido a favoritos');
    }
    
    localStorage.setItem('mosameli_favoritos', JSON.stringify(favoritos));
}

function actualizarEstrellasFavoritos() {
    const favoritos = JSON.parse(localStorage.getItem('mosameli_favoritos') || '[]');
    document.querySelectorAll('.btn-favorito').forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        const match = onclick.match(/toggleFavorito\((\d+)/);
        if (match && favoritos.includes(parseInt(match[1]))) {
            btn.querySelector('i').className = 'fas fa-star';
        }
    });
}
// ================== SCROLL INFINITO DE CATEGORÍAS ==================
function inicializarScrollCategorias() {
    const scroll = document.getElementById('categoryScroll');
    const nav = document.getElementById('categoryNav');
    if (!scroll || !nav) return;

    // Duplicar las categorías para efecto infinito
    const contenidoOriginal = scroll.innerHTML;
    scroll.innerHTML = contenidoOriginal + contenidoOriginal;

    // Pausar cuando el usuario interactúa
    const pausar = () => scroll.classList.add('pausado');
    const reanudar = () => {
        setTimeout(() => {
            scroll.classList.remove('pausado');
        }, 3000); // Reanudar después de 3 segundos
    };

    // Detectar interacción táctil/mouse
    scroll.addEventListener('touchstart', pausar);
    scroll.addEventListener('touchend', reanudar);
    scroll.addEventListener('mouseenter', pausar);
    scroll.addEventListener('mouseleave', reanudar);
    scroll.addEventListener('mousedown', pausar);
    scroll.addEventListener('mouseup', reanudar);

    // Ajustar animación si es móvil
    if (window.innerWidth <= 768) {
        scroll.style.animation = 'scrollInfinito 30s linear infinite';
    }
}