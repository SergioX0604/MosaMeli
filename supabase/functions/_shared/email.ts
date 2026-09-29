import { escapeHtml } from "./http.ts";

/**
 * Identidad visual compartida por enviar-confirmacion y notificar-estado.
 * Todo el estilo va en línea y sobre tablas porque Gmail y Outlook descartan
 * las hojas de estilo externas.
 */

export const ESTADOS = {
  pedido_recibido: {
    titulo: "Recibimos tu pedido",
    resumen: "Tu pedido está anotado y esperando la confirmación del pago.",
    detalle:
      "Apenas confirmemos tu pago te avisamos por correo. Desde ese momento también podrás ver el código de seguimiento de tu pedido.",
    icono: "🧾",
    color: "#6d28d9",
    fondo: "#f5f3ff",
    punto: "#c4b5fd",
  },
  pago_verificado: {
    titulo: "¡Pago confirmado!",
    resumen: "Verificamos tu pago y tu pedido entra a preparación.",
    detalle: "Ya estamos separando tus productos. Te escribimos de nuevo en cuanto tu pedido salga a reparto.",
    icono: "✅",
    color: "#047857",
    fondo: "#ecfdf5",
    punto: "#6ee7b7",
  },
  en_preparacion: {
    titulo: "Estamos preparando tu pedido",
    resumen: "Tus productos se están seleccionando y empacando.",
    detalle:
      "Revisamos cada artículo antes de despacharlo. Si algo no estuviera disponible, te avisamos por WhatsApp el mismo día.",
    icono: "📦",
    color: "#b45309",
    fondo: "#fffbeb",
    punto: "#fcd34d",
  },
  en_camino: {
    titulo: "Tu pedido va en camino",
    resumen: "El repartidor ya salió con tu pedido.",
    detalle: "Mantente atento al teléfono: te escribimos por WhatsApp cuando esté cerca de tu dirección.",
    icono: "🛵",
    color: "#1d4ed8",
    fondo: "#eff6ff",
    punto: "#93c5fd",
  },
  entregado: {
    titulo: "¡Pedido entregado!",
    resumen: "Tu pedido llegó a tus manos.",
    detalle: "Gracias por confiar en MosaMeli. Si algo no salió como esperabas, escríbenos dentro de las próximas 24 horas.",
    icono: "🎉",
    color: "#6d28d9",
    fondo: "#fdf4ff",
    punto: "#f0abfc",
  },
  cancelado: {
    titulo: "Pedido cancelado",
    resumen: "Este pedido fue cancelado.",
    detalle: "Si no fuiste tú quien lo canceló, escríbenos por WhatsApp al 937 309 837 y lo revisamos contigo.",
    icono: "⚠️",
    color: "#be123c",
    fondo: "#fff1f2",
    punto: "#fda4af",
  },
} as const;

export type EstadoClave = keyof typeof ESTADOS;

export const ORDEN_ESTADOS: EstadoClave[] = ["pedido_recibido", "pago_verificado", "en_preparacion", "en_camino", "entregado"];

type EstadoInfo = (typeof ESTADOS)[EstadoClave];

export function estadoInfo(estado: string): EstadoInfo {
  return ESTADOS[estado as EstadoClave] ?? ESTADOS.pedido_recibido;
}

