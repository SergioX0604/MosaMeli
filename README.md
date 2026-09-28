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

## Reglas de negocio

- **Regalo sorpresa**: se incluye cuando el subtotal de productos llega a S/ 150 (`GIFT_THRESHOLD` en `lib/delivery.ts`). El catálogo muestra el badge, el carrito y el checkout indican cuánto falta, y el RPC `crear_pedido` guarda `tiene_regalo` con el mismo criterio.
- **Splash**: la intro se reproduce en cada entrada al catálogo (recarga o volver desde otra página). Al mostrarse, el catálogo borra la marca `mosameli_splash_v2`; las navegaciones internas del catálogo (filtros y búsqueda del header) la renuevan para no interrumpir al filtrar.

## Estructura

- `app/`: rutas y Server Actions de Next.js.
- `components/`: componentes de interfaz reutilizables.
- `lib/`: Supabase, autenticación, validaciones, carrito y delivery.
- `supabase/migrations/`: esquema, RLS y funciones SQL.
- `supabase/functions/`: notificaciones por correo.
- `tests/`: pruebas unitarias y E2E.

Los archivos HTML/JS antiguos se conservaron en `_legacy_archive/` como referencia de la migración y no forman parte de la nueva aplicación.
