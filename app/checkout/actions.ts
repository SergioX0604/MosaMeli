"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validation";

export type CreateOrderResult = {
  ok: boolean;
  message?: string;
  orderId?: number;
  total?: number;
  notificationPending?: boolean;
};

export type DeclarePaymentResult = {
  ok: boolean;
  message?: string;
  trackingCode?: string;
  trackingToken?: string;
  total?: number;
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
  PEDIDO_NO_ENCONTRADO: "No encontramos ese pedido en tu cuenta.",
  PEDIDO_YA_VERIFICADO: "El pago de este pedido ya fue verificado.",
  PAGO_YA_DECLARADO: "Ya registraste el pago de este pedido.",
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
  // El codigo de seguimiento NO se devuelve aqui: se entrega mas tarde, cuando
  // el cliente declara el pago (ver declararPagoAction).
  return {
    ok: true,
    orderId: Number(result.id),
    total: Number(result.total ?? 0),
    notificationPending,
  };
}

/**
 * El cliente pulsa "Ya hice el pago" y recien ahi se le entrega el codigo de
 * seguimiento. El pedido se busca por id en el servidor: nunca se acepta el
 * codigo ni el token desde el navegador.
 */
export async function declararPagoAction(orderId: number): Promise<DeclarePaymentResult> {
  const id = Number(orderId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Pedido inválido" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Debes iniciar sesión para registrar el pago" };

  const { data, error } = await supabase.rpc("declarar_pago", { p_pedido_id: id });
  if (!error) {
    const result = Array.isArray(data) ? data[0] : data;
    if (result) {
      return {
        ok: true,
        trackingCode: result.codigo_seguimiento,
        trackingToken: result.tracking_token,
        total: Number(result.total ?? 0),
      };
    }
  }

  // Si la migracion 202609260003 aun no esta aplicada se resuelve con una
  // lectura (RLS ya limita la fila al usuario). El mismo camino cubre el doble
  // clic, que el RPC reporta como PAGO_YA_DECLARADO.
  const message = error?.message ?? "";
  const missingFunction = error?.code === "PGRST202" || error?.code === "42883" || /declarar_pago/i.test(message);
  const alreadyDeclared = /PAGO_YA_DECLARADO/.test(message);
  if (!missingFunction && !alreadyDeclared) {
    return { ok: false, message: friendlyError(message) };
  }

  const { data: order, error: readError } = await supabase
    .from("pedidos")
    .select("id,codigo_seguimiento,tracking_token,total,estado")
    .eq("id", id)
    .maybeSingle();
  if (readError || !order) {
    return { ok: false, message: "No encontramos ese pedido en tu cuenta." };
  }
  return {
    ok: true,
    trackingCode: order.codigo_seguimiento,
    trackingToken: order.tracking_token ?? undefined,
    total: Number(order.total ?? 0),
  };
}
