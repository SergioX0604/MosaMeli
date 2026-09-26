import Link from "next/link";
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
    const { data, error } = await supabase
      .from("productos")
      .select("id,nombre,categoria,precio,precio_original,imagen,stock,descripcion,caracteristicas,imagenes_extra,video_url,marca,garantia")
      .order("id");

    if (error) {
      loadError = true;
    } else {
      products = (data ?? []).map((product) => ({
        ...product,
        precio: toNumber(product.precio),
        precio_original: product.precio_original == null ? null : toNumber(product.precio_original),
        stock: toNumber(product.stock),
      })) as Product[];
    }
  }

  return (
    <div className="page-shell container-shell space-y-8">
      <section className="surface overflow-hidden bg-gradient-to-br from-white via-white to-[var(--brand-50)] px-6 py-10 md:px-12 md:py-14">
        <div className="max-w-3xl">
          <span className="badge">Envíos en Chaclacayo y cercanías</span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">Tu mundo en un click.</h1>
          <p className="mt-4 max-w-2xl text-base text-[var(--muted)] md:text-lg">Encuentra productos para casa, familia y mascotas, con una experiencia de compra simple y segura.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn btn-primary" href="#catalogo">Explorar catálogo</a>
            <Link className="btn btn-secondary" href="/seguimiento">Rastrear mi pedido</Link>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="alert alert-error" role="alert">No se pudo conectar con el catálogo. Intenta nuevamente en unos minutos.</div>
      ) : null}

      {!hasSupabaseConfig() && !loadError ? (
        <div className="alert alert-info">Configura <code>.env.local</code> con las variables de Supabase para cargar el catálogo.</div>
      ) : null}

      {products.length ? (
        <Catalog products={products} />
      ) : hasSupabaseConfig() && !loadError ? (
        <div className="surface px-6 py-12 text-center">
          <p className="text-3xl" aria-hidden="true">📦</p>
          <h2 className="mt-3 font-black">El catálogo está vacío</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Los productos aparecerán aquí cuando estén publicados.</p>
        </div>
      ) : null}
    </div>
  );
}
