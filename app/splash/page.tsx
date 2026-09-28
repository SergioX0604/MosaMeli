import type { Metadata } from "next";
import { SplashScreen } from "@/components/splash-screen";

export const metadata: Metadata = {
  title: "Bienvenido a MosaMeli",
  robots: { index: false, follow: false },
};

type SplashPageProps = { searchParams: Promise<{ next?: string }> };

export default async function SplashPage({ searchParams }: SplashPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  return <SplashScreen nextPath={nextPath} />;
}
