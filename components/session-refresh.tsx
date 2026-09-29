"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SessionRefreshProps = {
  /** Usuario que el servidor ya vio al renderizar. */
  usuarioEnServidor: string | null;
};

/**
 * Refresca los componentes de servidor (header, perfil, carrito) cuando la
 * sesión del navegador cambia sin que el usuario navegue: login con Google que
 * vuelve en otra pestaña, cierre de sesión en otra pestaña o actualización del
 * token.
 *
 * El login por correo ya hace `replace` + `refresh` en `components/auth-form.tsx`
 * y el callback de Google en `app/auth/callback/page.tsx`. Este componente
 * cubre el resto de los casos para que el nombre del usuario del header siempre
 * coincida con la sesión real.
 *
 * No hace falta leer la sesión al montar: `@supabase/ssr` la guarda en cookies,
 * así que el servidor ve exactamente la misma sesión que el navegador.
 */
export function SessionRefresh({ usuarioEnServidor }: SessionRefreshProps) {
  const router = useRouter();
  const usuarioConocido = useRef<string | null>(usuarioEnServidor);

  useEffect(() => {
    // El layout se re-renderiza con cada refresh, así que si el servidor ahora
    // ve a otro usuario hay que tomar su id como referencia.
    usuarioConocido.current = usuarioEnServidor;
  }, [usuarioEnServidor]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, sesion) => {
      // INITIAL_SESSION y TOKEN_REFRESHED no cambian quién es el usuario.
      if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED") return;
      const id = sesion?.user?.id ?? null;
      if (id === usuarioConocido.current) return;
      usuarioConocido.current = id;
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
