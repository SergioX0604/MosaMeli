-- El codigo de seguimiento solo se entrega despues de que el cliente
-- declara que realizo el pago. La columna registra esa declaracion para que
-- el administrador pueda verificar el pago antes de marcarlo como verificado.
--
-- 1) Columna de declaracion (idempotente)
alter table public.pedidos
  add column if not exists pago_declarado timestamptz;

-- 2) RPC: valida que el pedido sea del usuario, que siga pendiente de pago y
--    que no se haya declarado antes. Devuelve el codigo solo en ese momento.
create or replace function public.declarar_pago(p_pedido_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.pedidos%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_order
    from public.pedidos
   where id = p_pedido_id
     and usuario_id = v_user_id;

  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO';
  end if;

  if v_order.estado <> 'pedido_recibido' then
    raise exception 'PEDIDO_YA_VERIFICADO';
  end if;

  if v_order.pago_declarado is not null then
    raise exception 'PAGO_YA_DECLARADO';
  end if;

  update public.pedidos
     set pago_declarado = now()
   where id = p_pedido_id
     and usuario_id = v_user_id;

  return jsonb_build_object(
    'id', v_order.id,
    'codigo_seguimiento', v_order.codigo_seguimiento,
    'tracking_token', v_order.tracking_token,
    'total', v_order.total,
    'metodo_pago', v_order.metodo_pago,
    'pago_declarado', now()
  );
end;
$$;

revoke all on function public.declarar_pago(bigint) from public, anon;
grant execute on function public.declarar_pago(bigint) to authenticated;
