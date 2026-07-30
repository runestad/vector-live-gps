import { routeDistance } from "../utils";
import type { RouteProvider, RouteRequest, RouteResult } from "./types";

export class OsrmProvider implements RouteProvider {
  async generate(request: RouteRequest): Promise<RouteResult> {
    if (request.points.length < 2) throw new Error("At least two route points are required.");
    const coords = request.points.map(p => `${p.lng},${p.lat}`).join(";");
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("The routing service did not respond.");
    const data = await response.json() as { code?: string; routes?: Array<{ distance: number; duration: number; geometry: { coordinates: number[][] } }> };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route?.geometry?.coordinates?.length) throw new Error("No drivable route was found.");
    const points = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    return { points, distanceMeters: route.distance || routeDistance(points), durationSeconds: route.duration, provider: "OSRM" };
  }
}
