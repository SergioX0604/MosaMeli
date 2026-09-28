"use client";

import Link from "next/link";
import { useState } from "react";
import { declararPagoAction, type DeclarePaymentResult } from "@/app/checkout/actions";

/**
 * Boton "Ya hice el pago" para cuando el cliente salio del checkout antes de
 * confirmar. El codigo de seguimiento llega del servidor recien al pulsarlo.
 */
export function DeclarePaymentButton({ orderId }: { orderId: number }) {
  const [result, setResult] = useState<DeclarePaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function declarar() {
    setPending(true);
    setError(null);
    try {
      const respuesta = await declararPagoAction(orderId);
      if (!respuesta.ok) {
        setError(respuesta.message ?? "No pudimos registrar tu pago");
        return;
      }
      setResult(respuesta);
    } catch {
      setError("No pudimos registrar tu pago. Inténtalo de nuevo en un momento.");
    } finally {
      setPending(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-3">
        <p className="text-xs font-bold text-[#065f46]">Pago registrado ✅</p>
        <p className="mt-1 text-lg font-black tracking-wider text-[#065f46]">{result.trackingCode}</p>
        {result.trackingToken ? (
          <Link className="btn btn-secondary mt-2 min-h-9 px-3 text-sm" href={`/seguimiento/${result.trackingToken}`}>
            Ver seguimiento
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full sm:w-auto">
      {error ? <p className="mb-2 text-xs font-semibold text-[var(--danger)]">{error}</p> : null}
      <button type="button" className="btn btn-primary min-h-9 w-full px-3 text-sm sm:w-auto" disabled={pending} onClick={declarar}>
        {pending ? "Registrando…" : "Ya hice el pago"}
      </button>
    </div>
  );
}
