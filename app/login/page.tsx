import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    action?: string;
    error?: string;
    motivo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/");

  const nextPath =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";
  const initialMessage =
    params.error === "oauth"
      ? {
          type: "error" as const,
          text: `No pudimos completar el acceso con Google. Intenta de nuevo o usa tu correo y contraseña.${params.motivo ? ` Detalle: ${params.motivo}` : ""}`,
        }
      : null;

  return (
    <div className="auth-page page-shell container-shell">
      <AuthForm nextPath={nextPath} initialMessage={initialMessage} />
    </div>
  );
}
