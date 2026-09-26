"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useFavoritesStore } from "@/lib/favorites-store";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";

export function FavoritesClient() {
  const ids = useFavoritesStore((state) => state.ids);
  const toggle = useFavoritesStore((state) => state.toggle);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    const supabase = createSupabaseBrowserClient();
    supabase.from("productos").select("id,nombre,categoria,precio,imagen,stock").in("id", ids).then(({ data, error: queryError }) => {
      if (queryError) setError("No pudimos cargar tus favoritos.");
      else setProducts((data ?? []) as Product[]);
    });
  }, [ids]);

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!ids.length) return <div className="surface p-8 text-center"><h1 className="text-xl font-black">Todavía no tienes favoritos</h1><p className="mt-2 text-sm text-[var(--muted)]">Pulsa la estrella de un producto para guardarlo aquí.</p><Link className="btn btn-primary mt-5" href="/#catalogo">Ver catálogo</Link></div>;

  const visibleProducts = ids.length ? products : [];
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visibleProducts.map((product) => <article key={product.id} className="surface overflow-hidden"><img src={product.imagen} alt={product.nombre} className="aspect-square w-full object-cover" /><div className="p-4"><Link href={`/producto/${product.id}`} className="font-black hover:text-[var(--primary)]">{product.nombre}</Link><p className="mt-2 text-[var(--primary-dark)]">{formatMoney(product.precio)}</p><button type="button" className="btn btn-quiet mt-3 min-h-9 px-2 text-sm text-[var(--danger)]" onClick={() => toggle(product.id)}>Quitar de favoritos</button></div></article>)}</div>;
}
