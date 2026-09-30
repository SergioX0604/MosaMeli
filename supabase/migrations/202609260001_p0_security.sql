-- MosaMeli P0: autorización y operaciones críticas en servidor.
-- Aplicar después de revisar una copia de seguridad de la base de datos.
-- La migración está pensada para PostgreSQL de Supabase.

begin;

create extension if not exists pgcrypto;

-- El administrador se decide con un claim de Supabase, no con un correo en el navegador.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Campos nuevos para tracking seguro e idempotencia.
alter table public.pedidos add column if not exists tracking_token text;
alter table public.pedidos add column if not exists idempotency_key uuid;

create index if not exists pedidos_tracking_token_idx
  on public.pedidos (tracking_token)
  where tracking_token is not null;

create unique index if not exists pedidos_tracking_token_unique
  on public.pedidos (tracking_token)
  where tracking_token is not null;

create index if not exists pedidos_codigo_seguimiento_idx
  on public.pedidos (codigo_seguimiento);

create unique index if not exists pedidos_usuario_idempotencia_unique
  on public.pedidos (usuario_id, idempotency_key)
  where idempotency_key is not null;

-- Restricciones básicas. Se omiten si ya existen para permitir reaplicar la migración.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
    from pg_constraint
   where conrelid = 'public.productos'::regclass
     and conname = 'productos_precio_positivo';
  if constraint_name is null then
    alter table public.productos
      add constraint productos_precio_positivo check (precio > 0);
  end if;

  select conname into constraint_name
    from pg_constraint
   where conrelid = 'public.productos'::regclass
     and conname = 'productos_stock_no_negativo';
  if constraint_name is null then
    alter table public.productos
      add constraint productos_stock_no_negativo check (stock >= 0);
  end if;

  select conname into constraint_name
    from pg_constraint
   where conrelid = 'public.pedidos'::regclass
     and conname = 'pedidos_total_no_negativo';
  if constraint_name is null then
    alter table public.pedidos
      add constraint pedidos_total_no_negativo check (total >= 0);
  end if;
end;
$$;

-- Elimina políticas antiguas para que no se acumulen permisos permisivos.
-- Haz una copia de seguridad antes de ejecutar esta parte.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in ('productos', 'pedidos', 'perfiles', 'resenas')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end;
$$;

alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.perfiles enable row level security;
alter table public.resenas enable row level security;

-- Productos: lectura pública, escritura solo admin.
revoke all on table public.productos from anon, authenticated;
grant select on table public.productos to anon, authenticated;
grant insert, update, delete on table public.productos to authenticated;

create policy productos_select_public
  on public.productos for select
  to anon, authenticated
  using (true);

create policy productos_admin_insert
  on public.productos for insert
  to authenticated
  with check (public.is_admin());

create policy productos_admin_update
  on public.productos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy productos_admin_delete
  on public.productos for delete
  to authenticated
  using (public.is_admin());

-- Pedidos: el cliente no inserta ni modifica nada directamente.
revoke all on table public.pedidos from anon, authenticated;
grant select on table public.pedidos to authenticated;
grant update on table public.pedidos to authenticated;

create policy pedidos_select_own_or_admin
  on public.pedidos for select
  to authenticated
  using (auth.uid() = usuario_id or public.is_admin());

create policy pedidos_admin_update
  on public.pedidos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Perfiles: cada usuario solo puede ver y modificar su perfil.
revoke all on table public.perfiles from anon, authenticated;
grant select, insert, update on table public.perfiles to authenticated;

create policy perfiles_select_own_or_admin
  on public.perfiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy perfiles_insert_own
  on public.perfiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy perfiles_update_own_or_admin
  on public.perfiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Reseñas: las aprobadas son públicas; las pendientes son de su autor o del admin.
revoke all on table public.resenas from anon, authenticated;
grant select on table public.resenas to anon, authenticated;
grant update, delete on table public.resenas to authenticated;

create policy resenas_select_public_or_owner
  on public.resenas for select
  to anon, authenticated
  using (aprobada = true or auth.uid() = usuario_id or public.is_admin());

