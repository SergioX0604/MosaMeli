"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import { giftProgress } from "@/lib/delivery";
import { cartSubtotal, formatMoney } from "@/lib/money";

function mobileBadge(product: Product): string {
  const category = product.categoria.toLowerCase();
  if (category.includes("deport")) return "100% CALIDAD";
  if (category.includes("cocina")) return "TOP VENTAS";
  if (category.includes("hogar")) return "ORGANIZACIÓN";
  if (category.includes("oficina")) return "MINIMALISTA";
  if (category.includes("baño")) return "SMART HOME";
  if (category.includes("vest")) return "NUEVO";
  return product.stock <= 6 ? `${product.stock} DISPONIBLES` : "SELECCIÓN";
}

export function ProductCard({
  product,
  onPreview,
}: {
  product: Product;
  onPreview?: () => void;
}) {
  const add = useCartStore((state) => state.add);
  const cartItems = useCartStore((state) => state.items);
  const favorite = useFavoritesStore((state) => state.ids.includes(product.id));
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const [message, setMessage] = useState("");
  const gift = giftProgress(cartSubtotal(cartItems));
  const original = Number(product.precio_original ?? 0);
  const hasDiscount = original > product.precio;
  const summary = product.descripcion?.trim() || product.marca?.trim() || "";

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
      <span className="product-mobile-badge">{mobileBadge(product)}</span>
      <div className="product-flags">
        {gift.qualifies ? (
          <span className="product-badge gift">🎁 Regalo sorpresa</span>
        ) : hasDiscount ? (
          <span className="product-badge discount">Oferta</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="product-favorite"
          aria-label={
            favorite
              ? `Quitar ${product.nombre} de favoritos`
              : `Añadir ${product.nombre} a favoritos`
          }
          aria-pressed={favorite}
          onClick={() => toggleFavorite(product.id)}
        >
          {favorite ? "♥" : "♡"}
        </button>
      </div>

      {onPreview ? (
        <button
          type="button"
          className="product-media"
          aria-label={`Vista rápida de ${product.nombre}`}
          onClick={onPreview}
        >
          <img
            src={product.imagen}
            alt={product.nombre}
            loading="lazy"
            decoding="async"
          />
          <span className="product-quick-view-trigger">⌕ Vista rápida</span>
        </button>
      ) : (
        <Link
          href={`/producto/${product.id}`}
          className="product-media"
          aria-label={`Ver ${product.nombre}`}
        >
          <img
            src={product.imagen}
            alt={product.nombre}
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}

      <div className="product-body">
        {product.rating ? (
          <div
            className="product-rating"
            aria-label={`Calificación ${product.rating} de 5`}
          >
            <span className="star" aria-hidden="true">
              ★
            </span>
            <strong>{product.rating}</strong>
            <span>({product.review_count ?? 0})</span>
          </div>
        ) : null}
        <Link href={`/producto/${product.id}`} className="product-name">
          {product.nombre}
        </Link>
        <p className="product-description">{summary}</p>
        <div className="product-price-row">
          <span className="product-price-stack">
            {hasDiscount ? (
              <span className="product-price-old">{formatMoney(original)}</span>
            ) : null}
            <span className="product-price">{formatMoney(product.precio)}</span>
          </span>
          <button
            type="button"
            className="product-cart-button"
            onClick={addProduct}
            disabled={product.stock <= 0}
            aria-label={`Agregar ${product.nombre} al carrito`}
            title={
              product.stock > 0 ? "Agregar al carrito" : "Producto agotado"
            }
          >
            <span className="desktop-cart-symbol" aria-hidden="true">
              ＋
            </span>
            <span className="mobile-cart-symbol" aria-hidden="true">
              🛒
            </span>
          </button>
        </div>
        <p className="product-feedback" role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </article>
  );
}
