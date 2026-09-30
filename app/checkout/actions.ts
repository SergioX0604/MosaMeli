"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validation";
import { z } from "zod";

export type CreateOrderResult = {
  ok: boolean;
  message?: string;
  orderId?: number;
  total?: number;
  deliveryCost?: number;
  reservationExpiresAt?: string;
};

export type DeliveryQuoteResult = {
  ok: boolean;
  message?: string;
  distance?: number;
  base?: number;
  nightSurcharge?: number;
  sundaySurcharge?: number;
  cost?: number;
};

export type DeclarePaymentResult = {
  ok: boolean;
  message?: string;
  trackingCode?: string;
  trackingToken?: string;
  total?: number;
  notificationPending?: boolean;
};

// El RPC lanza códigos internos; se traducen antes de mostrarlos al cliente.
const RPC_ERRORS: Record<string, string> = {
  AUTH_REQUIRED:
    "Tu sesión expiró. Vuelve a iniciar sesión para confirmar el pedido.",
  EMAIL_REQUERIDO: "No pudimos leer tu correo. Vuelve a iniciar sesión.",
  ITEMS_INVALIDOS: "El carrito tiene un formato inesperado.",
  CANTIDAD_PRODUCTOS_INVALIDA: "El carrito debe tener entre 1 y 50 productos.",
  METODO_PAGO_INVALIDO: "Elige un método de pago válido.",
  DIRECCION_INVALIDA: "Escribe una dirección de entrega más completa.",
  NOTAS_INVALIDAS: "Las notas son demasiado largas (máximo 500 caracteres).",
  UBICACION_INVALIDA: "Selecciona una ubicación en el mapa.",
  PRODUCTO_NO_DISPONIBLE: "Uno de los productos ya no está disponible.",
  CANTIDAD_INVALIDA:
    "Una cantidad del carrito no es válida. Revisa el carrito e inténtalo de nuevo.",
  STOCK_INSUFICIENTE: "No hay stock suficiente para uno de los productos.",
  CARRITO_VACIO: "El carrito está vacío.",
  FUERA_DE_COBERTURA:
    "Tu ubicación está fuera de la zona de delivery. Contáctanos por WhatsApp.",
  PEDIDO_NO_ENCONTRADO: "No encontramos ese pedido en tu cuenta.",
  PEDIDO_YA_VERIFICADO: "El pago de este pedido ya fue verificado.",
  PAGO_YA_DECLARADO: "Ya registraste el pago de este pedido.",
  PEDIDO_EXPIRADO:
    "La reserva venció y el stock fue liberado. Vuelve al carrito para crear un pedido nuevo.",
  IDEMPOTENCY_KEY_REQUERIDA:
    "No pudimos proteger este pedido contra duplicados. Recarga la página e inténtalo de nuevo.",
};

function friendlyError(message: string): string {
  const code =
    Object.keys(RPC_ERRORS).find((item) => message.includes(item)) ??
    message.trim();
  return (
    RPC_ERRORS[code] ??
    `No pudimos confirmar el pedido (${code}). Inténtalo de nuevo.`
  );
}

const coordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export async function quoteDeliveryAction(
  input: unknown,
): Promise<DeliveryQuoteResult> {
  const parsed = coordinatesSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Selecciona una ubicación válida en el mapa.",
    };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cotizar_delivery", {
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
  });
  if (error) return { ok: false, message: friendlyError(error.message) };
  const result = Array.isArray(data) ? data[0] : data;
  if (!result)
    return { ok: false, message: "No pudimos calcular el delivery." };
  return {
    ok: true,
    distance: Number(result.distancia),
    base: Number(result.base),
    nightSurcharge: Number(result.recargo_nocturno),
    sundaySurcharge: Number(result.recargo_domingo),
    cost: Number(result.costo),
  };
}

export async function createOrderAction(
  input: unknown,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revisa los datos del pedido",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      ok: false,
      message: "Debes iniciar sesión para confirmar un pedido",
    };

  // El RPC espera { id, cantidad } en jsonb; se construye aquí para no depender
  // de la forma exacta del payload que envía el navegador.
  const items = parsed.data.items.map((item) => ({
    id: item.id,
    cantidad: item.cantidad,
  }));

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

  revalidatePath("/mi-perfil");
  revalidatePath("/mis-pedidos");
  // El codigo de seguimiento NO se devuelve aqui: se entrega mas tarde, cuando
  // el cliente declara el pago (ver declararPagoAction).
  return {
    ok: true,
    orderId: Number(result.id),
    total: Number(result.total ?? 0),
    deliveryCost: Number(result.costo_delivery ?? 0),
    reservationExpiresAt: result.reserva_expira_en ?? undefined,
  };
}

/**
 * El cliente pulsa "Ya hice el pago" y recien ahi se le entrega el codigo de
 * seguimiento. El pedido se busca por id en el servidor: nunca se acepta el
 * codigo ni el token desde el navegador.
 */
export async function declararPagoAction(
  orderId: number,
): Promise<DeclarePaymentResult> {
  const id = Number(orderId);
  if (!Number.isInteger(id) || id <= 0)
    return { ok: false, message: "Pedido inválido" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      ok: false,
      message: "Debes iniciar sesión para registrar el pago",
    };

  const { data, error } = await supabase.rpc("declarar_pago", {
    p_pedido_id: id,
  });
  if (!error) {
    const result = Array.isArray(data) ? data[0] : data;
    if (result) {
      let notificationPending = false;
      let notificationError = "";
      try {
        const { error: emailError } = await supabase.functions.invoke(
          "enviar-confirmacion",
          {
            body: { order_id: id },
          },
        );
        notificationPending = Boolean(emailError);
        notificationError = emailError?.message ?? "";
      } catch {
        notificationPending = true;
        notificationError = "No se pudo invocar enviar-confirmacion";
      }
      if (notificationPending) {
        await supabase.rpc("registrar_notificacion_pendiente", {
          p_pedido_id: id,
          p_tipo: "confirmacion",
          p_error: notificationError,
        });
      }

      revalidatePath("/mi-perfil");
      revalidatePath("/mis-pedidos");
      return {
        ok: true,
        trackingCode: result.codigo_seguimiento,
        trackingToken: result.tracking_token,
        total: Number(result.total ?? 0),
        notificationPending,
      };
    }
  }

  const message = error?.message ?? "";
  if (error?.code === "PGRST202" || error?.code === "42883") {
    return {
      ok: false,
      message:
        "La base de datos todavía no tiene aplicada la migración de pagos. Contacta al administrador.",
    };
  }
  return { ok: false, message: friendlyError(message) };
}
