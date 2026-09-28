import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createOrderSchema, orderItemSchema } from "@/lib/validation";

/**
 * El RPC crear_pedido interpreta el carrito con
 *   jsonb_to_recordset(p_items) as item(id bigint, cantidad integer)
 * Si el navegador manda otra clave (por ejemplo `quantity`), Postgres no la ve,
 * `cantidad` llega NULL y el pedido se rechaza con CANTIDAD_INVALIDA.
 * Esta prueba lee la migración y verifica que el payload coincida.
 */
function sqlItemColumns(): string[] {
  const sql = readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "202609260001_p0_security.sql"),
    "utf8",
  );
  const match = sql.match(/jsonb_to_recordset\(p_items\)\s+as item\(([^)]*)\)/i);
  if (!match) throw new Error("No se encontró jsonb_to_recordset(p_items) en la migración");
  return match[1].split(",").map((column) => column.trim().split(/\s+/)[0].toLowerCase());
}

describe("contrato del carrito con el RPC crear_pedido", () => {
  const columns = sqlItemColumns();

  it("el SQL espera las claves id y cantidad", () => {
    expect(columns).toEqual(["id", "cantidad"]);
  });

  it("el esquema de Zod usa las mismas claves que el SQL", () => {
    expect(Object.keys(orderItemSchema.shape).sort()).toEqual([...columns].sort());
  });

  it("rechaza el payload antiguo con `quantity`", () => {
    const parsed = orderItemSchema.safeParse({ id: 1, quantity: 2 });
    expect(parsed.success).toBe(false);
  });

  it("acepta el payload con `cantidad` y lo conserva como entero", () => {
    const parsed = orderItemSchema.safeParse({ id: 7, cantidad: 2 });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ id: 7, cantidad: 2 });
  });

  it("valida el pedido completo como lo arma el checkout", () => {
    const payload = {
      items: [
        { id: 1, cantidad: 1 },
        { id: 4, cantidad: 2 },
      ],
      metodo_pago: "yape",
      direccion: "Calle los Amancaes Mz Q1 Lt 7A",
      lat: -11.97,
      lng: -76.78,
      notas: "",
      idempotencyKey: "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    };
    const parsed = createOrderSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // El Server Action convierte a la forma que espera el RPC.
    const pItems = parsed.data.items.map((item) => ({ id: item.id, cantidad: item.cantidad }));
    expect(Object.keys(pItems[0])).toEqual(columns);
  });

  it("no acepta cantidades fraccionarias, cero o negativas", () => {
    expect(orderItemSchema.safeParse({ id: 1, cantidad: 1.5 }).success).toBe(false);
    expect(orderItemSchema.safeParse({ id: 1, cantidad: 0 }).success).toBe(false);
    expect(orderItemSchema.safeParse({ id: 1, cantidad: -3 }).success).toBe(false);
    expect(orderItemSchema.safeParse({ id: 1, cantidad: 100 }).success).toBe(false);
  });
});
