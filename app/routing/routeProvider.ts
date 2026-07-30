import type { Coordinates } from "../types";
import { OsrmProvider } from "./osrmProvider";
import type { RouteResult } from "./types";

export async function geocodePlace(query: string): Promise<Coordinates> {
  const parsed = query.trim().split(/[\s,]+/).map(Number);
  if (parsed.length === 2 && parsed.every(Number.isFinite)) return { lat: parsed[0], lng: parsed[1] };
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Could not resolve “${query}”.`);
  const data = await response.json() as Array<{ lat: string; lon: string }>;
  if (!data[0]) throw new Error(`No location found for “${query}”.`);
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

export async function generateRoute(inputs: Array<Coordinates | string>): Promise<RouteResult> {
  const points: Coordinates[] = [];
  for (const input of inputs) points.push(typeof input === "string" ? await geocodePlace(input) : input);
  return new OsrmProvider().generate({ points });
}
