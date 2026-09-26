import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mosameli.com";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacidad", "/terminos", "/seguimiento"],
      disallow: ["/admin", "/login", "/reset-password", "/mi-perfil", "/checkout", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
