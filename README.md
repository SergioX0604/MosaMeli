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

Las migraciones están en `supabase/migrations/`: `202609260001_p0_security.sql` (RLS, RPCs, roles, stock atómico e idempotencia) y `202609260002_regalo_subtotal.sql` (regla del regalo sorpresa). Las funciones Edge están en `supabase/functions/`. Consulta `supabase/README.md` antes de aplicarlas.

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
- **Barra de categorías y buscador**: el header los muestra solo en el catálogo (`/`). En el resto de páginas quedan el logo, la ubicación, favoritos, carrito y usuario.
- **Paleta**: fondo lavanda `#f7f2fb`, violeta `#7c3aed` para acciones, rosa `#e11d48` para precios y acentos pastel en los chips de categoría. Los tokens viven en `:root` y `@theme` de `app/globals.css`.
- **Splash**: la intro se reproduce solo al entrar de verdad al catálogo, es decir, con una carga real de la página (URL directa, F5, enlace externo o pestaña nueva). Las navegaciones internas —carrito, perfil, logo, categorías, buscador— no la lanzan. El redirect se resuelve en `proxy.ts` para responder con un 307 real; con `redirect()` desde la página Next devolvía un 200 con meta-refresh. La barra muestra el progreso de la intro y suena `public/audio/splash-intro.wav`, sintetizado con `node scripts/build-splash-audio.js`; el botón 🔊/🔇 permite silenciarlo porque los navegadores bloquean el audio automático en la primera visita.

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
