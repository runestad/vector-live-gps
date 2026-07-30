export type Coordinates = { lat: number; lng: number };
export type TrackerStatus =
  | "Active" | "Moving" | "Stationary" | "Weak Signal"
  | "Offline" | "Signal Lost" | "Low Battery" | "Unknown";
export type Appearance = {
  size: number; opacity: number; rotation: number; pulse: boolean;
  ring: boolean; shadow: boolean; directionRotation: boolean; customIcon?: string;
};
export type Scenario = {
  id: string; name: string; position: Coordinates; route: Coordinates[];
  speed: number; loop: boolean; status: TrackerStatus; battery: number;
  signal: string; trackerName: string; deviceId: string; vehicle: string;
  registration: string; note: string; appearance: Appearance; zoom: number;
};
