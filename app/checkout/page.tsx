import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/checkout-client";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/checkout");
  return (
    <div className="page-shell container-shell space-y-6">
      <CheckoutClient />
    </div>
  );
}
