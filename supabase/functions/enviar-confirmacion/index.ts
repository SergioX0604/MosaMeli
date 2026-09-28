import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders, json } from "../_shared/http.ts";
import { boton, correoShell, escapeHtml, metodoPago, primerNombre } from "../_shared/email.ts";

type Item = { id?: number; nombre?: string; precio?: number; cantidad?: number };

type Confirmacion = {
  siteUrl: string;
  nombre: string | null;
  items: Item[];
  total: number;
  pago: string;
  direccion: string | null;
  tieneRegalo: boolean;
};

function soles(valor: number): string {
  return `S/ ${valor.toFixed(2)}`;
}

function itemsTabla(items: Item[]): string {
  return items
    .map((item) => {
      const cantidad = Number(item.cantidad ?? 1);
      const unitario = Number(item.precio ?? 0);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4eefb;color:#34244f;font-size:15px">${escapeHtml(item.nombre ?? "Producto")}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f4eefb;color:#6d5a80;font-size:14px;text-align:center;white-space:nowrap">×${cantidad}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f4eefb;color:#2b1b45;font-size:15px;font-weight:700;text-align:right;white-space:nowrap">${soles(unitario * cantidad)}</td>
      </tr>`;
    })
    .join("");
}

function lineaResumen(etiqueta: string, valor: string, fuerte = false): string {
  const color = fuerte ? "#2b1b45" : "#6d5a80";
  return `<tr>
    <td style="padding:4px 0;font-size:${fuerte ? "17px" : "14px"};font-weight:${fuerte ? "700" : "400"};color:${color}">${escapeHtml(etiqueta)}</td>
    <td style="padding:4px 0;font-size:${fuerte ? "17px" : "14px"};font-weight:${fuerte ? "800" : "600"};color:${color};text-align:right;white-space:nowrap">${escapeHtml(valor)}</td>
  </tr>`;
}

function paso(numero: number, titulo: string, detalle: string, fondo: string, color: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px"><tr>
    <td width="34" valign="top" style="padding:2px 0"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:999px;background:${fondo};color:${color};font-size:13px;font-weight:800">${numero}</span></td>
    <td valign="top" style="padding:0 0 0 10px">
      <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#2b1b45">${escapeHtml(titulo)}</p>
      <p style="margin:3px 0 0;font-size:14px;line-height:1.5;color:#5b4a70">${escapeHtml(detalle)}</p>
    </td>
  </tr></table>`;
}

/** Arma el correo de confirmacion de pedido. Sin efectos: se puede previsualizar. */
export function construirConfirmacion(args: Confirmacion): { subject: string; html: string } {
  const { siteUrl, items, total, pago, direccion, tieneRegalo } = args;
  const nombre = primerNombre(args.nombre ?? "cliente");
  const metodo = metodoPago(pago);
  const subtotal = items.reduce((suma, item) => suma + Number(item.precio ?? 0) * Number(item.cantidad ?? 1), 0);
  const delivery = Math.max(0, total - subtotal);

  const giftHtml = tieneRegalo
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0"><tr><td style="padding:14px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px">
        <p style="margin:0;font-size:15px;font-weight:700;color:#065f46">🎁 Tu pedido incluye un regalo sorpresa</p>
        <p style="margin:4px 0 0;font-size:13px;color:#047857">Lo separamos al momento de empacar y va incluido sin costo adicional.</p>
      </td></tr></table>`
    : "";

  const direccionHtml = direccion
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0"><tr><td style="padding:16px;background:#f7f2fb;border-radius:14px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9b8bb4;font-weight:700">Entregamos en</p>
        <p style="margin:0;font-size:15px;line-height:1.5;color:#34244f">${escapeHtml(direccion)}</p>
      </td></tr></table>`
    : "";

  const html = correoShell({
    siteUrl,
    preheader: `${nombre}, recibimos tu pedido por ${soles(total)}. Solo falta que confirmes el pago para obtener tu código de seguimiento.`,
    titulo: "¡Gracias por tu compra!",
    cuerpo: `
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b3a63">Hola ${escapeHtml(nombre)}, ya tenemos tu pedido anotado. Te contamos aquí todo para que la compra termine sin sorpresas.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="padding:18px;background:#faf5ff;border:1px solid #f0e7fb;border-radius:16px">
  <p style="margin:0 0 10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9b8bb4;font-weight:700">Resumen del pedido</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${itemsTabla(items)}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px">
    ${lineaResumen("Subtotal de productos", soles(subtotal))}
    ${delivery > 0 ? lineaResumen("Delivery", soles(delivery)) : ""}
    ${lineaResumen("Total a pagar", soles(total), true)}
  </table>
  <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #f0e7fb;font-size:13px;color:#6d5a80">Pagarás con <strong style="color:#4b3a63">${escapeHtml(metodo)}</strong></p>
</td></tr></table>

${giftHtml}

${direccionHtml}

<p style="margin:26px 0 14px;font-size:17px;font-weight:800;color:#2b1b45">¿Qué sigue ahora? Son 3 pasos</p>
${paso(1, `Paga con ${metodo}`, `Transfiere ${soles(total)} usando los datos que ya están en la pantalla del pedido.`, "#ede9fe", "#6d28d9")}
${paso(2, "Presiona “Ya hice el pago”", "Vuelve a Mis pedidos, busca tu pedido y confirma el pago con un clic. Así lo revisamos más rápido.", "#fce7f3", "#be185d")}
${paso(3, "Recibes tu código de seguimiento", "Te mostramos tu código único y te escribimos por correo cada vez que el pedido avance.", "#fef3c7", "#b45309")}

${boton("Ir a Mis pedidos", `${siteUrl}/mi-perfil`)}
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#8b7aa6;text-align:center">Cuando confirmemos tu pago, el pedido pasa a preparación y te avisamos.</p>`,
  });

  return { subject: "MosaMeli: recibimos tu pedido ✨", html };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") ?? "MosaMeli <notificaciones@mosameli.com>";
    if (!supabaseUrl || !serviceRoleKey || !resendKey) return json({ error: "Configuración de correo incompleta" }, 503);

    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace("Bearer ", "");
    if (!token) return json({ error: "No autenticado" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "No autenticado" }, 401);

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) return json({ error: "Pedido inválido" }, 400);

    const { data: order, error: orderError } = await admin
      .from("pedidos")
      .select("id,items,total,metodo_pago,cliente_nombre,cliente_email,direccion_cliente,tiene_regalo")
      .eq("id", orderId)
      .eq("usuario_id", authData.user.id)
      .single();
    if (orderError || !order) return json({ error: "Pedido no encontrado" }, 404);

    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://mosameli.com").replace(/\/$/, "");
    const correo = construirConfirmacion({
      siteUrl,
      nombre: order.cliente_nombre,
      items: (Array.isArray(order.items) ? order.items : []) as Item[],
      total: Number(order.total ?? 0),
      pago: String(order.metodo_pago ?? ""),
      direccion: order.direccion_cliente,
      tieneRegalo: Boolean(order.tiene_regalo),
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [order.cliente_email], subject: correo.subject, html: correo.html }),
    });
    if (!response.ok) return json({ error: "El proveedor de correo rechazó el mensaje" }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "No se pudo enviar la notificación" }, 500);
  }
});
