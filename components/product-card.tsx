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
    setMessage("Agregado al carrito");
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <article className="group surface flex h-full flex-col overflow-hidden">
      <Link href={`/producto/${product.id}`} className="block aspect-square overflow-hidden bg-[var(--brand-50)]">
        <img
          src={product.imagen}
          alt={product.nombre}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="relative flex flex-1 flex-col gap-3 p-4">
        <button type="button" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-lg shadow-sm" aria-label={favorite ? `Quitar ${product.nombre} de favoritos` : `Añadir ${product.nombre} a favoritos`} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}>{favorite ? "★" : "☆"}</button>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">{product.categoria}</p>
          <h2 className="mt-1 line-clamp-2 font-black leading-snug">{product.nombre}</h2>
          <p className="mt-2 text-lg font-black text-[var(--primary-dark)]">{formatMoney(product.precio)}</p>
        </div>
        <button type="button" className="btn btn-primary w-full" onClick={addProduct} disabled={product.stock <= 0}>
          {product.stock > 0 ? "Agregar al carrito" : "Agotado"}
        </button>
        <p className="min-h-5 text-center text-xs text-[var(--success)]" role="status" aria-live="polite">{message}</p>
      </div>
    </article>
  );
}
