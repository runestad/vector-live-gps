import type { Coordinates, Scenario } from "./types";

export function isValidCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseCoordinateLine(value: string): Coordinates | null {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  return parts.length === 2 && isValidCoordinates(parts[0], parts[1])
    ? { lat: parts[0], lng: parts[1] } : null;
}

export function interpolatePosition(route: Coordinates[], progress: number): Coordinates {
  if (!route.length) return { lat: 0, lng: 0 };
  if (route.length === 1) return route[0];
  const p = Math.max(0, Math.min(1, progress)) * (route.length - 1);
  const i = Math.min(Math.floor(p), route.length - 2);
  const t = p - i;
  return { lat: route[i].lat + (route[i + 1].lat - route[i].lat) * t, lng: route[i].lng + (route[i + 1].lng - route[i].lng) * t };
}

export function bearing(a: Coordinates, b: Coordinates) {
  const y = Math.sin((b.lng - a.lng) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
  const x = Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
    Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos((b.lng - a.lng) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function validateScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Scenario>;
  return typeof v.name === "string" && !!v.position &&
    isValidCoordinates(v.position.lat, v.position.lng) &&
    Array.isArray(v.route) && v.route.every(p => isValidCoordinates(p.lat, p.lng));
}
