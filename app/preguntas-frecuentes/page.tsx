import type { Metadata } from "next";
import Link from "next/link";
import { DELIVERY_ZONES, GIFT_THRESHOLD, MAX_DELIVERY_KM } from "@/lib/delivery";
import { PASOS, WHATSAPP, WHATSAPP_TEXTO } from "@/lib/estados";

export const metadata: Metadata = { title: "Preguntas frecuentes", description: "Cómo comprar, pagar y seguir tu pedido en MosaMeli." };

type Pregunta = { pregunta: string; respuesta: React.ReactNode; abierta?: boolean };

const PREGUNTAS: Pregunta[] = [
  {
    pregunta: "¿Cómo hago un pedido?",
    abierta: true,
    respuesta: (
      <>
        <p>Agrega los productos al carrito, revisa el total y pulsa <strong>Ir al checkout</strong>. Ahí eliges el método de pago, escribes tu dirección y marcas tu ubicación en el mapa para que calculemos el costo del delivery.</p>
        <p>Cuando confirmas, el pedido queda registrado y la pantalla te muestra los datos para pagar.</p>
      </>
    ),
  },
  {
    pregunta: "¿Qué métodos de pago aceptan?",
    respuesta: <p>Plin, Yape y transferencia bancaria. El importe exacto a pagar, con el delivery incluido, aparece en la pantalla del pedido y en el correo de confirmación.</p>,
  },
  {
    pregunta: "¿Cómo obtengo mi código de seguimiento?",
    abierta: true,
    respuesta: (
      <>
        <ol>
          <li>Paga el pedido con el método que elegiste.</li>
          <li>
            Presiona <strong>Ya hice el pago</strong>, en la pantalla del pedido o en <strong>Mis pedidos</strong> dentro de tu cuenta.
          </li>
          <li>Te mostramos tu código único y el enlace para seguir el pedido paso a paso.</li>
        </ol>
        <p>El código aparece recién cuando confirmas el pago, para que el seguimiento refleje únicamente pedidos en los que estás pagando.</p>
      </>
    ),
  },
  {
    pregunta: "¿Cuánto tarda en confirmarse mi pago?",
    respuesta: <p>La confirmación puede tardar hasta 24 horas. Apenas verificamos el pago cambias el estado a “Pago verificado” y te llega un correo; no necesitas escribirnos para preguntar.</p>,
  },
  {
    pregunta: "¿A qué zonas hacen delivery y cuánto cuesta?",
    abierta: true,
    respuesta: (
      <>
        <p>
          Hacemos delivery en un radio de hasta {MAX_DELIVERY_KM} km desde Chaclacayo. El costo depende de la distancia:
        </p>
        <ul>
          {DELIVERY_ZONES.map((zona) => (
            <li key={zona.nombre}>
              <strong>{zona.nombre}</strong> — hasta {zona.radio} km: <strong>S/ {zona.costo.toFixed(2)}</strong>
            </li>
          ))}
        </ul>
        <p>El mapa del checkout te muestra la zona y el costo de tu dirección antes de confirmar.</p>
      </>
    ),
  },
  {
    pregunta: "Mi dirección dice que está fuera de cobertura",
    respuesta: (
      <p>
        Si el mapa marca tu ubicación fuera del radio, el checkout no permite confirmar el pedido. Escríbenos por WhatsApp al{" "}
        {WHATSAPP_TEXTO} y vemos una alternativa para tu caso.
      </p>
    ),
  },
  {
    pregunta: "¿Qué significa cada estado de mi pedido?",
    respuesta: (
      <ol>
        {PASOS.map((paso) => (
          <li key={paso.key}>
            <strong>{paso.etiqueta}</strong> — {paso.descripcion}
          </li>
        ))}
      </ol>
    ),
  },
  {
    pregunta: "¿Mi pedido incluye regalo sorpresa?",
    respuesta: (
      <p>
        Sí. Cuando el subtotal de productos llega a <strong>S/ {GIFT_THRESHOLD}</strong> tu pedido incluye un regalo sorpresa, sin costo
        adicional. El monto se calcula sobre los productos y no incluye el delivery. En el carrito y en el checkout te indicamos
        cuánto te falta para alcanzarlo.
      </p>
    ),
  },
  {
    pregunta: "¿Puedo cambiar o cancelar un pedido?",
    respuesta: (
      <p>
        Puedes solicitarlo mientras el pedido no haya sido despachado. Escríbenos por WhatsApp con tu código de seguimiento y lo
        revisamos contigo. Los pedidos ya despachados se gestionan según cómo va la entrega.
      </p>
    ),
  },
  {
    pregunta: "No me llega el código o el correo",
    respuesta: (
      <>
        <p>Revisa la carpeta de spam y que tu correo esté bien escrito. También puedes entrar a Mis pedidos: ahí verás el estado de cada compra y el botón “Ya hice el pago”.</p>
        <p>Si el pedido ya figura como entregado, el código sigue disponible en Mis pedidos.</p>
      </>
    ),
  },
  {
    pregunta: "¿Cómo los contacto?",
    respuesta: (
      <p>
        WhatsApp{" "}
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
          {WHATSAPP_TEXTO}
        </a>{" "}
        o correo{" "}
        <a href="mailto:mosamelicorp@gmail.com">mosamelicorp@gmail.com</a>. Atendemos de lunes a sábado.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <article className="page-shell container-shell">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="surface p-6 md:p-8">
          <p className="badge">Ayuda</p>
          <h1 className="mt-3 text-3xl font-black">Preguntas frecuentes</h1>
          <p className="mt-2 text-[var(--muted)]">
            Todo lo que suelen preguntarnos antes de comprar y después de pagar. Si tu duda no está aquí, escríbenos por WhatsApp
            y la resolvemos contigo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a className="btn btn-primary" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
            <Link className="btn btn-secondary" href="/seguimiento">
              Rastrear mi pedido
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {PREGUNTAS.map((item) => (
            <details key={item.pregunta} className="surface group p-5" open={item.abierta}>
              <summary className="cursor-pointer list-none text-lg font-black text-[var(--text)] marker:content-none">
                <span className="flex items-start justify-between gap-3">
                  {item.pregunta}
                  <span aria-hidden="true" className="text-[var(--primary)] transition-transform group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-[var(--muted)] [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_strong]:text-[var(--text)]">
                {item.respuesta}
              </div>
            </details>
          ))}
        </div>

        <div className="surface p-6 text-center">
          <h2 className="text-xl font-black">¿Sigue sin resolverse?</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Escríbenos con tu código de seguimiento y lo revisamos el mismo día.</p>
          <a className="btn btn-primary mt-4" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            WhatsApp {WHATSAPP_TEXTO}
          </a>
        </div>
      </div>
    </article>
  );
}
