"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { PAYMENT_DETAILS } from "@/lib/payment";

type PaymentMethod = keyof typeof PAYMENT_DETAILS;

export function PaymentInstructions({
  method,
  total,
}: {
  method: PaymentMethod;
  total: number;
}) {
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
    <div className="payment-instructions-card">
      <div className="payment-method-chip">
        <span aria-hidden="true">●</span>
        {details.label}
      </div>
      <h2>
        {"qrUrl" in details
          ? "Escanea el código QR"
          : "Realiza la transferencia"}
      </h2>
      <p className="payment-exact-label">Monto exacto a pagar</p>
      <strong className="payment-exact-total">S/ {total.toFixed(2)}</strong>

      {"qrUrl" in details ? (
        <div className="payment-qr-block">
          <img src={details.qrUrl} alt={`Código QR de ${details.label}`} />
          <div className="payment-account-owner">
            <span>Titular de la cuenta</span>
            <strong>{details.titular}</strong>
          </div>
        </div>
      ) : null}

      {"cci" in details ? (
        <div className="payment-bank-details">
          <p>
            <span>Banco</span>
            <strong>{details.banco}</strong>
          </p>
          <p>
            <span>Tipo de cuenta</span>
            <strong>{details.tipoCuenta}</strong>
          </p>
          <p>
            <span>Número de cuenta</span>
            <strong>{details.numeroCuenta}</strong>
          </p>
          <p>
            <span>CCI</span>
            <strong>{details.cci}</strong>
          </p>
          <p>
            <span>Titular</span>
            <strong>{details.titular}</strong>
          </p>
          <button
            type="button"
            className="btn btn-secondary payment-copy-button"
            onClick={() => copy(details.cci)}
          >
            {copied ? "CCI copiado" : "Copiar CCI"}
          </button>
        </div>
      ) : null}

      <p className="payment-help">
        <span aria-hidden="true">●</span> ¿Problemas con tu pago?{" "}
        <a
          href="https://wa.me/51937309837"
          target="_blank"
          rel="noopener noreferrer"
        >
          Escríbenos por WhatsApp
        </a>
      </p>
    </div>
  );
}
