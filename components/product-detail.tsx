"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { ProductGallery } from "@/components/product-gallery";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ProductDetail({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  function addToCart() {
    add(product, quantity);
    setMessage("Producto agregado al carrito");
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ProductGallery product={product} />
      <div className="surface flex flex-col gap-4 p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--primary)]">{product.categoria}</p>
          <h1 className="mt-2 text-3xl font-black">{product.nombre}</h1>
          {product.marca ? <p className="mt-1 text-sm text-[var(--muted)]">Marca: {product.marca}</p> : null}
          <p className="mt-4 text-3xl font-black text-[var(--primary-dark)]">{formatMoney(product.precio)}</p>
        </div>
        {product.descripcion ? <p className="leading-relaxed text-[var(--muted)]">{product.descripcion}</p> : null}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">Cantidad</span>
          <button type="button" className="btn btn-secondary min-h-10 px-3" aria-label="Disminuir cantidad" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
          <span className="min-w-8 text-center font-black">{quantity}</span>
          <button type="button" className="btn btn-secondary min-h-10 px-3" aria-label="Aumentar cantidad" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}>+</button>
        </div>
        <button type="button" className="btn btn-primary w-full" onClick={addToCart} disabled={product.stock <= 0}>
          {product.stock > 0 ? "Agregar al carrito" : "Producto agotado"}
        </button>
        <p className="min-h-5 text-center text-sm text-[var(--success)]" role="status" aria-live="polite">{message}</p>
        <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
          <p>Stock disponible: {product.stock}</p>
          {product.garantia ? <p className="mt-1">Garantía: {product.garantia}</p> : null}
        </div>
      </div>
    </div>
  );
}
