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
  return Boolean(order.pago_declarado) || ["pago_verificado", "en_preparacion", "en_camino", "entregado"].includes(order.estado ?? "pedido_recibido");
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
  const baseColumns = columns
    .split(",")
    .map((column) => column.trim())
    .filter((column) => !["pago_declarado", "reserva_expira_en", "stock_liberado_en"].includes(column))
    .join(",");
  async function run(extra: string) {
    let query = supabase.from("pedidos").select(`${baseColumns}${extra}`);
    if (options.codigo) query = query.eq("codigo_seguimiento", options.codigo);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    if (options.limit) query = query.limit(options.limit);
    return query;
  }

  const withColumn = await run(",pago_declarado,reserva_expira_en,stock_liberado_en");
  if (!withColumn.error) {
    return { data: (withColumn.data ?? []) as unknown as Array<Record<string, unknown>>, declaredColumn: true };
  }

  const missingColumn = withColumn.error?.code === "42703" || withColumn.error?.code === "PGRST204";
  if (!missingColumn) throw new Error(`No se pudieron cargar los pedidos: ${withColumn.error?.message ?? "error desconocido"}`);

  const fallback = await run("");
  if (fallback.error) throw new Error(`No se pudieron cargar los pedidos: ${fallback.error.message}`);
  return { data: (fallback.data ?? []) as unknown as Array<Record<string, unknown>>, declaredColumn: false };
}
