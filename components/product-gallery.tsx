"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { Product } from "@/lib/types";

export function ProductGallery({ product }: { product: Product }) {
  const extras = Array.isArray(product.imagenes_extra) ? product.imagenes_extra : [];
  const images = [product.imagen, ...extras].filter(Boolean);
  const [selected, setSelected] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="surface overflow-hidden bg-[var(--brand-50)]">
      {showVideo && product.video_url ? <video className="aspect-square w-full bg-black object-contain" src={product.video_url} controls preload="metadata" /> : <img src={images[selected]} alt={product.nombre} className="aspect-square w-full object-cover" />}
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] bg-white p-3">
        {images.map((image, index) => <button key={image} type="button" className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${selected === index && !showVideo ? "border-[var(--primary)]" : "border-transparent"}`} onClick={() => { setSelected(index); setShowVideo(false); }}><img src={image} alt={`Vista ${index + 1} de ${product.nombre}`} className="h-full w-full object-cover" /></button>)}
        {product.video_url ? <button type="button" className={`grid h-16 w-16 place-items-center rounded-xl border-2 text-xl ${showVideo ? "border-[var(--primary)] bg-[var(--brand-100)]" : "border-transparent bg-black text-white"}`} onClick={() => setShowVideo((value) => !value)} aria-label={showVideo ? "Cerrar video" : "Reproducir video"}>▶</button> : null}
      </div>
    </div>
  );
}
