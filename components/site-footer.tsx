"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
/* eslint-disable @next/next/no-img-element */

function FooterSocialIcon({
  name,
}: {
  name: "instagram" | "facebook" | "tiktok" | "whatsapp";
}) {
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </svg>
    );
  }
  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 8H17V4h-3c-3.3 0-5 2-5 5v2H6v4h3v7h4v-7h3.5l.5-4h-4V9.3c0-.9.4-1.3 1.5-1.3Z" />
      </svg>
    );
  }
  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 4c.5 2.5 2 4 4.5 4.5V12a9 9 0 0 1-4.5-1.3v5.1a5.3 5.3 0 1 1-4.5-5.2V14a2 2 0 1 0 1.2 1.8V4H15Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-4.9A8.5 8.5 0 1 1 20.5 11.7Z" />
      <path d="M8.2 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 2c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.4 0 .6.7 1.2 1.7 2.1 2.9 2.7.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l2 .9c.3.1.4.3.4.5 0 .3-.2 1.5-1 2.1-.6.6-1.5.8-2.4.5-1.1-.3-2.5-.8-4.1-2.2-1.3-1.2-2.3-2.6-2.9-4-.6-1.4.1-2.8.7-3.3Z" />
    </svg>
  );
}

export function SiteFooter() {
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyEmail() {
    const email = "mosamelicorp@gmail.com";
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      try {
        const input = document.createElement("textarea");
        input.value = email;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        copied = document.execCommand("copy");
        input.remove();
      } catch {
        copied = false;
      }
    }
    if (copied) {
      setCopyMessage(`Correo copiado: ${email}`);
    } else {
      setCopyMessage(`Copia este correo: ${email}`);
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyMessage(""), 3000);
  }

  return (
    <footer className="site-footer">
      <div className="footer-social-strip">
        <div className="container-shell footer-social-inner">
          <p>
            <span aria-hidden="true">✦</span> Síguenos en nuestras redes
            sociales
          </p>
          <nav className="footer-social-links" aria-label="Redes sociales">
            <a
              href="https://instagram.com/mosameli"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <FooterSocialIcon name="instagram" />
            </a>
            <a
              href="https://facebook.com/mosameli"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FooterSocialIcon name="facebook" />
            </a>
            <a
              href="https://tiktok.com/@mosameli"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <FooterSocialIcon name="tiktok" />
            </a>
            <a
              href="https://wa.me/51937309837"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
            >
              <FooterSocialIcon name="whatsapp" />
            </a>
          </nav>
        </div>
      </div>

      <div className="footer-dark">
        <div className="footer-columns container-shell">
          <section className="footer-column" aria-labelledby="footer-contacto">
            <h2 id="footer-contacto">Contacto</h2>
            <ul className="footer-contact-list">
              <li>
                <span className="footer-list-icon" aria-hidden="true">
                  ☎
                </span>
                <span>
                  <small>Teléfono / WhatsApp</small>
                  <a
                    href="https://wa.me/51937309837"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    937 309 837
                  </a>
                </span>
              </li>
              <li>
                <span className="footer-list-icon" aria-hidden="true">
                  ✉
                </span>
                <span>
                  <small>Email</small>
                  <button type="button" onClick={copyEmail}>
                    mosamelicorp@gmail.com
                  </button>
                </span>
              </li>
              <li>
                <span className="footer-list-icon" aria-hidden="true">
                  ⌖
                </span>
                <span>
                  <small>Ubicación</small>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Chaclacayo%2C%20Lima%2C%20Per%C3%BA"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chaclacayo, Lima – Perú
                  </a>
                </span>
              </li>
              <li>
                <span className="footer-list-icon" aria-hidden="true">
                  ◷
                </span>
                <span>
                  <small>Horario</small>
                  <strong>Lun a Dom: 10am – 8pm</strong>
                </span>
              </li>
            </ul>
          </section>

          <section className="footer-column" aria-labelledby="footer-nosotros">
            <h2 id="footer-nosotros">Sobre nosotros</h2>
            <nav aria-label="Sobre MosaMeli">
              <Link href="/nosotros">Nuestra tienda</Link>
              <Link href="/regalo-sorpresa">Regalo sorpresa</Link>
              <Link href="/por-que-elegirnos">Por qué elegirnos</Link>
              <Link href="/zonas-delivery">Zonas de delivery</Link>
            </nav>
          </section>

          <section className="footer-column" aria-labelledby="footer-ayuda">
            <h2 id="footer-ayuda">Ayuda</h2>
            <nav aria-label="Ayuda de compra">
              <Link href="/como-comprar">Cómo comprar</Link>
              <Link href="/rastrear-pedido">Rastrear mi pedido</Link>
              <Link href="/envios-olva">Envíos por Olva</Link>
              <Link href="/metodos-pago">Métodos de pago</Link>
              <Link href="/tiempo-entrega">Tiempo de entrega</Link>
              <Link href="/faq">Preguntas frecuentes</Link>
            </nav>
          </section>

          <section className="footer-column" aria-labelledby="footer-legal">
            <h2 id="footer-legal">Legal</h2>
            <nav aria-label="Información legal">
              <Link href="/terminos">Términos y condiciones</Link>
              <Link href="/privacidad">Políticas de privacidad</Link>
              <a
                href="https://wa.me/51937309837?text=Hola%20MosaMeli,%20deseo%20información%20sobre%20el%20Libro%20de%20Reclamaciones"
                target="_blank"
                rel="noopener noreferrer"
              >
                Libro de reclamaciones
              </a>
            </nav>
          </section>
        </div>

        <div className="footer-bottom-card container-shell">
          <div className="footer-brand">
            <img src="/img/logo-icon.png" alt="" width={36} height={36} />
            <p>
              <strong>
                Mosa<span>Meli</span>
              </strong>
              <small>Boutique</small>
            </p>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} MosaMeli. Todos los derechos
            reservados.
          </p>
          <p className="footer-made">
            Hecho con <span aria-label="amor">♥</span> en Chaclacayo, Perú
          </p>
        </div>
      </div>

      <a
        className="footer-whatsapp-float"
        href="https://wa.me/51937309837?text=Hola%20MosaMeli,%20tengo%20una%20consulta"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar a MosaMeli por WhatsApp"
      >
        <FooterSocialIcon name="whatsapp" />
      </a>
      {copyMessage ? (
        <div className="footer-copy-toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {copyMessage}
        </div>
      ) : null}
    </footer>
  );
}
