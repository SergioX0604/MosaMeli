import { describe, expect, it } from "vitest";
import { PASOS, estadoInfo, estadoLabel, metodoPagoLabel } from "@/lib/estados";

/**
 * La pagina de seguimiento y los correos se apoyan en estos textos para
 * explicarle al cliente en que punto va su pedido.
 */
describe("textos del seguimiento", () => {
  it("describe los seis estados con título, resumen y qué sigue", () => {
    for (const clave of ["pedido_recibido", "pago_verificado", "en_preparacion", "en_camino", "entregado", "cancelado"] as const) {
      const info = estadoInfo(clave);
      expect(info.titulo.length).toBeGreaterThan(3);
      expect(info.resumen.length).toBeGreaterThan(10);
      expect(info.siguiente.length).toBeGreaterThan(10);
      expect(info.icono.length).toBeGreaterThan(0);
    }
  });

  it("usa un tono distinto en cada estado", () => {
    const tonos = new Set(
      ["pedido_recibido", "pago_verificado", "en_preparacion", "en_camino", "entregado", "cancelado"].map(
        (clave) => estadoInfo(clave).tono.fondo,
      ),
    );
    expect(tonos.size).toBe(6);
  });

  it("cae en pedido recibido si el estado es desconocido", () => {
    expect(estadoInfo("inventado").titulo).toBe(estadoInfo("pedido_recibido").titulo);
    expect(estadoLabel("en_camino")).toBe("Tu pedido va en camino");
  });

  it("traduce los metodos de pago a su nombre comercial", () => {
    expect(metodoPagoLabel("plin")).toBe("Plin");
    expect(metodoPagoLabel("yape")).toBe("Yape");
    expect(metodoPagoLabel("transferencia")).toBe("Transferencia bancaria");
    expect(metodoPagoLabel("otro")).toBe("otro");
  });

  it("el camino del pedido tiene los cinco pasos en orden", () => {
    expect(PASOS.map((paso) => paso.key)).toEqual([
      "pedido_recibido",
      "pago_verificado",
      "en_preparacion",
      "en_camino",
      "entregado",
    ]);
    for (const paso of PASOS) expect(paso.descripcion.length).toBeGreaterThan(10);
  });
});
