import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders, escapeHtml, json } from "../_shared/http.ts";

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
      .select("id,codigo_seguimiento,tracking_token,items,total,metodo_pago,cliente_nombre,cliente_email,estado")
      .eq("id", orderId)
      .eq("usuario_id", authData.user.id)
      .single();
    if (orderError || !order) return json({ error: "Pedido no encontrado" }, 404);

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.map((item: { nombre?: string; cantidad?: number; precio?: number }) =>
      `<li>${escapeHtml(item.cantidad ?? 1)} × ${escapeHtml(item.nombre)} — S/ ${Number(item.precio ?? 0).toFixed(2)}</li>`
    ).join("");
    const trackingUrl = `${Deno.env.get("SITE_URL") ?? "https://mosameli.com"}/seguimiento/${order.tracking_token ?? ""}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [order.cliente_email],
        subject: `MosaMeli: pedido ${order.codigo_seguimiento} confirmado`,
        html: `<h1>Gracias por tu compra</h1><p>Hola ${escapeHtml(order.cliente_nombre)},</p><p>Tu pedido <strong>${escapeHtml(order.codigo_seguimiento)}</strong> quedó registrado.</p><ul>${itemsHtml}</ul><p>Total: <strong>S/ ${Number(order.total ?? 0).toFixed(2)}</strong></p><p><a href="${escapeHtml(trackingUrl)}">Ver seguimiento</a></p>`,
      }),
    });
    if (!response.ok) return json({ error: "El proveedor de correo rechazó el mensaje" }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "No se pudo enviar la notificación" }, 500);
  }
});
