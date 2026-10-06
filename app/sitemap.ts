import type { MetadataRoute } from "next";
import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FOOTER_INFO_SLUGS } from "@/lib/footer-info";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mosameli.com";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${baseUrl}/seguimiento`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  for (const slug of FOOTER_INFO_SLUGS) {
    entries.push({
      url: `${baseUrl}/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("productos").select("id").order("id");
    for (const product of data ?? []) {
      entries.push({
        url: `${baseUrl}/producto/${product.id}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }
  return entries;
}
