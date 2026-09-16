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
function abrirProducto(productoId) {
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

// ================== CONTROLES DE VIDEO ==================
function initVideoControls() {
    const video = document.getElementById('productVideo');
    const wrapper = document.getElementById('videoWrapper');
    const progressBar = document.getElementById('progressBar');
    const videoTime = document.getElementById('videoTime');
    const playPauseIcon = document.getElementById('playPauseIcon');
    
    if (!video || !wrapper) return;
    
    video.addEventListener('timeupdate', () => {
        if (video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressBar.style.width = percent + '%';
            videoTime.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
        }
    });
    
    video.addEventListener('play', () => {
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
    });
    
    video.addEventListener('pause', () => {
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    });
    
    video.addEventListener('loadedmetadata', () => {
        videoTime.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
    });
    
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
    
    video.addEventListener('click', togglePlayPause);
    
    // Inicializar volumen al 100%
    video.volume = 1;
    video.muted = false;
    actualizarSliderVolumen(1);
    actualizarIconoVolumen(1);
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
function toggleMute() {
    const video = document.getElementById('productVideo');
    const icon = document.getElementById('volumeIcon');
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
}

function setVolumeFromClick(e) {
    e.stopPropagation();
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

// Inicializar arrastre del slider de volumen
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('volumeSlider');
    if (!slider) return;
    
    let isDragging = false;
    
    slider.addEventListener('mousedown', (e) => {
        isDragging = true;
        setVolumeFromClick(e);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            setVolumeFromClick(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
});

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
    if (metodo === 'qr' && totalCarrito() < 6) {
        showToast("El monto mínimo para pagar con QR es S/ 6.00");
        return;
    }

    metodoPagoElegido = metodo;
    document.getElementById('opciones-pago').style.display = 'none';
    document.getElementById('instrucciones-pago').style.display = 'block';

    const titulo = document.getElementById('titulo-instrucciones');
    const detalle = document.getElementById('detalle-instrucciones');
    const total = totalCarrito().toFixed(2);
    const totalHTML = `<p style="font-size:1.2rem; font-weight:bold; color:#8E24AA; margin-bottom:15px; text-align:center;">Total a pagar: S/ ${total}</p>`;

    if (metodo === 'qr') {
        titulo.textContent = 'Escanea el QR';
        detalle.innerHTML = totalHTML + `<p style="text-align:center; color:#7A6A8C;">Generando QR de pago...</p>`;
        generarQRReal();
    } else if (metodo === 'tarjeta') {
        titulo.textContent = 'Datos de Tarjeta';
        detalle.innerHTML = totalHTML + `
            <input type="text" id="cardNumber" placeholder="Número de tarjeta (16 dígitos)" style="padding:10px; width:100%; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
            <div style="display:flex; gap:10px;">
                <input type="text" id="cardExpiry" placeholder="MM/AA" style="padding:10px; flex:1; border-radius:8px; border:1px solid #ddd;">
                <input type="text" id="cardCVV" placeholder="CVV" style="padding:10px; flex:1; border-radius:8px; border:1px solid #ddd;">
            </div>
        `;
    } else {
        titulo.textContent = 'Transferencia';
        detalle.innerHTML = totalHTML + `<p>Banco: <b>BCP</b></p><p>CCI: <b>002-191-2345678-0-12</b></p>`;
    }
}

async function generarQRReal() {
    const detalle = document.getElementById('detalle-instrucciones');
    const total = totalCarrito();
    
    const { data: { user } } = await sc.auth.getUser();
    const email = user?.email || 'cliente@mosameli.com';

    try {
        const { data, error } = await sc.functions.invoke('crear-orden-culqi', {
            body: {
                amount: total,
                email: email,
                description: `Compra en MosaMeli - ${carrito.length} productos`,
                pedido_id: `MOSA-${Date.now()}`
            }
        });

        if (error) throw error;

        if (data.success && data.qr_code) {
            detalle.innerHTML = `
                <p style="font-size:1.2rem; font-weight:bold; color:#8E24AA; margin-bottom:15px; text-align:center;">Total: S/ ${total.toFixed(2)}</p>
                <p style="text-align:center; margin-bottom:10px;">1. Abre Yape, Plin o tu app bancaria</p>
                <p style="text-align:center; margin-bottom:10px;">2. Escanea este código QR:</p>
                <img src="${data.qr_code}" alt="QR de pago" style="width:250px; height:250px; display:block; margin:0 auto; border:2px solid #9B7FD4; border-radius:12px; padding:5px; background:white;">
                <p style="text-align:center; margin-top:10px; font-size:0.85rem; color:#7A6A8C;">3. Confirma el monto en tu app</p>
                <p style="text-align:center; margin-top:10px; font-size:0.8rem; color:#7A6A8C;">Orden: ${data.order_number}</p>
                <p style="text-align:center; margin-top:5px; font-size:0.75rem; color:#B0A5BD;">Válido por 1 hora</p>
            `;
        } else {
            detalle.innerHTML = `<p style="text-align:center; color:#D32F2F;">Error al generar el QR. Intenta de nuevo.</p>`;
        }
    } catch (error) {
        console.error("Error:", error);
        detalle.innerHTML = `<p style="text-align:center; color:#D32F2F;">Error: ${error.message}</p>`;
    }
}

function validateCardForm() {
    const num = document.getElementById('cardNumber');
    const exp = document.getElementById('cardExpiry');
    const cvv = document.getElementById('cardCVV');
    let isValid = true;

    if (!/^\d{16}$/.test(num.value)) { num.classList.add('error'); isValid = false; } else { num.classList.remove('error'); }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp.value)) { exp.classList.add('error'); isValid = false; } else { exp.classList.remove('error'); }
    if (!/^\d{3,4}$/.test(cvv.value)) { cvv.classList.add('error'); isValid = false; } else { cvv.classList.remove('error'); }

    if (!isValid) { showToast("Por favor, revisa los datos de tu tarjeta"); }
    return isValid;
}

async function confirmarPago() {
    if (metodoPagoElegido === 'tarjeta') { if (!validateCardForm()) return; }
    
    const { data: { user } } = await sc.auth.getUser();
    if (!user) { closeCheckout(); mostrarModalRegistroObligatorio(); return; }

    const { error } = await sc.from('pedidos').insert([
        { usuario_id: user.id, items: carrito, total: totalCarrito() }
    ]);
    if (error) { showToast("Error al guardar pedido"); return; }

    for (const item of carrito) {
        await sc.from('productos').update({ stock: item.stock - 1 }).eq('id', item.id);
    }

    showToast("¡Pago procesado con éxito! 🎉");
    carrito = [];
    saveCart();
    closeCheckout();
    document.getElementById('cartModal').style.display = 'none';
    document.getElementById('checkoutModal').style.display = 'none';
    loadProducts();
}

function volverOpciones() {
    document.getElementById('opciones-pago').style.display = 'block';
    document.getElementById('instrucciones-pago').style.display = 'none';
}

function closeCheckout() { document.getElementById('checkoutModal').style.display = 'none'; }

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
};

window.onclick = function(event) {
    const cartModal = document.getElementById('cartModal');
    const checkoutModal = document.getElementById('checkoutModal');
    const registerModal = document.getElementById('registerRequiredModal');
    const productModal = document.getElementById('productModal');
    const fullscreenModal = document.getElementById('imageFullscreenModal');
    if (event.target === cartModal) closeCart();
    if (event.target === checkoutModal) closeCheckout();
    if (event.target === registerModal) closeRegisterRequired();
    if (event.target === productModal) closeProductModal();
    if (event.target === fullscreenModal) closeFullscreenImage();
};