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
        <p className="text-4xl" aria-hidden="true">🛒</p>
        <h1 className="mt-3 text-xl font-black">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Agrega productos desde el catálogo para continuar.</p>
        <Link href="/#catalogo" className="btn btn-primary mt-6">Ver catálogo</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="surface divide-y divide-[var(--border)] overflow-hidden" aria-label="Productos del carrito">
        {items.map((line) => (
          <div key={line.product.id} className="flex gap-3 p-4">
            <img src={line.product.imagen} alt="" className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{line.product.nombre}</h2>
              <p className="mt-1 text-sm font-bold text-[var(--primary-dark)]">{formatMoney(line.product.precio)}</p>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className="btn btn-secondary min-h-9 px-3" aria-label={`Quitar una unidad de ${line.product.nombre}`} onClick={() => setQuantity(line.product.id, line.quantity - 1)}>−</button>
                <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">{line.quantity}</span>
                <button type="button" className="btn btn-secondary min-h-9 px-3" aria-label={`Agregar una unidad de ${line.product.nombre}`} onClick={() => setQuantity(line.product.id, line.quantity + 1)}>+</button>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between">
              <strong>{formatMoney(line.product.precio * line.quantity)}</strong>
              <button type="button" className="text-sm font-semibold text-[var(--danger)] hover:underline" onClick={() => remove(line.product.id)}>Quitar</button>
            </div>
          </div>
        ))}
      </section>

      <aside className="surface h-fit p-5">
        <h2 className="text-lg font-black">Resumen</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Delivery</span><span>Se calcula al finalizar</span></div>
          <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 text-base"><strong>Total estimado</strong><strong>{formatMoney(subtotal)}</strong></div>
        </div>
        <div className={`gift-box mt-4 ${gift.qualifies ? "qualified" : ""}`}>
          <p className="gift-box-title">{gift.qualifies ? "🎉 ¡Tu pedido incluye regalo sorpresa!" : "🎁 Te falta poco para tu regalo sorpresa"}</p>
          <p className="gift-box-text">{gift.qualifies ? "Se agrega automáticamente al confirmar el pedido." : `Agrega ${formatMoney(gift.missing)} más y lo desbloqueas. El monto mínimo es S/ ${GIFT_THRESHOLD}.`}</p>
          <div className="gift-progress" role="progressbar" aria-label="Progreso para el regalo sorpresa" aria-valuemin={0} aria-valuemax={GIFT_THRESHOLD} aria-valuenow={Math.round(gift.total)}>
            <span style={{ width: `${Math.round(gift.ratio * 100)}%` }} />
          </div>
        </div>
        <Link href="/checkout" className="btn btn-primary mt-5 w-full">Finalizar compra</Link>
        <button type="button" className="btn btn-quiet mt-2 w-full text-sm" onClick={clear}>Vaciar carrito</button>
        <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">El total definitivo y el costo de delivery se calculan en el servidor antes de confirmar el pago.</p>
      </aside>
    </div>
  );
}
