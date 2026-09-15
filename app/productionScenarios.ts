import type { Coordinates, Scenario } from "./types";
import { DEFAULT_APPEARANCE, routeDistance } from "./utils";

export const GREEN_FINGERS_LOCATIONS = {
  movementStart: { lat: 59.75196, lng: 10.607519 },
  industrial: { lat: 59.736, lng: 10.588 },
  greenFingers: { lat: 59.852, lng: 10.661 },
} satisfies Record<string, Coordinates>;

// Cached OSRM/OpenStreetMap road geometry. Keeping it in the scenario makes takes deterministic and offline-ready after map load.
export const ROUTE_261: Coordinates[] = [
  { lat: 59.75196, lng: 10.607519 }, { lat: 59.751071, lng: 10.608041 }, { lat: 59.750478, lng: 10.60805 },
  { lat: 59.749793, lng: 10.608567 }, { lat: 59.749117, lng: 10.609686 }, { lat: 59.748607, lng: 10.61074 },
  { lat: 59.74807, lng: 10.611584 }, { lat: 59.747698, lng: 10.612039 }, { lat: 59.747503, lng: 10.612391 },
  { lat: 59.747242, lng: 10.612281 }, { lat: 59.746804, lng: 10.611257 }, { lat: 59.74642, lng: 10.610558 },
  { lat: 59.746109, lng: 10.609964 }, { lat: 59.745772, lng: 10.609121 }, { lat: 59.745528, lng: 10.608534 },
  { lat: 59.745189, lng: 10.607802 }, { lat: 59.74476, lng: 10.607237 }, { lat: 59.744414, lng: 10.606684 },
  { lat: 59.744145, lng: 10.60601 }, { lat: 59.743969, lng: 10.605235 }, { lat: 59.743665, lng: 10.604575 },
  { lat: 59.743267, lng: 10.604081 }, { lat: 59.74297, lng: 10.603417 }, { lat: 59.742503, lng: 10.602889 },
  { lat: 59.742106, lng: 10.60207 }, { lat: 59.74172, lng: 10.601055 }, { lat: 59.741608, lng: 10.600284 },
  { lat: 59.741383, lng: 10.599602 }, { lat: 59.741007, lng: 10.598931 }, { lat: 59.740688, lng: 10.598141 },
  { lat: 59.740329, lng: 10.597627 }, { lat: 59.739725, lng: 10.59708 }, { lat: 59.739168, lng: 10.596858 },
  { lat: 59.738681, lng: 10.596508 }, { lat: 59.738268, lng: 10.595859 }, { lat: 59.738055, lng: 10.595147 },
  { lat: 59.737739, lng: 10.594363 }, { lat: 59.737435, lng: 10.593779 }, { lat: 59.737053, lng: 10.592576 },
  { lat: 59.73665, lng: 10.591939 }, { lat: 59.736212, lng: 10.590761 }, { lat: 59.735843, lng: 10.589771 },
  { lat: 59.735591, lng: 10.589288 }, { lat: 59.736, lng: 10.588 },
];

const tracker = {
  builtIn: true, trackerName: "William", deviceId: "GF-WILLIAM-01", vehicle: "Car", registration: "—",
  appearance: { ...DEFAULT_APPEARANCE, standardIcon: "dot" as const, size: 38, pulseIntensity: "Normal" as const },
  interfaceProfile: "vector" as const, category: "Grønne Fingre", lockMarker: true, updateIntervalSeconds: 2,
};

export const GREEN_FINGERS_SCENARIOS: Scenario[] = [
  { ...tracker, id: "gf-scene-261", name: "261", subtitle: "Signal og bevegelig prikk", operatorNotes: "Start når Dennis setter mobilen i holderen. Én bevegelsesvarsling, deretter kjøreforløp mot industriområdet.", position: GREEN_FINGERS_LOCATIONS.movementStart, route: ROUTE_261, routeDistanceMeters: routeDistance(ROUTE_261), speed: 52, speedMode: "adaptive", adaptiveSpeedPreset: "Normal", loop: false, status: "Moving", battery: 96, signal: "Good", note: "EP2 scene 261. Cached OSRM route to the shared industrial point.", zoom: 14, lastUpdateStartSeconds: 0, updateBehavior: "fresh", startAlert: "William – bevegelse registrert" },
  { ...tracker, id: "gf-scene-265", name: "265", subtitle: "Prikken har stoppet", operatorNotes: "Lastes direkte på stoppbildet. Ingen obligatorisk innkjøring.", position: GREEN_FINGERS_LOCATIONS.industrial, route: [], routeDistanceMeters: 0, speed: 0, speedMode: "set", adaptiveSpeedPreset: "Normal", loop: false, status: "Stationary", battery: 95, signal: "Good", note: "EP2 scene 265. Connected and stationary at the shared industrial point.", zoom: 15, lastUpdateStartSeconds: 1, updateBehavior: "fresh" },
  { ...tracker, id: "gf-scene-267", name: "267", subtitle: "Nesten ingen dekning", operatorNotes: "Siste industriposisjon beholdes. Oppdateringsalderen øker uten markørbevegelse.", position: GREEN_FINGERS_LOCATIONS.industrial, route: [], routeDistanceMeters: 0, speed: 0, speedMode: "set", adaptiveSpeedPreset: "Normal", loop: false, status: "Weak Signal", battery: 94, signal: "Very weak", note: "EP2 scene 267. Connection problem; transmitter remains on.", zoom: 15, lastUpdateStartSeconds: 15, updateBehavior: "aging" },
  { ...tracker, id: "gf-scene-268", name: "268", subtitle: "Ingen dekning på industriområdet", operatorNotes: "Ingen automatisk gjenoppretting. Oppdatering beholder siste kjente posisjon.", position: GREEN_FINGERS_LOCATIONS.industrial, route: [], routeDistanceMeters: 0, speed: 0, speedMode: "set", adaptiveSpeedPreset: "Normal", loop: false, status: "Signal Lost", battery: 93, signal: "No connection", note: "EP2 scene 268. Last known position; transmitter is not reported as switched off.", zoom: 16, lastUpdateStartSeconds: 120, updateBehavior: "aging" },
  { ...tracker, id: "gf-scene-275", name: "275", subtitle: "Åpne appen og zoom inn", operatorNotes: "Presenter Mode: skuespilleren kan panorere og pinch-zoome. Markøren er låst. Etiketten blir tydelig fra zoom 15.", position: GREEN_FINGERS_LOCATIONS.greenFingers, route: [], routeDistanceMeters: 0, speed: 0, speedMode: "set", adaptiveSpeedPreset: "Normal", loop: false, status: "Stationary", battery: 91, signal: "Good", note: "EP2 scene 275. Grønne Fingre is a production interpretation based on scenes 272 and 278–279.", zoom: 12, lastUpdateStartSeconds: 1, updateBehavior: "fresh", mapLabel: { text: "Grønne Fingre", position: GREEN_FINGERS_LOCATIONS.greenFingers, minZoom: 15 } },
];
