"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useCartStore } from "@/lib/cart-store";
import { useFavoritesStore } from "@/lib/favorites-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/roles";

type SiteHeaderProps = { user: User | null };

const categories = [
  ["Todo", "🛍️", "solid"],
  ["Hogar", "🏠", "pink"],
  ["Vestuario", "👕", "lilac"],
  ["Juegos", "🎮", "blue"],
  ["Electrónica", "💻", "sun"],
  ["Mascotas", "🐾", "mint"],
  ["Belleza", "💄", "rose"],
  ["Deportes", "🏃", "peach"],
  ["Cocina", "🍳", "pink"],
  ["Herramientas", "🔧", "lilac"],
  ["Baño", "🛁", "blue"],
  ["Oficina", "💼", "sun"],
] as const;

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const items = useCartStore((state) => state.items);
  const setOwner = useCartStore((state) => state.setOwner);
  const clearCart = useCartStore((state) => state.clear);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const cartCount = items.reduce((total, line) => total + line.quantity, 0);
  const displayName = user?.user_metadata?.username || user?.email?.split("@")[0] || "Invitado";
  const activeCategory = searchParams.get("categoria") ?? "todos";
  // El buscador y la barra de categorías solo tienen sentido en el catálogo.
  // En el resto de páginas el buscador se sustituye por un espaciador para
  // mantener las acciones a la derecha.
  const isCatalog = pathname === "/";
  const showSearch = isCatalog;

  useEffect(() => {
    setOwner(user?.id ?? null);
  }, [setOwner, user?.id]);

  useEffect(() => {
    // La búsqueda puede cambiar mediante el router sin remontar el header.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, []);

  async function handleLogout() {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      clearCart();
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}#catalogo` : "/#catalogo");
  }

  return (
    <>
      <header className="site-header-main sticky top-0 z-40">
        <div className="header-main-row container-shell">
          <Link href="/" className="brand-lockup" aria-label="MosaMeli, inicio">
            <span className="brand-mark"><img src="/img/logo-icon.png" alt="" width={52} height={52} /></span>
            <span><span className="brand-name">MosaMeli</span><span className="brand-tagline">Tu mundo en un click</span></span>
          </Link>

          {showSearch ? (
            <form className="header-search-form" onSubmit={submitSearch} role="search">
              <span aria-hidden="true" className="text-[var(--muted)]">⌕</span>
              <label className="sr-only" htmlFor="header-search">Buscar productos</label>
              <input id="header-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué estás buscando? (ej: zapatillas, lámpara, accesorios)" />
              <button type="submit">Buscar</button>
            </form>
          ) : <div className="header-spacer" aria-hidden="true" />}

          <div className="header-actions">
            <Link href="/checkout" className="location-pill" aria-label="Seleccionar ubicación de entrega"><span aria-hidden="true">⌖</span><span>Selecciona tu ubicaci...</span><span aria-hidden="true">⌄</span></Link>
            <Link href="/favoritos" className="header-icon-button" aria-label={`Favoritos, ${favoriteIds.length} productos`}><span aria-hidden="true">♡</span>{favoriteIds.length ? <span className="cart-count">{favoriteIds.length}</span> : null}</Link>
            <Link href="/carrito" className="header-icon-button filled" aria-label={`Carrito con ${cartCount} productos`}><span aria-hidden="true">🛒</span>{cartCount ? <span className="cart-count">{cartCount}</span> : null}</Link>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button type="button" className="user-pill" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((open) => !open)}>
                  <span className="user-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><span className="max-w-24 truncate">{displayName}</span><span aria-hidden="true">⌄</span>
                </button>
                {menuOpen ? (
                  <div className="user-menu" role="menu">
                    <div className="user-menu-header"><span className="user-avatar" aria-hidden="true">♙</span><span><strong className="block text-[#2f1b63]">{displayName}</strong><small className="text-[#8a7a9d]">{user.email}</small></span></div>
                    <Link role="menuitem" className="user-menu-item" href="/mi-perfil" onClick={() => setMenuOpen(false)}>♙ <span>Mi perfil</span></Link>
                    <Link role="menuitem" className="user-menu-item" href="/seguimiento" onClick={() => setMenuOpen(false)}>▣ <span>Rastrear mi pedido</span></Link>
                    <a role="menuitem" className="user-menu-item" href="https://wa.me/51937309837" target="_blank" rel="noopener noreferrer">◌ <span>Contáctanos</span></a>
                    {isAdmin(user) ? <Link role="menuitem" className="user-menu-item" href="/admin" onClick={() => setMenuOpen(false)}>⚙ <span>Panel de Admin</span><span className="ml-auto rounded-full bg-[#fce7f3] px-2 py-0.5 text-[0.62rem] text-[#be185d]">Pro</span></Link> : null}
                    <div className="my-2 border-t border-[#f0e9f7]" />
                    <button role="menuitem" type="button" className="user-menu-item danger" disabled={busy} onClick={handleLogout}>{busy ? "Cerrando…" : "→  Cerrar sesión"}</button>
                  </div>
                ) : null}
              </div>
            ) : <Link href="/login" className="user-pill"><span className="user-avatar" aria-hidden="true">♙</span><span>Ingresar</span></Link>}
          </div>
        </div>
        {isCatalog ? (
          <nav className="category-nav" aria-label="Categorías">
            <div className="category-nav-inner container-shell">
              {categories.map(([label, icon, tone]) => {
                const key = label === "Todo" ? "todos" : label.toLowerCase().replace("ó", "o").replace("í", "i");
                const active = activeCategory === key;
                return <Link key={label} className={`category-nav-link tone-${tone} ${active ? "active" : ""}`} href={key === "todos" ? "/#catalogo" : `/?categoria=${encodeURIComponent(key)}#catalogo`}><span aria-hidden="true">{icon}</span>{label}</Link>;
              })}
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}
