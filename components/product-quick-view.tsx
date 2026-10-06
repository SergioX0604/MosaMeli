"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductGallery } from "@/components/product-gallery";
import { useCartStore } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";

function productFeatures(product: Product): Array<[string, string]> {
  if (!product.caracteristicas) return [];
  if (typeof product.caracteristicas === "object") {
    return Object.entries(product.caracteristicas).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
  }
  try {
    const parsed = JSON.parse(product.caracteristicas) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return [];
    return Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
  } catch {
    return [];
  }
}

export function ProductQuickView({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const add = useCartStore((state) => state.add);
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");
  const features = useMemo(
    () => productFeatures(product).slice(0, 6),
    [product],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !document.querySelector(".product-image-lightbox")
      )
        onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  function addProduct() {
    add(product, quantity);
    setFeedback(
      `${quantity} ${quantity === 1 ? "unidad agregada" : "unidades agregadas"}`,
    );
    window.setTimeout(() => setFeedback(""), 1800);
  }

  function buyNow() {
    add(product, quantity);
    onClose();
    router.push("/checkout");
  }

  const rating = Number(product.rating ?? 0);
  const reviewCount = Number(product.review_count ?? 0);

  return (
    <div
      className="product-quick-view-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="product-quick-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <button
          type="button"
          className="product-quick-view-close"
          onClick={onClose}
          aria-label="Cerrar vista del producto"
        >
          ×
        </button>
        <div className="product-quick-view-grid">
          <ProductGallery product={product} />
          <div className="product-quick-view-info">
            <p className="product-quick-view-category">
              {product.marca || product.categoria}
            </p>
            <h2 id="quick-view-title">{product.nombre}</h2>
            <p className="product-quick-view-price">
              {formatMoney(product.precio)}
            </p>
            <p className="product-quick-view-description">
              {product.descripcion ||
                "Producto seleccionado por MosaMeli para hacer tu compra más práctica."}
            </p>

            {features.length ? (
              <dl className="product-quick-view-features">
                {features.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="product-quick-view-quantity">
              <strong>Cantidad:</strong>
              <div>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(product.stock, value + 1))
                  }
                  aria-label="Aumentar cantidad"
                >
                  ＋
                </button>
              </div>
            </div>

            <div className="product-quick-view-actions">
              <button
                type="button"
                className="btn quick-view-add-button"
                onClick={addProduct}
                disabled={product.stock <= 0}
              >
                🛒 Añadir al carrito
              </button>
              <button
                type="button"
                className="btn quick-view-buy-button"
                onClick={buyNow}
                disabled={product.stock <= 0}
              >
                ⚡ Comprar ahora
              </button>
            </div>
            <p
              className="product-quick-view-feedback"
              role="status"
              aria-live="polite"
            >
              {feedback}
            </p>

            <ul className="product-quick-view-benefits">
              <li>
                <span>▱</span> Delivery calculado según tu ubicación
              </li>
              <li>
                <span>♢</span> {product.garantia || "Garantía de 30 días"}
              </li>
              <li>
                <span>↶</span> Seguimiento seguro de tu pedido
              </li>
            </ul>

            <section className="quick-view-reviews" aria-labelledby="quick-view-reviews-title">
              <h3 id="quick-view-reviews-title"><span aria-hidden="true">●</span> Cuéntanos qué te pareció</h3>
              <div className="quick-view-rating-card">
                <strong className="quick-view-rating-score">{rating.toFixed(1)}</strong>
                <span className="quick-view-rating-stars" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
                  {Array.from({ length: 5 }, (_, index) => index < Math.round(rating) ? "★" : "☆").join("")}
                </span>
                <small>{reviewCount} {reviewCount === 1 ? "reseña" : "reseñas"}</small>
              </div>
              <p className="quick-view-review-empty">{reviewCount ? "Lee las opiniones y comparte tu experiencia con este producto." : "Aún no hay reseñas. ¡Sé el primero en opinar!"}</p>
              <Link className="btn quick-view-review-button" href={`/producto/${product.id}#escribir-resena`} onClick={onClose}>
                ✎ Escribir mi reseña
              </Link>
              <Link className="quick-view-detail-link" href={`/producto/${product.id}`} onClick={onClose}>
                Ver todos los detalles del producto →
              </Link>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
