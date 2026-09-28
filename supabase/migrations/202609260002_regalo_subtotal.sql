-- Regalo sorpresa: el monto minimo se evalua sobre el subtotal de productos
-- (S/ 150), sin incluir el costo de delivery. Asi la regla coincide con la
-- que muestra la interfaz en catalogo, carrito y checkout.

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
    v_subtotal >= 150,
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
