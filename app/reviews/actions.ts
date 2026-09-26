"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(500),
});

export async function createReviewAction(input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa tu reseña" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Inicia sesión para escribir una reseña" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("crear_resena", {
    p_producto_id: parsed.data.productId,
    p_calificacion: parsed.data.rating,
    p_comentario: parsed.data.comment,
  });
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No pudimos registrar la reseña" };
  revalidatePath(`/producto/${parsed.data.productId}`);
  return { ok: true, message: "Reseña enviada para moderación" };
}
