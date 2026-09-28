"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import { giftProgress } from "@/lib/delivery";
import { cartSubtotal, formatMoney } from "@/lib/money";

export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const cartItems = useCartStore((state) => state.items);
  const favorite = useFavoritesStore((state) => state.ids.includes(product.id));
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const [message, setMessage] = useState("");
  const gift = giftProgress(cartSubtotal(cartItems));
  const original = Number(product.precio_original ?? 0);
  const discount = original > product.precio ? Math.round((1 - product.precio / original) * 100) : 0;

  function addProduct() {
    if (product.stock <= 0) {
      setMessage("Producto agotado");
      return;
    }
    add(product);
    setMessage("Agregado");
    window.setTimeout(() => setMessage(""), 1800);
  }

  return (
    <article className="product-card">
      <Link href={`/producto/${product.id}`} className="product-media" aria-label={`Ver ${product.nombre}`}>
        <img src={product.imagen} alt={product.nombre} loading="lazy" decoding="async" />
        {gift.qualifies ? <span className="product-badge gift">🎁 Regalo sorpresa</span> : discount > 0 ? <span className="product-badge">-{discount}% dto</span> : null}
      </Link>
      <button type="button" className="product-favorite" aria-label={favorite ? `Quitar ${product.nombre} de favoritos` : `Añadir ${product.nombre} a favoritos`} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}>{favorite ? "♥" : "♡"}</button>
      <div className="product-body">
        {product.rating ? <div className="product-rating" aria-label={`Calificación ${product.rating} de 5`}><span className="star" aria-hidden="true">★</span><strong>{product.rating}</strong><span>({product.review_count ?? 0})</span></div> : null}
        <Link href={`/producto/${product.id}`} className="product-name hover:text-[var(--primary)]">{product.nombre}</Link>
        <p className="product-description">{product.descripcion || product.marca || "Producto seleccionado para ti"}</p>
        <div className="product-price-row">
          <span><span className="product-price-label">Precio</span><span className="product-price">{formatMoney(product.precio)}</span></span>
          <button type="button" className="product-cart-button" onClick={addProduct} disabled={product.stock <= 0} aria-label={`Agregar ${product.nombre} al carrito`} title={product.stock > 0 ? "Agregar al carrito" : "Producto agotado"}>🛒</button>
        </div>
        <p className="product-feedback" role="status" aria-live="polite">{message}</p>
      </div>
    </article>
  );
}
