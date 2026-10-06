"use client";

import { useState, useTransition } from "react";
import { createReviewAction } from "@/app/reviews/actions";

export function ReviewForm({ productId }: { productId: number }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await createReviewAction({ productId, rating, comment });
      setFeedback({ type: result.ok ? "success" : "error", text: result.message ?? "No pudimos enviar la reseña" });
      if (result.ok) { setComment(""); setRating(0); }
    });
  }

  return (
    <form id="escribir-resena" className="surface scroll-mt-28 space-y-4 p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">Escribir reseña</h2>
      {feedback ? <p className={`alert ${feedback.type === "error" ? "alert-error" : "alert-success"}`} role="status">{feedback.text}</p> : null}
      <fieldset><legend className="form-label">Calificación</legend><div className="flex gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} className={`text-3xl ${value <= rating ? "text-amber-500" : "text-[var(--border)]"}`} onClick={() => setRating(value)} aria-label={`${value} estrellas`}>★</button>)}
      </div></fieldset>
      <div><label className="form-label" htmlFor={`review-${productId}`}>Comentario</label><textarea id={`review-${productId}`} className="form-textarea" value={comment} onChange={(event) => setComment(event.target.value)} minLength={10} maxLength={500} required /></div>
      <button className="btn btn-primary" type="submit" disabled={pending || !rating}>{pending ? "Enviando…" : "Enviar reseña"}</button>
    </form>
  );
}
