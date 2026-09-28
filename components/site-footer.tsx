import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main container-shell">
        <div><p className="text-lg font-black text-[var(--primary-dark)]">MosaMeli</p><p className="mt-1 text-xs text-[var(--muted)]">© {new Date().getFullYear()} MosaMeli - Tu mundo en un click. Todos los derechos reservados.</p></div>
        <nav className="site-footer-links" aria-label="Enlaces legales"><Link href="/seguimiento">Rastrear mi pedido</Link><Link href="/privacidad">Preguntas Frecuentes</Link><Link href="/terminos">Términos y Condiciones</Link><Link href="/privacidad">Políticas de Privacidad</Link><a href="https://wa.me/51937309837" target="_blank" rel="noopener noreferrer">Libro de Reclamaciones</a></nav>
      </div>
    </footer>
  );
}
