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
window.imagenesProducto = [];

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
        precioOriginal: p.precio_original,
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

    grid.innerHTML = productosFiltrados.map(p => {
        const descuento = p.precioOriginal ? Math.round(((p.precioOriginal - p.precio) / p.precioOriginal) * 100) : 0;
        return `
            <div class="product-card">
                ${descuento > 0 ? `<span class="discount-tag">-${descuento}%</span>` : ''}
                <img src="${p.imagen}" class="product-image" onclick="abrirProducto(${p.id})" style="cursor:pointer;">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <div class="price-container">
                        <span class="current-price">S/ ${p.precio.toFixed(2)}</span>
                        ${p.precioOriginal ? `<span class="original-price">S/ ${p.precioOriginal.toFixed(2)}</span>` : ''}
                    </div>
                    <p class="shipping-info"><i class="fas fa-truck"></i> Envío gratis</p>
                    <button class="btn-buy-now" onclick="buyNow(${p.id})">Comprar ahora</button>
                    <button class="btn-add-cart" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>
                </div>
            </div>
        `;
    }).join('');

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

    grid.innerHTML = resultados.map(p => {
        const descuento = p.precioOriginal ? Math.round(((p.precioOriginal - p.precio) / p.precioOriginal) * 100) : 0;
        return `
            <div class="product-card">
                ${descuento > 0 ? `<span class="discount-tag">-${descuento}%</span>` : ''}
                <img src="${p.imagen}" class="product-image" onclick="abrirProducto(${p.id})" style="cursor:pointer;">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <div class="price-container">
                        <span class="current-price">S/ ${p.precio.toFixed(2)}</span>
                        ${p.precioOriginal ? `<span class="original-price">S/ ${p.precioOriginal.toFixed(2)}</span>` : ''}
                    </div>
                    <button class="btn-buy-now" onclick="buyNow(${p.id})">Comprar ahora</button>
                    <button class="btn-add-cart" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>
                </div>
            </div>
        `;
    }).join('');

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
    
    const descuento = productoActual.precioOriginal 
        ? Math.round(((productoActual.precioOriginal - productoActual.precio) / productoActual.precioOriginal) * 100) 
        : 0;
    const badge = document.getElementById('productBadge');
    badge.textContent = descuento > 0 ? `-${descuento}% OFF` : '';
    badge.style.display = descuento > 0 ? 'inline-block' : 'none';
    
    document.getElementById('productDetailName').textContent = productoActual.nombre;
    document.getElementById('productBrand').textContent = productoActual.marca || 'MosaMeli';
    
    document.getElementById('productDetailPrice').textContent = `S/ ${productoActual.precio.toFixed(2)}`;
    const originalPrice = document.getElementById('productDetailOriginalPrice');
    if (productoActual.precioOriginal) {
        originalPrice.textContent = `S/ ${productoActual.precioOriginal.toFixed(2)}`;
        originalPrice.style.display = 'inline';
    } else {
        originalPrice.style.display = 'none';
    }
    
    document.getElementById('productDescription').textContent = 
        productoActual.descripcion || 'Producto de alta calidad seleccionado por MosaMeli. Ideal para el día a día.';
    
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
    
    const imagenes = [productoActual.imagen];
    if (productoActual.imagenes_extra) {
        const extras = typeof productoActual.imagenes_extra === 'string'
            ? JSON.parse(productoActual.imagenes_extra)
            : productoActual.imagenes_extra;
        imagenes.push(...extras);
    }
    
    imagenActualIndex = 0;
    document.getElementById('productMainImage').src = imagenes[0];
    window.imagenesProducto = imagenes;
    
    const thumbnails = document.getElementById('productThumbnails');
    thumbnails.innerHTML = imagenes.map((img, i) => `
        <div class="thumbnail ${i === 0 ? 'active' : ''}" onclick="cambiarImagen(${i}, '${img}')">
            <img src="${img}" alt="Miniatura ${i + 1}">
        </div>
    `).join('');
    
    document.getElementById('productModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cambiarImagen(index, url) {
    imagenActualIndex = index;
    document.getElementById('productMainImage').src = url;
    document.querySelectorAll('.thumbnail').forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });
}

function prevImage() {
    if (!window.imagenesProducto.length) return;
    imagenActualIndex = (imagenActualIndex - 1 + window.imagenesProducto.length) % window.imagenesProducto.length;
    cambiarImagen(imagenActualIndex, window.imagenesProducto[imagenActualIndex]);
}

function nextImage() {
    if (!window.imagenesProducto.length) return;
    imagenActualIndex = (imagenActualIndex + 1) % window.imagenesProducto.length;
    cambiarImagen(imagenActualIndex, window.imagenesProducto[imagenActualIndex]);
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
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    productoActual = null;
}

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
    if (event.target === cartModal) closeCart();
    if (event.target === checkoutModal) closeCheckout();
    if (event.target === registerModal) closeRegisterRequired();
    if (event.target === productModal) closeProductModal();
};