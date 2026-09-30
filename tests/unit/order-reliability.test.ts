import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nextOrderStatuses } from "@/lib/order-transitions";

const migration = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "202609290004_checkout_reliability.sql"),
  "utf8",
);

describe("flujo seguro de estados", () => {
  it("solo permite avanzar o cancelar antes del reparto", () => {
    expect(nextOrderStatuses("pedido_recibido")).toEqual(["pago_verificado", "cancelado"]);
    expect(nextOrderStatuses("pago_verificado")).toEqual(["en_preparacion", "cancelado"]);
    expect(nextOrderStatuses("en_preparacion")).toEqual(["en_camino", "cancelado"]);
    expect(nextOrderStatuses("en_camino")).toEqual(["entregado"]);
    expect(nextOrderStatuses("entregado")).toEqual([]);
    expect(nextOrderStatuses("cancelado")).toEqual([]);
  });
});

describe("migracion de fiabilidad", () => {
  it("reserva y libera stock de forma idempotente", () => {
    expect(migration).toContain("reserva_expira_en");
    expect(migration).toContain("stock_liberado_en is not null then return");
    expect(migration).toContain("set stock = stock + v_item.cantidad");
  });

  it("reutiliza pedidos con la misma clave devolviendo el total", () => {
    expect(migration).toMatch(/'total', v_existing\.total/);
    expect(migration).toMatch(/'reutilizado', true/);
  });

  it("centraliza la cotizacion y protege las transiciones", () => {
    expect(migration).toContain("function public.cotizar_delivery");
    expect(migration).toContain("raise exception 'TRANSICION_INVALIDA'");
    expect(migration).toContain("raise exception 'PAGO_NO_DECLARADO'");
  });
});
