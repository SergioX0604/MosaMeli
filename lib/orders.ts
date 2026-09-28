import type { SupabaseClient } from "@supabase/supabase-js";

type SelectOptions = {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  codigo?: string;
};

/**
 * El codigo de seguimiento solo se muestra cuando el cliente ya declaro el
 * pago o cuando un administrador lo verifico.
 */
export function trackingDisponible(order: { estado?: string | null; pago_declarado?: string | null }): boolean {
  return Boolean(order.pago_declarado) || (order.estado ?? "pedido_recibido") !== "pedido_recibido";
}

/**
 * La columna pago_declarado llega con la migracion 202609260003. Si todavia no
 * esta aplicada, la consulta se reintenta sin ella para que el perfil y el
 * panel de admin no se caigan.
 */
export async function selectPedidos(
  supabase: SupabaseClient,
  columns: string,
  options: SelectOptions = {},
): Promise<{ data: Array<Record<string, unknown>>; declaredColumn: boolean }> {
  async function run(extra: string) {
    let query = supabase.from("pedidos").select(`${columns}${extra}`);
    if (options.codigo) query = query.eq("codigo_seguimiento", options.codigo);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    if (options.limit) query = query.limit(options.limit);
    return query;
  }

  const withColumn = await run(",pago_declarado");
  if (!withColumn.error) {
    return { data: (withColumn.data ?? []) as unknown as Array<Record<string, unknown>>, declaredColumn: true };
  }

  const fallback = await run("");
  return { data: (fallback.data ?? []) as unknown as Array<Record<string, unknown>>, declaredColumn: false };
}
