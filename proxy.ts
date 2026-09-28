import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function createNonce(): string {
  return btoa(crypto.randomUUID());
}

function contentSecurityPolicy(nonce: string): string {
  const developmentScriptPolicy = process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptPolicy}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://router.project-osrm.org https://server.arcgisonline.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  // La intro se reproduce solo al entrar de verdad al catálogo, es decir, con
  // una carga real de la página. Las navegaciones internas de Next viajan como
  // peticiones del router (cabecera next-url, sin sec-fetch-dest: document), así
  // que llegar al catálogo desde el carrito, el perfil, el logo o una categoría
  // no vuelve a lanzar el splash. El redirect va aquí y no en la página para
  // responder con un 307 real y no con un meta-refresh.
  const isDocumentRequest = request.headers.get("sec-fetch-dest") === "document";
  const isRouterRequest =
    request.headers.has("next-url") ||
    request.headers.get("rsc") === "1" ||
    request.nextUrl.searchParams.has("_rsc");
  // Si Supabase devuelve el callback de OAuth al Site URL (/?code=...), hay que
  // dejar pasar la URL para que auth-code-handler complete el intercambio.
  const hasOAuthParams =
    request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("error");

  if (request.nextUrl.pathname === "/" && isDocumentRequest && !isRouterRequest && !hasOAuthParams) {
    const splashUrl = request.nextUrl.clone();
    splashUrl.pathname = "/splash";
    splashUrl.search = "";
    return NextResponse.redirect(splashUrl);
  }

  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Do not run code between createServerClient and getUser.
    await supabase.auth.getUser();
  }

  response.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)",
  ],
};
