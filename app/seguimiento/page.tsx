import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrackingLookup } from "@/components/tracking-lookup";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { selectPedidos, trackingDisponible } from "@/lib/orders";

export const metadata: Metadata = { title: "Seguimiento de pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type TrackingPageProps = { searchParams: Promise<{ codigo?: string }> };

export default async function TrackingPage({ searchParams }: TrackingPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  if (user && hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    if (params.codigo) {
      const { data } = await selectPedidos(supabase, "id,estado,tracking_token", { codigo: params.codigo, limit: 1 });
      const found = data[0];
      if (found?.tracking_token && trackingDisponible(found as { estado: string; pago_declarado?: string | null })) {
        redirect(`/seguimiento/${found.tracking_token}`);
      }
    }
    // Solo se ofrece el pedido mas reciente cuando su pago ya fue declarado.
    const { data } = await selectPedidos(supabase, "id,estado,tracking_token,pago_declarado", { orderBy: "fecha", limit: 10 });
    const revealed = data.find(
      (order) => order.tracking_token && trackingDisponible(order as { estado: string; pago_declarado?: string | null }),
    );
    if (revealed?.tracking_token) redirect(`/seguimiento/${revealed.tracking_token}`);
  }
  return <div className="page-shell container-shell space-y-6"><div><h1 className="text-3xl font-black">Seguimiento de pedido</h1><p className="mt-1 text-sm text-[var(--muted)]">Consulta el estado con el código seguro recibido por correo.</p></div>{params.codigo && !user ? <p className="alert alert-info">Inicia sesión para consultar pedidos asociados a tu cuenta o usa el código seguro recibido por correo.</p> : null}<TrackingLookup /></div>;
}
