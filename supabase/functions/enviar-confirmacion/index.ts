import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders, json } from "../_shared/http.ts";
import {
  boton,
  chip,
  correoShell,
  escapeHtml,
  metodoPago,
  miniatura,
  paso,
  primerNombre,
} from "../_shared/email.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";

type Item = {
  id?: number;
  nombre?: string;
  precio?: number;
  cantidad?: number;
};

type Confirmacion = {
  siteUrl: string;
  nombre: string | null;
  items: Item[];
  total: number;
  pago: string;
  direccion: string | null;
  tieneRegalo: boolean;
  /** Imagen de cada producto indexada por id, para las miniaturas. */
  fotos: Record<string, string>;
};

function soles(valor: number): string {
  return `S/ ${valor.toFixed(2)}`;
}

function filaItem(
  siteUrl: string,
  item: Item,
  foto: string | undefined,
): string {
  const cantidad = Number(item.cantidad ?? 1);
  const unitario = Number(item.precio ?? 0);
  const nombre = String(item.nombre ?? "Producto");
  return `<tr>
    ${miniatura(siteUrl, foto, nombre)}
    <td valign="middle" style="padding:12px 0;border-bottom:1px solid #f4eefb">
      <p style="margin:0;font-size:15px;font-weight:700;color:#2b1b45;line-height:1.35">${escapeHtml(nombre)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#8b7aa6">${soles(unitario)} c/u${cantidad > 1 ? ` · ${cantidad} unidades` : ""}</p>
    </td>
    <td valign="middle" align="right" style="padding:12px 0;border-bottom:1px solid #f4eefb;font-size:15px;font-weight:800;color:#2b1b45;white-space:nowrap">${soles(unitario * cantidad)}</td>
  </tr>`;
}

function totalFila(etiqueta: string, valor: string, fuerte = false): string {
  const color = fuerte ? "#2b1b45" : "#6d5a80";
  return `<tr>
    <td style="padding:5px 0;font-size:${fuerte ? "17px" : "14px"};font-weight:${fuerte ? "700" : "400"};color:${color}">${escapeHtml(etiqueta)}</td>
    <td style="padding:5px 0;font-size:${fuerte ? "17px" : "14px"};font-weight:${fuerte ? "800" : "600"};color:${color};text-align:right;white-space:nowrap">${escapeHtml(valor)}</td>
  </tr>`;
}