export function metodoPago(metodo: string): string {
  const textos: Record<string, string> = {
    plin: "Plin",
    yape: "Yape",
    transferencia: "Transferencia bancaria",
  };
  return textos[metodo] ?? metodo;
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

function url(siteUrl: string, imagen: string | null | undefined): string | null {
  if (!imagen) return null;
  if (/^https?:\/\//i.test(imagen)) return imagen;
  return `${siteUrl}/${imagen.replace(/^\//, "")}`;
}

/** Miniatura cuadrada de un producto; si no hay imagen, cae a un emoji. */
export function miniatura(siteUrl: string, imagen: string | null | undefined, nombre: string): string {
  const src = url(siteUrl, imagen);
  if (!src) {
    return `<td width="56" valign="top" style="padding:0 14px 0 0">
      <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#f3e8ff,#fce7f3);border:1px solid #f1ebf8;text-align:center;line-height:54px;font-size:26px">🎁</div>
      <div style="display:none;max-height:0">${escapeHtml(nombre)}</div>
    </td>`;
  }
  return `<td width="56" valign="top" style="padding:0 14px 0 0">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(nombre)}" width="56" height="56" style="width:56px;height:56px;border-radius:14px;border:1px solid #f1ebf8;object-fit:cover;display:block">
  </td>`;
}

function boton(texto: string, destino: string, color = "#6d28d9"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0"><tr><td align="center" bgcolor="${color}" style="border-radius:999px"><a href="${escapeHtml(destino)}" style="display:inline-block;padding:15px 32px;font-family:inherit;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(texto)}</a></td></tr></table>`;
}

/** Etiqueta redondeada para datos sueltos (método de pago, tipo de entrega). */
export function chip(texto: string, fondo: string, color: string): string {
  return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${fondo};color:${color};font-size:13px;font-weight:700">${escapeHtml(texto)}</span>`;
}

/** Paso numerado con línea vertical de unión, a prueba de Gmail. */
export function paso(
  numero: number,
  titulo: string,
  detalle: string,
  fondo: string,
  color: string,
  ultimo = false,
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${ultimo ? "0" : "4px"}"><tr>
    <td width="42" valign="top" style="text-align:center">
      <div style="width:28px;height:28px;line-height:28px;border-radius:999px;background:${fondo};color:${color};font-size:13px;font-weight:800">${numero}</div>
      ${ultimo ? "" : '<div style="width:2px;height:16px;background:#efe7f8;margin:4px auto 0"></div>'}
    </td>
    <td valign="top" style="padding:1px 0 16px 12px">
      <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#2b1b45">${escapeHtml(titulo)}</p>
      <p style="margin:3px 0 0;font-size:14px;line-height:1.5;color:#5b4a70">${escapeHtml(detalle)}</p>
    </td>
  </tr></table>`;
}

/** Barra de progreso horizontal de 5 pasos con conectores. */
function lineaTiempo(estado: string): string {
  const actual = ORDEN_ESTADOS.indexOf(estado as EstadoClave);
  const cancelado = estado === "cancelado";

  const celdas = ORDEN_ESTADOS.map((clave, indice) => {
    const info = ESTADOS[clave];
    const alcanzado = !cancelado && actual >= indice;
    const enCurso = !cancelado && actual === indice;
    const primero = indice === 0;
    const ultimo = indice === ORDEN_ESTADOS.length - 1;
    // Un solo color para lo alcanzado: la barra se lee como una sola línea.
    const conector = primero || ultimo ? "transparent" : alcanzado ? "#ddd6fe" : "#f1ebf8";
    const circulo = enCurso
      ? `<div style="width:30px;height:30px;line-height:30px;border-radius:999px;background:${info.color};color:#ffffff;font-size:13px;font-weight:800;box-shadow:0 0 0 4px ${info.fondo}">${indice + 1}</div>`
      : `<div style="width:30px;height:30px;line-height:30px;border-radius:999px;background:${alcanzado ? "#ede9fe" : "#f4eefb"};color:${alcanzado ? "#6d28d9" : "#b9a9cd"};font-size:13px;font-weight:800">${indice + 1}</div>`;
    return `<td align="center" valign="top" width="20%" style="padding:0 3px">
      <div style="height:3px;background:${conector};margin-bottom:10px">&nbsp;</div>
      ${circulo}
      <p style="margin:8px 2px 0;font-size:11px;line-height:1.35;font-weight:${enCurso ? "700" : "400"};color:${alcanzado ? "#3d2b5c" : "#a394b8"}">${escapeHtml(info.titulo)}</p>
    </td>`;
  }).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${celdas}</table>`;
}

/**
 * Envoltura comun: barra superior de color, cabecera con logo, bloque de
 * contenido y pie con datos de contacto. `preheader` es el texto que se ve en
 * la bandeja antes de abrir.
 */
export function correoShell(args: { siteUrl: string; preheader: string; titulo: string; cuerpo: string }): string {
  const { siteUrl, preheader, titulo, cuerpo } = args;
  const logo = escapeHtml(`${siteUrl}/img/logo-icon.png`);
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f7f2fb">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2fb;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #efe8f8;box-shadow:0 18px 40px rgba(124,58,237,0.10)">

<tr><td style="height:6px;line-height:6px;font-size:0;background:linear-gradient(90deg,#7c3aed,#c026d3,#f472b6)">&nbsp;</td></tr>

<tr><td style="padding:26px 28px 22px;text-align:center;background:linear-gradient(135deg,#faf5ff 0%,#fdf2f8 100%);border-bottom:1px solid #f4eefb">
  <img src="${logo}" alt="MosaMeli" width="66" height="66" style="width:66px;height:66px;border-radius:20px;border:0;display:block;margin:0 auto;box-shadow:0 10px 24px rgba(124,58,237,0.18)">
  <p style="margin:14px 0 0;font-family:inherit;font-size:20px;font-weight:800;color:#6d28d9;letter-spacing:-.01em">MosaMeli</p>
  <p style="margin:3px 0 0;font-family:inherit;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f472b6">Tu mundo en un click</p>
</td></tr>

<tr><td style="padding:30px 28px 32px">
  ${cuerpo}
</td></tr>

<tr><td style="padding:22px 28px;background:#fbfaff;border-top:1px solid #f4eefb;text-align:center">
  <p style="margin:0;font-family:inherit;font-size:14px;color:#4b3a63"><strong style="color:#6d28d9">MosaMeli</strong> · Chaclacayo, Lima</p>
  <p style="margin:8px 0 0;font-family:inherit;font-size:13px;color:#7c6b93">
    <a href="https://wa.me/51937309837" style="color:#7c3aed;text-decoration:none;font-weight:600">WhatsApp 937 309 837</a>
    &nbsp;·&nbsp;
    <a href="mailto:mosamelicorp@gmail.com" style="color:#7c3aed;text-decoration:none;font-weight:600">mosamelicorp@gmail.com</a>
  </p>
  <p style="margin:14px 0 0;font-family:inherit;font-size:11px;line-height:1.6;color:#a396b8">Este es un mensaje automático de MosaMeli. Por seguridad no respondas a este correo; escríbenos por WhatsApp si necesitas ayuda.</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export { boton, lineaTiempo, escapeHtml };
