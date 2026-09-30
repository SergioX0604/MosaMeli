import type { Metadata } from "next";
import { CartPanel } from "@/components/cart-panel";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="purchase-page page-shell container-shell">
      <div className="purchase-progress" aria-label="Progreso de compra">
        <div className="active">
          <span>1</span>
          <p>
            <strong>Carrito de compras</strong>
            <small>Revisa tus productos</small>
          </p>
        </div>
        <i />
        <div>
          <span>2</span>
          <p>
            <strong>Entrega y ubicación</strong>
            <small>Calculamos tu delivery</small>
          </p>
        </div>
        <i />
        <div>
          <span>3</span>
          <p>
            <strong>Confirmación y pago</strong>
            <small>Finaliza de forma segura</small>
          </p>
        </div>
      </div>
      <CartPanel />
    </div>
  );
}
