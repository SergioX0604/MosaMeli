"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  createOrderAction,
  declararPagoAction,
  quoteDeliveryAction,
  type CreateOrderResult,
  type DeclarePaymentResult,
  type DeliveryQuoteResult,
} from "@/app/checkout/actions";
import { DeliveryMap } from "@/components/delivery-map";
import { PaymentInstructions } from "@/components/payment-instructions";
import { useCartStore } from "@/lib/cart-store";
import {
  DELIVERY_ORIGIN,
  giftProgress,
  haversineKm,
  isDeliverable,
  zoneForDistance,
} from "@/lib/delivery";
import { cartSubtotal, formatMoney } from "@/lib/money";
import type { CartLine } from "@/lib/types";

const paymentMethods = [
  {
    value: "plin",
    label: "Plin",
    description: "Escanea el QR y paga desde tu celular",
  },
  { value: "yape", label: "Yape", description: "Paga rápido con Yape" },
  {
    value: "transferencia",
    label: "Transferencia",
    description: "Transferencia bancaria Interbank",
  },
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
  const [position, setPosition] = useState({
    lat: DELIVERY_ORIGIN.lat,
    lng: DELIVERY_ORIGIN.lng,
  });
  const [positionConfirmed, setPositionConfirmed] = useState(false);
  const [quote, setQuote] = useState<DeliveryQuoteResult | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [payment, setPayment] =
    useState<(typeof paymentMethods)[number]["value"]>("plin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateOrderResult | null>(null);
  const [submittedItems, setSubmittedItems] = useState<CartLine[]>([]);
  const [declared, setDeclared] = useState<DeclarePaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [pending, startTransition] = useTransition();
  const idempotencyKeyRef = useRef<string | null>(null);

  const distance = useMemo(
    () =>
      haversineKm(
        DELIVERY_ORIGIN.lat,
        DELIVERY_ORIGIN.lng,
        position.lat,
        position.lng,
      ),
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
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        });
        setPositionConfirmed(true);
        setQuote(null);
      },
      () =>
        setError("No pudimos obtener tu ubicación. Marca el punto en el mapa."),
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
      setError(
        "Marca el punto exacto de entrega en el mapa o usa tu ubicación.",
      );
      return;
    }
    if (!deliverable || !quote?.ok) {
      setError(
        "Tu ubicación está fuera de la zona de cobertura. Contáctanos por WhatsApp para revisar el envío.",
      );
      return;
    }

    const payload = {
      items: items.map((line) => ({
        id: line.product.id,
        cantidad: line.quantity,
      })),
      metodo_pago: payment,
      direccion: address.trim(),
      lat: position.lat,
      lng: position.lng,
      notas: notes.trim(),
      idempotencyKey: (idempotencyKeyRef.current ??= persistentCheckoutKey()),
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (!result.ok) {
        setError(result.message ?? "No pudimos confirmar el pedido");
        return;
      }
      setSubmittedItems(
        items.map((line) => ({ ...line, product: { ...line.product } })),
      );
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
      setPaymentError(
        "No pudimos registrar tu pago. Inténtalo de nuevo en un momento.",
      );
    } finally {
      setPaymentPending(false);
    }
  }

  if (success?.ok) {
    const confirmedTotal = Number(success.total ?? 0);
    const confirmedDelivery = Number(success.deliveryCost ?? 0);
    const confirmedSubtotal = Math.max(0, confirmedTotal - confirmedDelivery);
    const reservationTime = success.reservationExpiresAt
      ? new Date(success.reservationExpiresAt).toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div className="checkout-success-page">
        <div
          className="purchase-progress checkout-success-progress"
          aria-label="Progreso de compra"
        >
          <div className="complete">
            <span>✓</span>
            <p>
              <strong>Carrito</strong>
              <small>Productos revisados</small>
            </p>
          </div>
          <i />
          <div className="complete">
            <span>✓</span>
            <p>
              <strong>Envío</strong>
              <small>Ubicación confirmada</small>
            </p>
          </div>
          <i />
          <div className={declared ? "complete" : "active"}>
            <span>{declared ? "✓" : "3"}</span>
            <p>
              <strong>Confirmación</strong>
              <small>{declared ? "Aviso recibido" : "Pago pendiente"}</small>
            </p>
          </div>
        </div>

        <section
          className={`checkout-success-hero ${declared ? "is-declared" : ""}`}
        >
          <div className="checkout-success-icon" aria-hidden="true">
            {declared ? "✓" : "⌁"}
          </div>
          <h1>
            {declared
              ? "Aviso de pago recibido"
              : "Pedido registrado · pago pendiente"}
          </h1>
          <p>
            {declared ? (
              <>
                Recibimos tu aviso. El administrador verificará el abono antes
                de cambiar el estado a <strong>Pago verificado</strong> y
                continuar con el despacho.
              </>
            ) : (
              <>
                Guardamos tu pedido. Realiza el pago con los datos indicados y
                luego presiona <strong>“Ya hice el pago”</strong> para
                avisarnos.
              </>
            )}
          </p>
          {reservationTime && !declared ? (
            <span className="reservation-pill">
              <b aria-hidden="true">◷</b> Tu stock queda reservado hasta las{" "}
              {reservationTime}
            </span>
          ) : null}
        </section>

        <div className="checkout-success-layout">
          <div className="checkout-success-main">
            <section className="checkout-ticket-card">
              <header>
                <div>
                  <small>Detalles del pedido</small>
                  <h2>
                    Pedido #{success.orderId}{" "}
                    <span>
                      {declared ? "Pago informado" : "Pendiente de pago"}
                    </span>
                  </h2>
                </div>
                <div>
                  <small>Total a pagar</small>
                  <strong>{formatMoney(confirmedTotal)}</strong>
                </div>
              </header>
              <div className="checkout-ticket-summary">
                <p>
                  Resumen de artículos (
                  {submittedItems.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                  {submittedItems.reduce(
                    (sum, line) => sum + line.quantity,
                    0,
                  ) === 1
                    ? "producto"
                    : "productos"}
                  )
                </p>
                <div className="checkout-ticket-items">
                  {submittedItems.map((line) => (
                    <article key={line.product.id}>
                      <img
                        src={line.product.imagen}
                        alt={line.product.nombre}
                      />
                      <div>
                        <strong>{line.product.nombre}</strong>
                        <small>
                          {line.product.categoria} · Cantidad: {line.quantity}
                        </small>
                      </div>
                      <b>{formatMoney(line.product.precio * line.quantity)}</b>
                    </article>
                  ))}
                </div>
              </div>
              <div className="checkout-ticket-totals">
                <p>
                  <span>Subtotal</span>
                  <strong>{formatMoney(confirmedSubtotal)}</strong>
                </p>
                <p>
                  <span>Delivery</span>
                  <strong>{formatMoney(confirmedDelivery)}</strong>
                </p>
              </div>
              <p className="checkout-delivery-line">
                <span aria-hidden="true">▱</span>
                <strong>Entrega en:</strong> {address}
              </p>
            </section>

            {!declared ? (
              <section className="checkout-payment-steps">
                <h2>
                  <span aria-hidden="true">☷</span> ¿Cómo realizar tu pago con{" "}
                  {payment === "transferencia"
                    ? "transferencia"
                    : payment === "plin"
                      ? "Plin"
                      : "Yape"}
                  ?
                </h2>
                <ol>
                  <li>
                    <span>1</span>
                    <p>
                      <strong>Abre tu aplicación bancaria</strong>
                      <small>
                        Ingresa a tu billetera digital o banca móvil habitual.
                      </small>
                    </p>
                  </li>
                  <li>
                    <span>2</span>
                    <p>
                      <strong>
                        {payment === "transferencia"
                          ? "Copia los datos bancarios"
                          : "Escanea el código QR"}
                      </strong>
                      <small>
                        Usa la información mostrada y revisa el nombre del
                        titular.
                      </small>
                    </p>
                  </li>
                  <li>
                    <span>3</span>
                    <p>
                      <strong>Confirma el importe exacto</strong>
                      <small>
                        El monto a transferir debe ser{" "}
                        {formatMoney(confirmedTotal)}.
                      </small>
                    </p>
                  </li>
                </ol>
              </section>
            ) : null}

            <section
              className={`checkout-payment-action ${declared ? "is-declared" : ""}`}
            >
              {declared ? (
                <div className="declared-payment-result" role="status">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Su pedido fue recibido</strong>
                    <p>
                      Se procederá con el despacho después de verificar el pago.
                      Código de seguimiento: <b>{declared.trackingCode}</b>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="payment-reconciliation-note">
                  <span aria-hidden="true">✉</span>Al presionar{" "}
                  <strong>“Ya hice el pago”</strong>, registraremos tu aviso
                  para que el administrador verifique el abono.
                </p>
              )}
              {paymentError ? (
                <div className="alert alert-error" role="alert">
                  {paymentError}
                </div>
              ) : null}
              {declared?.notificationPending ? (
                <div className="alert alert-info" role="status">
                  Tu aviso quedó registrado, pero el correo está pendiente de
                  reintento.
                </div>
              ) : null}
              {!declared ? (
                <button
                  type="button"
                  className="btn btn-primary checkout-payment-declare"
                  disabled={paymentPending}
                  onClick={declarePayment}
                >
                  {paymentPending
                    ? "Registrando tu aviso…"
                    : "✓  Ya hice el pago"}
                </button>
              ) : declared.trackingToken ? (
                <Link
                  className="btn btn-primary checkout-payment-declare"
                  href={`/seguimiento/${declared.trackingToken}`}
                >
                  Ver seguimiento seguro
                </Link>
              ) : null}
              <div className="checkout-success-links">
                <Link href="/mi-perfil">Ver mis pedidos</Link>
                <Link href="/">Seguir comprando</Link>
              </div>
            </section>
          </div>

          <aside className="checkout-payment-aside">
            {!declared ? (
              <PaymentInstructions method={payment} total={confirmedTotal} />
            ) : (
              <div className="payment-declared-card">
                <span aria-hidden="true">✓</span>
                <h2>Pago informado</h2>
                <p>
                  Tu aviso ya está en la pestaña del administrador para su
                  verificación.
                </p>
                <strong>{declared.trackingCode}</strong>
              </div>
            )}
          </aside>
        </div>

        <section
          className="checkout-trust-row"
          aria-label="Beneficios de compra"
        >
          <article>
            <span>♢</span>
            <p>
              <strong>Pago protegido</strong>
              <small>Validación directa y segura.</small>
            </p>
          </article>
          <article>
            <span>▣</span>
            <p>
              <strong>Stock reservado</strong>
              <small>Durante tu ventana de pago.</small>
            </p>
          </article>
          <article>
            <span>◉</span>
            <p>
              <strong>Atención inmediata</strong>
              <small>Soporte directo por WhatsApp.</small>
            </p>
          </article>
        </section>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="surface mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-black">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Agrega productos antes de continuar.
        </p>
        <Link className="btn btn-primary mt-5" href="/#catalogo">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        className="purchase-progress checkout-progress"
        aria-label="Progreso de compra"
      >
        <div className="complete">
          <span>✓</span>
          <p>
            <strong>Carrito de compras</strong>
            <small>Productos revisados</small>
          </p>
        </div>
        <i />
        <div className="active">
          <span>2</span>
          <p>
            <strong>Entrega y ubicación</strong>
            <small>Paso actual</small>
          </p>
        </div>
        <i />
        <div>
          <span>3</span>
          <p>
            <strong>Confirmación y pago</strong>
            <small>Último paso seguro</small>
          </p>
        </div>
      </div>
      <div className="secure-purchase-banner checkout-secure-banner">
        <span aria-hidden="true">♢</span>
        <p>
          <strong>Proceso de compra protegido</strong>
          <small>Tu información y tu pedido se procesan de forma segura.</small>
        </p>
        <b>SSL seguro</b>
      </div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-main-column">
          <section className="surface checkout-intro-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">Finalizar compra</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Confirma tu ubicación antes de mostrar el monto final.
                </p>
              </div>
              <span className="badge">Seguro</span>
            </div>
            {error ? (
              <div className="alert alert-error mt-4" role="alert">
                {error}
              </div>
            ) : null}
          </section>

          <section className="surface checkout-section-card delivery-section-card">
            <div className="checkout-section-title">
              <span aria-hidden="true">⌖</span>
              <div>
                <h2>Dirección de entrega</h2>
                <p>
                  Indica el punto exacto para calcular una tarifa transparente.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary min-h-10 px-3 text-sm"
                onClick={useMyLocation}
              >
                Usar mi ubicación
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="form-label" htmlFor="delivery-address">
                  Dirección
                </label>
                <input
                  id="delivery-address"
                  className="form-input"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Calle, número, referencia"
                  autoComplete="street-address"
                  required
                />
              </div>
              <DeliveryMap
                lat={position.lat}
                lng={position.lng}
                onChange={handlePositionChange}
              />
              <div
                className={`alert ${quote?.ok ? "alert-success" : quote && !quote.ok ? "alert-error" : "alert-info"}`}
                role="status"
              >
                {!positionConfirmed
                  ? "Marca en el mapa el punto exacto donde entregaremos el pedido."
                  : quotePending
                    ? "Calculando la tarifa oficial…"
                    : quote?.ok
                      ? `Zona: ${zone.nombre} · ${Number(quote.distance).toFixed(1)} km · Delivery final: ${formatMoney(deliveryCost)}`
                      : (quote?.message ??
                        "No pudimos cotizar esta ubicación.")}
              </div>
              {quote?.ok && (quote.nightSurcharge || quote.sundaySurcharge) ? (
                <p className="text-xs text-[var(--muted)]">
                  Incluye{" "}
                  {quote.nightSurcharge
                    ? `${formatMoney(quote.nightSurcharge)} por horario nocturno`
                    : ""}
                  {quote.nightSurcharge && quote.sundaySurcharge ? " y " : ""}
                  {quote.sundaySurcharge
                    ? `${formatMoney(quote.sundaySurcharge)} por domingo`
                    : ""}
                  .
                </p>
              ) : null}
              <div>
                <label className="form-label" htmlFor="delivery-notes">
                  Notas para el repartidor{" "}
                  <span className="font-normal text-[var(--muted)]">
                    (opcional)
                  </span>
                </label>
                <textarea
                  id="delivery-notes"
                  className="form-textarea"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  placeholder="Referencia, punto de encuentro, etc."
                />
              </div>
            </div>
          </section>

          <section className="surface checkout-section-card payment-section-card">
            <div className="checkout-section-title">
              <span aria-hidden="true">▣</span>
              <div>
                <h2>Método de pago seguro</h2>
                <p>Elige la opción que prefieras para completar tu compra.</p>
              </div>
            </div>
            <div className="payment-method-grid">
              {paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className={`payment-method-option ${payment === method.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.value}
                    checked={payment === method.value}
                    onChange={() => setPayment(method.value)}
                    className="h-5 w-5 accent-[var(--primary)]"
                  />
                  <span>
                    <strong className="block">{method.label}</strong>
                    <span className="text-sm text-[var(--muted)]">
                      {method.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="alert alert-info mt-4">
              Después de confirmar el pedido mostraremos el monto final y los
              datos para pagar. No realices una transferencia antes de verlos.
            </p>
          </section>
        </div>

        <aside className="surface checkout-summary-card">
          <div className="cart-section-heading">
            <span aria-hidden="true">▤</span>
            <h2>Resumen del pedido</h2>
          </div>
          <div className="mt-4 space-y-3 border-b border-[var(--border)] pb-4 text-sm">
            {items.map((line) => (
              <div key={line.product.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {line.quantity}× {line.product.nombre}
                </span>
                <strong>
                  {formatMoney(line.product.precio * line.quantity)}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Delivery</span>
              <strong>{quote?.ok ? formatMoney(deliveryCost) : "—"}</strong>
            </div>
            <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 text-base">
              <strong>Total final</strong>
              <strong>{quote?.ok ? formatMoney(total) : "—"}</strong>
            </div>
          </div>
          {gift.qualifies ? (
            <p className="gift-box qualified mt-4">
              <span className="gift-box-title">
                🎉 Tu pedido incluye regalo sorpresa.
              </span>
            </p>
          ) : (
            <p className="gift-box mt-4">
              <span className="gift-box-title">
                🎁 Te faltan {formatMoney(gift.missing)} para tu regalo sorpresa
              </span>
              <span className="gift-box-text">
                El monto mínimo se calcula sobre los productos, sin delivery.
              </span>
            </p>
          )}
          <button
            className="btn btn-primary checkout-submit-button"
            type="submit"
            disabled={
              pending || quotePending || !positionConfirmed || !quote?.ok
            }
          >
            {pending
              ? "Creando pedido…"
              : quotePending
                ? "Calculando delivery…"
                : quote?.ok
                  ? `Confirmar pedido · ${formatMoney(total)}`
                  : "Confirma tu ubicación"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
            El servidor volverá a calcular precio, stock, delivery y total antes
            de guardar el pedido.
          </p>
          <div className="purchase-benefits compact">
            <p>
              <span>✓</span>
              <strong>
                Precios verificados<small>Sin costos ocultos</small>
              </strong>
            </p>
            <p>
              <span>✓</span>
              <strong>
                Stock reservado<small>30 minutos al confirmar</small>
              </strong>
            </p>
            <p>
              <span>✓</span>
              <strong>
                Seguimiento seguro<small>Desde tu cuenta</small>
              </strong>
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
