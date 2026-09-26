import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrackingAction } from "@/app/seguimiento/actions";
import { TrackingView } from "@/components/tracking-view";
import { hasSupabaseConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Estado del pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type TrackingTokenPageProps = { params: Promise<{ token: string }> };

export default async function TrackingTokenPage({ params }: TrackingTokenPageProps) {
  const { token } = await params;
  if (!hasSupabaseConfig() || !/^[a-f0-9]{32,200}$/i.test(token)) notFound();
  const result = await getTrackingAction(token);
  if (!result.ok) notFound();
  return <div className="page-shell container-shell space-y-6"><TrackingView order={result.data} /></div>;
}
