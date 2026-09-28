import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders, json } from "../_shared/http.ts";
import { boton, correoShell, estadoInfo, lineaTiempo, escapeHtml, metodoPago, primerNombre } from "../_shared/email.ts";

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
    <td style="padding:0 0 ${conCorte ? "8px" : "0"};font-size:13px;color:#6d5a80">${escapeHtml(etiqueta)}</td>
    <td style="padding:0 0 ${conCorte ? "8px" : "0"};font-size:14px;font-weight:700;color:#2b1b45;text-align:right">${escapeHtml(valor)}</td>
  </tr>`;
}

/** Arma el correo de cambio de estado. Sin efectos: se puede previsualizar. */
export function construirAviso(args: Aviso): { subject: string; html: string } {
  const { siteUrl, codigo, estado, total, pago, direccion, trackingUrl } = args;
  const nombre = primerNombre(args.nombre ?? "cliente");
  const info = estadoInfo(estado);
  // "¡Pago confirmado!" -> "¡pago confirmado!" dentro de la frase de saludo.
  const enFrase = info.titulo.charAt(0).toLocaleLowerCase("es") + info.titulo.slice(1);

  const html = correoShell({
    siteUrl,
    preheader: `${info.titulo}: ${info.resumen}`,
    titulo: `Hola ${nombre}, ${enFrase}`,
    cuerpo: `
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4b3a63">${escapeHtml(info.resumen)} Te dejamos el detalle y en qué punto exacto va tu pedido.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="padding:18px;background:${info.fondo};border-left:4px solid ${info.color};border-radius:12px">
  <p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${info.color};opacity:.75;font-weight:700">Qué significa este estado</p>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#3d2b5c">${escapeHtml(info.icono)} ${escapeHtml(info.detalle)}</p>
</td></tr></table>

<p style="margin:0 0 10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9b8bb4;font-weight:700">Cómo va tu pedido</p>
${lineaTiempo(estado)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0"><tr><td style="padding:16px;background:#faf5ff;border:1px solid #f0e7fb;border-radius:16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${fila("Pedido", codigo, true)}
    ${fila("Total", `S/ ${Number(total || 0).toFixed(2)}`, true)}
    ${fila("Pagaste con", metodoPago(pago))}
  </table>
  ${direccion && estado === "en_camino" ? `<p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #f0e7fb;font-size:13px;line-height:1.5;color:#5b4a70">El repartidor va a: <strong style="color:#2b1b45">${escapeHtml(direccion)}</strong></p>` : ""}
</td></tr></table>

${ESTADOS_ACTIVOS.has(estado) ? boton("Ver el seguimiento completo", trackingUrl, info.color) : ""}
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#8b7aa6;text-align:center">Te escribimos por este mismo correo en cada cambio de estado. No necesitas responder.</p>`,
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

    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace("Bearer ", "");
    if (!token) return json({ error: "No autenticado" }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user || authData.user.app_metadata?.role !== "admin") return json({ error: "No autorizado" }, 403);

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) return json({ error: "Pedido inválido" }, 400);

    const { data: order, error: orderError } = await admin
      .from("pedidos")
      .select("codigo_seguimiento,tracking_token,cliente_nombre,cliente_email,estado,total,metodo_pago,direccion_cliente")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ error: "Pedido no encontrado" }, 404);

    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://mosameli.com").replace(/\/$/, "");
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
