import { toNumber } from "@/lib/money";

export const DELIVERY_ORIGIN = {
  lat: -11.9726,
  lng: -76.779,
};

export const DELIVERY_ZONES = [
  { radio: 2, costo: 5, nombre: "Zona 1 - Chaclacayo Centro", color: "#4CAF50" },
  { radio: 4, costo: 7, nombre: "Zona 2 - Chaclacayo Cercano", color: "#FFC107" },
  { radio: 7, costo: 10, nombre: "Zona 3 - Chaclacayo Alto", color: "#FF9800" },
  { radio: 10, costo: 15, nombre: "Zona 4 - Chosica / Ricardo Palma", color: "#F44336" },
] as const;

export const MAX_DELIVERY_KM = 10;

// Regalo sorpresa: aplica cuando el subtotal de productos (sin delivery)
// llega a S/ 150. Mismo criterio que usa el RPC crear_pedido.
export const GIFT_THRESHOLD = 150;

export function giftProgress(subtotal: number) {
  const total = toNumber(subtotal);
  const qualifies = total >= GIFT_THRESHOLD;
  return {
    qualifies,
    total,
    missing: qualifies ? 0 : Math.round((GIFT_THRESHOLD - total) * 100) / 100,
    ratio: Math.min(1, total / GIFT_THRESHOLD),
  };
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function zoneForDistance(distanceKm: number) {
  return (
    DELIVERY_ZONES.find((zone) => distanceKm <= zone.radio) ?? {
      radio: MAX_DELIVERY_KM,
      costo: 0,
      nombre: "Fuera de cobertura",
      color: "#E57373",
    }
  );
}

export function isDeliverable(distanceKm: number): boolean {
  return Number.isFinite(distanceKm) && distanceKm <= MAX_DELIVERY_KM;
}
