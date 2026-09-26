import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import { toNumber } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Order, Product, Review } from "@/lib/types";

export const metadata: Metadata = { title: "Panel de administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) {
    return <div className="page-shell container-shell"><div className="surface mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-black">Acceso restringido</h1><p className="mt-2 text-sm text-[var(--muted)]">Esta cuenta no tiene permisos de administrador.</p></div></div>;
  }
  if (!hasSupabaseConfig()) return <div className="page-shell container-shell"><div className="alert alert-info">Configura las variables de Supabase para cargar el panel.</div></div>;

  const supabase = await createSupabaseServerClient();
  const [productsResult, ordersResult, reviewsResult] = await Promise.all([
    supabase.from("productos").select("id,nombre,categoria,precio,precio_original,imagen,stock").order("id"),
    supabase.from("pedidos").select("id,items,total,metodo_pago,estado,codigo_seguimiento,tracking_token,cliente_nombre,cliente_email,direccion_cliente,notas_delivery,fecha").order("fecha", { ascending: false }).limit(200),
    supabase.from("resenas").select("id,producto_id,usuario_id,usuario_nombre,calificacion,comentario,aprobada,fecha,productos(nombre)").eq("aprobada", false).order("fecha", { ascending: false }).limit(100),
  ]);

  const products: Product[] = (productsResult.data ?? []).map((product) => ({ ...product, precio: toNumber(product.precio), stock: toNumber(product.stock) })) as Product[];
  const orders: Order[] = (ordersResult.data ?? []).map((order) => ({ ...order, total: toNumber(order.total) })) as Order[];
  const reviews: Review[] = (reviewsResult.data ?? []) as Review[];

  return (
    <div className="page-shell container-shell space-y-6">
      <div><h1 className="text-3xl font-black">Panel de administración</h1><p className="mt-1 text-sm text-[var(--muted)]">Gestiona catálogo, pedidos y reseñas.</p></div>
      <AdminDashboard products={products} orders={orders} reviews={reviews} />
    </div>
  );
}
