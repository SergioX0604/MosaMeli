import type { Review } from "@/lib/types";

export function ProductReviews({ reviews }: { reviews: Review[] }) {
  return (
    <section id="resenas" className="surface scroll-mt-28 p-5 md:p-6">
      <h2 className="text-xl font-black">Reseñas</h2>
      {reviews.length ? <div className="mt-4 space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><strong>{review.usuario_nombre}</strong><span className="text-amber-500" aria-label={`${review.calificacion} de 5 estrellas`}>{"★".repeat(review.calificacion)}{"☆".repeat(5 - review.calificacion)}</span></div><p className="mt-2 text-sm text-[var(--muted)]">{review.comentario || "Sin comentario"}</p><time className="mt-2 block text-xs text-[var(--muted)]" dateTime={review.fecha}>{new Date(review.fecha).toLocaleDateString("es-PE")}</time></article>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">Aún no hay reseñas publicadas.</p>}
    </section>
  );
}
