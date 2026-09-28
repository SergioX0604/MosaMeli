/**
 * Textos del seguimiento de pedido. Se muestran en la pagina de seguimiento y
 * explican al cliente en palabras simples en que punto va su compra.
 */

export type EstadoClave =
  | "pedido_recibido"
  | "pago_verificado"
  | "en_preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado";

export type Tono = { fondo: string; borde: string; texto: string; pastilla: string };

export type Paso = {
  key: EstadoClave;
  etiqueta: string;
  descripcion: string;
  icono: string;
};

export const PASOS: Paso[] = [
  {
    key: "pedido_recibido",
    etiqueta: "Pedido recibido",
    descripcion: "Anotamos tu pedido y esperamos la confirmación del pago.",
    icono: "🧾",
  },
  {
    key: "pago_verificado",
    etiqueta: "Pago verificado",
    descripcion: "Revisamos tu pago y reservamos los productos de tu pedido.",
    icono: "✅",
  },
  {
    key: "en_preparacion",
    etiqueta: "En preparación",
    descripcion: "Separamos y empacamos todo con cuidado antes de despachar.",
    icono: "📦",
  },
  {
    key: "en_camino",
    etiqueta: "En camino",
    descripcion: "El repartidor salió hacia tu dirección con tu pedido.",
    icono: "🛵",
  },
  {
    key: "entregado",
    etiqueta: "Entregado",
    descripcion: "Tu pedido llegó a tus manos. ¡Gracias por tu compra!",
    icono: "🎉",
  },
];

export const ESTADOS: Record<EstadoClave, { titulo: string; resumen: string; siguiente: string; icono: string; tono: Tono }> = {
  pedido_recibido: {
    titulo: "Recibimos tu pedido",
    resumen: "Todo está anotado. Solo falta confirmar tu pago para que podamos empezar.",
    siguiente:
      "Cuando pagues, presiona “Ya hice el pago” en Mis pedidos. Ahí te damos tu código de seguimiento y verificamos el pago.",
    icono: "🧾",
    tono: {
      fondo: "bg-[#f5f3ff]",
      borde: "border-[#ddd6fe]",
      texto: "text-[#5b21b6]",
      pastilla: "bg-[#ede9fe] text-[#5b21b6]",
    },
  },
  pago_verificado: {
    titulo: "¡Pago confirmado!",
    resumen: "Ya verificamos tu pago. Tu pedido entra a preparación ahora mismo.",
    siguiente: "No tienes que hacer nada más. Te escribimos por correo en cuanto el pedido salga a reparto.",
    icono: "✅",
    tono: {
      fondo: "bg-[#ecfdf5]",
      borde: "border-[#a7f3d0]",
      texto: "text-[#065f46]",
      pastilla: "bg-[#d1fae5] text-[#065f46]",
    },
  },
  en_preparacion: {
    titulo: "Estamos preparando tu pedido",
    resumen: "Tus productos se están separando y empacando.",
    siguiente:
      "Revisamos cada artículo antes de despacharlo. Si algo no estuviera disponible, te avisamos por WhatsApp el mismo día.",
    icono: "📦",
    tono: {
      fondo: "bg-[#fffbeb]",
      borde: "border-[#fde68a]",
      texto: "text-[#92400e]",
      pastilla: "bg-[#fef3c7] text-[#92400e]",
    },
  },
  en_camino: {
    titulo: "Tu pedido va en camino",
    resumen: "El repartidor ya salió con tu pedido.",
    siguiente: "Mantente atento al teléfono: te escribimos por WhatsApp cuando esté cerca de tu dirección.",
    icono: "🛵",
    tono: {
      fondo: "bg-[#eff6ff]",
      borde: "border-[#bfdbfe]",
      texto: "text-[#1d4ed8]",
      pastilla: "bg-[#dbeafe] text-[#1d4ed8]",
    },
  },
  entregado: {
    titulo: "¡Pedido entregado!",
    resumen: "Tu pedido llegó a tus manos.",
    siguiente:
      "Esperamos que lo disfrutes. Si algo no salió como esperabas, escríbenos dentro de las próximas 24 horas.",
    icono: "🎉",
    tono: {
      fondo: "bg-[#fdf4ff]",
      borde: "border-[#e9d5ff]",
      texto: "text-[#6b21a8]",
      pastilla: "bg-[#fae8ff] text-[#6b21a8]",
    },
  },
  cancelado: {
    titulo: "Pedido cancelado",
    resumen: "Este pedido fue cancelado y no llegará a entregarse.",
    siguiente:
      "Si no fuiste tú quien lo canceló, escríbenos por WhatsApp al 937 309 837 y lo revisamos contigo.",
    icono: "⚠️",
    tono: {
      fondo: "bg-[#fff1f2]",
      borde: "border-[#fecdd3]",
      texto: "text-[#be123c]",
      pastilla: "bg-[#ffe4e6] text-[#be123c]",
    },
  },
};

export const METODOS_PAGO: Record<string, string> = {
  plin: "Plin",
  yape: "Yape",
  transferencia: "Transferencia bancaria",
};

export function estadoInfo(estado: string) {
  return ESTADOS[estado as EstadoClave] ?? ESTADOS.pedido_recibido;
}

export function metodoPagoLabel(metodo: string): string {
  return METODOS_PAGO[metodo] ?? metodo;
}

/** Nombre corto del estado, para listas y filtros. */
export function estadoLabel(estado: string): string {
  return estadoInfo(estado).titulo;
}

export const WHATSAPP = "https://wa.me/51937309837";
export const WHATSAPP_TEXTO = "937 309 837";
