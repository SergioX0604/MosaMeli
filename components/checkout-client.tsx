"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createOrderAction, type CreateOrderResult } from "@/app/checkout/actions";
import { DeliveryMap } from "@/components/delivery-map";
import { PaymentInstructions } from "@/components/payment-instructions";
import { useCartStore } from "@/lib/cart-store";
import { DELIVERY_ORIGIN, giftProgress, haversineKm, isDeliverable, zoneForDistance } from "@/lib/delivery";
import { cartSubtotal, formatMoney } from "@/lib/money";

const paymentMethods = [
  { value: "plin", label: "Plin", description: "Escanea el QR y paga desde tu celular" },
  { value: "yape", label: "Yape", description: "Paga rápido con Yape" },
  { value: "transferencia", label: "Transferencia", description: "Transferencia bancaria Interbank" },
] as const;

export function CheckoutClient() {
  const { items, clear } = useCartStore();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [position, setPosition] = useState({ lat: DELIVERY_ORIGIN.lat, lng: DELIVERY_ORIGIN.lng });
  const [payment, setPayment] = useState<(typeof paymentMethods)[number]["value"]>("plin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateOrderResult | null>(null);
  const [pending, startTransition] = useTransition();

  const distance = useMemo(
    () => haversineKm(DELIVERY_ORIGIN.lat, DELIVERY_ORIGIN.lng, position.lat, position.lng),
    [position],
  );
  const zone = zoneForDistance(distance);
  const deliverable = isDeliverable(distance);
  const deliveryCost = deliverable ? zone.costo : 0;
  const subtotal = cartSubtotal(items);
  const total = subtotal + deliveryCost;
  const gift = giftProgress(subtotal);

  const handlePositionChange = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta la geolocalización.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (result) => setPosition({ lat: result.coords.latitude, lng: result.coords.longitude }),
      () => setError("No pudimos obtener tu ubicación. Marca el punto en el mapa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!address.trim()) {
      setError("Escribe o selecciona una dirección de entrega.");
      return;
    }
    if (!deliverable) {
      setError("Tu ubicación está fuera de la zona de cobertura. Contáctanos por WhatsApp para revisar el envío.");
      return;
    }

    const payload = {
      items: items.map((line) => ({ id: line.product.id, cantidad: line.quantity })),
      metodo_pago: payment,
      direccion: address.trim(),
      lat: position.lat,
      lng: position.lng,
      notas: notes.trim(),
      idempotencyKey: crypto.randomUUID(),
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (!result.ok) {
        setError(result.message ?? "No pudimos confirmar el pedido");
        return;
      }
      clear();
      setSuccess(result);
    });
  }

  if (success?.ok) {
    return (
      <div className="surface mx-auto max-w-2xl p-6 text-center md:p-10">
        <div className="text-5xl" aria-hidden="true">🎉</div>
        <h1 className="mt-4 text-3xl font-black">Pedido confirmado</h1>
        <p className="mt-2 text-[var(--muted)]">Guardamos tu pedido. Realiza el pago con los datos que aparecen debajo y espera la verificación.</p>
        <div className="mt-6 rounded-2xl bg-[var(--brand-50)] p-5">
          <p className="text-sm text-[var(--muted)]">Total final confirmado: {formatMoney(success.total ?? 0)}</p>
          <p className="mt-3 text-sm text-[var(--muted)]">Código de seguimiento</p>
          <p className="mt-1 text-2xl font-black tracking-wider text-[var(--primary-dark)]">{success.trackingCode}</p>
          {success.trackingToken ? (
            <Link className="btn btn-primary mt-4" href={`/seguimiento/${success.trackingToken}`}>Ver seguimiento seguro</Link>
          ) : null}
        </div>
        <PaymentInstructions method={payment} total={success.total ?? 0} />
        {success.notificationPending ? <p className="alert alert-info mt-5 text-left">El pedido se guardó, pero la notificación por correo está pendiente. Puedes revisar el estado desde tu perfil.</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-secondary" href="/mi-perfil">Ver mis pedidos</Link>
          <Link className="btn btn-primary" href="/">Seguir comprando</Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="surface mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-black">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Agrega productos antes de continuar.</p>
        <Link className="btn btn-primary mt-5" href="/#catalogo">Ir al catálogo</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-5 lg:grid-cols-[1fr_360px]" onSubmit={submit}>
      <div className="space-y-5">
        <section className="surface p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h1 className="text-2xl font-black">Finalizar compra</h1><p className="mt-1 text-sm text-[var(--muted)]">Confirma tu ubicación antes de mostrar el monto final.</p></div>
            <span className="badge">Seguro</span>
          </div>
          {error ? <div className="alert alert-error mt-4" role="alert">{error}</div> : null}
        </section>

        <section className="surface p-5 md:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">1. Ubicación de entrega</h2><button type="button" className="btn btn-secondary min-h-10 px-3 text-sm" onClick={useMyLocation}>Usar mi ubicación</button></div>
          <div className="mt-4 space-y-4">
            <div><label className="form-label" htmlFor="delivery-address">Dirección</label><input id="delivery-address" className="form-input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Calle, número, referencia" autoComplete="street-address" required /></div>
            <DeliveryMap lat={position.lat} lng={position.lng} onChange={handlePositionChange} />
            <div className={`alert ${deliverable ? "alert-success" : "alert-error"}`} role="status">
              {deliverable ? `Zona: ${zone.nombre} · Distancia aproximada: ${distance.toFixed(1)} km · Delivery: ${formatMoney(deliveryCost)}` : "Fuera de cobertura (máximo 10 km)."}
            </div>
            <div><label className="form-label" htmlFor="delivery-notes">Notas para el repartidor <span className="font-normal text-[var(--muted)]">(opcional)</span></label><textarea id="delivery-notes" className="form-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Referencia, punto de encuentro, etc." /></div>
          </div>
        </section>

        <section className="surface p-5 md:p-6">
          <h2 className="text-lg font-black">2. Método de pago</h2>
          <div className="mt-4 grid gap-3">
            {paymentMethods.map((method) => (
              <label key={method.value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${payment === method.value ? "border-[var(--primary)] bg-[var(--brand-50)]" : "border-[var(--border)]"}`}>
                <input type="radio" name="payment" value={method.value} checked={payment === method.value} onChange={() => setPayment(method.value)} className="h-5 w-5 accent-[var(--primary)]" />
                <span><strong className="block">{method.label}</strong><span className="text-sm text-[var(--muted)]">{method.description}</span></span>
              </label>
            ))}
          </div>
          <p className="alert alert-info mt-4">Después de confirmar el pedido mostraremos el monto final y los datos para pagar. No realices una transferencia antes de verlos.</p>
        </section>
      </div>

      <aside className="surface h-fit p-5 md:p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-black">Resumen del pedido</h2>
        <div className="mt-4 space-y-3 border-b border-[var(--border)] pb-4 text-sm">
          {items.map((line) => <div key={line.product.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{line.quantity}× {line.product.nombre}</span><strong>{formatMoney(line.product.precio * line.quantity)}</strong></div>)}
        </div>
        <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><div className="flex justify-between"><span className="text-[var(--muted)]">Delivery</span><strong>{deliverable ? formatMoney(deliveryCost) : "—"}</strong></div><div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 text-base"><strong>Total estimado</strong><strong>{formatMoney(total)}</strong></div></div>
        {gift.qualifies ? <p className="gift-box qualified mt-4"><span className="gift-box-title">🎉 Tu pedido incluye regalo sorpresa.</span></p> : <p className="gift-box mt-4"><span className="gift-box-title">🎁 Te faltan {formatMoney(gift.missing)} para tu regalo sorpresa</span><span className="gift-box-text">El monto mínimo se calcula sobre los productos, sin delivery.</span></p>}
        <button className="btn btn-primary mt-5 w-full" type="submit" disabled={pending || !deliverable}>{pending ? "Creando pedido…" : "Confirmar pedido"}</button>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">El servidor volverá a calcular precio, stock, delivery y total antes de guardar el pedido.</p>
      </aside>
    </form>
  );
}
