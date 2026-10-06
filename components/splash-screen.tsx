"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EXIT_DELAY = 450;
const INTRO_MS = 2600;
const SPLASH_SOUND = "/audio/splash-intro.wav";
type Theme = "light" | "dark";

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
  const [theme, setTheme] = useState<Theme>("light");
  const exitTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    const activeTheme: Theme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setTheme(activeTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

  function selectTheme(nextTheme: Theme) {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("mosameli-theme", nextTheme);
    window.dispatchEvent(
      new CustomEvent<Theme>("mosameli-theme-change", { detail: nextTheme }),
    );
    setTheme(nextTheme);
  }

  return (
    <main className={`splash-screen ${leaving ? "is-leaving" : ""}`}>
      <div className="splash-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="splash-card" aria-labelledby="splash-title">
        <div className="splash-theme-selector" role="group" aria-label="Tema del sitio">
          <button
            type="button"
            className={theme === "light" ? "active" : ""}
            aria-pressed={theme === "light"}
            onClick={() => selectTheme("light")}
          >
            <span aria-hidden="true">☀</span> Light
          </button>
          <button
            type="button"
            className={theme === "dark" ? "active" : ""}
            aria-pressed={theme === "dark"}
            onClick={() => selectTheme("dark")}
          >
            <span aria-hidden="true">☾</span> Dark
          </button>
        </div>
        <span className="splash-eyebrow">E Commerce · Chaclacayo</span>
        <div className="splash-logo-frame">
          <span className="splash-logo-halo" aria-hidden="true" />
          <img
            src="/img/logo-icon.png"
            alt=""
            width={128}
            height={128}
            fetchPriority="high"
          />
        </div>
        <h1 id="splash-title"><span>Mosa</span><em>Meli</em></h1>
        <p className="splash-tagline">Tu mundo en un click</p>
        <p className="splash-welcome">Una selección especial para tu día a día.</p>

        <div className="splash-loading">
          <div className="splash-loading-copy">
            <span>Preparando tu catálogo</span>
            <strong>{progress}%</strong>
          </div>
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
        </div>

        <Link
          href={nextPath}
          className="splash-skip"
          aria-label="Saltar intro y entrar al catálogo"
          onClick={(event) => {
            event.preventDefault();
            leave();
          }}
        >
          Entrar ahora <span aria-hidden="true">→</span>
        </Link>
        <div className="splash-assurances" aria-label="Beneficios de MosaMeli">
          <span>✦ Productos seleccionados</span>
          <span>♢ Compra segura</span>
          <span>⌖ Delivery en Lima Este</span>
        </div>
      </section>

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
