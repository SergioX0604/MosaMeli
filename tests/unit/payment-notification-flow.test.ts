import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const actionsSource = readFileSync(
  path.join(process.cwd(), "app", "checkout", "actions.ts"),
  "utf8",
);
const emailSource = readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "functions",
    "enviar-confirmacion",
    "index.ts",
  ),
  "utf8",
);

function functionBody(source: string, name: string, nextName?: string): string {
  const start = source.indexOf(`export async function ${name}`);
  const end = nextName
    ? source.indexOf(`export async function ${nextName}`, start + 1)
    : source.length;
  if (start < 0 || end < 0) throw new Error(`No se encontró ${name}`);
  return source.slice(start, end);
}

describe("comunicación del pago", () => {
  const createOrder = functionBody(
    actionsSource,
    "createOrderAction",
    "declararPagoAction",
  );
  const declarePayment = functionBody(actionsSource, "declararPagoAction");

  it("no envía el correo antes de que el cliente declare el pago", () => {
    expect(createOrder).not.toContain('"enviar-confirmacion"');
  });

  it("envía el correo después de pulsar Ya hice el pago", () => {
    expect(declarePayment).toContain('rpc("declarar_pago"');
    expect(declarePayment).toContain('"enviar-confirmacion"');
    expect(declarePayment.indexOf('rpc("declarar_pago"')).toBeLessThan(
      declarePayment.indexOf('"enviar-confirmacion"'),
    );
  });

  it("el correo evita afirmar que la compra o el pago ya están confirmados", () => {
    expect(emailSource).not.toContain("Gracias por tu compra");
    expect(emailSource).toContain("Su pedido fue recibido");
    expect(emailSource).toContain("no que el pago ya fue verificado");
  });

  it("la función de correo rechaza pedidos sin pago declarado", () => {
    expect(emailSource).toContain("pago_declarado");
    expect(emailSource).toContain("El cliente todavía no declaró el pago");
  });
});
