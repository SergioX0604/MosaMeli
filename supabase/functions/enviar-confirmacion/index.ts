import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders, escapeHtml, json } from "../_shared/http.ts";

type EmailHtmlArgs = {
  siteUrl: string;
  nombre?: string | null;
  itemsHtml: string;
  total: number;
  giftHtml: string;
};

function emailHtml({ siteUrl, nombre, itemsHtml, total, giftHtml }: EmailHtmlArgs): string {
  const logo = escapeHtml(`${siteUrl}/img/logo-icon.png`);
  return `<div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fbfaff;padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #efe8f8;border-radius:22px">
<tr><td style="padding:24px;text-align:center;border-bottom:1px solid #f4eefb">
<img src="${logo}" alt="MosaMeli" width="72" height="72" style="width:72px;height:72px;border-radius:18px;border:0">
<p style="margin:10px 0 0;font-size:20px;font-weight:800;color:#6d28d9">MosaMeli</p>
<p style="margin:2px 0 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f472b6">Tu mundo en un click</p>
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:22px;color:#2b1b45">Gracias por tu compra</h1>
<p style="margin:0 0 12px;font-size:15px;color:#4b3a63">Hola ${escapeHtml(nombre ?? "cliente")},</p>
<p style="margin:0 0 16px;font-size:15px;color:#4b3a63">Registramos tu pedido y ya puedes pagar con los datos de la tienda.</p>
<ul style="margin:0;padding:16px;background:#faf5ff;border-radius:12px;font-size:15px;color:#34244f">${itemsHtml}</ul>
<p style="margin:16px 0 0;font-size:16px;color:#2b1b45">Total: <strong>S/ ${total.toFixed(2)}</strong></p>
${giftHtml}
<p style="margin:20px 0 0;padding:14px 16px;background:#fdf4ff;border:1px solid #e9d5ff;border-radius:12px;color:#5b21b6;font-size:14px">Cuando termines de pagar, entra a <strong>Mis pedidos</strong> en la tienda y presiona <strong>Ya hice el pago</strong>. Ahí te mostramos tu código de seguimiento.</p>
</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#8b7aa6;text-align:center">MosaMeli · Chaclacayo, Lima · 937 309 837</p>
</div>`;
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
      .select("id,items,total,metodo_pago,cliente_nombre,cliente_email,estado,tiene_regalo")
      .eq("id", orderId)
      .eq("usuario_id", authData.user.id)
      .single();
    if (orderError || !order) return json({ error: "Pedido no encontrado" }, 404);

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.map((item: { nombre?: string; cantidad?: number; precio?: number }) =>
      `<li style="margin:0 0 8px">${escapeHtml(item.cantidad ?? 1)} × ${escapeHtml(item.nombre)} — S/ ${Number(item.precio ?? 0).toFixed(2)}</li>`
    ).join("");
    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://mosameli.com").replace(/\/$/, "");
    const giftHtml = order.tiene_regalo
      ? `<p style="margin:20px 0 0;padding:14px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;color:#065f46;font-size:15px"><strong>Tu pedido incluye un regalo sorpresa.</strong></p>`
      : "";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [order.cliente_email],
        subject: "MosaMeli: tu pedido quedó registrado",
        html: emailHtml({ siteUrl, nombre: order.cliente_nombre, itemsHtml, total: Number(order.total ?? 0), giftHtml }),
      }),
    });
    if (!response.ok) return json({ error: "El proveedor de correo rechazó el mensaje" }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "No se pudo enviar la notificación" }, 500);
  }
});
