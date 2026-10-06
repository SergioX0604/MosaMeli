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
type Theme = "light" | "dark";

const categories = [
  ["todos", "Todo el catálogo", "solid"],
  ["hogar", "Hogar", "sun"],
  ["vestuario", "Vestuario", "mint"],
  ["juegos", "Juegos", "lilac"],
  ["electronica", "Electrónica", "blue"],
  ["mascotas", "Mascotas", "aqua"],
  ["belleza", "Belleza", "rose"],
  ["deportes", "Deportes", "peach"],
  ["cocina", "Cocina", "coral"],
  ["herramientas", "Herramientas", "stone"],
  ["bano", "Baño", "cyan"],
  ["oficina", "Oficina", "sun"],
] as const;

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const items = useCartStore((state) => state.items);
  const setOwner = useCartStore((state) => state.setOwner);
  const clearCart = useCartStore((state) => state.clear);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const cartCount = items.reduce((total, line) => total + line.quantity, 0);
  const displayName =
    user?.user_metadata?.username || user?.email?.split("@")[0] || "Invitado";
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
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const saved = window.localStorage.getItem("mosameli-theme");
      const nextTheme: Theme =
        saved === "dark" || saved === "light"
          ? saved
          : media.matches
            ? "dark"
            : "light";
      root.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };
    const followSystem = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem("mosameli-theme")) return;
      root.dataset.theme = event.matches ? "dark" : "light";
      syncTheme();
    };
    syncTheme();
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  useEffect(() => {
    // La búsqueda puede cambiar mediante el router sin remontar el header.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setUserMenuOpen(false);
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
      setUserMenuOpen(false);
      // El refresh hace que el header vuelva al estado de invitado sin esperar
      // a la siguiente navegación.
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(
      query ? `/?q=${encodeURIComponent(query)}#catalogo` : "/#catalogo",
    );
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("mosameli-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <>
      <header className="site-header-main sticky top-0 z-40">
        <div className="header-main-row container-shell">
          <button
            type="button"
            className="mobile-menu-trigger"
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link href="/" className="brand-lockup" aria-label="MosaMeli, inicio">
            <span className="brand-mark">
              <img src="/img/logo-icon.png" alt="" width={52} height={52} />
            </span>
            <span>
              <span className="brand-name">MosaMeli</span>
              <span className="brand-tagline">Tu mundo en un click</span>
            </span>
          </Link>

          {showSearch ? (
            <form
              className="header-search-form"
              onSubmit={submitSearch}
              role="search"
            >
              <span aria-hidden="true" className="text-[var(--muted)]">
                ⌕
              </span>
              <label className="sr-only" htmlFor="header-search">
                Buscar productos
              </label>
              <input
                id="header-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="¿Qué estás buscando? (ej: zapatillas, lámpara, accesorios)"
              />
              <button type="submit">Buscar</button>
            </form>
          ) : (
            <div className="header-spacer" aria-hidden="true" />
          )}

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              aria-pressed={theme === "dark"}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
              <strong>{theme === "dark" ? "LIGHT" : "DARK"}</strong>
            </button>
            <Link
              href="/checkout"
              className="location-pill"
              aria-label="Seleccionar ubicación de entrega"
            >
              <span aria-hidden="true">⌖</span>
              <span>Selecciona tu ubicaci...</span>
              <span aria-hidden="true">⌄</span>
            </Link>
            <Link
              href="/favoritos"
              className="header-icon-button"
              aria-label={`Favoritos, ${favoriteIds.length} productos`}
            >
              <span aria-hidden="true">♡</span>
              {favoriteIds.length ? (
                <span className="cart-count">{favoriteIds.length}</span>
              ) : null}
            </Link>
            <Link
              href="/carrito"
              className="header-icon-button filled"
              aria-label={`Carrito con ${cartCount} productos`}
            >
              <span aria-hidden="true">🛒</span>
              {cartCount ? (
                <span className="cart-count">{cartCount}</span>
              ) : null}
            </Link>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="user-pill"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setUserMenuOpen((open) => !open)}
                >
                  <span className="user-avatar" aria-hidden="true">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-24 truncate">{displayName}</span>
                  <span aria-hidden="true">⌄</span>
                </button>
                {userMenuOpen ? (
                  <div className="user-menu" role="menu">
                    <div className="user-menu-header">
                      <span className="user-avatar" aria-hidden="true">
                        ♙
                      </span>
                      <span>
                        <strong className="block text-[#2f1b63]">
                          {displayName}
                        </strong>
                        <small className="text-[#8a7a9d]">{user.email}</small>
                      </span>
                    </div>
                    <Link
                      role="menuitem"
                      className="user-menu-item"
                      href="/mi-perfil"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      ♙ <span>Mi perfil</span>
                    </Link>
                    <Link
                      role="menuitem"
                      className="user-menu-item"
                      href="/seguimiento"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      ▣ <span>Rastrear mi pedido</span>
                    </Link>
                    <a
                      role="menuitem"
                      className="user-menu-item"
                      href="https://wa.me/51937309837"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ◌ <span>Contáctanos</span>
                    </a>
                    {isAdmin(user) ? (
                      <Link
                        role="menuitem"
                        className="user-menu-item"
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        ⚙ <span>Panel de Admin</span>
                        <span className="ml-auto rounded-full bg-[#fce7f3] px-2 py-0.5 text-[0.62rem] text-[#be185d]">
                          Pro
                        </span>
                      </Link>
                    ) : null}
                    <div className="my-2 border-t border-[#f0e9f7]" />
                    <button
                      role="menuitem"
                      type="button"
                      className="user-menu-item danger"
                      disabled={busy}
                      onClick={handleLogout}
                    >
                      {busy ? "Cerrando…" : "→  Cerrar sesión"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/login" className="user-pill">
                <span className="user-avatar" aria-hidden="true">
                  ♙
                </span>
                <span>Ingresar</span>
              </Link>
            )}
          </div>
          <button
            type="button"
            className="mobile-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            aria-pressed={theme === "dark"}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
          <Link
            href="/carrito"
            className="mobile-cart-button"
            aria-label={`Carrito con ${cartCount} productos`}
          >
            <span className="mobile-bag-icon" aria-hidden="true" />
            {cartCount ? <span className="cart-count">{cartCount}</span> : null}
          </Link>
        </div>
        <div className="mobile-delivery-row container-shell">
          <Link href="/checkout" aria-label="Cambiar ubicación de entrega">
            <span aria-hidden="true">⌖</span>
            <span>
              Entregar en <strong>Lima, Perú</strong>
            </span>
            <b>Cambiar</b>
          </Link>
        </div>
        {isCatalog ? (
          <form
            className="mobile-header-search-form container-shell"
            onSubmit={submitSearch}
            role="search"
          >
            <span aria-hidden="true">⌕</span>
            <label className="sr-only" htmlFor="mobile-header-search">
              Buscar productos
            </label>
            <input
              id="mobile-header-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar productos..."
            />
            {search ? (
              <button
                type="button"
                className="mobile-search-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            ) : null}
            <button type="submit">Buscar</button>
          </form>
        ) : null}
        {isCatalog ? (
          <nav className="category-nav" aria-label="Categorías">
            <div className="category-nav-inner container-shell">
              {categories.map(([key, label, tone]) => {
                const active = activeCategory === key;
                return (
                  <Link
                    key={label}
                    className={`category-nav-link tone-${tone} ${active ? "active" : ""}`}
                    href={
                      key === "todos"
                        ? "/#catalogo"
                        : `/?categoria=${encodeURIComponent(key)}#catalogo`
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={
                        key === "todos" ? "category-menu-icon" : "category-dot"
                      }
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>
      <button
        type="button"
        className={`mobile-menu-backdrop ${mobileMenuOpen ? "open" : ""}`}
        aria-label="Cerrar menú"
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside
        className={`mobile-menu-drawer ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="mobile-menu-header">
          <strong>MosaMeli</strong>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>
        <nav aria-label="Menú móvil">
          <button type="button" onClick={toggleTheme}>
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
          </button>
          <Link href="/" onClick={() => setMobileMenuOpen(false)}>
            ⌂ <span>Inicio</span>
          </Link>
          <Link href="/#catalogo" onClick={() => setMobileMenuOpen(false)}>
            ▦ <span>Catálogo</span>
          </Link>
          <Link href="/carrito" onClick={() => setMobileMenuOpen(false)}>
            ▢ <span>Mi carrito</span>
            <b>{cartCount}</b>
          </Link>
          <Link href="/favoritos" onClick={() => setMobileMenuOpen(false)}>
            ♡ <span>Favoritos</span>
            <b>{favoriteIds.length}</b>
          </Link>
          <Link href="/mi-perfil" onClick={() => setMobileMenuOpen(false)}>
            ♙ <span>Mi perfil</span>
          </Link>
          <Link href="/seguimiento" onClick={() => setMobileMenuOpen(false)}>
            ◎ <span>Rastrear pedido</span>
          </Link>
          <Link
            href="/preguntas-frecuentes"
            onClick={() => setMobileMenuOpen(false)}
          >
            ? <span>Ayuda y preguntas</span>
          </Link>
        </nav>
      </aside>
      <nav
        className="mobile-bottom-nav"
        aria-label="Navegación principal móvil"
      >
        <Link href="/">
          <span aria-hidden="true">⌂</span>
          <small>Inicio</small>
        </Link>
        <Link className={pathname === "/" ? "active" : ""} href="/#catalogo">
          <span aria-hidden="true">▦</span>
          <small>Catálogo</small>
        </Link>
        <Link
          className={pathname === "/favoritos" ? "active" : ""}
          href="/favoritos"
        >
          <span aria-hidden="true">♡</span>
          <small>Favoritos</small>
        </Link>
        <Link
          className={
            pathname === "/mi-perfil" || pathname === "/login" ? "active" : ""
          }
          href={user ? "/mi-perfil" : "/login"}
        >
          <span aria-hidden="true">♙</span>
          <small>Perfil</small>
        </Link>
      </nav>
    </>
  );
}
