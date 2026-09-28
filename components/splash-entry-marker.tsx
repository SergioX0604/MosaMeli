"use client";

import { useEffect } from "react";
import { clearSplashSeen } from "@/lib/splash";

/**
 * Se monta en el catálogo y borra la marca del splash, de modo que la
 * siguiente entrada al catálogo (recarga, volver desde otra página) vuelva a
 * mostrar la intro. Las navegaciones internas del catálogo la vuelven a
 * colocar para no interrumpir al filtrar.
 */
export function SplashEntryMarker() {
  useEffect(() => {
    clearSplashSeen();
  }, []);

  return null;
}
