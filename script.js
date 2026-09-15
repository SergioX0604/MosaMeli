// Usa la instancia global de supabaseClient (definida en supabaseClient.js)
const supabaseClient = window.supabaseClient;

// Variables globales
let productos = [];
let carrito = [];
let metodoPagoElegido = null;
let categoriasActivas = [];
let filtroPrecioMax = 300;
let soloDisponibles = false;

// Cargar productos desde Supabase
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '<p style="text-align:center; padding:50px; grid-column: 1/-1;">Cargando productos...</p>';

    const { data, error } = await supabaseClient.from('productos').select('*').order('id');
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
        stock: p.stock
    }));
    renderProductos();
}

// Renderizado de productos
function renderProductos() {
    const grid = document.getElementById('productGrid');
    const title = document.getElementById('categoryTitle');
    const count = document.getElementById('productCount');

    let productosFiltrados = productos;

    if (categoriasActivas.length > 0) {
        productosFiltrados = productosFiltrados.filter(p => categoriasActivas.includes(p.categoria));
    }

    productosFiltrados = productosFiltrados.filter(p => p.precio <= filtroPrecioMax);

    if (soloDisponibles) {
        productosFiltrados = productosFiltrados.filter(p => p.stock > 0);
    }

    if (categoriasActivas.length === 0) {
        title.textContent = 'Todos los productos';
    } else if (categoriasActivas.length === 1) {
        const nombre = categoriasActivas[0];
        title.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    } else {
        title.textContent = 'Varios productos';
    }
    count.textContent = `${productosFiltrados.length} productos`;

    grid.innerHTML = productosFiltrados.map(p => {
        const descuento = p.precioOriginal ? Math.round(((p.precioOriginal - p.precio) / p.precioOriginal) * 100) : 0;
        return `
            <div class="product-card">
                ${descuento > 0 ? `<span class="discount-tag">-${descuento}%</span>` : ''}
                <img src="${p.imagen}" class="product-image">
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

// Sincronización de UI
function syncFilterUI() {
    document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.remove('active');
        const onclick = btn.getAttribute('onclick') || '';
        if (categoriasActivas.length === 0 && onclick.includes('showAll()')) {
            btn.classList.add('active');
        } else if (onclick.includes('showCategory')) {
            const match = onclick.match(/'([^']+)'/);
            if (match && categoriasActivas.includes(match[1])) {
                btn.classList.add('active');
            }
        }
    });
    document.querySelectorAll('.filter-cat').forEach(checkbox => {
        checkbox.checked = categoriasActivas.includes(checkbox.value);
    });
}

function showAll() {
    categoriasActivas = [];
    syncFilterUI();
    renderProductos();
}

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

// Búsqueda
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
                <img src="${p.imagen}" class="product-image">
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

// Eventos de filtros
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

// ================== NUEVA FUNCIÓN: MOSTRAR/OCULTAR FILTROS EN MÓVIL ==================
function toggleFilters() {
    const sidebar = document.getElementById('filtersSidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('visible');
    
    const btn = document.querySelector('.mobile-filter-btn');
    if (!btn) return;
    
    if (sidebar.classList.contains('visible')) {
        btn.innerHTML = '<i class="fas fa-times"></i> Ocultar filtros';
    } else {
        btn.innerHTML = '<i class="fas fa-filter"></i> Mostrar filtros';
    }
}

// Carrito
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

// Checkout
function openCheckout() {
    if (carrito.length === 0) { showToast("Tu carrito está vacío"); return; }
    closeCart();
    document.getElementById('opciones-pago').style.display = 'block';
    document.getElementById('instrucciones-pago').style.display = 'none';
    document.getElementById('checkoutModal').style.display = 'flex';
}

function seleccionarMetodo(metodo) {
    metodoPagoElegido = metodo;
    document.getElementById('opciones-pago').style.display = 'none';
    document.getElementById('instrucciones-pago').style.display = 'block';

    const titulo = document.getElementById('titulo-instrucciones');
    const detalle = document.getElementById('detalle-instrucciones');
    const total = totalCarrito().toFixed(2);

    const totalHTML = `<p style="font-size:1.2rem; font-weight:bold; color:#8E24AA; margin-bottom:15px; text-align:center;">Total a pagar: S/ ${total}</p>`;

    if (metodo === 'qr') {
        titulo.textContent = 'Escanea el QR';
        detalle.innerHTML = totalHTML + `<p>1. Abre Yape o Plin.</p><p>2. Escanea:</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MosaMeli-${total}" style="margin:10px auto; display:block;"><p>3. Confirma el monto en tu app.</p>`;
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
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { showToast("Debes iniciar sesión para comprar"); return; }

    const { error } = await supabaseClient.from('pedidos').insert([
        { usuario_id: user.id, items: carrito, total: totalCarrito() }
    ]);
    if (error) { showToast("Error al guardar pedido"); return; }

    for (const item of carrito) {
        await supabaseClient.from('productos').update({ stock: item.stock - 1 }).eq('id', item.id);
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

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Inicialización
window.onload = async function() {
    checkLoginStatus();
    await loadProducts();
    loadCart();
    initFilterEvents();
};

window.onclick = function(event) {
    const cartModal = document.getElementById('cartModal');
    const checkoutModal = document.getElementById('checkoutModal');
    if (event.target === cartModal) closeCart();
    if (event.target === checkoutModal) closeCheckout();
};