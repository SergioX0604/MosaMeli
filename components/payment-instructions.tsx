"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { PAYMENT_DETAILS } from "@/lib/payment";

type PaymentMethod = keyof typeof PAYMENT_DETAILS;

export function PaymentInstructions({ method, total }: { method: PaymentMethod; total: number }) {
  const [copied, setCopied] = useState(false);
  const details = PAYMENT_DETAILS[method];

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--brand-50)] p-4">
      <h3 className="font-black">Instrucciones para {details.label}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">Monto a pagar: <strong>S/ {total.toFixed(2)}</strong></p>
      {"qrUrl" in details ? <div className="mt-4 flex flex-col items-center gap-2"><img src={details.qrUrl} alt={`Código QR de ${details.label}`} className="h-48 w-48 rounded-2xl bg-white object-contain p-2" /><span className="text-xs text-[var(--muted)]">Escanea el QR y confirma el pago.</span></div> : null}
      {"cci" in details ? <div className="mt-4 space-y-2 text-sm"><p><strong>Banco:</strong> {details.banco}</p><p><strong>Tipo:</strong> {details.tipoCuenta}</p><p><strong>Cuenta:</strong> {details.numeroCuenta}</p><p className="flex items-center gap-2"><strong>CCI:</strong> {details.cci}<button type="button" className="btn btn-secondary min-h-8 px-2 text-xs" onClick={() => copy(details.cci)}>{copied ? "Copiado" : "Copiar"}</button></p><p><strong>Titular:</strong> {details.titular}</p></div> : null}
    </div>
  );
}
