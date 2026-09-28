"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markSplashSeen } from "@/lib/splash";

const EXIT_DELAY = 450;

export function SplashScreen({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<number | null>(null);

  const leave = useCallback(() => {
    setLeaving(true);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => router.replace(nextPath), EXIT_DELAY);
  }, [nextPath, router]);

  useEffect(() => {
    markSplashSeen();

    const timer = window.setTimeout(() => leave(), 2600);

    return () => {
      window.clearTimeout(timer);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, [leave]);

  return (
    <main className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#241b35] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,114,182,0.35),transparent_34rem),radial-gradient(circle_at_85%_80%,rgba(124,58,237,0.4),transparent_32rem)]" />
      <div className={`relative z-10 flex flex-col items-center px-6 text-center transition duration-500 ${leaving ? "scale-105 opacity-0" : "scale-100 opacity-100"}`}>
        <div className="grid h-28 w-28 place-items-center rounded-[2.2rem] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-6xl font-black shadow-2xl shadow-purple-950/40">
          M
        </div>
        <h1 className="mt-7 text-4xl font-black tracking-tight sm:text-5xl">MosaMeli</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.35em] text-purple-200">Tu mundo en un click</p>
        <div className="mt-10 h-1.5 w-48 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Cargando MosaMeli" aria-busy="true">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
        </div>
        <button type="button" className="mt-8 rounded-full border border-white/25 px-5 py-2 text-sm font-bold text-white/80 transition hover:border-white hover:bg-white/10" onClick={leave}>
          Saltar intro ➜
        </button>
      </div>
    </main>
  );
}
