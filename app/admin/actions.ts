"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { orderStatusSchema, productSchema } from "@/lib/validation";

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("FORBIDDEN");
  return user;
}

export async function createProductAction(input: unknown) {
  await assertAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("productos").insert({
    nombre: parsed.data.nombre,
    categoria: parsed.data.categoria,
    precio: parsed.data.precio,
    precio_original: parsed.data.precioOriginal,
    imagen: parsed.data.imagen,
    stock: parsed.data.stock,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateProductAction(id: number, input: unknown) {
  await assertAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("productos").update({
    nombre: parsed.data.nombre,
    categoria: parsed.data.categoria,
    precio: parsed.data.precio,
    precio_original: parsed.data.precioOriginal,
    imagen: parsed.data.imagen,
    stock: parsed.data.stock,
  }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteProductAction(id: number) {
  await assertAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateOrderStatusAction(orderId: number, status: unknown) {
  await assertAdmin();
  if (!Number.isInteger(orderId) || orderId <= 0) return { ok: false, message: "Pedido inválido" };
  const parsed = orderStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "Estado inválido" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cambiar_estado_pedido", {
    p_pedido_id: orderId,
    p_estado: parsed.data,
  });
  if (error) {
    const message = error.message.includes("TRANSICION_INVALIDA")
      ? "Ese cambio de estado no está permitido. Actualiza el panel y revisa el estado actual."
      : error.message.includes("PAGO_NO_DECLARADO")
        ? "El cliente todavía no declaró el pago."
        : error.message;
    return { ok: false, message };
  }
  const { error: notificationError } = await supabase.functions.invoke("notificar-estado", {
    body: { order_id: orderId },
  });
  if (notificationError) {
    await supabase.rpc("registrar_notificacion_pendiente", {
      p_pedido_id: orderId,
      p_tipo: "estado",
      p_error: notificationError.message,
    });
  }
  revalidatePath("/admin");
  revalidatePath("/seguimiento");
  return { ok: true, notificationPending: Boolean(notificationError) };
}

export async function updateDeliveryCostAction(orderId: number, value: number) {
  await assertAdmin();
  if (!Number.isFinite(value) || value < 0) return { ok: false, message: "Costo inválido" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("pedidos").update({ costo_real_delivery: value }).eq("id", orderId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function moderateReviewAction(id: number, action: "approve" | "reject") {
  await assertAdmin();
  const supabase = await createSupabaseServerClient();
  const query = action === "approve"
    ? supabase.from("resenas").update({ aprobada: true }).eq("id", id)
    : supabase.from("resenas").delete().eq("id", id);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
