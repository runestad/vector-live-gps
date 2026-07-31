export type InterfaceProfileId = "vector" | "kartspor" | "trackpoint-2002";

export type ProfileLabels = {
  position: string; movement: string; appearance: string; scenarios: string; settings: string;
  setPosition: string; updatePosition: string; movementSimulator: string; presenterMode: string;
  saveScenario: string; newScenario: string; trackerAppearance: string; exitPresenter: string;
  profileSaved: string; profileSwitched: string;
  presenterLock: string; exitPresenterPrompt: string; openControls: string;
};

export type InterfaceProfile = {
  id: InterfaceProfileId;
  name: string;
  shortName: string;
  tagline: string;
  logo: string;
  mark: string;
  presenterCode: string;
  presenterNotice: string;
  language: "English" | "Norsk";
  labels: ProfileLabels;
};

const vectorLabels: ProfileLabels = {
  position: "Position", movement: "Movement", appearance: "Appearance", scenarios: "Scenarios", settings: "Settings",
  setPosition: "Set Position", updatePosition: "Update Position", movementSimulator: "Movement Simulator", presenterMode: "Presenter mode",
  saveScenario: "Save Active Scenario", newScenario: "New Scenario", trackerAppearance: "Tracker Appearance", exitPresenter: "Exit presenter",
  profileSaved: "Interface profile saved with scenario", profileSwitched: "VECTOR interface active", presenterLock: "Presenter Mode Lock", exitPresenterPrompt: "Exit Presenter Mode?", openControls: "Controls",
};

export const INTERFACE_PROFILES: Record<InterfaceProfileId, InterfaceProfile> = {
  vector: { id: "vector", name: "VECTOR", shortName: "VECTOR", tagline: "LIVE GPS TRACKING", logo: "/vector-logo.svg", mark: "/vector-logo.svg", presenterCode: "GPS / LIVE", presenterNotice: "FICTIONAL TRACKING INTERFACE", language: "English", labels: vectorLabels },
  kartspor: {
    id: "kartspor", name: "KARTSPOR", shortName: "KARTSPOR", tagline: "OPERATIV POSISJONSOVERSIKT", logo: "/branding/kartspor/kartspor-logo-light.svg", mark: "/branding/kartspor/kartspor-mark.svg", presenterCode: "OPS-4", presenterNotice: "INTERNT ARBEIDSVERKTØY", language: "Norsk",
    labels: { position: "Posisjon", movement: "Bevegelse", appearance: "Utseende", scenarios: "Scenarioer", settings: "Innstillinger", setPosition: "Angi posisjon", updatePosition: "Oppdater posisjon", movementSimulator: "Bevegelsessimulator", presenterMode: "Presentasjonsmodus", saveScenario: "Lagre aktivt scenario", newScenario: "Nytt scenario", trackerAppearance: "Trackerutseende", exitPresenter: "Avslutt visning", profileSaved: "Grensesnittprofil lagret med scenario", profileSwitched: "KARTSPOR-grensesnitt aktivt", presenterLock: "Lås for visningsmodus", exitPresenterPrompt: "Avslutte visningsmodus?", openControls: "Kontroller" },
  },
  "trackpoint-2002": {
    id: "trackpoint-2002", name: "TrackPoint 2002", shortName: "TRACKPOINT", tagline: "WEB LOCATION MONITOR", logo: "/branding/trackpoint-2002/trackpoint-2002-logo.svg", mark: "/branding/trackpoint-2002/trackpoint-2002-mark.svg", presenterCode: "MONITOR 01", presenterNotice: "TrackPoint Network Console · 2002 Edition", language: "English",
    labels: { ...vectorLabels, position: "Locate", movement: "Route", appearance: "Marker", scenarios: "Files", settings: "Options", setPosition: "Set Tracker Position", updatePosition: "Submit Position", movementSimulator: "Route Playback", presenterMode: "Open Monitor", saveScenario: "Save Current File", newScenario: "New Tracking File", trackerAppearance: "Marker Properties", exitPresenter: "Close Monitor", profileSaved: "Display style saved in tracking file", profileSwitched: "TrackPoint 2002 console loaded", presenterLock: "DISPLAY LOCK MODE", exitPresenterPrompt: "TERMINATE DISPLAY SESSION?", openControls: "CONTROL PANEL" },
  },
};

export const PROFILE_ORDER: InterfaceProfileId[] = ["vector", "kartspor", "trackpoint-2002"];
export const normalizeProfile = (value: unknown): InterfaceProfileId => PROFILE_ORDER.includes(value as InterfaceProfileId) ? value as InterfaceProfileId : "vector";
export const nextProfile = (current: InterfaceProfileId) => PROFILE_ORDER[(PROFILE_ORDER.indexOf(current) + 1) % PROFILE_ORDER.length];
export const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return !!element && (/^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) || element.isContentEditable);
};
