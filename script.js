// Usa la instancia global de Supabase
const sc = window.supabaseClient;

// Variables globales
let productos = [];
let carrito = [];
let metodoPagoElegido = null;
let categoriasActivas = [];
let filtroPrecioMax = 300;
let soloDisponibles = false;

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
            <img src="${p.imagen}" class="product-image" onclick="abrirProducto(${p.id})" style="cursor:pointer;">
            <div class="product-info">
                <h3>${p.nombre}</h3>
                <div class="price-container">
                    <span class="current-price">S/ ${p.precio.toFixed(2)}</span>
                </div>
                <p class="shipping-info"><i class="fas fa-truck"></i> Envío gratis</p>
                <button class="btn-buy-now" onclick="buyNow(${p.id})">Comprar ahora</button>
                <button class="btn-add-cart" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>
            </div>
        </div>
    `).join('');

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
    if (producto.stock <= 0) { showToast("Producto agotado"); return; }
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
    if (carrito.length === 0) itemsDiv.innerHTML = '<p style="text-align:center; padding:20px;">Tu carrito está vacío</p>';
    else {
        itemsDiv.innerHTML = carrito.map((item, index) => `
            <div class="cart-item">
                <span>${item.nombre}</span>
                <span>S/ ${item.precio.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})"><i class="fas fa-trash-alt"></i></button>
            </div>
        `).join('') + `<h3 style="text-align:right; margin-top:15px;">Total: S/ ${totalCarrito().toFixed(2)}</h3>`;
    }
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
    for (let i = 0; i < cantidadProducto; i++) {
        carrito.push(productoActual);
    }
    saveCart();
    showToast(`✅ ${cantidadProducto} x ${productoActual.nombre}`);
    closeProductModal();
}

function buyNowFromModal() {
    if (!productoActual) return;
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
    const { data: { user } } = await sc.auth.getUser();
    if (!user) { 
        closeCheckout(); 
        mostrarModalRegistroObligatorio(); 
        return; 
    }

    // Obtener perfil del cliente
    const { data: perfil } = await sc.from('perfiles')
        .select('username')
        .eq('id', user.id)
        .single();
    
    const clienteNombre = perfil?.username || user.email.split('@')[0];
    
    // Generar código de seguimiento único
    const codigoSeguimiento = 'MOSA-' + 
        new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + 
        Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // Guardar el pedido
    const { data: pedido, error } = await sc.from('pedidos').insert([
        { 
            usuario_id: user.id, 
            items: carrito, 
            total: totalCarrito(),
            metodo_pago: metodoPagoElegido,
            estado: 'pedido_recibido',
            codigo_seguimiento: codigoSeguimiento,
            cliente_nombre: clienteNombre,
            cliente_email: user.email
        }
    ]).select().single();
    
    if (error) { 
        showToast("Error al guardar pedido: " + error.message); 
        return; 
    }

    // Descontar stock
    for (const item of carrito) {
        await sc.from('productos').update({ stock: item.stock - 1 }).eq('id', item.id);
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
                total: totalCarrito(),
                metodo_pago: metodoPagoElegido
            }
        });
    } catch (e) {
        console.error("Error al enviar correo:", e);
    }

    // Mostrar mensaje de éxito con código de seguimiento
    const detalle = document.getElementById('detalle-instrucciones');
    detalle.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
            <h3 style="color: #7E57C2; margin-bottom: 15px;">¡Pedido confirmado!</h3>
            <p style="color: #4A3A5C; line-height: 1.6; margin-bottom: 20px;">
                Recibirás tu pedido en <strong>2-3 días hábiles</strong>.
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

    carrito = [];
    saveCart();
    
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
    document.getElementById('checkoutModal').style.display = 'none';
    document.querySelector('.confirmar-pago-btn').style.display = 'block';
    document.querySelector('.volver-btn').textContent = 'Volver';
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

// ================== INICIALIZACIÓN ==================
window.onload = async function() {
    checkLoginStatus();
    await loadProducts();
    loadCart();
    initFilterEvents();
    setTimeout(() => initVolumeControl(), 500);
};

window.onclick = function(event) {
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
};