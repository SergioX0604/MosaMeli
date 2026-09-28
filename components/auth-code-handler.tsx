"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Supabase devuelve el callback de OAuth a /auth/callback. Si esa URL no está
 * autorizada en el panel (Authentication → URL Configuration), Supabase cae al
 * Site URL y vuelve a / con ?code=... sin intercambiar nada, por lo que el
 * usuario queda fuera. Este componente completa el intercambio en el navegador
 * para que el login funcione en cualquiera de los dos casos.
 */
export function AuthCodeHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // /auth/callback tiene su propio cierre de flujo; si los dos intendieran
    // intercambiar el mismo code, el segundo fallaría y echaría la sesión.
    if (pathname.startsWith("/auth/callback")) return;

    const code = searchParams.get("code");
    if (searchParams.get("error")) {
      router.replace("/login?error=oauth");
      return;
    }
    if (!code) return;

    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (error) {
        router.replace("/login?error=oauth");
        return;
      }
      router.replace(pathname);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  return null;
}
