"use client";

import { useEffect, useRef } from "react";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { DELIVERY_ORIGIN } from "@/lib/delivery";

type DeliveryMapProps = {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
};

export function DeliveryMap({ lat, lng, onChange }: DeliveryMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPositionRef = useRef({ lat, lng });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;
    const initialPosition = initialPositionRef.current;

    async function initialize() {
      if (!elementRef.current) return;
      const L = await import("leaflet");
      if (disposed || !elementRef.current) return;

      map = L.map(elementRef.current, { zoomControl: true }).setView([initialPosition.lat, initialPosition.lng], 13);
      mapRef.current = map;
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        attribution: "© Esri",
        maxZoom: 19,
      }).addTo(map);
      L.circle([DELIVERY_ORIGIN.lat, DELIVERY_ORIGIN.lng], {
        radius: 10000,
        color: "#7c3aed",
        fillColor: "#a78bfa",
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map);
      const marker = L.circleMarker([initialPosition.lat, initialPosition.lng], {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#ec4899",
        fillOpacity: 1,
      }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        onChangeRef.current(point.lat, point.lng);
      });
      map.on("click", (event) => {
        onChangeRef.current(event.latlng.lat, event.latlng.lng);
      });
      window.setTimeout(() => map?.invalidateSize(), 100);
    }

    void initialize();
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([lat, lng]);
    const map = mapRef.current;
    if (map) map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng]);

  return <div ref={elementRef} className="h-80 w-full rounded-2xl border border-[var(--border)]" aria-label="Mapa para seleccionar la ubicación de entrega" />;
}
