import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type LoginPageProps = { searchParams: Promise<{ next?: string; action?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/");

  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  return (
    <div className="page-shell container-shell">
      <AuthForm nextPath={nextPath} />
    </div>
  );
}
