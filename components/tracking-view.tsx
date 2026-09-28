import Link from "next/link";
import { PASOS, WHATSAPP, WHATSAPP_TEXTO, estadoInfo, metodoPagoLabel } from "@/lib/estados";
import { formatMoney } from "@/lib/money";
import type { TrackingResult } from "@/lib/types";

const zona = "America/Lima";

function fecha(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleString("es-PE", {
      timeZone: zona,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    // Intl devuelve espacios finos que la fuente de marca no tiene.
    .replace(/[\u202f\u00a0]/g, " ");
}

export function TrackingView({ order }: { order: TrackingResult }) {
  const info = estadoInfo(order.estado);
  const cancelado = order.estado === "cancelado";
  const indiceActual = PASOS.findIndex((paso) => paso.key === order.estado);
  const fechas = [order.fecha, order.fecha_pago_verificado, order.fecha_preparacion, order.fecha_envio, order.fecha_entrega];
  const creado = fecha(order.fecha);

  return (
    <div className="space-y-5">
      {/* Estado actual: lo primero que el cliente necesita leer */}
      <section className={`rounded-3xl border p-6 md:p-8 ${info.tono.fondo} ${info.tono.borde}`}>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider ${info.tono.pastilla}`}>
          Estado actual
        </span>
        <h1 className={`mt-3 text-2xl font-black md:text-3xl ${info.tono.texto}`}>
          <span aria-hidden="true" className="mr-1">{info.icono}</span>
          {info.titulo}
        </h1>
        <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed text-[var(--text)]">{info.resumen}</p>
        <div className="mt-4 flex gap-3 rounded-2xl bg-white/70 p-4">
          <span aria-hidden="true" className="text-lg">👉</span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Qué sigue</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{info.siguiente}</p>
          </div>
        </div>
      </section>

      {/* Camino del pedido, paso a paso */}
      <section className="surface p-6 md:p-8">
        <h2 className="text-lg font-black">Camino de tu pedido</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {cancelado
            ? "Este pedido se canceló antes de completarse."
            : indiceActual >= PASOS.length - 1
              ? "Completaste todos los pasos. 🎉"
              : `Vamos en el paso ${indiceActual + 1} de ${PASOS.length}.`}
        </p>

        <ol className="mt-6 space-y-0">
          {PASOS.map((paso, indice) => {
            const completado = !cancelado && indiceActual >= indice;
            const actual = !cancelado && indiceActual === indice;
            const pendiente = !completado && !actual;
            const momento = fecha(fechas[indice]);
            const esUltimo = indice === PASOS.length - 1;

            return (
              <li key={paso.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ring-4 ${
                      actual
                        ? "bg-white shadow-sm ring-[var(--primary)]"
                        : completado
                          ? "bg-[#d1fae5] text-[#065f46] ring-[#d1fae5]"
                          : "bg-[#f4eefb] text-[#b9a9cd] ring-[#f4eefb]"
                    }`}
                  >
                    {paso.icono}
                  </span>
                  {!esUltimo ? (
                    <span aria-hidden="true" className={`w-0.5 flex-1 ${completado ? "bg-[#a7f3d0]" : "bg-[#ede7f5]"}`} />
                  ) : null}
                </div>

                <div className={`pb-7 ${esUltimo ? "pb-0" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-black ${pendiente ? "text-[var(--muted)]" : "text-[var(--text)]"}`}>{paso.etiqueta}</p>
                    {actual ? <span className="badge">En curso</span> : null}
                    {completado && !actual ? <span className="badge bg-[#d1fae5] text-[#065f46]">Listo</span> : null}
                  </div>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">{paso.descripcion}</p>
                  {momento ? (
                    <p className="mt-1 text-xs font-semibold text-[var(--primary-dark)]">{momento}</p>
                  ) : actual ? (
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">En proceso</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {cancelado ? (
          <p className="alert alert-error mt-6">
            Tu pedido fue cancelado y por eso no Advances en el camino de entrega. Si no fuiste tú, escríbenos y lo revisamos.
          </p>
        ) : null}
      </section>

      {/* Datos del pedido */}
      <section className="surface p-6 md:p-8">
        <h2 className="text-lg font-black">Datos de tu compra</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--brand-50)] p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Código de seguimiento</dt>
            <dd className="mt-1 text-lg font-black tracking-wider text-[var(--primary-dark)]">{order.codigo_seguimiento}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--brand-50)] p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Total pagado</dt>
            <dd className="mt-1 text-lg font-black text-[var(--text)]">{formatMoney(order.total)}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--brand-50)] p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Pagaste con</dt>
            <dd className="mt-1 font-black text-[var(--text)]">{metodoPagoLabel(order.metodo_pago)}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--brand-50)] p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Pedido registrado</dt>
            <dd className="mt-1 font-black text-[var(--text)]">{creado ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Pedido de <strong className="text-[var(--text)]">{order.cliente_nombre}</strong>. Te enviamos un correo cada vez que el
          pedido avance, así que no necesitas entrar aquí seguido.
        </p>
      </section>

      {/* Ayuda */}
      <section className="surface flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <h2 className="text-lg font-black">¿Necesitas ayuda?</h2>
          <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
            Escríbenos por WhatsApp con tu código de seguimiento y lo revisamos contigo en el momento.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-primary" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
          <Link className="btn btn-secondary" href="/">Volver a la tienda</Link>
        </div>
      </section>

      <p className="text-center text-xs text-[var(--muted)]">
        MosaMeli · Chaclacayo, Lima · WhatsApp {WHATSAPP_TEXTO}
      </p>
    </div>
  );
}
