"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createOrderAction, declararPagoAction, quoteDeliveryAction, type CreateOrderResult, type DeclarePaymentResult, type DeliveryQuoteResult } from "@/app/checkout/actions";
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
const CHECKOUT_KEY = "mosameli-checkout-idempotency";

function persistentCheckoutKey(): string {
  const stored = window.sessionStorage.getItem(CHECKOUT_KEY);
  if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(CHECKOUT_KEY, created);
  return created;
}

export function CheckoutClient() {
  const { items, clear } = useCartStore();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [position, setPosition] = useState({ lat: DELIVERY_ORIGIN.lat, lng: DELIVERY_ORIGIN.lng });
  const [positionConfirmed, setPositionConfirmed] = useState(false);
  const [quote, setQuote] = useState<DeliveryQuoteResult | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [payment, setPayment] = useState<(typeof paymentMethods)[number]["value"]>("plin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateOrderResult | null>(null);
  const [declared, setDeclared] = useState<DeclarePaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [pending, startTransition] = useTransition();
  const idempotencyKeyRef = useRef<string | null>(null);

  const distance = useMemo(
    () => haversineKm(DELIVERY_ORIGIN.lat, DELIVERY_ORIGIN.lng, position.lat, position.lng),
    [position],
  );
  const zone = zoneForDistance(distance);
  const deliverable = isDeliverable(distance);
  const deliveryCost = quote?.ok ? Number(quote.cost ?? 0) : 0;
  const subtotal = cartSubtotal(items);
  const total = subtotal + deliveryCost;
  const gift = giftProgress(subtotal);

  const handlePositionChange = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
    setPositionConfirmed(true);
    setQuote(null);
  }, []);

  useEffect(() => {
    if (!positionConfirmed) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setQuotePending(true);
      const result = await quoteDeliveryAction(position);
      if (!cancelled) {
        setQuote(result);
        setQuotePending(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [position, positionConfirmed]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta la geolocalización.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setPositionConfirmed(true);
        setQuote(null);
      },
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
    if (!positionConfirmed) {
      setError("Marca el punto exacto de entrega en el mapa o usa tu ubicación.");
      return;
    }
    if (!deliverable || !quote?.ok) {
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
      idempotencyKey: idempotencyKeyRef.current ??= persistentCheckoutKey(),
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (!result.ok) {
        setError(result.message ?? "No pudimos confirmar el pedido");
        return;
      }
      clear();
      idempotencyKeyRef.current = null;
      window.sessionStorage.removeItem(CHECKOUT_KEY);
      setSuccess(result);
    });
  }

  async function declarePayment() {
    if (!success?.orderId) return;
    setPaymentPending(true);
    setPaymentError(null);
    try {
      const result = await declararPagoAction(success.orderId);
      if (!result.ok) {
        setPaymentError(result.message ?? "No pudimos registrar tu pago");
        return;
      }
      setDeclared(result);
    } catch {
      setPaymentError("No pudimos registrar tu pago. Inténtalo de nuevo en un momento.");
    } finally {
      setPaymentPending(false);
    }
  }

  if (success?.ok) {
    return (
      <div className="surface mx-auto max-w-2xl p-6 text-center md:p-10">
        <div className="text-5xl" aria-hidden="true">🎉</div>
        <h1 className="mt-4 text-3xl font-black">Pedido confirmado</h1>
        <p className="mx-auto mt-2 max-w-lg text-[var(--muted)]">
          Guardamos tu pedido. Realiza el pago con los datos que aparecen abajo y, cuando lo hagas, presiona
          <strong className="text-[var(--text)]"> Ya hice el pago </strong>
          para recibir tu código de seguimiento.
        </p>

        <div className="mt-6 rounded-2xl bg-[var(--brand-50)] p-5">
          <p className="text-sm text-[var(--muted)]">Total a pagar: <strong className="text-[var(--text)]">{formatMoney(success.total ?? 0)}</strong></p>
          <p className="mt-1 text-sm text-[var(--muted)]">N.º de pedido: <strong className="text-[var(--text)]">#{success.orderId}</strong></p>
          {success.reservationExpiresAt ? <p className="mt-1 text-xs text-[var(--muted)]">Tu stock queda reservado hasta las {new Date(success.reservationExpiresAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}.</p> : null}
        </div>

        <PaymentInstructions method={payment} total={success.total ?? 0} />

        {declared ? (
          <div className="mt-6 rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-5" role="status">
            <p className="text-sm font-bold text-[#065f46]">Registramos tu pago. Este es tu código de seguimiento:</p>
            <p className="mt-2 text-2xl font-black tracking-wider text-[#065f46]">{declared.trackingCode}</p>
            <p className="mt-2 text-xs text-[#047857]">Guárdalo: con él puedes consultar el estado de tu pedido cuando quieras.</p>
            {declared.trackingToken ? (
              <Link className="btn btn-primary mt-4" href={`/seguimiento/${declared.trackingToken}`}>Ver seguimiento seguro</Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-6">
            {paymentError ? <div className="alert alert-error" role="alert">{paymentError}</div> : null}
            <button type="button" className="btn btn-primary w-full text-base" disabled={paymentPending} onClick={declarePayment}>
              {paymentPending ? "Registrando tu pago…" : "Ya hice el pago"}
            </button>
            <p className="mt-2 text-xs text-[var(--muted)]">Presiona este botón después de realizar el pago para obtener tu código de seguimiento.</p>
          </div>
        )}

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
            <div className={`alert ${quote?.ok ? "alert-success" : quote && !quote.ok ? "alert-error" : "alert-info"}`} role="status">
              {!positionConfirmed
                ? "Marca en el mapa el punto exacto donde entregaremos el pedido."
                : quotePending
                  ? "Calculando la tarifa oficial…"
                  : quote?.ok
                    ? `Zona: ${zone.nombre} · ${Number(quote.distance).toFixed(1)} km · Delivery final: ${formatMoney(deliveryCost)}`
                    : quote?.message ?? "No pudimos cotizar esta ubicación."}
            </div>
            {quote?.ok && (quote.nightSurcharge || quote.sundaySurcharge) ? <p className="text-xs text-[var(--muted)]">Incluye {quote.nightSurcharge ? `${formatMoney(quote.nightSurcharge)} por horario nocturno` : ""}{quote.nightSurcharge && quote.sundaySurcharge ? " y " : ""}{quote.sundaySurcharge ? `${formatMoney(quote.sundaySurcharge)} por domingo` : ""}.</p> : null}
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
        <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><div className="flex justify-between"><span className="text-[var(--muted)]">Delivery</span><strong>{quote?.ok ? formatMoney(deliveryCost) : "—"}</strong></div><div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 text-base"><strong>Total final</strong><strong>{quote?.ok ? formatMoney(total) : "—"}</strong></div></div>
        {gift.qualifies ? <p className="gift-box qualified mt-4"><span className="gift-box-title">🎉 Tu pedido incluye regalo sorpresa.</span></p> : <p className="gift-box mt-4"><span className="gift-box-title">🎁 Te faltan {formatMoney(gift.missing)} para tu regalo sorpresa</span><span className="gift-box-text">El monto mínimo se calcula sobre los productos, sin delivery.</span></p>}
        <button className="btn btn-primary mt-5 w-full" type="submit" disabled={pending || quotePending || !positionConfirmed || !quote?.ok}>{pending ? "Creando pedido…" : quotePending ? "Calculando delivery…" : "Confirmar pedido"}</button>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">El servidor volverá a calcular precio, stock, delivery y total antes de guardar el pedido.</p>
      </aside>
    </form>
  );
}
