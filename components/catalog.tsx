"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

export function Catalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todos");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  const categories = useMemo(
    () => ["todos", ...Array.from(new Set(products.map((product) => product.categoria).filter(Boolean)))],
    [products],
  );
  const priceLimit = useMemo(
    () => Math.max(300, ...products.map((product) => Number(product.precio) || 0)),
    [products],
  );
  const effectiveMaxPrice = maxPrice ?? priceLimit;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery || [product.nombre, product.categoria]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesCategory = category === "todos" || product.categoria === category;
      const matchesStock = !onlyAvailable || product.stock > 0;
      const matchesPrice = Number(product.precio) <= effectiveMaxPrice;
      return matchesQuery && matchesCategory && matchesStock && matchesPrice;
    });
  }, [category, effectiveMaxPrice, onlyAvailable, products, query]);

  return (
    <section id="catalogo" className="space-y-5">
      <div className="surface p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="form-label" htmlFor="catalogo-busqueda">Buscar productos</label>
            <input
              id="catalogo-busqueda"
              className="form-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej:audífonos, hogar, mascotas"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[430px]">
            <div>
              <label className="form-label" htmlFor="precio-maximo">Precio máximo: S/ {effectiveMaxPrice}</label>
              <input
                id="precio-maximo"
                type="range"
                min="0"
                max={priceLimit}
                step="1"
                value={effectiveMaxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(event) => setOnlyAvailable(event.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Solo disponibles
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por categoría">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full border px-3 py-2 text-sm font-bold transition ${category === item ? "border-transparent bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--primary)]"}`}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item === "todos" ? "Todos" : item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">
          {filtered.length} producto{filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}
        </p>
        {(query || category !== "todos" || onlyAvailable || maxPrice !== undefined) ? (
          <button
            type="button"
            className="btn btn-quiet min-h-9 px-3 text-sm"
            onClick={() => { setQuery(""); setCategory("todos"); setOnlyAvailable(false); setMaxPrice(undefined); }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="surface px-6 py-12 text-center">
          <p className="text-3xl" aria-hidden="true">🔍</p>
          <h2 className="mt-3 font-black">No encontramos productos</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Prueba con otra búsqueda o limpia los filtros.</p>
        </div>
      )}
    </section>
  );
}
