import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <article className="page-shell container-shell">
      <div className="surface mx-auto max-w-3xl space-y-5 p-6 md:p-10">
        <p className="badge">Última actualización: septiembre de 2026</p>
        <h1 className="text-3xl font-black">Política de privacidad</h1>
        <p>Esta política explica qué datos utiliza MosaMeli, para qué fines y cómo se protegen.</p>
        <h2 className="text-xl font-black">1. Datos que usamos</h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--muted)]"><li>Datos de cuenta: correo y nombre de usuario.</li><li>Datos de pedido: productos, dirección, notas de entrega, importe y método de pago elegido.</li><li>Ubicación aproximada o coordenadas cuando seleccionas una dirección de entrega.</li></ul>
        <h2 className="text-xl font-black">2. Finalidades</h2>
        <p className="text-[var(--muted)]">Usamos los datos para gestionar cuentas, pedidos, pagos, entregas, soporte y comunicaciones relacionadas con una compra.</p>
        <h2 className="text-xl font-black">3. Almacenamiento local</h2>
        <p className="text-[var(--muted)]">El carrito y los favoritos pueden guardarse en el almacenamiento local del navegador. No se guardan contraseñas en ese almacenamiento. Puedes borrar estos datos desde la configuración del navegador.</p>
        <h2 className="text-xl font-black">4. Proveedores y transferencias</h2>
        <p className="text-[var(--muted)]">Utilizamos Supabase para cuentas y datos, servicios de mapas para calcular cobertura y un proveedor de correo para confirmaciones. Las coordenadas pueden enviarse a esos proveedores cuando se utiliza el mapa de entrega. No vendemos datos personales.</p>
        <h2 className="text-xl font-black">5. Seguridad</h2>
        <p className="text-[var(--muted)]"> Aplicamos medidas técnicas y organizativas razonables. El acceso administrativo y las operaciones sensibles deben realizarse mediante controles de servidor y políticas de autorización.</p>
        <h2 className="text-xl font-black">6. Derechos y contacto</h2>
        <p className="text-[var(--muted)]">Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a mosamelicorp@gmail.com o contacting-nos por WhatsApp al 937 309 837.</p>
      </div>
    </article>
  );
}
