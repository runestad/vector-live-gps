export type Coordinates = { lat: number; lng: number };
import type { InterfaceProfileId } from "./interfaceProfiles";
export type TrackerStatus =
  | "Active" | "Moving" | "Stationary" | "Weak Signal"
  | "Offline" | "Signal Lost" | "Low Battery" | "Unknown";
export type StandardIcon =
  | "gps-tracker" | "car" | "van" | "motorcycle" | "truck" | "suv"
  | "phone" | "arrow" | "dot" | "magnetic-tracker" | "boat" | "bicycle";
export type PulseIntensity = "Subtle" | "Normal" | "Strong";
export type PulseSpeed = "Slow" | "Normal" | "Fast";
export type MobilePanelState = "collapsed" | "half" | "expanded";
export type PresenterLock = "off" | "triple" | "triple-confirm" | "long-press";
export type Appearance = {
  size: number;
  opacity: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
  pulse: boolean;
  pulseIntensity: PulseIntensity;
  pulseSpeed: PulseSpeed;
  pulseSize: number;
  pulseOpacity: number;
  ring: boolean;
  shadow: boolean;
  directionRotation: boolean;
  standardIcon: StandardIcon;
  customIcon?: string;
};
export type Scenario = {
  id: string;
  name: string;
  builtIn: boolean;
  position: Coordinates;
  route: Coordinates[];
  routeDistanceMeters?: number;
  speed: number;
  loop: boolean;
  status: TrackerStatus;
  battery: number;
  signal: string;
  trackerName: string;
  deviceId: string;
  vehicle: string;
  registration: string;
  note: string;
  appearance: Appearance;
  zoom: number;
  interfaceProfile?: InterfaceProfileId;
};
export type AppSettings = {
  light: boolean;
  routeVisible: boolean;
  statusVisible: boolean;
  locked: boolean;
  interfaceProfile: InterfaceProfileId;
  saveProfileWithScenario: boolean;
  presenterLock: PresenterLock;
  presenterZoomControls: boolean;
  presenterScale: boolean;
  presenterAttribution: boolean;
  presenterBranding: boolean;
  presenterClock: boolean;
};
export type StoredAppData = {
  version: 2;
  scenarios: Scenario[];
  activeScenarioId?: string;
  current: Scenario;
  settings: AppSettings;
};
