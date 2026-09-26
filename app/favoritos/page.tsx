import type { Metadata } from "next";
import { FavoritesClient } from "@/components/favorites-client";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false, follow: false } };

export default function FavoritesPage() {
  return <div className="page-shell container-shell space-y-6"><div><h1 className="text-3xl font-black">Favoritos</h1><p className="mt-1 text-sm text-[var(--muted)]">Tus productos guardados en este navegador.</p></div><FavoritesClient /></div>;
}
