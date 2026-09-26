import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell container-shell">
      <div className="surface mx-auto max-w-xl px-6 py-14 text-center">
        <p className="text-5xl" aria-hidden="true">🔎</p>
        <h1 className="mt-4 text-2xl font-black">Página no encontrada</h1>
        <p className="mt-2 text-[var(--muted)]">La página que buscas no existe o cambió de ubicación.</p>
        <Link className="btn btn-primary mt-6" href="/">Volver al inicio</Link>
      </div>
    </div>
  );
}
