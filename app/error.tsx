"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-shell container-shell">
      <div className="surface mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-black">Algo salió mal</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">No pudimos cargar esta página. Intenta nuevamente.</p>
        <button className="btn btn-primary mt-5" type="button" onClick={() => reset()}>Reintentar</button>
      </div>
    </div>
  );
}
