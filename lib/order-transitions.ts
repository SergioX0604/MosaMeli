import type { OrderStatus } from "@/lib/types";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pedido_recibido: ["pago_verificado", "cancelado"],
  pago_verificado: ["en_preparacion", "cancelado"],
  en_preparacion: ["en_camino", "cancelado"],
  en_camino: ["entregado"],
  entregado: [],
  cancelado: [],
};

export function nextOrderStatuses(status: string): OrderStatus[] {
  return ORDER_TRANSITIONS[status as OrderStatus] ?? [];
}
