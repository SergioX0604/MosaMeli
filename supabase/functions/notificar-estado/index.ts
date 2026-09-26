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
    if (authError || !authData.user || authData.user.app_metadata?.role !== "admin") return json({ error: "No autorizado" }, 403);

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) return json({ error: "Pedido inválido" }, 400);

    const { data: order, error: orderError } = await admin
      .from("pedidos")
      .select("codigo_seguimiento,tracking_token,cliente_nombre,cliente_email,estado")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ error: "Pedido no encontrado" }, 404);

    const trackingUrl = `${Deno.env.get("SITE_URL") ?? "https://mosameli.com"}/seguimiento/${order.tracking_token ?? ""}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [order.cliente_email],
        subject: `MosaMeli: actualización de ${order.codigo_seguimiento}`,
        html: `<p>Hola ${escapeHtml(order.cliente_nombre)},</p><p>Tu pedido <strong>${escapeHtml(order.codigo_seguimiento)}</strong> está en estado: <strong>${escapeHtml(order.estado)}</strong>.</p><p><a href="${escapeHtml(trackingUrl)}">Ver seguimiento</a></p>`,
      }),
    });
    if (!response.ok) return json({ error: "El proveedor de correo rechazó el mensaje" }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "No se pudo enviar la notificación" }, 500);
  }
});
