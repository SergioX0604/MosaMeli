import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/env";

export function GET() {
  return NextResponse.json({ ok: true, supabaseConfigured: hasSupabaseConfig(), timestamp: new Date().toISOString() });
}
