import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterInfoPage } from "@/components/footer-info-page";
import {
  FOOTER_INFO_PAGES,
  FOOTER_INFO_SLUGS,
  type FooterInfoSlug,
} from "@/lib/footer-info";

type PageProps = { params: Promise<{ slug: string }> };

function getPage(slug: string) {
  return FOOTER_INFO_PAGES[slug as FooterInfoSlug];
}

export function generateStaticParams() {
  return FOOTER_INFO_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(slug);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function InformationPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) notFound();
  return <FooterInfoPage page={page} />;
}
