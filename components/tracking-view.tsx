import type { TrackingResult } from "@/lib/types";
import { formatMoney } from "@/lib/money";

const statusSteps = [
  { key: "pedido_recibido", label: "Pedido recibido" },
  { key: "pago_verificado", label: "Pago verificado" },
  { key: "en_preparacion", label: "En preparación" },
  { key: "en_camino", label: "En camino" },
  { key: "entregado", label: "Entregado" },
];

export function TrackingView({ order }: { order: TrackingResult }) {
  const currentIndex = statusSteps.findIndex((step) => step.key === order.estado);
  const dates = [order.fecha, order.fecha_pago_verificado, order.fecha_preparacion, order.fecha_envio, order.fecha_entrega];
  return (
    <div className="space-y-6">
      <section className="surface p-6 text-center"><p className="text-sm text-[var(--muted)]">Código</p><p className="mt-1 text-2xl font-black tracking-wider text-[var(--primary-dark)]">{order.codigo_seguimiento}</p><div className="mt-4 grid gap-2 text-left sm:grid-cols-3"><div><p className="text-xs text-[var(--muted)]">Cliente</p><p className="font-bold">{order.cliente_nombre}</p></div><div><p className="text-xs text-[var(--muted)]">Total</p><p className="font-bold">{formatMoney(order.total)}</p></div><div><p className="text-xs text-[var(--muted)]">Pago</p><p className="font-bold">{order.metodo_pago}</p></div></div></section>
      <section className="surface p-6"><h2 className="text-lg font-black">Estado del pedido</h2>{order.estado === "cancelado" ? <p className="alert alert-error mt-4">Este pedido fue cancelado. Contáctanos si necesitas ayuda.</p> : null}<ol className="mt-5 space-y-4">{statusSteps.map((step, index) => { const complete = currentIndex >= 0 && index <= currentIndex; const date = dates[index]; return <li key={step.key} className="flex gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-black ${complete ? "bg-[var(--primary)] text-white" : "bg-[var(--brand-100)] text-[var(--muted)]"}`}>{complete ? "✓" : index + 1}</span><div><p className={`font-bold ${complete ? "" : "text-[var(--muted)]"}`}>{step.label}</p>{date ? <time className="text-xs text-[var(--muted)]" dateTime={date}>{new Date(date).toLocaleString("es-PE")}</time> : null}</div></li>; })}</ol></section>
    </div>
  );
}
