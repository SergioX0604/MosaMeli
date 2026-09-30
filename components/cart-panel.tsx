"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { GIFT_THRESHOLD, giftProgress } from "@/lib/delivery";
import { cartSubtotal, formatMoney } from "@/lib/money";

export function CartPanel() {
  const { items, remove, setQuantity, clear } = useCartStore();
  const subtotal = cartSubtotal(items);
  const gift = giftProgress(subtotal);

  if (!items.length) {
    return (
      <div className="surface px-6 py-12 text-center">
        <p className="text-4xl" aria-hidden="true">
          🛒
        </p>
        <h1 className="mt-3 text-xl font-black">Tu carrito</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Está vacío. Agrega productos desde el catálogo para continuar.
        </p>
        <Link href="/#catalogo" className="btn btn-primary mt-6">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-checkout-grid">
      <div className="cart-main-column">
        <div className="secure-purchase-banner">
          <span aria-hidden="true">♢</span>
          <p>
            <strong>Compra protegida y segura</strong>
            <small>
              Tu pedido, ubicación y pago se procesan de forma cifrada.
            </small>
          </p>
          <b>Compra segura</b>
        </div>
        <section
          className="cart-products-card surface"
          aria-label="Productos del carrito"
        >
          <header>
            <div>
              <span aria-hidden="true">♧</span>
              <h2>Productos en tu carrito</h2>
              <span className="cart-items-count">
                {items.reduce((total, line) => total + line.quantity, 0)}{" "}
                artículos
              </span>
            </div>
            <Link href="/#catalogo">Seguir comprando</Link>
          </header>
          <div className="cart-lines">
            {items.map((line) => (
              <article key={line.product.id} className="cart-line">
                <img src={line.product.imagen} alt={line.product.nombre} />
                <div className="cart-line-copy">
                  <h3>{line.product.nombre}</h3>
                  <p>
                    {line.product.categoria}
                    {line.product.marca ? ` · ${line.product.marca}` : ""}
                  </p>
                  <div
                    className="quantity-control"
                    aria-label={`Cantidad de ${line.product.nombre}`}
                  >
                    <button
                      type="button"
                      aria-label={`Quitar una unidad de ${line.product.nombre}`}
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Agregar una unidad de ${line.product.nombre}`}
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity + 1)
                      }
                    >
                      ＋
                    </button>
                  </div>
                </div>
                <div className="cart-line-total">
                  <strong>
                    {formatMoney(line.product.precio * line.quantity)}
                  </strong>
                  {line.quantity > 1 ? (
                    <small>{formatMoney(line.product.precio)} c/u</small>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(line.product.id)}
                    aria-label={`Quitar ${line.product.nombre} del carrito`}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cart-delivery-preview surface">
          <div className="cart-section-heading">
            <span aria-hidden="true">▱</span>
            <div>
              <h2>Entrega adaptada a tu ubicación</h2>
              <p>
                En el siguiente paso podrás escribir tu dirección o marcarla en
                el mapa.
              </p>
            </div>
          </div>
          <div className="delivery-preview-options">
            <div className="selected">
              <span aria-hidden="true">●</span>
              <p>
                <strong>Delivery local MosaMeli</strong>
                <small>
                  Tarifa calculada por distancia, con total visible antes de
                  confirmar.
                </small>
              </p>
            </div>
            <div>
              <span aria-hidden="true">⌖</span>
              <p>
                <strong>Cobertura de hasta 10 km</strong>
                <small>
                  Selecciona el punto exacto para evitar errores de entrega.
                </small>
              </p>
            </div>
          </div>
        </section>
      </div>

      <aside className="cart-summary-card surface">
        <div className="cart-section-heading">
          <span aria-hidden="true">▤</span>
          <h2>Resumen del pedido</h2>
        </div>
        <div className="cart-summary-lines">
          <div>
            <span>
              Subtotal (
              {items.reduce((total, line) => total + line.quantity, 0)}{" "}
              productos)
            </span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div>
            <span>Costo de delivery</span>
            <strong className="pending-value">Por calcular</strong>
          </div>
        </div>
        <div className={`gift-box ${gift.qualifies ? "qualified" : ""}`}>
          <p className="gift-box-title">
            {gift.qualifies
              ? "🎉 Incluye regalo sorpresa"
              : "🎁 Regalo sorpresa"}
          </p>
          <p className="gift-box-text">
            {gift.qualifies
              ? "Se agregará automáticamente al confirmar."
              : `Agrega ${formatMoney(gift.missing)} más para desbloquearlo desde S/ ${GIFT_THRESHOLD}.`}
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
        </div>
        <div className="cart-summary-total">
          <span>
            <strong>Total estimado</strong>
            <small>El delivery se suma en el siguiente paso</small>
          </span>
          <b>{formatMoney(subtotal)}</b>
        </div>
        <Link href="/checkout" className="btn btn-primary cart-checkout-button">
          <span aria-hidden="true">♙</span> Continuar con entrega y pago
        </Link>
        <button type="button" className="cart-clear-button" onClick={clear}>
          Vaciar carrito
        </button>
        <div className="purchase-benefits">
          <p>
            <span>✓</span>
            <strong>
              Stock reservado al confirmar<small>Durante 30 minutos</small>
            </strong>
          </p>
          <p>
            <span>✓</span>
            <strong>
              Seguimiento del pedido
              <small>Estado actualizado en tu cuenta</small>
            </strong>
          </p>
          <p>
            <span>✓</span>
            <strong>
              Soporte por WhatsApp<small>Asistencia cuando la necesites</small>
            </strong>
          </p>
        </div>
      </aside>
    </div>
  );
}
