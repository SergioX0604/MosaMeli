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

La migración P0 está en `supabase/migrations/202609260001_p0_security.sql`. Las funciones Edge están en `supabase/functions/`. Consulta `supabase/README.md` antes de aplicarlas.

El checkout no acepta precios ni totales desde el navegador: envía únicamente IDs, cantidades, ubicación y método de pago. El servidor vuelve a calcular y validar todo antes de crear el pedido.

## Estructura

- `app/`: rutas y Server Actions de Next.js.
- `components/`: componentes de interfaz reutilizables.
- `lib/`: Supabase, autenticación, validaciones, carrito y delivery.
- `supabase/migrations/`: esquema, RLS y funciones SQL.
- `supabase/functions/`: notificaciones por correo.
- `tests/`: pruebas unitarias y E2E.

Los archivos HTML/JS antiguos se conservaron en `legacy/` como referencia de la migración y no forman parte de la nueva aplicación.
