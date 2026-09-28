# Supabase — MosaMeli

## Aplicar la capa P0

1. Haz una copia de seguridad de la base de datos.
2. En Supabase SQL Editor, ejecuta `migrations/202609260001_p0_security.sql`.
3. Ejecuta también `migrations/202609260002_regalo_subtotal.sql` para que el regalo sorpresa se calcule sobre el subtotal de productos (S/ 150) y coincida con lo que muestra la interfaz.
4. Ejecuta `migrations/202609260003_pago_declarado.sql`: agrega la columna `pago_declarado` y el RPC `declarar_pago`, que entrega el código de seguimiento solo cuando el cliente declara el pago. Si aún no la aplicas, la web sigue funcionando (el botón "Ya hice el pago" valida con una lectura), pero el panel de admin no mostrará la fecha de declaración.
5. Revisa que el correo del bootstrap sea el de tu cuenta administrativa.
6. Configura el claim `app_metadata.role = "admin"`; no se debe autorizar administradores comparando correos en el frontend.
7. Despliega las funciones:
   - `functions/enviar-confirmacion`
   - `functions/notificar-estado`
8. Configura en las funciones: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` y `SITE_URL`.

## Correos

- `functions/_shared/email.ts` concentra la identidad visual (cabecera con logo, botón, barra de progreso de 5 pasos, pie con datos de contacto) y los textos de cada estado. Los dos correos la comparten para que se vean de la misma marca.
- `enviar-confirmacion` y `notificar-estado` exponen `construirConfirmacion` y `construirAviso`, funciones puras que devuelven `{ subject, html }`. Para revisar un correo sin desplegar, transpílalas y llama a esos builders con datos de ejemplo; así se inspecciona el HTML final.
- El correo de confirmación no incluye el código de seguimiento: el cliente lo recibe al presionar "Ya hice el pago".
- Al cambiar un estado desde el panel, `notificar-estado` manda el correo con el tono del estado, la barra de progreso y el enlace de seguimiento. Si el pedido está `cancelado`, no incluye botón de seguimiento.

`SUPABASE_SERVICE_ROLE_KEY` solo debe existir en los secretos de Supabase Edge Functions. Nunca debe aparecer en variables `NEXT_PUBLIC_*` ni en el repositorio.

## Variables del frontend

Copia `.env.example` a `.env.local` y configura únicamente la URL y la clave publicable de Supabase. La clave publicable está pensada para el navegador; la seguridad depende de RLS y de las funciones de servidor.

## Verificación recomendada

- Un usuario no puede leer pedidos de otro.
- Un usuario no puede insertar pedidos directamente.
- Un usuario no puede editar productos.
- Un administrador sí puede leer y editar productos/pedidos.
- Un pedido concurrente no genera sobreventa.
- Un token de seguimiento no devuelve la fila completa de `pedidos`.
