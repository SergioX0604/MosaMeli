import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mosameli.com"),
  title: {
    default: "MosaMeli - Tu mundo en un click",
    template: "%s | MosaMeli",
  },
  description:
    "Tienda online de productos para el hogar, baño, vestuario, juegos, electrónica y mascotas.",
  applicationName: "MosaMeli",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/img/favicon.ico",
    apple: "/img/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "MosaMeli",
    title: "MosaMeli - Tu mundo en un click",
    description: "Productos seleccionados para casa, familia y mascotas.",
    images: ["/img/logo-mosameli.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser().catch(() => null);

  return (
    <html lang="es">
      <body>
        <a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3" href="#contenido">
          Saltar al contenido
        </a>
        <SiteHeader user={user} />
        <main id="contenido">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
