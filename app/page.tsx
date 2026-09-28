import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/money";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("mosameli_splash_v2")?.value) redirect("/splash");

  let products: Product[] = [];
  let loadError = false;

  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id,nombre,categoria,precio,precio_original,imagen,stock,descripcion,caracteristicas,imagenes_extra,video_url,marca,garantia")
      .order("id");
    const { data: reviewData } = await supabase.from("resenas").select("producto_id,calificacion").eq("aprobada", true);

    if (error) {
      loadError = true;
    } else {
      const reviewSummary = new Map<number, { total: number; count: number }>();
      for (const review of reviewData ?? []) {
        const id = Number(review.producto_id);
        const current = reviewSummary.get(id) ?? { total: 0, count: 0 };
        current.total += Number(review.calificacion) || 0;
        current.count += 1;
        reviewSummary.set(id, current);
      }
      products = (data ?? []).map((product) => {
        const summary = reviewSummary.get(Number(product.id));
        return {
          ...product,
          precio: toNumber(product.precio),
          precio_original: product.precio_original == null ? null : toNumber(product.precio_original),
          stock: toNumber(product.stock),
          rating: summary?.count ? Number((summary.total / summary.count).toFixed(1)) : null,
          review_count: summary?.count ?? 0,
        };
      }) as Product[];
    }
  }

  return (
    <div className="page-shell container-shell">
      {loadError ? <div className="alert alert-error mb-5" role="alert">No se pudo conectar con el catálogo. Intenta nuevamente en unos minutos.</div> : null}
      {!hasSupabaseConfig() && !loadError ? <div className="alert alert-info mb-5">Configura <code>.env.local</code> con las variables de Supabase para cargar el catálogo.</div> : null}
      {products.length ? <Catalog products={products} /> : hasSupabaseConfig() && !loadError ? <div className="surface px-6 py-12 text-center"><p className="text-3xl" aria-hidden="true">📦</p><h2 className="mt-3 font-black">El catálogo está vacío</h2><p className="mt-1 text-sm text-[var(--muted)]">Los productos aparecerán aquí cuando estén publicados.</p></div> : null}
    </div>
  );
}
