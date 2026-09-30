import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders, json } from "../_shared/http.ts";
import { boton, chip, correoShell, estadoInfo, lineaTiempo, escapeHtml, metodoPago, primerNombre } from "../_shared/email.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";

/** Estados en los que el pedido sigue activo y conviene un tono de avance. */
const ESTADOS_ACTIVOS = new Set(["pago_verificado", "en_preparacion", "en_camino", "entregado"]);

type Aviso = {
  siteUrl: string;
  nombre: string | null;
  codigo: string;
  estado: string;
  total: number;
  pago: string;
  direccion: string | null;
  trackingUrl: string;
  /** Imagen del primer producto del pedido, para la portada. */
  foto: string | null;
  nombreProducto: string | null;
  unidades: number;
};

function asunto(estado: string, codigo: string): string {
  switch (estado) {
    case "pago_verificado":
      return `MosaMeli: ✅ confirmamos el pago de ${codigo}`;
    case "en_preparacion":
      return `MosaMeli: 📦 estamos preparando ${codigo}`;
    case "en_camino":
      return `MosaMeli: 🛵 ${codigo} va en camino`;
    case "entregado":
      return `MosaMeli: 🎉 entregamos ${codigo}`;
    case "cancelado":
      return `MosaMeli: cancelamos ${codigo}`;
    default:
      return `MosaMeli: actualizamos el estado de ${codigo}`;
  }
}

function fila(etiqueta: string, valor: string, conCorte = false): string {
  return `<tr>
    <td style="padding:0 0 ${conCorte ? "8px" : "0"};font-size:13px;color:#7c6b93">${escapeHtml(etiqueta)}</td>
    <td style="padding:0 0 ${conCorte ? "8px" : "0"};font-size:14px;font-weight:700;color:#2b1b45;text-align:right">${escapeHtml(valor)}</td>
  </tr>`;
}