create policy resenas_admin_update
  on public.resenas for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy resenas_admin_delete
  on public.resenas for delete
  to authenticated
  using (public.is_admin());

-- El alta de perfiles se hace mediante trigger; el nombre no se toma del cliente en cada operación.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );

  insert into public.perfiles (id, email, username)
  values (new.id, new.email, base_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Crear pedido: única función autorizada para insertar y descontar stock.
-- No acepta precios, totales, delivery ni nombre de cliente desde el navegador.
create or replace function public.crear_pedido(
  p_items jsonb,
  p_metodo_pago text,
  p_direccion text,
  p_lat double precision,
  p_lng double precision,
  p_notas text default '',
  p_idempotency_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_username text;
  v_order_id bigint;
  v_code text;
  v_token text;
  v_subtotal numeric := 0;
  v_delivery numeric := 0;
  v_distance double precision;
  v_items jsonb := '[]'::jsonb;
  v_item record;
  v_quantity integer;
  v_product record;
  v_now timestamptz := now();
  origin_lat constant double precision := -11.9726;
  origin_lng constant double precision := -76.7790;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'EMAIL_REQUERIDO';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_INVALIDOS';
  end if;

  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'CANTIDAD_PRODUCTOS_INVALIDA';
  end if;

  if p_metodo_pago is null or p_metodo_pago not in ('plin', 'yape', 'transferencia') then
    raise exception 'METODO_PAGO_INVALIDO';
  end if;

  if p_direccion is null or length(trim(p_direccion)) < 5 or length(p_direccion) > 300 then
    raise exception 'DIRECCION_INVALIDA';
  end if;

  if length(coalesce(p_notas, '')) > 500 then
    raise exception 'NOTAS_INVALIDAS';
  end if;

  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'UBICACION_INVALIDA';
  end if;

  if p_idempotency_key is not null then
    select id, codigo_seguimiento, tracking_token
      into v_order_id, v_code, v_token
      from public.pedidos
     where usuario_id = v_user_id
       and idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'id', v_order_id,
        'codigo_seguimiento', v_code,
        'tracking_token', v_token
      );
    end if;
  end if;

  for v_item in
    select id, sum(cantidad)::integer as cantidad
      from jsonb_to_recordset(p_items) as item(id bigint, cantidad integer)
     group by id
     order by id
  loop
    select id, nombre, precio, stock
      into v_product
      from public.productos
     where id = v_item.id
     for update;

    if not found then
      raise exception 'PRODUCTO_NO_DISPONIBLE';
    end if;

    v_quantity := v_item.cantidad;
    if v_quantity is null or v_quantity <= 0 or v_quantity > 99 then
      raise exception 'CANTIDAD_INVALIDA';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'STOCK_INSUFICIENTE';
    end if;

    v_subtotal := v_subtotal + (v_product.precio * v_quantity);
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_product.id,
        'nombre', v_product.nombre,
        'precio', v_product.precio,
        'cantidad', v_quantity
      )
    );

    update public.productos
       set stock = stock - v_quantity
     where id = v_product.id;
  end loop;

  if v_items = '[]'::jsonb then
    raise exception 'CARRITO_VACIO';
  end if;

  v_distance := 6371 * 2 * asin(sqrt(
    power(sin(radians(p_lat - origin_lat) / 2), 2) +
    cos(radians(origin_lat)) * cos(radians(p_lat)) *
    power(sin(radians(p_lng - origin_lng) / 2), 2)
  ));

  if v_distance > 10 then
    raise exception 'FUERA_DE_COBERTURA';
  end if;

  v_delivery := case
    when v_distance <= 2 then 5
    when v_distance <= 4 then 7
    when v_distance <= 7 then 10
    else 15
  end;

  if extract(hour from v_now at time zone 'America/Lima') >= 20
     or extract(hour from v_now at time zone 'America/Lima') < 7 then
    v_delivery := v_delivery + 3;
  end if;

  if extract(dow from v_now at time zone 'America/Lima') = 0 then
    v_delivery := v_delivery + 2;
  end if;

  select username into v_username
    from public.perfiles
   where id = v_user_id;

  v_username := coalesce(nullif(v_username, ''), split_part(coalesce(v_email, 'cliente'), '@', 1));
  v_token := encode(gen_random_bytes(24), 'hex');
  v_code := 'MOSA-' || to_char(v_now at time zone 'America/Lima', 'YYYYMMDD') || '-' ||
            lpad(floor(random() * 10000)::integer::text, 4, '0');

  insert into public.pedidos (
    usuario_id, items, total, metodo_pago, estado, codigo_seguimiento,
    tracking_token, idempotency_key, cliente_nombre, cliente_email,
    costo_delivery, distancia_delivery, direccion_cliente, notas_delivery,
    tiene_regalo, fecha
  ) values (
    v_user_id,
    v_items,
    round(v_subtotal + v_delivery, 2),
    p_metodo_pago,
    'pedido_recibido',
    v_code,
    v_token,
    p_idempotency_key,
    v_username,
    v_email,
    v_delivery,
    v_distance,
    left(trim(p_direccion), 300),
    nullif(left(trim(coalesce(p_notas, '')), 500), ''),
    (v_subtotal + v_delivery) >= 150,
    v_now
  ) returning id into v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'codigo_seguimiento', v_code,
    'tracking_token', v_token,
    'total', round(v_subtotal + v_delivery, 2)
  );
