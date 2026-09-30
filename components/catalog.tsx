"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { useCartStore } from "@/lib/cart-store";
import { GIFT_THRESHOLD, giftProgress } from "@/lib/delivery";
import { cartSubtotal, formatMoney } from "@/lib/money";

const PAGE_SIZE = 6;

function normalizeCategory(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function displayCategory(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function Catalog({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeCategories, setActiveCategories] = useState<string[]>(() => {
    const value = searchParams.get("categoria");
    return value && value !== "todos" ? [value] : [];
  });
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState("relevancia");
  const [page, setPage] = useState(1);
  const cartItems = useCartStore((state) => state.items);
  const gift = giftProgress(cartSubtotal(cartItems));

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products)
      counts.set(product.categoria, (counts.get(product.categoria) ?? 0) + 1);
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);
  const priceLimit = Math.max(
    300,
    ...products.map((product) => Number(product.precio) || 0),
  );
  const effectiveMaxPrice = maxPrice ?? priceLimit;

  useEffect(() => {
    // Sincroniza el catálogo con los filtros que llegan desde el header.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(searchParams.get("q") ?? "");
    const category = searchParams.get("categoria");
    setActiveCategories(category && category !== "todos" ? [category] : []);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [product.nombre, product.categoria, product.marca]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesCategory =
        activeCategories.length === 0 ||
        activeCategories.includes(normalizeCategory(product.categoria));
      const matchesStock = !onlyAvailable || product.stock > 0;
      const matchesPrice = Number(product.precio) <= effectiveMaxPrice;
      return matchesQuery && matchesCategory && matchesStock && matchesPrice;
    });
    return result.sort((a, b) => {
      if (sort === "precio-asc") return Number(a.precio) - Number(b.precio);
      if (sort === "precio-desc") return Number(b.precio) - Number(a.precio);
      if (sort === "nombre") return a.nombre.localeCompare(b.nombre);
      return a.id - b.id;
    });
  }, [
    activeCategories,
    effectiveMaxPrice,
    onlyAvailable,
    products,
    query,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilters = Boolean(
    query || activeCategories.length || onlyAvailable || maxPrice !== undefined,
  );

  function toggleCategory(category: string) {
    setActiveCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setActiveCategories([]);
    setOnlyAvailable(false);
    setMaxPrice(undefined);
    setPage(1);
    router.replace("/#catalogo");
  }

  return (
    <section id="catalogo" className="catalog-layout">
      <aside
        className="filters-panel surface"
        aria-label="Filtros del catálogo"
      >
        <div className="filters-heading">
          <h2>Filtros</h2>
          {hasFilters ? (
            <button
              type="button"
              className="clear-filter-button"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          ) : null}
        </div>

        <div className="filter-section">
          <h3>Categoría</h3>
          <div className="space-y-0.5">
            {categories.map(([category, count]) => {
              const key = normalizeCategory(category);
              const checked = activeCategories.includes(key);
              return (
                <div className="filter-category-row" key={category}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(key)}
                    />
                    {displayCategory(category)}
                  </label>
                  <span className="filter-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="filter-section">
          <h3>Rango de Precio</h3>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="price-chip">Hasta S/ {priceLimit}</span>
            <span className="text-xs text-[var(--muted)]">
              Máximo: S/ {effectiveMaxPrice}
            </span>
          </div>
          <input
            aria-label="Precio máximo"
            type="range"
            min="0"
            max={priceLimit}
            step="1"
            value={effectiveMaxPrice}
            onChange={(event) => {
              setMaxPrice(Number(event.target.value));
              setPage(1);
            }}
            className="w-full accent-[var(--primary)]"
          />
          <div className="filter-price-labels">
            <span>S/ 0.00</span>
            <span>S/ {priceLimit}.00</span>
          </div>
        </div>

        <div className="filter-section">
          <h3>Disponibilidad</h3>
          <div className="filter-category-row">
            <label>
              En stock inmediato{" "}
              <input
                type="checkbox"
                className="filter-check"
                checked={onlyAvailable}
                onChange={(event) => {
                  setOnlyAvailable(event.target.checked);
                  setPage(1);
                }}
              />
            </label>
          </div>
        </div>

        <div className="filter-section">
          <h3>Calificación</h3>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="text-[var(--primary)]">◉</span>
            <span aria-hidden="true" className="tracking-tight text-amber-500">
              ★★★★☆
            </span>
            <span>4 estrellas o más</span>
          </div>
        </div>

        <div className="promo-card">
          <span className="promo-label">Regalo sorpresa</span>
          <h3>
            {gift.qualifies
              ? "🎉 ¡Tu carrito ya califica!"
              : `Desde S/ ${GIFT_THRESHOLD} te llevas regalo`}
          </h3>
          <p>
            {gift.qualifies
              ? "Tu pedido incluye un regalo sorpresa de selección limitada."
              : `Te faltan ${formatMoney(gift.missing)} para desbloquearlo.`}
          </p>
          <div
            className="gift-progress"
            role="progressbar"
            aria-label="Progreso para el regalo sorpresa"
            aria-valuemin={0}
            aria-valuemax={GIFT_THRESHOLD}
            aria-valuenow={Math.round(gift.total)}
          >
            <span style={{ width: `${Math.round(gift.ratio * 100)}%` }} />
          </div>
          <p className="promo-total">
            {formatMoney(gift.total)} <span>/ S/ {GIFT_THRESHOLD}</span>
          </p>
        </div>
      </aside>

      <div className="catalog-results">
        <div className="catalog-mobile-search">
          <label className="form-label" htmlFor="catalogo-busqueda">
            Buscar productos
          </label>
          <input
            id="catalogo-busqueda"
            className="form-input"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Ej: audífonos, hogar, mascotas"
          />
        </div>
        <div className="catalog-toolbar surface">
          <div className="catalog-title-row">
            <h2>
              {activeCategories.length
                ? displayCategory(activeCategories[0])
                : "Productos seleccionados"}
            </h2>
            <span className="catalog-count" role="status" aria-live="polite">
              {filtered.length} productos
            </span>
          </div>
          <label className="catalog-sort">
            Ordenar:
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              aria-label="Ordenar productos"
            >
              <option value="relevancia">Relevancia</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
            </select>
          </label>
        </div>

        {visibleProducts.length ? (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="surface px-6 py-12 text-center">
            <p className="text-3xl" aria-hidden="true">
              🔍
            </p>
            <h2 className="mt-3 font-black">No encontramos productos</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Prueba con otra búsqueda o limpia los filtros.
            </p>
          </div>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="pagination">
            <span className="pagination-info">
              Mostrando {visibleProducts.length} de {filtered.length} productos
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="pagination-button"
                aria-label="Anterior"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                ‹
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (number) => (
                  <button
                    key={number}
                    type="button"
                    className={`pagination-button ${number === currentPage ? "active" : ""}`}
                    onClick={() => setPage(number)}
                    aria-current={number === currentPage ? "page" : undefined}
                  >
                    {number}
                  </button>
                ),
              )}
              <button
                type="button"
                className="pagination-button"
                aria-label="Siguiente"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
