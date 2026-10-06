"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";

type MediaItem = { type: "image" | "video"; url: string };

function imageList(product: Product): string[] {
  let extras: string[] = [];
  if (Array.isArray(product.imagenes_extra)) extras = product.imagenes_extra;
  else if (typeof product.imagenes_extra === "string") {
    try {
      const parsed = JSON.parse(product.imagenes_extra);
      if (Array.isArray(parsed))
        extras = parsed.filter(
          (value): value is string => typeof value === "string",
        );
    } catch {
      extras = [];
    }
  }
  return [product.imagen, ...extras].filter(Boolean);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function ProductVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      video?.pause();
    };
  }, []);

  function revealControls() {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing)
      hideTimer.current = window.setTimeout(
        () => setControlsVisible(false),
        3000,
      );
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function changeSpeed(value: number) {
    const video = videoRef.current;
    if (video) video.playbackRate = value;
    setSpeed(value);
    setSpeedOpen(false);
  }

  function changeVolume(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  }

  async function toggleFullscreen() {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await wrapperRef.current.requestFullscreen();
  }

  return (
    <div
      ref={wrapperRef}
      className={`catalog-video-player ${controlsVisible || !playing ? "controls-visible" : ""} ${playing ? "is-playing" : "is-paused"}`}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={revealControls}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        aria-label={`Video de ${title}`}
        onClick={togglePlayback}
        onPlay={() => {
          setPlaying(true);
          revealControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      >
        Tu navegador no soporta videos HTML5.
      </video>

      <button
        type="button"
        className="catalog-video-center-play"
        onClick={togglePlayback}
        aria-label={playing ? "Pausar video" : "Reproducir video"}
      >
        {playing ? "Ⅱ" : "▶"}
      </button>

      <div
        className="catalog-video-controls"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="catalog-video-button"
          onClick={togglePlayback}
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
        <input
          className="catalog-video-progress"
          type="range"
          min={0}
          max={duration || 0}
          step="0.05"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Progreso del video"
          style={
            {
              "--video-progress": `${duration ? (currentTime / duration) * 100 : 0}%`,
            } as React.CSSProperties
          }
        />
        <span className="catalog-video-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="catalog-video-popover-wrap">
          <button
            type="button"
            className="catalog-video-button speed"
            onClick={() => setSpeedOpen((open) => !open)}
            aria-expanded={speedOpen}
            aria-label={`Velocidad ${speed}x`}
          >
            {speed}x
          </button>
          {speedOpen ? (
            <div
              className="catalog-video-speed-menu"
              role="menu"
              aria-label="Velocidad de reproducción"
            >
              {[0.5, 1, 1.25, 1.5, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={speed === value ? "active" : ""}
                  onClick={() => changeSpeed(value)}
                  role="menuitem"
                >
                  {value}x
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="catalog-video-popover-wrap">
          <button
            type="button"
            className="catalog-video-button"
            onClick={toggleMute}
            onMouseEnter={() => setVolumeOpen(true)}
            aria-label={muted || volume === 0 ? "Activar sonido" : "Silenciar"}
          >
            {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </button>
          <div
            className={`catalog-video-volume ${volumeOpen ? "open" : ""}`}
            onMouseLeave={() => setVolumeOpen(false)}
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volumen"
            />
            <span>{Math.round((muted ? 0 : volume) * 100)}%</span>
          </div>
        </div>

        <button
          type="button"
          className="catalog-video-button"
          onClick={toggleFullscreen}
          aria-label="Ver video en pantalla completa"
        >
          ⛶
        </button>
      </div>
    </div>
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const images = imageList(product);
  const media: MediaItem[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...(product.video_url
      ? [{ type: "video" as const, url: product.video_url }]
      : []),
  ];
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenScale, setFullscreenScale] = useState(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const current = media[selected] ?? media[0];

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
      if (event.key === "ArrowLeft")
        setSelected((index) => (index - 1 + media.length) % media.length);
      if (event.key === "ArrowRight")
        setSelected((index) => (index + 1) % media.length);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [media.length]);

  function selectMedia(index: number) {
    setSelected(index);
    setZoomed(false);
  }

  function moveZoom(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || current?.type !== "image") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    if (imageRef.current)
      imageRef.current.style.transformOrigin = `${x}% ${y}%`;
    setZoomed(true);
  }

  function previous() {
    selectMedia((selected - 1 + media.length) % media.length);
  }

  function next() {
    selectMedia((selected + 1) % media.length);
  }

  if (!current) return null;

  return (
    <div className="product-gallery surface">
      <div className="product-gallery-stage">
        {current.type === "video" ? (
          <ProductVideo
            src={current.url}
            poster={product.imagen}
            title={product.nombre}
          />
        ) : (
          <button
            type="button"
            className={`product-zoom-stage ${zoomed ? "is-zoomed" : ""}`}
            onPointerMove={moveZoom}
            onPointerLeave={() => setZoomed(false)}
            onClick={() => {
              setFullscreenScale(1);
              setFullscreen(true);
            }}
            aria-label={`Ampliar imagen de ${product.nombre}`}
          >
            <span className="product-zoom-hint">
              <span className="zoom-hint-desktop">
                ⌕ Pasa el cursor para hacer zoom
              </span>
              <span className="zoom-hint-mobile">⌕ Toca para ampliar</span>
            </span>
            <img
              ref={imageRef}
              src={current.url}
              alt={product.nombre}
              draggable={false}
            />
          </button>
        )}

        {media.length > 1 ? (
          <>
            <button
              type="button"
              className="product-gallery-arrow previous"
              onClick={previous}
              aria-label="Vista anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="product-gallery-arrow next"
              onClick={next}
              aria-label="Vista siguiente"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      <div
        className="product-gallery-thumbnails"
        aria-label="Vistas del producto"
      >
        {media.map((item, index) => (
          <button
            key={`${item.type}-${item.url}`}
            type="button"
            className={selected === index ? "active" : ""}
            onClick={() => selectMedia(index)}
            aria-label={
              item.type === "video"
                ? `Ver video de ${product.nombre}`
                : `Ver imagen ${index + 1} de ${product.nombre}`
            }
          >
            {item.type === "video" ? (
              <span className="product-video-thumbnail">
                <video src={item.url} muted preload="metadata" />
                <i aria-hidden="true">▶</i>
              </span>
            ) : (
              <img src={item.url} alt="" />
            )}
          </button>
        ))}
      </div>

      {fullscreen && current.type === "image" ? (
        <div
          className="product-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${product.nombre}`}
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            className="product-lightbox-close"
            onClick={() => setFullscreen(false)}
            aria-label="Cerrar imagen ampliada"
          >
            ×
          </button>
          <div className="product-lightbox-canvas">
            <img
              src={current.url}
              alt={product.nombre}
              style={{ transform: `scale(${fullscreenScale})` }}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
          <div
            className="product-lightbox-controls"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                setFullscreenScale((value) => Math.max(0.75, value - 0.25))
              }
              aria-label="Alejar"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setFullscreenScale(1)}
              aria-label="Restablecer zoom"
            >
              {Math.round(fullscreenScale * 100)}%
            </button>
            <button
              type="button"
              onClick={() =>
                setFullscreenScale((value) => Math.min(3, value + 0.25))
              }
              aria-label="Acercar"
            >
              ＋
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
