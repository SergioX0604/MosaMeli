import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { ProductReviews } from "@/components/product-reviews";
import { ReviewForm } from "@/components/review-form";
import { hasSupabaseConfig } from "@/lib/env";
import { toNumber } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("productos").select("nombre,descripcion").eq("id", Number(id)).maybeSingle();
    if (data) return { title: data.nombre, description: data.descripcion ?? undefined, openGraph: { images: [{ url: "/img/logo-og.jpg", width: 1200, height: 630, alt: data.nombre }] } };
  }
  return { title: `Producto ${id}` };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0 || !hasSupabaseConfig()) notFound();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id,nombre,categoria,precio,precio_original,imagen,stock,descripcion,caracteristicas,imagenes_extra,video_url,marca,garantia")
    .eq("id", productId)
    .maybeSingle();
  if (error || !data) notFound();

  const { data: reviews } = await supabase
    .from("resenas")
    .select("id,producto_id,usuario_id,usuario_nombre,calificacion,comentario,aprobada,fecha")
    .eq("producto_id", productId)
    .eq("aprobada", true)
    .order("fecha", { ascending: false })
    .limit(50);

  let extraImages: string[] = [];
  if (Array.isArray(data.imagenes_extra)) extraImages = data.imagenes_extra;
  else if (typeof data.imagenes_extra === "string") {
    try {
      const parsed = JSON.parse(data.imagenes_extra);
      if (Array.isArray(parsed)) extraImages = parsed.filter((value): value is string => typeof value === "string");
    } catch {
      extraImages = [];
    }
  }

  const product: Product = {
    ...data,
    precio: toNumber(data.precio),
    precio_original: data.precio_original == null ? null : toNumber(data.precio_original),
    stock: toNumber(data.stock),
    imagenes_extra: extraImages,
  } as Product;

  return (
    <div className="page-shell container-shell space-y-6">
      <ProductDetail product={product} />
      <ProductReviews reviews={reviews ?? []} />
      <ReviewForm productId={product.id} />
    </div>
  );
}