end;
$$;

revoke all on function public.crear_pedido(jsonb, text, text, double precision, double precision, text, uuid) from public, anon;
grant execute on function public.crear_pedido(jsonb, text, text, double precision, double precision, text, uuid) to authenticated;

-- Crear reseña: el usuario no puede enviar nombre de usuario o estado de moderación.
create or replace function public.crear_resena(
  p_producto_id integer,
  p_calificacion integer,
  p_comentario text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
  v_review_id bigint;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_calificacion < 1 or p_calificacion > 5 then
    raise exception 'CALIFICACION_INVALIDA';
  end if;
  if length(trim(coalesce(p_comentario, ''))) < 10 then
    raise exception 'COMENTARIO_INVALIDO';
  end if;

  if not exists (
    select 1
      from public.pedidos p
     where p.usuario_id = v_user_id
       and jsonb_typeof(p.items) = 'array'
       and exists (
         select 1
           from jsonb_array_elements(p.items) item
          where (item ->> 'id')::bigint = p_producto_id
       )
  ) then
    raise exception 'DEBES_COMPRAR_EL_PRODUCTO';
  end if;

  select username into v_username
    from public.perfiles
   where id = v_user_id;
  v_username := coalesce(nullif(v_username, ''), 'Cliente');

  insert into public.resenas (producto_id, usuario_id, usuario_nombre, calificacion, comentario, aprobada)
  values (p_producto_id, v_user_id, v_username, p_calificacion, trim(p_comentario), false)
  returning id into v_review_id;

  return jsonb_build_object('id', v_review_id, 'estado', 'pendiente');
end;
$$;

revoke all on function public.crear_resena(integer, integer, text) from public, anon;
grant execute on function public.crear_resena(integer, integer, text) to authenticated;

-- Tracking público: devuelve un DTO mínimo, nunca select *.
create or replace function public.obtener_seguimiento(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'codigo_seguimiento', codigo_seguimiento,
    'cliente_nombre', coalesce(cliente_nombre, 'Cliente'),
    'total', total,
    'metodo_pago', metodo_pago,
    'estado', coalesce(estado, 'pedido_recibido'),
    'fecha', fecha,
    'fecha_pago_verificado', fecha_pago_verificado,
    'fecha_preparacion', fecha_preparacion,
    'fecha_envio', fecha_envio,
    'fecha_entrega', fecha_entrega
  )
  from public.pedidos
  where tracking_token = p_token
  limit 1;
$$;

revoke all on function public.obtener_seguimiento(text) from public;
grant execute on function public.obtener_seguimiento(text) to anon, authenticated;

-- Los administradores se asignan fuera de las migraciones mediante
-- app_metadata.role = 'admin'. No se incluyen correos personales en el esquema.

commit;
