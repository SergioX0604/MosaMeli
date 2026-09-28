# Supabase — MosaMeli

## Aplicar la capa P0

1. Haz una copia de seguridad de la base de datos.
2. En Supabase SQL Editor, ejecuta `migrations/202609260001_p0_security.sql`.
3. Ejecuta también `migrations/202609260002_regalo_subtotal.sql` para que el regalo sorpresa se calcule sobre el subtotal de productos (S/ 150) y coincida con lo que muestra la interfaz.
4. Revisa que el correo del bootstrap sea el de tu cuenta administrativa.
5. Configura el claim `app_metadata.role = "admin"`; no se debe autorizar administradores comparando correos en el frontend.
6. Despliega las funciones:
   - `functions/enviar-confirmacion`
   - `functions/notificar-estado`
7. Configura en las funciones: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` y `SITE_URL`.

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
