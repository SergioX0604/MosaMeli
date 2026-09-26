import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--border)] bg-white/70">
      <div className="container-shell grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-black text-[var(--primary-dark)]">MosaMeli</p>
          <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
            Tu mundo en un click. Productos seleccionados para casa, familia y mascotas.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-[var(--text)]">Tienda</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li><Link className="hover:text-[var(--primary)]" href="/#catalogo">Catálogo</Link></li>
            <li><Link className="hover:text-[var(--primary)]" href="/seguimiento">Rastrear pedido</Link></li>
            <li><Link className="hover:text-[var(--primary)]" href="/mi-perfil">Mi perfil</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-[var(--text)]">Ayuda</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li><Link className="hover:text-[var(--primary)]" href="/privacidad">Privacidad</Link></li>
            <li><Link className="hover:text-[var(--primary)]" href="/terminos">Términos</Link></li>
            <li><a className="hover:text-[var(--primary)]" href="https://wa.me/51937309837" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-[var(--text)]">Contacto</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">Lun–Sáb · 10:00–20:00</p>
          <p className="mt-1 text-sm text-[var(--muted)]">937 309 837</p>
        </div>
      </div>
      <div className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
        © {new Date().getFullYear()} MosaMeli. Todos los derechos reservados.
      </div>
    </footer>
  );
}
