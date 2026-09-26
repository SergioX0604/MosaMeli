import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrackingLookup } from "@/components/tracking-lookup";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seguimiento de pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type TrackingPageProps = { searchParams: Promise<{ codigo?: string }> };

export default async function TrackingPage({ searchParams }: TrackingPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  if (user && hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    if (params.codigo) {
      const { data } = await supabase.from("pedidos").select("tracking_token").eq("usuario_id", user.id).eq("codigo_seguimiento", params.codigo).maybeSingle();
      if (data?.tracking_token) redirect(`/seguimiento/${data.tracking_token}`);
    }
    const { data } = await supabase.from("pedidos").select("tracking_token").eq("usuario_id", user.id).order("fecha", { ascending: false }).limit(1);
    const latest = data?.[0]?.tracking_token;
    if (latest) redirect(`/seguimiento/${latest}`);
  }
  return <div className="page-shell container-shell space-y-6"><div><h1 className="text-3xl font-black">Seguimiento de pedido</h1><p className="mt-1 text-sm text-[var(--muted)]">Consulta el estado con el código seguro recibido por correo.</p></div>{params.codigo && !user ? <p className="alert alert-info">Inicia sesión para consultar pedidos asociados a tu cuenta o usa el código seguro recibido por correo.</p> : null}<TrackingLookup /></div>;
}
