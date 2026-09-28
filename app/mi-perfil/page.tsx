import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileDashboard } from "@/components/profile-dashboard";
import { AddressManager } from "@/components/address-manager";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { selectPedidos } from "@/lib/orders";
import { toNumber } from "@/lib/money";
import type { Order, Review } from "@/lib/types";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/mi-perfil");
  if (!hasSupabaseConfig()) return <div className="page-shell container-shell"><div className="alert alert-info">Configura Supabase para cargar tu perfil.</div></div>;

  const supabase = await createSupabaseServerClient();
  const [ordersResult, reviewsResult, profileResult] = await Promise.all([
    selectPedidos(supabase, "id,items,total,metodo_pago,estado,codigo_seguimiento,tracking_token,fecha", { orderBy: "fecha", limit: 100 }),
    supabase.from("resenas").select("id,producto_id,usuario_id,usuario_nombre,calificacion,comentario,aprobada,fecha,productos(nombre)").order("fecha", { ascending: false }).limit(100),
    supabase.from("perfiles").select("direcciones_guardadas").eq("id", user.id).maybeSingle(),
  ]);
  const orders = (ordersResult.data as Order[]).map((order) => ({ ...order, total: toNumber(order.total) }));
  const reviews = (reviewsResult.data ?? []) as Review[];
  const addresses = Array.isArray(profileResult.data?.direcciones_guardadas) ? profileResult.data.direcciones_guardadas : [];
  return <div className="page-shell container-shell space-y-6"><ProfileDashboard user={{ id: user.id, email: user.email }} orders={orders} reviews={reviews} /><AddressManager initial={addresses} /></div>;
}
