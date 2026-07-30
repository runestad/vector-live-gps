import type { Coordinates } from "../types";
import { parseCoordinateLine } from "../utils";
import type { ParsedRouteLink } from "./types";

const ALLOWED_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"]);
export function isAllowedGoogleMapsHost(hostname: string) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.has(host) || host.endsWith(".google.com");
}
function decodePoint(value: string | null): Coordinates | string | undefined {
  if (!value) return undefined;
  const decoded = decodeURIComponent(value.replace(/\+/g, " ")).trim();
  return parseCoordinateLine(decoded) ?? decoded;
}
export function parseGoogleMapsUrl(input: string): ParsedRouteLink {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a valid Google Maps URL."); }
  if (!isAllowedGoogleMapsHost(url.hostname)) throw new Error("Only approved Google Maps domains are supported.");
  const shortLink = url.hostname === "maps.app.goo.gl" || url.hostname === "goo.gl";
  if (shortLink) return { originalUrl: url.toString(), waypoints: [], shortLink: true };
  const origin = decodePoint(url.searchParams.get("origin"));
  const destination = decodePoint(url.searchParams.get("destination"));
  const queryWaypoints = (url.searchParams.get("waypoints") ?? "").split("|").filter(Boolean).map(v => decodePoint(v)!);
  if (origin && destination) return { originalUrl: url.toString(), start: origin, destination, waypoints: queryWaypoints, shortLink: false };
  const dirIndex = url.pathname.split("/").indexOf("dir");
  if (dirIndex >= 0) {
    const routeParts = url.pathname.split("/").slice(dirIndex + 1).filter(Boolean)
      .filter(part => !part.startsWith("@") && !part.startsWith("data="))
      .map(decodePoint).filter((p): p is Coordinates | string => !!p);
    if (routeParts.length >= 2) return { originalUrl: url.toString(), start: routeParts[0], destination: routeParts[routeParts.length - 1], waypoints: routeParts.slice(1, -1), shortLink: false };
  }
  throw new Error("The link does not contain both a route start and destination.");
}
