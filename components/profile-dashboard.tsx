"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order, Review } from "@/lib/types";
import { trackingDisponible } from "@/lib/orders";
import { estadoLabel } from "@/lib/estados";
import { DeclarePaymentButton } from "@/components/declare-payment-button";
import { formatMoney } from "@/lib/money";

export function ProfileDashboard({
  user,
  orders,
  reviews,
}: {
  user: { email?: string; id: string };
  orders: Order[];
  reviews: Review[];
}) {
  const [filter, setFilter] = useState("todos");
  const visibleOrders =
    filter === "todos"
      ? orders
      : orders.filter((order) => order.estado === filter);
  const filters = [
    "todos",
    "pedido_recibido",
    "pago_verificado",
    "en_preparacion",
    "en_camino",
    "entregado",
    "cancelado",
  ];

  return (
    <div className="profile-dashboard space-y-6">
      <section className="profile-hero surface p-6">
        <span className="profile-avatar" aria-hidden="true">
          {(user.email?.[0] ?? "M").toUpperCase()}
        </span>
        <div>
          <p className="profile-eyebrow">Mi cuenta</p>
          <h1 className="text-3xl font-black">Mi perfil</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading">
          <h2 className="text-xl font-black">Mis pedidos</h2>
          <span>{orders.length} en total</span>
        </div>
        <div
          className="profile-order-filters"
          role="group"
          aria-label="Filtrar pedidos"
        >
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item === "todos" ? "Todos" : estadoLabel(item)}
            </button>
          ))}
        </div>
        <div className="profile-order-list">
          {visibleOrders.length ? (
            visibleOrders.map((order) => {
              const visible = trackingDisponible(order);
              const canDeclare = order.estado === "pedido_recibido" && !visible;
              return (
                <article key={order.id} className="profile-order-card surface">
                  <div className="profile-order-icon" aria-hidden="true">
                    ▢
                  </div>
                  <div className="min-w-0">
                    <p className="font-black">
                      {visible
                        ? `#${order.codigo_seguimiento}`
                        : `Pedido #${order.id}`}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {new Date(order.fecha).toLocaleDateString("es-PE")} ·{" "}
                      {estadoLabel(order.estado)}
                    </p>
                    {canDeclare ? (
                      <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
                        Confirma tu pago antes de que venza la reserva para
                        obtener el código de seguimiento
                      </p>
                    ) : null}
                    {canDeclare && order.reserva_expira_en ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Reserva hasta{" "}
                        {new Date(order.reserva_expira_en).toLocaleString(
                          "es-PE",
                        )}
                      </p>
                    ) : null}
                    {order.estado === "cancelado" && order.stock_liberado_en ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        La reserva venció o fue cancelada y el stock volvió al
                        catálogo.
                      </p>
                    ) : null}
                  </div>
                  <div className="profile-order-actions">
                    <strong>{formatMoney(order.total)}</strong>
                    {visible && order.tracking_token ? (
                      <Link
                        className="btn btn-secondary min-h-9 px-3 text-sm"
                        href={`/seguimiento/${order.tracking_token}`}
                      >
                        Ver estado
                      </Link>
                    ) : null}
                    {canDeclare ? (
                      <DeclarePaymentButton orderId={order.id} />
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="surface p-6 text-sm text-[var(--muted)]">
              No hay pedidos con este filtro.
            </p>
          )}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading">
          <h2 className="text-xl font-black">Mis reseñas</h2>
        </div>
        <div className="profile-review-list">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="surface p-4">
                <div className="flex justify-between gap-3">
                  <strong>{review.productos?.nombre ?? "Producto"}</strong>
                  <span className="text-amber-500">
                    {"★".repeat(review.calificacion)}
                    {"☆".repeat(5 - review.calificacion)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {review.comentario || "Sin comentario"}
                </p>
                <span className="badge mt-3">
                  {review.aprobada ? "Publicada" : "Pendiente"}
                </span>
              </article>
            ))
          ) : (
            <p className="surface p-6 text-sm text-[var(--muted)]">
              Todavía no has escrito reseñas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
