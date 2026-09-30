import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { json } from "../_shared/http.ts";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Configuración incompleta" }, 503);

  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token !== serviceRoleKey) return json({ error: "No autorizado" }, 403);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: pending, error } = await admin
    .from("notificaciones_pendientes")
    .select("id,pedido_id,tipo,intentos")
    .is("completada_en", null)
    .lte("siguiente_intento", new Date().toISOString())
    .lt("intentos", 6)
    .order("creada_en")
    .limit(20);
  if (error) return json({ error: error.message }, 500);

  let completed = 0;
  for (const item of pending ?? []) {
    const functionName = item.tipo === "confirmacion" ? "enviar-confirmacion" : "notificar-estado";
    let lastError = "";
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: item.pedido_id }),
      });
      if (response.ok) {
        await admin.from("notificaciones_pendientes").update({ completada_en: new Date().toISOString() }).eq("id", item.id);
        completed += 1;
        continue;
      }
      lastError = `HTTP ${response.status}: ${await response.text()}`;
    } catch (retryError) {
      lastError = retryError instanceof Error ? retryError.message : "Error desconocido";
    }

    const attempts = Number(item.intentos ?? 0) + 1;
    const delayMinutes = Math.min(360, 2 ** attempts * 5);
    await admin.from("notificaciones_pendientes").update({
      intentos: attempts,
      ultimo_error: lastError.slice(0, 500),
      siguiente_intento: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    }).eq("id", item.id);
  }

  return json({ ok: true, processed: pending?.length ?? 0, completed });
});
