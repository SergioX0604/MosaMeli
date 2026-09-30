import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.117.2";

export async function authenticateEdgeRequest(
  request: Request,
  admin: SupabaseClient,
  serviceRoleKey: string,
): Promise<{ internal: boolean; user: User | null }> {
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { internal: false, user: null };
  if (token === serviceRoleKey) return { internal: true, user: null };
  const { data, error } = await admin.auth.getUser(token);
  return { internal: false, user: error ? null : data.user };
}
