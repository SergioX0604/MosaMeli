import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  return (
    <article className="page-shell container-shell">
      <div className="surface mx-auto max-w-3xl space-y-5 p-6 md:p-10">
        <p className="badge">Última actualización: septiembre de 2026</p>
        <h1 className="text-3xl font-black">Términos y condiciones</h1>
        <h2 className="text-xl font-black">1. Pedidos y pagos</h2>
        <p className="text-[var(--muted)]">Los precios se muestran en soles peruanos. El pedido se registra después de que el servidor valide productos, stock, cobertura y total. Aceptamos Plin, Yape y transferencia bancaria; la confirmación del pago puede tardar hasta 24 horas.</p>
        <h2 className="text-xl font-black">2. Entregas</h2>
        <p className="text-[var(--muted)]">La cobertura y el costo de delivery se muestran en el mapa antes de confirmar. Las entregas locales se coordinan según disponibilidad y los envíos fuera de cobertura se gestionan por WhatsApp.</p>
        <h2 className="text-xl font-black">3. Cambios y cancelaciones</h2>
        <p className="text-[var(--muted)]">Puedes solicitar cambios o cancelaciones antes de que el pedido sea despachado. Contáctanos por WhatsApp con tu código de seguimiento.</p>
        <h2 className="text-xl font-black">4. Regalo sorpresa</h2>
        <p className="text-[var(--muted)]">Los pedidos que alcancen el monto publicado pueden incluir un regalo sorpresa sujeto a disponibilidad y a las reglas mostradas durante el checkout.</p>
        <h2 className="text-xl font-black">5. Responsabilidad del usuario</h2>
        <p className="text-[var(--muted)]">El usuario debe proporcionar información veraz y actualizar sus datos de entrega. MosaMeli no se responsabiliza por direcciones incorrectas o pedidos fuera del horario coordinado.</p>
        <h2 className="text-xl font-black">6. Contacto</h2>
        <p className="text-[var(--muted)]">WhatsApp: 937 309 837 · Email: mosamelicorp@gmail.com</p>
      </div>
    </article>
  );
}
