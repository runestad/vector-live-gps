import type { AdaptiveSpeedPreset, Appearance, Coordinates, Scenario } from "./types";

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

const adaptiveCruise: Record<AdaptiveSpeedPreset, number> = { Slow: 34, Normal: 62, Fast: 108 };

export function adaptiveSpeedKmh(route: Coordinates[], progress: number, preset: AdaptiveSpeedPreset) {
  const cruise = adaptiveCruise[preset];
  if (route.length < 2) return 0;
  const before = headingAtProgress(route, Math.max(0, progress - .012));
  const ahead = headingAtProgress(route, Math.min(1, progress + .018));
  const turn = Math.abs(((ahead - before + 540) % 360) - 180);
  const cornerFactor = Math.max(.36, 1 - turn / 145);
  const roadRhythm = .92 + .08 * Math.sin(progress * Math.PI * 10) + .04 * Math.sin(progress * Math.PI * 27);
  const launch = Math.min(1, .45 + progress * 9);
  const arrival = Math.min(1, .4 + (1 - progress) * 12);
  return Math.max(8, Math.round(cruise * cornerFactor * roadRhythm * launch * arrival));
}

export function estimatedAdaptiveSpeedKmh(preset: AdaptiveSpeedPreset) {
  return adaptiveCruise[preset] * .82;
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
    speedMode: value.speedMode === "set" ? "set" : "adaptive",
    adaptiveSpeedPreset: value.adaptiveSpeedPreset === "Slow" || value.adaptiveSpeedPreset === "Fast" ? value.adaptiveSpeedPreset : "Normal",
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
    category: typeof value.category === "string" ? value.category : undefined,
    subtitle: typeof value.subtitle === "string" ? value.subtitle : undefined,
    operatorNotes: typeof value.operatorNotes === "string" ? value.operatorNotes : undefined,
    lastUpdateStartSeconds: Math.max(0, Number(value.lastUpdateStartSeconds) || 0),
    updateIntervalSeconds: Math.max(1, Number(value.updateIntervalSeconds) || 2),
    updateBehavior: value.updateBehavior === "aging" ? "aging" : "fresh",
    startAlert: typeof value.startAlert === "string" ? value.startAlert : undefined,
    lockMarker: Boolean(value.lockMarker),
    mapLabel: value.mapLabel && typeof value.mapLabel.text === "string" && isValidCoordinates(value.mapLabel.position?.lat, value.mapLabel.position?.lng)
      ? { text: value.mapLabel.text, position: value.mapLabel.position, minZoom: Number(value.mapLabel.minZoom) || 15 }
      : undefined,
  };
}

export function validateScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  return normalizeScenario(value as Partial<Scenario>, "validate") !== null;
}
