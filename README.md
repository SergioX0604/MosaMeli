# MosaMeli

Tienda web migrada a Next.js, React, TypeScript, Tailwind CSS y Supabase.

## Desarrollo

```bash
npm.cmd install
copy .env.example .env.local
npm.cmd run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Comandos

- `npm.cmd run dev`: desarrollo.
- `npm.cmd run build`: build de producción.
- `npm.cmd run typecheck`: comprobación TypeScript.
- `npm.cmd run lint`: ESLint.
- `npm.cmd test`: pruebas unitarias.
- `npm.cmd run test:e2e`: pruebas E2E (requiere la aplicación en marcha).

## Supabase

Las migraciones están en `supabase/migrations/`, empezando por el esquema base reproducible y continuando con seguridad, reglas comerciales y fiabilidad del checkout. Las funciones Edge están en `supabase/functions/`. Consulta `supabase/README.md` antes de aplicarlas.

El checkout no acepta precios ni totales desde el navegador: envía únicamente IDs, cantidades, ubicación y método de pago. El servidor vuelve a calcular y validar todo antes de crear el pedido.

### Google OAuth

En Supabase → Authentication → URL Configuration agrega estas Redirect URLs. Si faltan, Supabase devuelve el callback al Site URL y el usuario queda sin sesión:

```
https://mosameli.com/auth/callback
https://www.mosameli.com/auth/callback
http://localhost:3000/auth/callback
```

El cierre del flujo OAuth ocurre en el navegador: `/auth/callback` es una página (no un Route Handler) que llama a `exchangeCodeForSession` desde el mismo contexto que generó el verifier PKCE. El destino post-login viaja en la cookie `mosameli_auth_next`, porque GoTrue compara el `redirectTo` con la lista autorizada y un query string extra puede hacer que caiga al Site URL. Si aun así el code llega a `/?code=...`, `components/auth-code-handler.tsx` lo completa.

## Reglas de negocio

- **Regalo sorpresa**: se incluye cuando el subtotal de productos llega a S/ 150 (`GIFT_THRESHOLD` en `lib/delivery.ts`). El catálogo muestra el badge, el carrito y el checkout indican cuánto falta, y el RPC `crear_pedido` guarda `tiene_regalo` con el mismo criterio.
- **Código de seguimiento**: no se entrega al crear el pedido. El cliente paga (Plin, Yape o transferencia), presiona **Ya hice el pago** y recién entonces el servidor devuelve el código (`declararPagoAction` → RPC `declarar_pago`, migración `202609260003_pago_declarado.sql`). Mientras tanto el código tampoco aparece en "Mis pedidos" ni en la página de seguimiento, y el panel de admin muestra "Pago declarado por el cliente" para que verifiques el pago antes de marcarlo como verificado.
- **Reserva de inventario**: un pedido pendiente reserva el stock durante 30 minutos. Al vencer o cancelarse, el servidor devuelve las unidades exactamente una vez. Declarar el pago detiene el vencimiento.
- **Delivery**: la interfaz consume la misma cotización del servidor que usa `crear_pedido`, incluidos los recargos nocturno y dominical.
- **Estados**: solo se permiten avances coherentes y cada cambio queda registrado en `pedido_historial`.

- **Barra de categorías y buscador**: el header los muestra solo en el catálogo (`/`). En el resto de páginas quedan el logo, la ubicación, favoritos, carrito y usuario.
- **Seguimiento y correos**: `lib/estados.ts` es la fuente única de los textos didácticos (título, resumen, qué sigue, tono de color y descripción de cada paso) y la usan tanto la página de seguimiento como los correos. Las Edge Functions comparten `_shared/email.ts` con la maqueta, el pie y la barra de progreso; el estilo va en línea y sobre tablas porque Gmail y Outlook descartan las hojas de estilo externas. `construirConfirmacion` y `construirAviso` son funciones puras: devuelven `{ subject, html }` y se pueden previsualizar sin desplegar.
- **Paleta**: fondo lavanda `#f7f2fb`, violeta `#7c3aed` para acciones, rosa `#e11d48` para precios y acentos pastel en los chips de categoría. Los tokens viven en `:root` y `@theme` de `app/globals.css`.
- **Splash**: la intro se reproduce una vez por navegador cada 30 días y conserva los filtros o parámetros del enlace de entrada. Las navegaciones internas no la lanzan. La barra muestra el progreso de la intro y suena `public/audio/splash-intro.wav`; el botón 🔊/🔇 permite silenciarlo.

## Estructura

- `app/`: rutas y Server Actions de Next.js.
- `components/`: componentes de interfaz reutilizables.
- `lib/`: Supabase, autenticación, validaciones, carrito y delivery.
- `public/img/`: logo, favicons e imagen social.
- `scripts/build-logo-assets.js`: regenera `logo-icon.png` y `logo-og.jpg` desde el logo original.
- `scripts/build-splash-audio.js`: sintetiza `public/audio/splash-intro.wav`.
- `supabase/migrations/`: esquema, RLS y funciones SQL.
- `supabase/functions/`: notificaciones por correo.
- `tests/`: pruebas unitarias y E2E.

Los archivos HTML/JS antiguos se conservaron en `_legacy_archive/` como referencia de la migración y no forman parte de la nueva aplicación.
