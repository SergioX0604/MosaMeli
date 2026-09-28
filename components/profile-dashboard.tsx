"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order, Review } from "@/lib/types";
import { trackingDisponible } from "@/lib/orders";
import { estadoLabel } from "@/lib/estados";
import { DeclarePaymentButton } from "@/components/declare-payment-button";
import { formatMoney } from "@/lib/money";

export function ProfileDashboard({ user, orders, reviews }: { user: { email?: string; id: string }; orders: Order[]; reviews: Review[] }) {
  const [filter, setFilter] = useState("todos");
  const visibleOrders = filter === "todos" ? orders : orders.filter((order) => order.estado === filter);
  const filters = ["todos", "pedido_recibido", "pago_verificado", "en_preparacion", "en_camino", "entregado"];
  return (
    <div className="space-y-6">
      <section className="surface p-6"><h1 className="text-3xl font-black">Mi perfil</h1><p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p></section>
      <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Mis pedidos</h2><div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar pedidos">{filters.map((item) => <button key={item} type="button" className={`rounded-full border px-3 py-2 text-xs font-bold ${filter === item ? "border-transparent bg-[var(--primary)] text-white" : "border-[var(--border)]"}`} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "todos" ? "Todos" : estadoLabel(item)}</button>)}</div></div><div className="mt-3 space-y-3">{visibleOrders.length ? visibleOrders.map((order) => { const visible = trackingDisponible(order); return (
        <article key={order.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-black">{visible ? `#${order.codigo_seguimiento}` : `Pedido #${order.id}`}</p>
            <p className="text-sm text-[var(--muted)]">{new Date(order.fecha).toLocaleDateString("es-PE")} · {estadoLabel(order.estado)}</p>
            {!visible ? <p className="mt-1 text-xs font-semibold text-[var(--accent)]">Confirma tu pago para obtener el código de seguimiento</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <strong>{formatMoney(order.total)}</strong>
            {visible && order.tracking_token ? <Link className="btn btn-secondary min-h-9 px-3 text-sm" href={`/seguimiento/${order.tracking_token}`}>Ver estado</Link> : null}
            {!visible ? <DeclarePaymentButton orderId={order.id} /> : null}
          </div>
        </article>
      ); }) : <p className="surface p-6 text-sm text-[var(--muted)]">No hay pedidos con este filtro.</p>}</div></section>
      <section><h2 className="text-xl font-black">Mis reseñas</h2><div className="mt-3 space-y-3">{reviews.length ? reviews.map((review) => <article key={review.id} className="surface p-4"><div className="flex justify-between gap-3"><strong>{review.productos?.nombre ?? "Producto"}</strong><span className="text-amber-500">{"★".repeat(review.calificacion)}{"☆".repeat(5 - review.calificacion)}</span></div><p className="mt-2 text-sm text-[var(--muted)]">{review.comentario || "Sin comentario"}</p><span className="badge mt-3">{review.aprobada ? "Publicada" : "Pendiente"}</span></article>) : <p className="surface p-6 text-sm text-[var(--muted)]">Todavía no has escrito reseñas.</p>}</div></section>
    </div>
  );
}
