"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const addressSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  texto: z.string().trim().min(5).max(300),
});

export async function saveAddressAction(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Inicia sesión para guardar direcciones" };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dirección inválida" };
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("perfiles").select("direcciones_guardadas").eq("id", user.id).maybeSingle();
  const current = Array.isArray(profile?.direcciones_guardadas) ? profile.direcciones_guardadas : [];
  const saved = { id: crypto.randomUUID(), ...parsed.data };
  const next = [...current, saved].slice(-5);
  const { error } = await supabase.from("perfiles").update({ direcciones_guardadas: next }).eq("id", user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/mi-perfil");
  return { ok: true, message: "Dirección guardada", address: saved };
}

export async function deleteAddressAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "No autenticado" };
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("perfiles").select("direcciones_guardadas").eq("id", user.id).maybeSingle();
  const current = Array.isArray(profile?.direcciones_guardadas) ? profile.direcciones_guardadas : [];
  const next = current.filter((address: { id?: string }) => address.id !== id);
  const { error } = await supabase.from("perfiles").update({ direcciones_guardadas: next }).eq("id", user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/mi-perfil");
  return { ok: true, message: "Dirección eliminada" };
}
