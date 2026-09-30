# Supabase — MosaMeli

## Aplicar la capa P0

1. Haz una copia de seguridad de la base de datos.
2. Ejecuta las migraciones de `supabase/migrations/` en orden. `202609250000_base_schema.sql` permite reconstruir un proyecto vacío; las siguientes agregan RLS, reglas comerciales, pago declarado, reservas, historial, cotización y cola de notificaciones.
3. Configura el claim `app_metadata.role = "admin"` desde un entorno administrativo; las migraciones no contienen correos personales.
4. Despliega las funciones:
   - `functions/enviar-confirmacion`
   - `functions/notificar-estado`
   - `functions/reintentar-notificaciones`
5. Configura en las funciones: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` y `SITE_URL`.
6. Programa `reintentar-notificaciones` cada 5 minutos con Supabase Cron usando una petición autenticada con el service role. La función aplica espera exponencial y abandona después de 6 intentos.
7. Programa `select public.expirar_reservas();` cada 5 minutos. Las operaciones de checkout también la ejecutan, pero el cron libera reservas aunque no haya tráfico.

## Correos

- `functions/_shared/email.ts` concentra la identidad visual (cabecera con logo y barra de color, botón, chips, miniaturas de producto, barra de progreso de 5 pasos, pie con datos de contacto) y los textos de cada estado. Los dos correos la comparten para que se vean de la misma marca.
- `enviar-confirmacion` y `notificar-estado` exponen `construirConfirmacion` y `construirAviso`, funciones puras que devuelven `{ subject, html }`. Para revisar un correo sin desplegar, transpílalas y llama a esos builders con datos de ejemplo; así se inspecciona el HTML final.
- El correo de confirmación busca las fotos de los productos en `productos.imagen` (el pedido solo guarda id, nombre, precio y cantidad). Si un producto no tiene imagen, la miniatura cae a una Pastilla con emoji.
- **Cambiar el diseño de los correos no cambia nada en la web**: hay que redesplegar las funciones. Sin eso, Supabase sigue sirviendo la versión anterior aunque el código esté en `main`.
- El correo de confirmación no incluye el código de seguimiento: el cliente lo recibe al presionar "Ya hice el pago".
- Si Resend o una Edge Function falla, el pedido queda en `notificaciones_pendientes` para un reintento persistente.
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