/** Arma el correo de confirmacion de pedido. Sin efectos: se puede previsualizar. */
export function construirConfirmacion(args: Confirmacion): {
  subject: string;
  html: string;
} {
  const { siteUrl, items, total, pago, direccion, tieneRegalo, fotos } = args;
  const nombre = primerNombre(args.nombre ?? "cliente");
  const metodo = metodoPago(pago);
  const subtotal = items.reduce(
    (suma, item) =>
      suma + Number(item.precio ?? 0) * Number(item.cantidad ?? 1),
    0,
  );
  const delivery = Math.max(0, total - subtotal);
  const unidades = items.reduce(
    (suma, item) => suma + Number(item.cantidad ?? 1),
    0,
  );

  const html = correoShell({
    siteUrl,
    preheader: `${nombre}, recibimos tu aviso de pago. Verificaremos el abono antes de iniciar el despacho.`,
    titulo: "Su pedido fue recibido",
    cuerpo: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <div style="width:66px;height:66px;line-height:66px;border-radius:999px;background:linear-gradient(135deg,#f3e8ff,#fce7f3);font-size:32px">✅</div>
  <h1 style="margin:16px 0 0;font-family:inherit;font-size:24px;line-height:1.25;color:#2b1b45">Su pedido fue recibido, ${escapeHtml(nombre)}</h1>
  <p style="margin:8px 0 0;font-family:inherit;font-size:15px;line-height:1.6;color:#5b4a70">Su pedido fue recibido y se procederá con el proceso de despacho una vez que el administrador verifique el pago informado.</p>
</td></tr></table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td style="padding:20px;background:#faf5ff;border:1px solid #f0e7fb;border-radius:18px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9b8bb4;font-weight:800">Tu pedido</p>
  <p style="margin:0 0 14px;font-size:13px;color:#7c6b93">${unidades} ${unidades === 1 ? "producto" : "productos"} · ${metodo}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${items.map((item) => filaItem(siteUrl, item, item.id != null ? fotos[String(item.id)] : undefined)).join("")}
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px">
    ${totalFila("Subtotal de productos", soles(subtotal))}
    ${delivery > 0 ? totalFila("Delivery", soles(delivery)) : ""}
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">
    <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background:#e9d5ff">&nbsp;</td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">
    ${totalFila("Total a pagar", soles(total), true)}
  </table>
</td></tr></table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0"><tr><td>
  ${chip(`Pagarás con ${metodo}`, "#ede9fe", "#5b21b6")}
  ${tieneRegalo ? chip("🎁 Incluye regalo sorpresa", "#ecfdf5", "#065f46") : ""}
  ${direccion ? chip("📍 Entrega a domicilio", "#fdf2f8", "#9d174d") : ""}
</td></tr></table>

${
  direccion
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0"><tr><td style="padding:16px 18px;background:#f7f2fb;border-radius:16px">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9b8bb4;font-weight:800">Entregamos en</p>
        <p style="margin:0;font-size:15px;line-height:1.5;color:#34244f">${escapeHtml(direccion)}</p>
      </td></tr></table>`
    : ""
}

${
  tieneRegalo
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0"><tr><td style="padding:16px 18px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px">
        <p style="margin:0;font-size:15px;font-weight:700;color:#065f46">🎁 Hay una sorpresa esperándote</p>
        <p style="margin:5px 0 0;font-size:13px;line-height:1.5;color:#047857">Alcanzaste el monto para el regalo sorpresa. Lo separamos al empacar tu pedido y va incluido sin costo adicional.</p>
      </td></tr></table>`
    : ""
}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0"><tr><td style="padding:20px 18px;background:linear-gradient(135deg,#faf5ff,#fdf2f8);border-radius:18px">
  <p style="margin:0 0 16px;font-size:17px;font-weight:800;color:#2b1b45">¿Qué sigue ahora?</p>
  ${paso(1, "Aviso de pago recibido", "Tu pedido continúa en estado Pedido recibido mientras revisamos el abono.", "#ede9fe", "#6d28d9")}
  ${paso(2, "Verificación del administrador", "Cuando comprobemos el pago, el estado cambiará a Pago verificado.", "#fce7f3", "#be185d")}
  ${paso(3, "Preparación y despacho", "Después de verificar el pago prepararemos tu pedido y te avisaremos cada avance.", "#fef3c7", "#b45309", true)}
</td></tr></table>

${boton("Ir a Mis pedidos", `${siteUrl}/mi-perfil`)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td align="center">
  <p style="margin:0;font-size:13px;line-height:1.6;color:#8b7aa6">Este correo confirma que recibimos tu aviso, no que el pago ya fue verificado.<br>Te avisaremos cuando el administrador confirme el abono y en cada cambio de estado.</p>
</td></tr></table>`,
  });

  return { subject: "MosaMeli: su pedido fue recibido", html };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from =
      Deno.env.get("EMAIL_FROM") ?? "MosaMeli <notificaciones@mosameli.com>";
    if (!supabaseUrl || !serviceRoleKey || !resendKey)
      return json({ error: "Configuración de correo incompleta" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const auth = await authenticateEdgeRequest(request, admin, serviceRoleKey);
    if (!auth.internal && !auth.user)
      return json({ error: "No autenticado" }, 401);

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0)
      return json({ error: "Pedido inválido" }, 400);

    let orderQuery = admin
      .from("pedidos")
      .select(
        "id,items,total,metodo_pago,cliente_nombre,cliente_email,direccion_cliente,tiene_regalo,pago_declarado,estado",
      )
      .eq("id", orderId);
    if (!auth.internal && auth.user)
      orderQuery = orderQuery.eq("usuario_id", auth.user.id);
    const { data: order, error: orderError } = await orderQuery.single();
    if (orderError || !order)
      return json({ error: "Pedido no encontrado" }, 404);
    if (!order.pago_declarado || order.estado === "cancelado") {
      return json({ error: "El cliente todavía no declaró el pago" }, 409);
    }

    const siteUrl = (
      Deno.env.get("SITE_URL") ?? "https://mosameli.com"
    ).replace(/\/$/, "");
    const items = (Array.isArray(order.items) ? order.items : []) as Item[];

    // Las imágenes no se guardan en el pedido: se consultan para el correo.
    const ids = items
      .map((item) => Number(item.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const fotos: Record<string, string> = {};
    if (ids.length) {
      const { data: productos } = await admin
        .from("productos")
        .select("id,imagen")
        .in("id", ids);
      for (const producto of (productos ?? []) as Array<{
        id: number;
        imagen?: string | null;
      }>) {
        if (producto.imagen) fotos[String(producto.id)] = producto.imagen;
      }
    }

    const correo = construirConfirmacion({
      siteUrl,
      nombre: order.cliente_nombre,
      items,
      total: Number(order.total ?? 0),
      pago: String(order.metodo_pago ?? ""),
      direccion: order.direccion_cliente,
      tieneRegalo: Boolean(order.tiene_regalo),
      fotos,
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `mosameli-pedido-recibido-${order.id}`,
      },
      body: JSON.stringify({
        from,
        to: [order.cliente_email],
        subject: correo.subject,
        html: correo.html,
      }),
    });
    if (!response.ok)
      return json({ error: "El proveedor de correo rechazó el mensaje" }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "No se pudo enviar la notificación" }, 500);
  }
});
