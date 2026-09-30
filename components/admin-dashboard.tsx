"use client";

import { useState, useTransition } from "react";
import {
  createProductAction,
  deleteProductAction,
  moderateReviewAction,
  updateOrderStatusAction,
  updateProductAction,
} from "@/app/admin/actions";
import type { Order, Product, Review } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { orderStatusSchema } from "@/lib/validation";
import { DeliveryCostEditor } from "@/components/delivery-cost-editor";
import { nextOrderStatuses } from "@/lib/order-transitions";

type AdminDashboardProps = {
  products: Product[];
  orders: Order[];
  reviews: Review[];
  summary: { paidOrders: number; paidTotal: number; deliveryCollected: number };
};

const emptyProduct = { nombre: "", categoria: "", precio: "", precioOriginal: "", imagen: "", stock: "" };

export function AdminDashboard({ products, orders, reviews, summary }: AdminDashboardProps) {
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const payload = {
        nombre: form.nombre,
        categoria: form.categoria,
        precio: Number(form.precio),
        precioOriginal: form.precioOriginal ? Number(form.precioOriginal) : null,
        imagen: form.imagen,
        stock: Number(form.stock),
      };
      const result = editingId ? await updateProductAction(editingId, payload) : await createProductAction(payload);
      if (!result.ok) {
        setFeedback({ type: "error", text: result.message ?? "No se pudo guardar el producto" });
        return;
      }
      setForm(emptyProduct);
      setEditingId(null);
      setFeedback({ type: "success", text: editingId ? "Producto actualizado" : "Producto creado" });
    });
  }

  function changeStatus(orderId: number, status: string) {
    if (!orderStatusSchema.safeParse(status).success) return;
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, status);
      if (!result.ok) setFeedback({ type: "error", text: result.message ?? "No se pudo actualizar" });
    });
  }

  function moderate(id: number, action: "approve" | "reject") {
    startTransition(async () => {
      const result = await moderateReviewAction(id, action);
      if (!result.ok) setFeedback({ type: "error", text: result.message ?? "No se pudo moderar" });
    });
  }

  return (
    <div className="space-y-6">
      {feedback ? <div className={`alert ${feedback.type === "error" ? "alert-error" : "alert-success"}`} role="status">{feedback.text}</div> : null}
      {pending ? <p className="text-sm text-[var(--muted)]" role="status">Procesando…</p> : null}

      <section className="surface p-5 md:p-6">
        <h2 className="text-xl font-black">{editingId ? "Editar producto" : "Agregar producto"}</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={submitProduct}>
          <div><label className="form-label" htmlFor="admin-name">Nombre</label><input id="admin-name" className="form-input" value={form.nombre} onChange={(event) => updateField("nombre", event.target.value)} required /></div>
          <div><label className="form-label" htmlFor="admin-category">Categoría</label><input id="admin-category" className="form-input" value={form.categoria} onChange={(event) => updateField("categoria", event.target.value)} required /></div>
          <div><label className="form-label" htmlFor="admin-price">Precio</label><input id="admin-price" className="form-input" type="number" min="0.01" step="0.01" value={form.precio} onChange={(event) => updateField("precio", event.target.value)} required /></div>
          <div><label className="form-label" htmlFor="admin-original-price">Precio original</label><input id="admin-original-price" className="form-input" type="number" min="0" step="0.01" value={form.precioOriginal} onChange={(event) => updateField("precioOriginal", event.target.value)} /></div>
          <div><label className="form-label" htmlFor="admin-stock">Stock</label><input id="admin-stock" className="form-input" type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField("stock", event.target.value)} required /></div>
          <div><label className="form-label" htmlFor="admin-image">URL de imagen</label><input id="admin-image" className="form-input" type="url" value={form.imagen} onChange={(event) => updateField("imagen", event.target.value)} required /></div>
          <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-3"><button className="btn btn-primary" type="submit" disabled={pending}>{editingId ? "Guardar cambios" : "Agregar producto"}</button>{editingId ? <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>Cancelar</button> : null}</div>
        </form>
      </section>

      <section className="surface p-5 md:p-6">
        <h2 className="text-xl font-black">Inventario</h2>
        <div className="table-wrap mt-4"><table className="data-table"><thead><tr><th>ID</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acción</th></tr></thead><tbody>
          {products.length ? products.map((product) => <tr key={product.id}><td>{product.id}</td><td>{product.nombre}</td><td>{product.categoria}</td><td>{formatMoney(product.precio)}</td><td>{product.stock}</td><td><div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary min-h-9 px-3 text-sm" onClick={() => { setEditingId(product.id); setForm({ nombre: product.nombre, categoria: product.categoria, precio: String(product.precio), precioOriginal: product.precio_original == null ? "" : String(product.precio_original), imagen: product.imagen, stock: String(product.stock) }); }}>Editar</button><button type="button" className="btn btn-danger min-h-9 px-3 text-sm" onClick={() => { if (window.confirm(`¿Eliminar ${product.nombre}?`)) { startTransition(async () => { await deleteProductAction(product.id); }); } }}>Eliminar</button></div></td></tr>) : <tr><td colSpan={6} className="text-center text-[var(--muted)]">No hay productos.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-5"><p className="text-sm text-[var(--muted)]">Pedidos pagados</p><p className="mt-1 text-2xl font-black">{summary.paidOrders}</p></div>
        <div className="surface p-5"><p className="text-sm text-[var(--muted)]">Ingresos verificados</p><p className="mt-1 text-2xl font-black">{formatMoney(summary.paidTotal)}</p></div>
        <div className="surface p-5"><p className="text-sm text-[var(--muted)]">Delivery cobrado</p><p className="mt-1 text-2xl font-black">{formatMoney(summary.deliveryCollected)}</p></div>
      </section>

      <section className="surface p-5 md:p-6">
        <h2 className="text-xl font-black">Pedidos</h2>
        <div className="mt-4 space-y-3">
          {orders.length ? orders.map((order) => { const nextStatuses = nextOrderStatuses(order.estado); return <article key={order.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">#{order.codigo_seguimiento}</h3><p className="text-sm text-[var(--muted)]">{order.cliente_nombre} · {order.cliente_email}</p>{order.pago_declarado ? <p className="mt-1 text-xs font-bold text-[#16a34a]">Pago declarado por el cliente · {new Date(order.pago_declarado).toLocaleString("es-PE")}</p> : null}</div><strong>{formatMoney(order.total)}</strong></div><div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm font-bold" htmlFor={`status-${order.id}`}>Estado</label><select id={`status-${order.id}`} className="form-select max-w-56" value={order.estado} onChange={(event) => changeStatus(order.id, event.target.value)} disabled={pending || nextStatuses.length === 0}><option value={order.estado}>{order.estado.replaceAll("_", " ")}</option>{nextStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>{nextStatuses.length === 0 ? <span className="text-xs text-[var(--muted)]">Estado final</span> : null}</div><p className="mt-3 text-sm text-[var(--muted)]">{order.items?.length ?? 0} producto(s) · Delivery cobrado: {formatMoney(Number(order.costo_delivery ?? 0))}</p>{order.direccion_cliente ? <p className="mt-1 text-sm">Dirección: {order.direccion_cliente}</p> : null}{order.notas_delivery ? <p className="mt-1 text-sm">Notas: {order.notas_delivery}</p> : null}<DeliveryCostEditor orderId={order.id} initial={Number(order.costo_real_delivery ?? 0)} /></article>; }) : <p className="text-sm text-[var(--muted)]">No hay pedidos.</p>}
        </div>
      </section>

      <section className="surface p-5 md:p-6">
        <h2 className="text-xl font-black">Reseñas pendientes</h2>
        <div className="mt-4 space-y-3">
          {reviews.length ? reviews.map((review) => <article key={review.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><strong>{review.productos?.nombre ?? "Producto"}</strong><span className="text-amber-500">{"★".repeat(review.calificacion)}{"☆".repeat(5 - review.calificacion)}</span></div><p className="mt-2 text-sm text-[var(--muted)]">{review.usuario_nombre}</p><p className="mt-2">{review.comentario || "Sin comentario"}</p><div className="mt-3 flex gap-2"><button type="button" className="btn btn-secondary min-h-9 px-3 text-sm" onClick={() => moderate(review.id, "approve")} disabled={pending}>Aprobar</button><button type="button" className="btn btn-danger min-h-9 px-3 text-sm" onClick={() => moderate(review.id, "reject")} disabled={pending}>Rechazar</button></div></article>) : <p className="text-sm text-[var(--muted)]">No hay reseñas pendientes.</p>}
        </div>
      </section>
    </div>
  );
}
