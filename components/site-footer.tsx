import Link from "next/link";
/* eslint-disable @next/next/no-img-element */

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main container-shell">
        <div>
          <div className="footer-brand">
            <img src="/img/logo-icon.png" alt="" width={44} height={44} />
            <p className="text-lg font-extrabold text-[var(--primary)]">MosaMeli</p>
          </div>
          <p className="footer-tagline">Tu mundo, en un click</p>
        </div>
        <nav className="site-footer-links" aria-label="Enlaces legales">
          <Link href="/seguimiento">Rastrear mi pedido</Link>
          <Link href="/privacidad">Preguntas Frecuentes</Link>
          <Link href="/terminos">Términos y Condiciones</Link>
          <Link href="/privacidad">Políticas de Privacidad</Link>
          <a href="https://wa.me/51937309837" target="_blank" rel="noopener noreferrer">Libro de Reclamaciones</a>
        </nav>
      </div>
      <div className="site-footer-bottom container-shell">
        © {new Date().getFullYear()} MosaMeli. Todos los derechos reservados.
      </div>
    </footer>
  );
}
