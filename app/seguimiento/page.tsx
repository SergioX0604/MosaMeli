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
  return (
    <div className="page-shell container-shell space-y-6">
      <div className="surface p-6 md:p-8">
        <h1 className="text-3xl font-black">Sigue tu pedido</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Te explicamos en qué punto va tu compra, paso a paso y con la fecha de cada avance. Solo necesitas el código que te
          mostramos después de registrar tu pago.
        </p>
        <ol className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-[var(--brand-50)] p-4">
            <p className="font-black text-[var(--text)]">1. Paga tu pedido</p>
            <p className="mt-1 text-[var(--muted)]">Con Plin, Yape o transferencia, usando los datos de la tienda.</p>
          </li>
          <li className="rounded-2xl bg-[var(--brand-50)] p-4">
            <p className="font-black text-[var(--text)]">2. Presiona “Ya hice el pago”</p>
            <p className="mt-1 text-[var(--muted)]">En el checkout o en Mis pedidos. Ahí te damos tu código.</p>
          </li>
          <li className="rounded-2xl bg-[var(--brand-50)] p-4">
            <p className="font-black text-[var(--text)]">3. Pega el código aquí</p>
            <p className="mt-1 text-[var(--muted)]">Y verás cada etapa: pago, preparación, envío y entrega.</p>
          </li>
        </ol>
      </div>
      {params.codigo && !user ? <p className="alert alert-info">Inicia sesión para consultar los pedidos asociados a tu cuenta, o pega aquí el código que te dimos al confirmar el pago.</p> : null}
      <TrackingLookup />
    </div>
  );
}
