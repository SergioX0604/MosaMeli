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

// El RPC lanza códigos internos; se traducen antes de mostrarlos al cliente.
const RPC_ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Tu sesión expiró. Vuelve a iniciar sesión para confirmar el pedido.",
  EMAIL_REQUERIDO: "No pudimos leer tu correo. Vuelve a iniciar sesión.",
  ITEMS_INVALIDOS: "El carrito tiene un formato inesperado.",
  CANTIDAD_PRODUCTOS_INVALIDA: "El carrito debe tener entre 1 y 50 productos.",
  METODO_PAGO_INVALIDO: "Elige un método de pago válido.",
  DIRECCION_INVALIDA: "Escribe una dirección de entrega más completa.",
  NOTAS_INVALIDAS: "Las notas son demasiado largas (máximo 500 caracteres).",
  UBICACION_INVALIDA: "Selecciona una ubicación en el mapa.",
  PRODUCTO_NO_DISPONIBLE: "Uno de los productos ya no está disponible.",
  CANTIDAD_INVALIDA: "Una cantidad del carrito no es válida. Revisa el carrito e inténtalo de nuevo.",
  STOCK_INSUFICIENTE: "No hay stock suficiente para uno de los productos.",
  CARRITO_VACIO: "El carrito está vacío.",
  FUERA_DE_COBERTURA: "Tu ubicación está fuera de la zona de delivery. Contáctanos por WhatsApp.",
};

function friendlyError(message: string): string {
  const code = message.trim();
  return RPC_ERRORS[code] ?? `No pudimos confirmar el pedido (${code}). Inténtalo de nuevo.`;
}

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

  // El RPC espera { id, cantidad } en jsonb; se construye aquí para no depender
  // de la forma exacta del payload que envía el navegador.
  const items = parsed.data.items.map((item) => ({ id: item.id, cantidad: item.cantidad }));

  const { data, error } = await supabase.rpc("crear_pedido", {
    p_items: items,
    p_metodo_pago: parsed.data.metodo_pago,
    p_direccion: parsed.data.direccion,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_notas: parsed.data.notas,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return { ok: false, message: friendlyError(error.message) };
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
