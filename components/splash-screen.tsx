"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EXIT_DELAY = 450;
const INTRO_MS = 2600;
const SPLASH_SOUND = "/audio/splash-intro.wav";

/** Curva de carga: avanza rapido al principio y se frena cerca al final. */
function progressAt(elapsed: number, total: number): number {
  const ratio = Math.min(1, elapsed / total);
  const eased = 1 - Math.pow(1 - ratio, 2.4);
  return Math.min(92, Math.round(eased * 100));
}

export function SplashScreen({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const exitTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startRef = useRef(0);

  const playSound = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(SPLASH_SOUND);
      audio.volume = 0.55;
      audioRef.current = audio;
    }
    void audioRef.current.play().catch(() => {
      // El navegador bloquea el autoplay sin interacción previa del usuario.
    });
  }, []);

  const leave = useCallback(() => {
    setLeaving(true);
    setProgress(100);
    if (tickTimer.current) window.clearInterval(tickTimer.current);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => router.replace(nextPath), EXIT_DELAY);
  }, [nextPath, router]);

  useEffect(() => {
    startRef.current = performance.now();
    playSound();

    // La barra refleja el avance de la intro y se cierra al 100% al salir.
    tickTimer.current = window.setInterval(() => {
      setProgress(progressAt(performance.now() - startRef.current, INTRO_MS));
    }, 120);

    const timer = window.setTimeout(() => leave(), INTRO_MS);

    return () => {
      window.clearTimeout(timer);
      if (tickTimer.current) window.clearInterval(tickTimer.current);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, [leave, playSound]);

  // Si el navegador bloqueo el sonido, se reintenta con el primer toque.
  useEffect(() => {
    function retry() {
      if (soundOn) playSound();
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    }
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [playSound, soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (!audioRef.current) return;
    if (next) {
      void audioRef.current.play().catch(() => undefined);
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  return (
    <main className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#1b1030] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(167,139,250,0.38),transparent_34rem),radial-gradient(circle_at_82%_78%,rgba(244,114,182,0.32),transparent_32rem)]" />
      <div
        className={`relative z-10 flex flex-col items-center px-6 text-center transition duration-500 ${leaving ? "scale-105 opacity-0" : "scale-100 opacity-100"}`}
      >
        <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-[2.2rem] bg-white shadow-2xl shadow-purple-950/50">
          <img src="/img/logo-icon.png" alt="" width={128} height={128} className="h-full w-full object-cover" />
        </div>
        <h1 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl">MosaMeli</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.35em] text-purple-200">Tu mundo en un click</p>

        <div className="mt-10 flex flex-col items-center">
          <div
            className="splash-bar"
            role="progressbar"
            aria-label="Cargando el catálogo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="splash-percent" aria-hidden="true">{progress}%</p>
        </div>

        <Link
          href={nextPath}
          className="mt-6 rounded-full border border-white/25 px-5 py-2 text-sm font-bold text-white/80 transition hover:border-white hover:bg-white/10"
          onClick={(event) => {
            event.preventDefault();
            leave();
          }}
        >
          Saltar intro ➜
        </Link>
      </div>

      <button
        type="button"
        className="splash-sound"
        aria-pressed={soundOn}
        onClick={toggleSound}
        title={soundOn ? "Silenciar" : "Activar sonido"}
      >
        <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
        <span>{soundOn ? "Sonido" : "Silencio"}</span>
      </button>
    </main>
  );
}
