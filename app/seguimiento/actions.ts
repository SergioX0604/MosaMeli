"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tokenSchema = z.string().trim().min(32).max(200).regex(/^[a-f0-9]+$/i);

export async function getTrackingAction(input: unknown) {
  const parsed = tokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "El código de seguimiento no es válido" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("obtener_seguimiento", { p_token: parsed.data });
  if (error || !data) return { ok: false as const, message: "No encontramos ese pedido" };
  const result = Array.isArray(data) ? data[0] : data;
  return { ok: true as const, data: result };
}