/** Arma el correo de cambio de estado. Sin efectos: se puede previsualizar. */
export function construirAviso(args: Aviso): { subject: string; html: string } {
  const { siteUrl, codigo, estado, total, pago, direccion, trackingUrl, unidades } = args;
  const nombre = primerNombre(args.nombre ?? "cliente");
  const info = estadoInfo(estado);
  // "¡Pago confirmado!" -> "¡pago confirmado!" dentro de la frase de saludo.
  const enFrase = info.titulo.charAt(0).toLocaleLowerCase("es") + info.titulo.slice(1);

  const fotoHtml = args.foto
    ? `<td width="72" valign="middle" style="padding:0 16px 0 0"><img src="${escapeHtml(args.foto)}" alt="${escapeHtml(args.nombreProducto ?? "Producto")}" width="72" height="72" style="width:72px;height:72px;border-radius:18px;border:1px solid #f1ebf8;object-fit:cover;display:block"></td>`
    : "";

  const html = correoShell({
    siteUrl,
    preheader: `${info.titulo}: ${info.resumen}`,
    titulo: `Hola ${nombre}, ${enFrase}`,
    cuerpo: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  ${fotoHtml}
  <td valign="middle" align="${args.foto ? "left" : "center"}">
    <p style="margin:0 0 2px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9b8bb4;font-weight:800">Pedido ${escapeHtml(codigo)}</p>
    <p style="margin:0;font-size:26px;line-height:1.2;font-weight:800;color:${info.color}">${escapeHtml(info.icono)} ${escapeHtml(info.titulo)}</p>
    ${args.nombreProducto ? `<p style="margin:6px 0 0;font-size:14px;color:#5b4a70">${unidades > 1 ? `${unidades} productos · ` : ""}${escapeHtml(args.nombreProducto)}${unidades > 1 ? " y más" : ""}</p>` : ""}
  </td>
</tr></table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0"><tr><td style="padding:18px 20px;background:${info.fondo};border-left:4px solid ${info.color};border-radius:14px">
  <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${info.color};opacity:.8;font-weight:800">Qué significa este estado</p>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#3d2b5c">${escapeHtml(info.detalle)}</p>
</td></tr></table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr><td style="padding:20px 18px;background:#fbfaff;border:1px solid #f4eefb;border-radius:18px">
  <p style="margin:0 0 16px;text-align:center;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9b8bb4;font-weight:800">Cómo va tu pedido</p>
  ${lineaTiempo(estado)}
</td></tr></table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0"><tr><td>
  ${chip(metodoPago(pago), "#ede9fe", "#5b21b6")}
  ${chip(`S/ ${Number(total || 0).toFixed(2)}`, "#fdf2f8", "#9d174d")}
  ${estado === "entregado" ? chip("Gracias por tu compra", "#ecfdf5", "#065f46") : ""}
  ${estado === "cancelado" ? chip("Pedido cancelado", "#fff1f2", "#be123c") : ""}
</td></tr></table>

${
  direccion && estado === "en_camino"
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0"><tr><td style="padding:16px 18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#1d4ed8;font-weight:800">El repartidor va a</p>
        <p style="margin:0;font-size:15px;line-height:1.5;color:#1e3a8a">${escapeHtml(direccion)}</p>
      </td></tr></table>`
    : ""
}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0"><tr><td style="padding:16px 18px;background:#faf5ff;border-radius:16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${fila("Código de pedido", codigo, true)}
    ${fila("Total del pedido", `S/ ${Number(total || 0).toFixed(2)}`, true)}
    ${fila("Pagaste con", metodoPago(pago))}
  </table>
</td></tr></table>

${ESTADOS_ACTIVOS.has(estado) ? boton("Ver el seguimiento completo", trackingUrl, info.color) : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td align="center">
  <p style="margin:0;font-size:13px;line-height:1.6;color:#8b7aa6">Te escribimos por este mismo correo en cada cambio de estado.<br>No necesitas responder.</p>
</td></tr></table>`,
  });

  return { subject: asunto(estado, codigo), html };
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

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const auth = await authenticateEdgeRequest(request, admin, serviceRoleKey);
    if (!auth.internal && auth.user?.app_metadata?.role !== "admin") return json({ error: "No autorizado" }, 403);

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) return json({ error: "Pedido inválido" }, 400);

    const { data: order, error: orderError } = await admin
      .from("pedidos")
      .select("codigo_seguimiento,tracking_token,cliente_nombre,cliente_email,estado,total,metodo_pago,direccion_cliente,items")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ error: "Pedido no encontrado" }, 404);

    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://mosameli.com").replace(/\/$/, "");
    const items = (Array.isArray(order.items) ? order.items : []) as Array<{ id?: number; nombre?: string; cantidad?: number }>;
    const unidades = items.reduce((suma, item) => suma + Number(item.cantidad ?? 1), 0);

    let foto: string | null = null;
    const primerId = Number(items[0]?.id);
    if (Number.isInteger(primerId) && primerId > 0) {
      const { data: producto } = await admin.from("productos").select("imagen").eq("id", primerId).maybeSingle();
      foto = (producto as { imagen?: string | null } | null)?.imagen ?? null;
    }

    const correo = construirAviso({
      siteUrl,
      nombre: order.cliente_nombre,
      codigo: String(order.codigo_seguimiento ?? ""),
      estado: String(order.estado ?? "pedido_recibido"),
      total: Number(order.total ?? 0),
      pago: String(order.metodo_pago ?? ""),
      direccion: order.direccion_cliente,
      // El enlace solo tiene sentido cuando el pedido ya no espera pago.
      trackingUrl: `${siteUrl}/seguimiento/${order.tracking_token ?? ""}`,
      foto,
      nombreProducto: items[0]?.nombre ?? null,
      unidades,
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `mosameli-estado-${orderId}-${order.estado}`,
      },
      body: JSON.stringify({ from, to: [order.cliente_email], subject: correo.subject, html: correo.html }),
    });
    if (!response.ok) return json({ error: "El proveedor de correo rechazó el mensaje" }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "No se pudo enviar la notificación" }, 500);
  }
});
