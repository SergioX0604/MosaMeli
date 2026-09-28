export const SPLASH_COOKIE = "mosameli_splash_v2";

// El splash se muestra en cada entrada real al catálogo. La cookie solo sirve
// como marca temporal para que /splash pueda volver a / sin bucles, y el
// catálogo la borra al mostrarse (ver components/splash-entry-marker.tsx).
export const SPLASH_COOKIE_MAX_AGE = 300;

function writeCookie(maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SPLASH_COOKIE}=1; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function markSplashSeen() {
  writeCookie(SPLASH_COOKIE_MAX_AGE);
}

export function clearSplashSeen() {
  writeCookie(0);
}
