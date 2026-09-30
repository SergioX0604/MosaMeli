"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useFavoritesStore } from "@/lib/favorites-store";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

export function FavoritesClient() {
  const ids = useFavoritesStore((state) => state.ids);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("productos")
      .select(
        "id,nombre,categoria,precio,precio_original,imagen,stock,descripcion,marca",
      )
      .in("id", ids)
      .then(({ data, error: queryError }) => {
        if (queryError) setError("No pudimos cargar tus favoritos.");
        else setProducts((data ?? []) as Product[]);
      });
  }, [ids]);

  if (error)
    return (
      <p className="alert alert-error" role="alert">
        {error}
      </p>
    );
  if (!ids.length)
    return (
      <div className="surface p-8 text-center">
        <h1 className="text-xl font-black">Todavía no tienes favoritos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Pulsa la estrella de un producto para guardarlo aquí.
        </p>
        <Link className="btn btn-primary mt-5" href="/#catalogo">
          Ver catálogo
        </Link>
      </div>
    );

  const visibleProducts = ids.length ? products : [];
  return (
    <div className="favorites-product-grid">
      {visibleProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
