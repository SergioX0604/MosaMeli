import type { CartLine } from "@/lib/types";

export function toNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatMoney(value: unknown): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(toNumber(value));
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce(
    (total, line) => total + toNumber(line.product.precio) * line.quantity,
    0,
  );
}
