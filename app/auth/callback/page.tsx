"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearAuthDestination, readAuthDestination } from "@/lib/auth-redirect";

/**
 * Cierre del flujo OAuth. El intercambio se hace en el navegador y no en un
 * Route Handler a propósito: el verifier PKCE lo genera el cliente del
 * navegador y se guarda en sus cookies por flujo, así que completes el
 * intercambio en el mismo contexto garantiza encontrarlo. Si el servidor lo
 * hace, puede no ver el verifier y la sesión nunca se crea.
 */
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    const destination = readAuthDestination();
    clearAuthDestination();

    const fail = (motivo: string) => {
      router.replace(`/login?error=oauth&motivo=${encodeURIComponent(motivo.slice(0, 120))}`);
    };

    if (!code) {
      fail(searchParams.get("error_description") ?? searchParams.get("error") ?? "no llego el codigo");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    void supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) {
          fail(error.message);
          return;
        }
        if (!data.session) {
          fail("la respuesta no traia sesion");
          return;
        }
        router.replace(destination);
        router.refresh();
      })
      .catch((cause: unknown) => fail(cause instanceof Error ? cause.message : "fallo inesperado"));
  }, [router, searchParams]);

  return (
    <div className="page-shell container-shell">
      <div className="surface mx-auto max-w-md p-8 text-center" role="status" aria-live="polite">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-100)] border-t-[var(--primary)]" aria-hidden="true" />
        <h1 className="mt-5 text-xl font-black">Cerrando tu acceso…</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Estamos confirmando tu cuenta de Google.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell container-shell">
          <div className="surface mx-auto max-w-md p-8 text-center" role="status">Cerrando tu acceso…</div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
