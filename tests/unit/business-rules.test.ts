import { describe, expect, it } from "vitest";
import { DELIVERY_ORIGIN, haversineKm, isDeliverable, zoneForDistance } from "@/lib/delivery";
import { cartSubtotal } from "@/lib/money";
import { createOrderSchema, signUpSchema } from "@/lib/validation";
import type { CartLine, Product } from "@/lib/types";

const product = (id: number, precio: number, stock = 10): Product => ({
  id,
  nombre: `Producto ${id}`,
  categoria: "hogar",
  precio,
  imagen: "https://example.com/image.png",
  stock,
});

describe("delivery rules", () => {
  it("calcula zonas por distancia", () => {
    expect(zoneForDistance(1).costo).toBe(5);
    expect(zoneForDistance(3).costo).toBe(7);
    expect(zoneForDistance(5).costo).toBe(10);
    expect(zoneForDistance(9).costo).toBe(15);
  });

  it("bloquea direcciones fuera de cobertura", () => {
    expect(isDeliverable(10)).toBe(true);
    expect(isDeliverable(10.01)).toBe(false);
    expect(haversineKm(DELIVERY_ORIGIN.lat, DELIVERY_ORIGIN.lng, DELIVERY_ORIGIN.lat, DELIVERY_ORIGIN.lng)).toBe(0);
  });
});

describe("cart totals", () => {
  it("multiplica precio por cantidad", () => {
    const lines: CartLine[] = [{ product: product(1, 12.5), quantity: 2 }, { product: product(2, 5), quantity: 1 }];
    expect(cartSubtotal(lines)).toBe(30);
  });
});

describe("validation", () => {
  it("exige contraseñas de 12 caracteres", () => {
    expect(signUpSchema.safeParse({ username: "abc", email: "user@example.com", password: "corta" }).success).toBe(false);
    expect(signUpSchema.safeParse({ username: "abc", email: "user@example.com", password: "una-contraseña-larga" }).success).toBe(true);
  });

  it("no acepta pedidos sin cantidades válidas", () => {
    const result = createOrderSchema.safeParse({
      items: [{ id: 1, quantity: 0 }],
      metodo_pago: "plin",
      direccion: "Av. Perú 123",
      lat: -11.9,
      lng: -76.7,
      notas: "",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(result.success).toBe(false);
  });
});
