"use client";

import Link from "next/link";
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
                className="btn btn-primary"
                onClick={addProduct}
                disabled={product.stock <= 0}
              >
                🛒 Agregar al carrito
              </button>
              <Link
                className="btn btn-secondary"
                href={`/producto/${product.id}`}
              >
                Ver todos los detalles
              </Link>
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
          </div>
        </div>
      </section>
    </div>
  );
}
