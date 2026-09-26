import type { Metadata } from "next";
import { CartPanel } from "@/components/cart-panel";

export const metadata: Metadata = { title: "Carrito", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <div className="page-shell container-shell space-y-6">
      <div>
        <h1 className="text-3xl font-black">Tu carrito</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Revisa los productos antes de continuar.</p>
      </div>
      <CartPanel />
    </div>
  );
}
