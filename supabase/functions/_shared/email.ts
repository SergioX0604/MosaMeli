import { escapeHtml } from "./http.ts";

/**
 * Identidad visual compartida por enviar-confirmacion y notificar-estado.
 * Todo el estilo va en linea y sobre tablas porque Gmail y Outlook descartan
 * las hojas de estilo externas.
 */

export const ESTADOS = {
  pedido_recibido: {
    titulo: "Recibimos tu pedido",
    resumen: "Tu pedido está anotado y esperando la confirmación del pago.",
    detalle:
      "Apenas confirmemos tu pago te avisamos por correo. Desde ese momento también podrás ver el código de seguimiento de tu pedido.",
    icono: "🧾",
    color: "#7c3aed",
    fondo: "#f5f3ff",
  },
  pago_verificado: {
    titulo: "¡Pago confirmado!",
    resumen: "Verificamos tu pago y tu pedido entra a preparación.",
    detalle:
      "Ya estamos separando tus productos. Te escribimos de nuevo en cuanto tu pedido salga a reparto.",
    icono: "✅",
    color: "#047857",
    fondo: "#ecfdf5",
  },
  en_preparacion: {
    titulo: "Estamos preparando tu pedido",
    resumen: "Tus productos se están seleccionando y empacando.",
    detalle:
      "Revisamos cada artículo antes de despacharlo. Si algo no estuviera disponible, te avisamos por WhatsApp el mismo día.",
    icono: "📦",
    color: "#b45309",
    fondo: "#fffbeb",
  },
  en_camino: {
    titulo: "Tu pedido va en camino",
    resumen: "El repartidor ya salió con tu pedido.",
    detalle:
      "Mantente atento al teléfono: te escribimos por WhatsApp cuando esté cerca de tu dirección.",
    icono: "🛵",
    color: "#1d4ed8",
    fondo: "#eff6ff",
  },
  entregado: {
    titulo: "¡Pedido entregado!",
    resumen: "Tu pedido llegó a tus manos.",
    detalle:
      "Gracias por confiar en MosaMeli. Si algo no salió como esperabas, escríbenos dentro de las próximas 24 horas.",
    icono: "🎉",
    color: "#7c3aed",
    fondo: "#fdf4ff",
  },
  cancelado: {
    titulo: "Pedido cancelado",
    resumen: "Este pedido fue cancelado.",
    detalle:
      "Si no fuiste tú quien lo canceló, escríbenos por WhatsApp al 937 309 837 y lo revisamos contigo.",
    icono: "⚠️",
    color: "#be123c",
    fondo: "#fff1f2",
  },
} as const;

export type EstadoClave = keyof typeof ESTADOS;

export const ORDEN_ESTADOS: EstadoClave[] = [
  "pedido_recibido",
  "pago_verificado",
  "en_preparacion",
  "en_camino",
  "entregado",
];

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

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

function boton(texto: string, url: string, color = "#7c3aed"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0"><tr><td align="center" bgcolor="${color}" style="border-radius:999px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 30px;font-family:inherit;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(texto)}</a></td></tr></table>`;
}

/** Barra de progreso de 5 pasos, usada en el correo de actualización. */
function lineaTiempo(estado: string): string {
  const actual = ORDEN_ESTADOS.indexOf(estado as EstadoClave);
  const cancelado = estado === "cancelado";
  const celdas = ORDEN_ESTADOS.map((clave, indice) => {
    const alcanzado = !cancelado && actual >= indice;
    const enCurso = !cancelado && actual === indice;
    const info = ESTADOS[clave];
    const circulo = enCurso
      ? `<td align="center" valign="top" width="20%"><span style="display:inline-block;width:26px;height:26px;line-height:26px;border-radius:999px;background:${info.color};color:#ffffff;font-size:13px;font-weight:700">${indice + 1}</span><p style="margin:6px 4px 0;font-size:11px;line-height:1.35;color:${alcanzado ? "#3d2b5c" : "#9b8bb4"};font-weight:${enCurso ? "700" : "400"}">${escapeHtml(info.titulo)}</p></td>`
      : `<td align="center" valign="top" width="20%"><span style="display:inline-block;width:26px;height:26px;line-height:26px;border-radius:999px;background:${alcanzado ? "#ddd6fe" : "#f1ebf8"};color:${alcanzado ? "#6d28d9" : "#b9a9cd"};font-size:13px;font-weight:700">${indice + 1}</span><p style="margin:6px 4px 0;font-size:11px;line-height:1.35;color:${alcanzado ? "#3d2b5c" : "#9b8bb4"}">${escapeHtml(info.titulo)}</p></td>`;
    return circulo;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>${celdas}</tr></table>`;
}

/**
 * Envoltura comun: encabezado con logo, bloque de contenido y pie con datos
 * de contacto. `preheader` es el texto que se ve en la bandeja antes de abrir.
 */
export function correoShell(args: {
  siteUrl: string;
  preheader: string;
  titulo: string;
  cuerpo: string;
}): string {
  const { siteUrl, preheader, titulo, cuerpo } = args;
  const logo = escapeHtml(`${siteUrl}/img/logo-icon.png`);
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f7f2fb">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2fb;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #efe8f8">

<tr><td style="padding:26px 28px;text-align:center;background:linear-gradient(135deg,#faf5ff,#fdf2f8);border-bottom:1px solid #f4eefb">
  <img src="${logo}" alt="MosaMeli" width="64" height="64" style="width:64px;height:64px;border-radius:18px;border:0;display:block;margin:0 auto">
  <p style="margin:12px 0 0;font-family:inherit;font-size:19px;font-weight:800;color:#6d28d9">MosaMeli</p>
  <p style="margin:3px 0 0;font-family:inherit;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#f472b6">Tu mundo en un click</p>
</td></tr>

<tr><td style="padding:28px">
  <h1 style="margin:0 0 12px;font-family:inherit;font-size:22px;line-height:1.3;color:#2b1b45">${escapeHtml(titulo)}</h1>
  ${cuerpo}
</td></tr>

<tr><td style="padding:20px 28px;background:#fbfaff;border-top:1px solid #f4eefb;text-align:center">
  <p style="margin:0;font-family:inherit;font-size:13px;color:#6d5a80"><strong style="color:#4b3a63">MosaMeli</strong> · Chaclacayo, Lima</p>
  <p style="margin:6px 0 0;font-family:inherit;font-size:13px;color:#8b7aa6">WhatsApp 937 309 837 · mosamelicorp@gmail.com</p>
  <p style="margin:12px 0 0;font-family:inherit;font-size:11px;line-height:1.5;color:#a396b8">Este es un mensaje automático de MosaMeli. Por seguridad no respondas a este correo; escríbenos por WhatsApp si necesitas ayuda.</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export { escapeHtml, boton, lineaTiempo, primerNombre };
