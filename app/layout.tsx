import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AuthCodeHandler } from "@/components/auth-code-handler";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

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
  manifest: "/img/site.webmanifest",
  icons: {
    icon: [
      { url: "/img/favicon.ico", sizes: "any" },
      { url: "/img/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/img/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/img/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { url: "/img/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/img/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "MosaMeli",
    title: "MosaMeli - Tu mundo en un click",
    description: "Productos seleccionados para casa, familia y mascotas.",
    images: [{ url: "/img/logo-og.jpg", width: 1200, height: 630, alt: "MosaMeli - Tu mundo en un click" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MosaMeli - Tu mundo en un click",
    description: "Productos seleccionados para casa, familia y mascotas.",
    images: ["/img/logo-og.jpg"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser().catch(() => null);

  return (
    <html lang="es" className={poppins.variable}>
      <body>
        <a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3" href="#contenido">
          Saltar al contenido
        </a>
        <Suspense fallback={null}>
          <AuthCodeHandler />
        </Suspense>
        <SiteHeader user={user} />
        <main id="contenido">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
