"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useCartStore } from "@/lib/cart-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/roles";

type SiteHeaderProps = {
  user: User | null;
};

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const items = useCartStore((state) => state.items);
  const setOwner = useCartStore((state) => state.setOwner);
  const clear = useCartStore((state) => state.clear);
  const count = items.reduce((total, line) => total + line.quantity, 0);

  useEffect(() => {
    setOwner(user?.id ?? null);
  }, [setOwner, user?.id]);

  async function handleLogout() {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      clear();
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
      <div className="container-shell flex min-h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-black tracking-tight text-[var(--primary-dark)]">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-lg text-white">
            M
          </span>
          <span className="hidden sm:inline">MosaMeli</span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
          <Link className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-50)] hover:text-[var(--primary-dark)]" href="/#catalogo">
            Catálogo
          </Link>
          <Link className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-50)] hover:text-[var(--primary-dark)]" href="/seguimiento">
            Seguir pedido
          </Link>
          {user ? (
            <>
              <Link className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-50)] hover:text-[var(--primary-dark)]" href="/mi-perfil">
                Mi perfil
              </Link>
              <Link className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-50)] hover:text-[var(--primary-dark)]" href="/favoritos">
                Favoritos
              </Link>
            </>
          ) : null}
          {isAdmin(user) ? (
            <Link className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--primary-dark)] hover:bg-[var(--brand-50)]" href="/admin">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-white text-lg hover:border-[var(--primary)]"
            aria-label={`Carrito con ${count} productos`}
          >
            🛒
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1 text-[0.7rem] font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>

          {user ? (
            <div className="relative">
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--primary-dark)]"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--brand-100)] text-xs">
                  {(user.email ?? "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate sm:inline">{user.email}</span>
                <span aria-hidden="true">▾</span>
              </button>
              {menuOpen ? (
                <div role="menu" className="absolute right-0 top-14 w-56 rounded-2xl border border-[var(--border)] bg-white p-2 shadow-xl">
                  <Link role="menuitem" href="/mi-perfil" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--brand-50)]">
                    Mi perfil
                  </Link>
                  <Link role="menuitem" href="/seguimiento" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--brand-50)]">
                    Mis pedidos
                  </Link>
                  <button role="menuitem" type="button" disabled={busy} onClick={handleLogout} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--danger)] hover:bg-red-50 disabled:opacity-50">
                    {busy ? "Cerrando…" : "Cerrar sesión"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary min-h-11 px-4 text-sm">
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
