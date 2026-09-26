"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validation";

export type CreateOrderResult = {
  ok: boolean;
  message?: string;
  orderId?: number;
  trackingToken?: string;
  trackingCode?: string;
  total?: number;
  notificationPending?: boolean;
};

export async function createOrderAction(input: unknown): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del pedido" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Debes iniciar sesión para confirmar un pedido" };

  const { data, error } = await supabase.rpc("crear_pedido", {
    p_items: parsed.data.items,
    p_metodo_pago: parsed.data.metodo_pago,
    p_direccion: parsed.data.direccion,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_notas: parsed.data.notas,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return { ok: false, message: "No se pudo crear el pedido" };

  let notificationPending = false;
  try {
    const { error: emailError } = await supabase.functions.invoke("enviar-confirmacion", {
      body: { order_id: result.id },
    });
    notificationPending = Boolean(emailError);
  } catch {
    notificationPending = true;
  }

  revalidatePath("/mi-perfil");
  revalidatePath("/mis-pedidos");
  return {
    ok: true,
    orderId: Number(result.id),
    trackingToken: result.tracking_token,
    trackingCode: result.codigo_seguimiento,
    total: Number(result.total ?? 0),
    notificationPending,
  };
}
