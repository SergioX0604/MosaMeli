export type FooterInfoPage = {
  title: string;
  description: string;
  kicker: string;
  intro: string;
  cards: Array<{ icon: string; title: string; text: string }>;
  note?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  tracking?: boolean;
};

export const FOOTER_INFO_PAGES = {
  nosotros: {
    title: "Nuestra tienda",
    description:
      "Conoce MosaMeli, una boutique digital de productos útiles para tu día a día.",
    kicker: "Sobre MosaMeli",
    intro:
      "Seleccionamos productos prácticos para el hogar, el bienestar y la rutina diaria, con una compra clara y acompañamiento cercano desde el catálogo hasta la entrega.",
    cards: [
      {
        icon: "✦",
        title: "Selección cuidada",
        text: "Reunimos productos funcionales y fáciles de incorporar a tu vida cotidiana.",
      },
      {
        icon: "♡",
        title: "Atención cercana",
        text: "Te acompañamos por WhatsApp cuando necesitas ayuda antes o después de comprar.",
      },
      {
        icon: "⌖",
        title: "Compra local",
        text: "Operamos desde Chaclacayo y coordinamos cada entrega según tu ubicación.",
      },
    ],
    primaryAction: { label: "Explorar el catálogo", href: "/#catalogo" },
    secondaryAction: {
      label: "Hablar con MosaMeli",
      href: "https://wa.me/51937309837",
    },
  },
  "regalo-sorpresa": {
    title: "Regalo sorpresa",
    description:
      "Descubre cómo obtener un regalo sorpresa con tu compra en MosaMeli.",
    kicker: "Beneficio especial",
    intro:
      "Cuando el subtotal de tus productos alcanza S/ 150, tu pedido incluye automáticamente un regalo sorpresa de selección limitada, sujeto a disponibilidad.",
    cards: [
      {
        icon: "1",
        title: "Agrega productos",
        text: "Elige tus favoritos y agrégalos al carrito como siempre.",
      },
      {
        icon: "2",
        title: "Alcanza S/ 150",
        text: "El progreso se calcula sobre productos; el delivery no forma parte del monto mínimo.",
      },
      {
        icon: "3",
        title: "Recíbelo sin costo",
        text: "El regalo se incorpora al pedido que prepararemos para tu entrega.",
      },
    ],
    note: "No necesitas ingresar ningún cupón. El carrito y el checkout te mostrarán si tu pedido ya califica.",
    primaryAction: { label: "Ver productos", href: "/#catalogo" },
    secondaryAction: { label: "Revisar mi carrito", href: "/carrito" },
  },
  "por-que-elegirnos": {
    title: "Por qué elegir MosaMeli",
    description:
      "Compra clara, productos seleccionados y acompañamiento cercano.",
    kicker: "Una compra más simple",
    intro:
      "Diseñamos cada paso para que sepas qué compras, cuánto pagarás y qué ocurre con tu pedido, sin mensajes confusos ni costos ocultos.",
    cards: [
      {
        icon: "✓",
        title: "Información transparente",
        text: "Precio, stock, delivery y total aparecen antes de confirmar tu pedido.",
      },
      {
        icon: "◎",
        title: "Seguimiento seguro",
        text: "Después de declarar el pago recibes un código para consultar cada avance.",
      },
      {
        icon: "◷",
        title: "Soporte disponible",
        text: "Puedes escribirnos por WhatsApp de lunes a domingo, de 10am a 8pm.",
      },
    ],
    primaryAction: { label: "Comprar ahora", href: "/#catalogo" },
    secondaryAction: { label: "Preguntas frecuentes", href: "/faq" },
  },
  "zonas-delivery": {
    title: "Zonas de delivery",
    description: "Consulta la cobertura y las tarifas de delivery de MosaMeli.",
    kicker: "Entregas desde Chaclacayo",
    intro:
      "Calculamos la tarifa con la ubicación que marcas en el checkout. La cobertura local llega hasta 10 km desde nuestro punto de despacho en Chaclacayo.",
    cards: [
      {
        icon: "1",
        title: "Hasta 2 km",
        text: "Zona 1 · Chaclacayo Centro: S/ 5.00.",
      },
      {
        icon: "2",
        title: "De 2 a 7 km",
        text: "Zona 2 hasta 4 km: S/ 7.00. Zona 3 hasta 7 km: S/ 10.00.",
      },
      {
        icon: "3",
        title: "De 7 a 10 km",
        text: "Zona 4 · Chosica o Ricardo Palma: S/ 15.00.",
      },
    ],
    note: "El mapa del checkout confirma la cobertura y el costo exacto antes de registrar el pedido. Si estás fuera del radio, consúltanos por WhatsApp.",
    primaryAction: { label: "Calcular en el checkout", href: "/checkout" },
    secondaryAction: {
      label: "Consultar por WhatsApp",
      href: "https://wa.me/51937309837",
    },
  },
  "como-comprar": {
    title: "Cómo comprar",
    description: "Conoce el proceso de compra de MosaMeli paso a paso.",
    kicker: "Compra en pocos pasos",
    intro:
      "Elige tus productos, confirma la dirección y el método de pago, realiza el abono y avísanos desde el botón “Ya hice el pago”.",
    cards: [
      {
        icon: "1",
        title: "Arma tu carrito",
        text: "Explora el catálogo, revisa los detalles y selecciona las cantidades que necesitas.",
      },
      {
        icon: "2",
        title: "Completa el checkout",
        text: "Ingresa tu dirección, marca la ubicación y elige Plin, Yape o transferencia.",
      },
      {
        icon: "3",
        title: "Declara el pago",
        text: "Después de abonar, presiona “Ya hice el pago” para que el administrador lo verifique.",
      },
    ],
    note: "Tu pedido se considera recibido cuando declaras el pago. La confirmación definitiva ocurre cuando el administrador cambia el estado a “Pago verificado”.",
    primaryAction: { label: "Empezar a comprar", href: "/#catalogo" },
    secondaryAction: { label: "Ver métodos de pago", href: "/metodos-pago" },
  },
  "rastrear-pedido": {
    title: "Rastrear mi pedido",
    description: "Consulta de forma segura el estado de tu pedido MosaMeli.",
    kicker: "Seguimiento seguro",
    intro:
      "Ingresa el código que recibiste después de presionar “Ya hice el pago”. Verás la etapa actual y las fechas disponibles de tu pedido.",
    cards: [
      {
        icon: "1",
        title: "Busca tu código",
        text: "Lo encuentras después de declarar el pago y también dentro de Mis pedidos.",
      },
      {
        icon: "2",
        title: "Consulta el estado",
        text: "El sistema mostrará pago, preparación, despacho y entrega.",
      },
      {
        icon: "3",
        title: "Protegemos tus datos",
        text: "El código y tu sesión permiten mostrar únicamente la información autorizada.",
      },
    ],
    tracking: true,
  },
  "envios-olva": {
    title: "Envíos por Olva",
    description:
      "Información para coordinar envíos de MosaMeli mediante Olva Courier.",
    kicker: "Envíos coordinados",
    intro:
      "Cuando una entrega requiere Olva Courier, coordinamos contigo la agencia, los datos del destinatario y el costo antes del despacho.",
    cards: [
      {
        icon: "1",
        title: "Confirma disponibilidad",
        text: "Escríbenos con el producto y el destino para validar si el envío puede realizarse por Olva.",
      },
      {
        icon: "2",
        title: "Revisa los datos",
        text: "Verificamos nombre, documento, teléfono y agencia o dirección de destino.",
      },
      {
        icon: "3",
        title: "Recibe el seguimiento",
        text: "Cuando el paquete es admitido, compartimos la información disponible para seguirlo.",
      },
    ],
    note: "Los plazos y tarifas de Olva dependen del destino y se confirman antes del despacho. No están incluidos automáticamente en el delivery local.",
    primaryAction: {
      label: "Consultar un envío",
      href: "https://wa.me/51937309837",
    },
    secondaryAction: {
      label: "Ver tiempos de entrega",
      href: "/tiempo-entrega",
    },
  },
  "metodos-pago": {
    title: "Métodos de pago",
    description: "Conoce los medios de pago disponibles en MosaMeli.",
    kicker: "Pago claro y seguro",
    intro:
      "Puedes elegir Plin, Yape o transferencia bancaria. Los datos y el importe exacto aparecen después de registrar el pedido.",
    cards: [
      {
        icon: "P",
        title: "Plin",
        text: "Escanea el QR mostrado en la pantalla de pago y confirma el importe exacto.",
      },
      {
        icon: "Y",
        title: "Yape",
        text: "Utiliza el QR o los datos indicados en el checkout para realizar el abono.",
      },
      {
        icon: "T",
        title: "Transferencia",
        text: "Transfiere a la cuenta indicada y conserva la constancia para cualquier consulta.",
      },
    ],
    note: "Después de pagar debes presionar “Ya hice el pago”. Ese aviso envía el pedido al proceso de verificación administrativa.",
    primaryAction: { label: "Ir al checkout", href: "/checkout" },
    secondaryAction: { label: "Cómo comprar", href: "/como-comprar" },
  },
  "tiempo-entrega": {
    title: "Tiempo de entrega",
    description:
      "Conoce cómo se calculan y coordinan los tiempos de entrega de MosaMeli.",
    kicker: "Despacho coordinado",
    intro:
      "El tiempo comienza después de que el pago ha sido verificado. La preparación y entrega dependen del producto, la ubicación y la modalidad coordinada.",
    cards: [
      {
        icon: "1",
        title: "Verificación",
        text: "La validación del pago puede tardar hasta 24 horas después de tu aviso.",
      },
      {
        icon: "2",
        title: "Preparación",
        text: "Cuando el pago se verifica, preparamos el pedido y actualizamos su estado.",
      },
      {
        icon: "3",
        title: "Entrega",
        text: "El plazo final se coordina según delivery local u operador externo.",
      },
    ],
    note: "Consulta el seguimiento para conocer el avance real. Si necesitas coordinar una fecha específica, escríbenos antes de pagar.",
    primaryAction: { label: "Rastrear pedido", href: "/rastrear-pedido" },
    secondaryAction: {
      label: "Contactar por WhatsApp",
      href: "https://wa.me/51937309837",
    },
  },
  faq: {
    title: "Preguntas frecuentes",
    description:
      "Respuestas rápidas sobre compras, pagos, delivery y seguimiento en MosaMeli.",
    kicker: "Centro de ayuda",
    intro:
      "Estas son las respuestas esenciales para completar una compra sin confusiones. También puedes consultar nuestra guía detallada.",
    cards: [
      {
        icon: "?",
        title: "¿Cuándo recibo mi código?",
        text: "Después de realizar el pago y presionar “Ya hice el pago”.",
      },
      {
        icon: "?",
        title: "¿Cómo calculan el delivery?",
        text: "Con la ubicación que marcas en el mapa del checkout y la distancia desde Chaclacayo.",
      },
      {
        icon: "?",
        title: "¿Cuándo confirman el pago?",
        text: "El administrador revisa el abono y cambia el pedido a “Pago verificado”.",
      },
    ],
    primaryAction: {
      label: "Ver todas las preguntas",
      href: "/preguntas-frecuentes",
    },
    secondaryAction: {
      label: "Escribir por WhatsApp",
      href: "https://wa.me/51937309837",
    },
  },
} satisfies Record<string, FooterInfoPage>;

export type FooterInfoSlug = keyof typeof FOOTER_INFO_PAGES;
export const FOOTER_INFO_SLUGS = Object.keys(
  FOOTER_INFO_PAGES,
) as FooterInfoSlug[];
