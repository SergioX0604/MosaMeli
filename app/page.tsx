import { Catalog } from "@/components/catalog";
import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/money";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[] = [];
  let loadError = false;

  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    let { data, error } = await supabase
      .from("productos_catalogo")
      .select(
        "id,nombre,categoria,precio,precio_original,imagen,stock,descripcion,caracteristicas,imagenes_extra,video_url,marca,garantia,rating,review_count",
      )
      .order("id");

    // Facilita el despliegue sin interrupcion: durante el breve lapso entre el
    // frontend y la migracion nueva solo se usa el esquema anterior si la vista
    // aun no existe. Cualquier otro error se muestra al usuario.
    if (error?.code === "PGRST205" || error?.code === "42P01") {
      const [productsResult, reviewsResult] = await Promise.all([
        supabase
          .from("productos")
          .select(
            "id,nombre,categoria,precio,precio_original,imagen,stock,descripcion,caracteristicas,imagenes_extra,video_url,marca,garantia",
          )
          .order("id"),
        supabase
          .from("resenas")
          .select("producto_id,calificacion")
          .eq("aprobada", true),
      ]);
      if (!productsResult.error && !reviewsResult.error) {
        const summaries = new Map<number, { total: number; count: number }>();
        for (const review of reviewsResult.data ?? []) {
          const id = Number(review.producto_id);
          const current = summaries.get(id) ?? { total: 0, count: 0 };
          current.total += Number(review.calificacion) || 0;
          current.count += 1;
          summaries.set(id, current);
        }
        data = (productsResult.data ?? []).map((product) => {
          const summary = summaries.get(Number(product.id));
          return {
            ...product,
            rating: summary?.count ? summary.total / summary.count : null,
            review_count: summary?.count ?? 0,
          };
        });
        error = null;
      } else {
        error = productsResult.error ?? reviewsResult.error;
      }
    }

    if (error) {
      loadError = true;
    } else {
      products = (data ?? []).map((product) => {
        return {
          ...product,
          precio: toNumber(product.precio),
          precio_original:
            product.precio_original == null
              ? null
              : toNumber(product.precio_original),
          stock: toNumber(product.stock),
          rating: product.rating == null ? null : toNumber(product.rating),
          review_count: toNumber(product.review_count),
        };
      }) as Product[];
    }
  }

  return (
    <div className="catalog-page page-shell container-shell">
      <section className="catalog-hero" aria-labelledby="catalog-hero-title">
        <div className="catalog-hero-copy">
          <span className="catalog-hero-kicker">
            ✦ Selección especial MosaMeli
          </span>
          <h1 id="catalog-hero-title">
            Estilo y funcionalidad cotidiana en <em>armonía perfecta.</em>
          </h1>
          <p>
            Descubre productos pensados para hacer más cómodo tu hogar, tu
            rutina y cada compra. Entregas en Lima Este con seguimiento seguro.
          </p>
          <a className="catalog-hero-action" href="#catalogo">
            Explorar {products.length || "nuestros"} productos{" "}
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div
          className="catalog-hero-benefits"
          aria-label="Beneficios de compra"
        >
          <div>
            <span aria-hidden="true">✦</span>
            <p>
              <strong>Curaduría especial</strong>
              <small>Productos útiles y seleccionados</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">⚡</span>
            <p>
              <strong>Delivery calculado al instante</strong>
              <small>Tarifa clara según tu ubicación</small>
            </p>
          </div>
        </div>
      </section>
      {loadError ? (
        <div className="alert alert-error mb-5" role="alert">
          No se pudo conectar con el catálogo. Intenta nuevamente en unos
          minutos.
        </div>
      ) : null}
      {!hasSupabaseConfig() && !loadError ? (
        <div className="alert alert-info mb-5">
          Configura <code>.env.local</code> con las variables de Supabase para
          cargar el catálogo.
        </div>
      ) : null}
      {products.length ? (
        <Catalog products={products} />
      ) : hasSupabaseConfig() && !loadError ? (
        <div className="surface px-6 py-12 text-center">
          <p className="text-3xl" aria-hidden="true">
            📦
          </p>
          <h2 className="mt-3 font-black">El catálogo está vacío</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Los productos aparecerán aquí cuando estén publicados.
          </p>
        </div>
      ) : null}
    </div>
  );
}
