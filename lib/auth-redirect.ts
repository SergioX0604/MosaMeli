export const AUTH_NEXT_COOKIE = "mosameli_auth_next";
const MAX_AGE_SECONDS = 600;

/**
 * El destino post-login se guarda en una cookie y no en el query string de
 * `redirectTo`. GoTrue compara la redirect_to con la lista permitida y un query
 * string extra puede hacer que caiga al Site URL; con la URL limpia el flujo
 * siempre pasa por /auth/callback.
 */
export function rememberAuthDestination(path: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

export function readAuthDestination(): string {
  if (typeof document === "undefined") return "/";
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_NEXT_COOKIE}=([^;]*)`));
  if (!match) return "/";
  const value = decodeURIComponent(match[1]);
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function clearAuthDestination(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_NEXT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}
