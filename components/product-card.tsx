"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import { formatMoney } from "@/lib/money";

export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const favorite = useFavoritesStore((state) => state.ids.includes(product.id));
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const [message, setMessage] = useState("");

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
        <span className="product-badge gift">🎁 Regalo sorpresa</span>
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
