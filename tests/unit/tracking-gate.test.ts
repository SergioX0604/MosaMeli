import { describe, expect, it } from "vitest";
import { trackingDisponible } from "@/lib/orders";

/**
 * El codigo de seguimiento solo se revela cuando el cliente declara el pago
 * o cuando un administrador verifica el pedido.
 */
describe("regla de entrega del codigo de seguimiento", () => {
  it("oculta el codigo en un pedido recien creado sin pago declarado", () => {
    expect(trackingDisponible({ estado: "pedido_recibido", pago_declarado: null })).toBe(false);
  });

  it("lo muestra apenas el cliente declara el pago", () => {
    expect(trackingDisponible({ estado: "pedido_recibido", pago_declarado: "2026-09-28T03:00:00Z" })).toBe(true);
  });

  it("lo muestra si el administrador ya verifico el pago", () => {
    expect(trackingDisponible({ estado: "pago_verificado", pago_declarado: null })).toBe(true);
    expect(trackingDisponible({ estado: "en_camino", pago_declarado: null })).toBe(true);
  });

  it("lo oculta si el pedido fue cancelado y nunca se declaro el pago", () => {
    expect(trackingDisponible({ estado: "cancelado", pago_declarado: null })).toBe(true);
    expect(trackingDisponible({ estado: "pedido_recibido", pago_declarado: null })).toBe(false);
  });

  it("funciona antes de aplicar la migracion (columna ausente = undefined)", () => {
    expect(trackingDisponible({ estado: "pedido_recibido" })).toBe(false);
    expect(trackingDisponible({})).toBe(false);
  });
});
