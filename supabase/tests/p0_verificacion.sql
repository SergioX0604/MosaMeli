-- Consultas de verificación para ejecutar después de aplicar la migración.
-- Requiere abrir sessions con distintos roles; no es un test destructivo.

-- 1. La función de pedido debe existir y ser ejecutable por authenticated.
select has_function_privilege('authenticated', 'public.crear_pedido(jsonb,text,text,double precision,double precision,text,uuid)', 'execute');

-- 2. La función de tracking debe existir y ser ejecutable por anon.
select has_function_privilege('anon', 'public.obtener_seguimiento(text)', 'execute');

-- 3. No debe existir granting directo de insert/update/delete de pedidos al anon.
select has_table_privilege('anon', 'public.pedidos', 'insert') as anon_puede_insertar,
       has_table_privilege('anon', 'public.pedidos', 'update') as anon_puede_actualizar;

-- 4. Las políticas de lectura de pedidos deben existir para authenticated.
select policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename = 'pedidos'
 order by policyname;
