"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tokenSchema = z.string().trim().min(32).max(200).regex(/^[a-f0-9]+$/i);
const codeSchema = z.string().trim().toUpperCase().regex(/^MOSA-\d{8}-[A-F0-9]{4,8}$/);

export async function getTrackingAction(input: unknown) {
  const supabase = await createSupabaseServerClient();
  const token = tokenSchema.safeParse(input);
  const code = codeSchema.safeParse(input);
  if (!token.success && !code.success) {
    return { ok: false as const, message: "El código de seguimiento no es válido" };
  }

  let data: unknown;
  let error: { message?: string } | null;
  if (token.success) {
    ({ data, error } = await supabase.rpc("obtener_seguimiento", { p_token: token.data }));
  } else {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false as const, message: "Inicia sesión para consultar el código escrito, o abre el enlace seguro que recibiste." };
    }
    ({ data, error } = await supabase.rpc("obtener_seguimiento_por_codigo", { p_codigo: code.data }));
  }
  if (error || !data) return { ok: false as const, message: "No encontramos ese pedido" };
  const result = Array.isArray(data) ? data[0] : data;
  return { ok: true as const, data: result };
}
