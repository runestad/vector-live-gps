import type { Appearance, Coordinates, Scenario } from "./types";

export const DEFAULT_APPEARANCE: Appearance = {
  size: 46, opacity: 1, rotation: 0, anchorX: 50, anchorY: 50,
  pulse: true, pulseIntensity: "Strong", pulseSpeed: "Normal",
  pulseSize: 2.8, pulseOpacity: .78, ring: true, shadow: true,
  directionRotation: true, standardIcon: "gps-tracker",
};

export function isValidCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseCoordinateLine(value: string): Coordinates | null {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  return parts.length === 2 && isValidCoordinates(parts[0], parts[1])
    ? { lat: parts[0], lng: parts[1] } : null;
}

export function haversineMeters(a: Coordinates, b: Coordinates) {
  const R = 6371000;
  const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180, dl = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function routeDistance(route: Coordinates[]) {
  return route.slice(1).reduce((sum, point, i) => sum + haversineMeters(route[i], point), 0);
}

export function interpolatePosition(route: Coordinates[], progress: number): Coordinates {
  if (!route.length) return { lat: 0, lng: 0 };
  if (route.length === 1) return route[0];
  const lengths = route.slice(1).map((point, i) => haversineMeters(route[i], point));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (!total) return route[0];
  let target = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const t = lengths[i] ? target / lengths[i] : 0;
      return { lat: route[i].lat + (route[i + 1].lat - route[i].lat) * t, lng: route[i].lng + (route[i + 1].lng - route[i].lng) * t };
    }
    target -= lengths[i];
  }
  return route[route.length - 1];
}

export function bearing(a: Coordinates, b: Coordinates) {
  const y = Math.sin((b.lng - a.lng) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
  const x = Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
    Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos((b.lng - a.lng) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function headingAtProgress(route: Coordinates[], progress: number) {
  if (route.length < 2) return 0;
  const a = interpolatePosition(route, Math.max(0, progress - .002));
  const b = interpolatePosition(route, Math.min(1, progress + .002));
  return bearing(a, b);
}

export function isPulseActive(appearance: Appearance, status: Scenario["status"]) {
  return appearance.pulse && status !== "Offline";
}

export function normalizeAppearance(value?: Partial<Appearance>): Appearance {
  return { ...DEFAULT_APPEARANCE, ...(value ?? {}), standardIcon: value?.standardIcon ?? "gps-tracker" };
}

export function normalizeScenario(value: Partial<Scenario>, fallbackId: string): Scenario | null {
  if (!value.position || !isValidCoordinates(value.position.lat, value.position.lng) || !Array.isArray(value.route)) return null;
  return {
    id: typeof value.id === "string" ? value.id : fallbackId,
    name: typeof value.name === "string" ? value.name : "Recovered Scenario",
    builtIn: Boolean(value.builtIn),
    position: value.position,
    route: value.route.filter(p => isValidCoordinates(p.lat, p.lng)),
    routeDistanceMeters: Number(value.routeDistanceMeters) || routeDistance(value.route),
    speed: Number(value.speed) || 42,
    loop: Boolean(value.loop),
    status: value.status ?? "Active",
    battery: Number.isFinite(value.battery) ? Number(value.battery) : 84,
    signal: typeof value.signal === "string" ? value.signal : "Strong",
    trackerName: typeof value.trackerName === "string" ? value.trackerName : "VECTOR-01",
    deviceId: typeof value.deviceId === "string" ? value.deviceId : "VT-8347",
    vehicle: typeof value.vehicle === "string" ? value.vehicle : "Unknown",
    registration: typeof value.registration === "string" ? value.registration : "—",
    note: typeof value.note === "string" ? value.note : "",
    appearance: normalizeAppearance(value.appearance),
    zoom: Number(value.zoom) || 14,
  };
}

export function validateScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  return normalizeScenario(value as Partial<Scenario>, "validate") !== null;
}
