import type { Coordinates } from "../types";

export type ParsedRouteLink = {
  originalUrl: string;
  start?: Coordinates | string;
  destination?: Coordinates | string;
  waypoints: Array<Coordinates | string>;
  shortLink: boolean;
};
export type RouteRequest = { points: Coordinates[] };
export type RouteResult = { points: Coordinates[]; distanceMeters: number; durationSeconds: number; provider: string };
export interface RouteProvider { generate(request: RouteRequest): Promise<RouteResult>; }
