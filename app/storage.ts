import type { AppSettings, Scenario, StoredAppData } from "./types";
import { normalizeScenario } from "./utils";
import { normalizeProfile } from "./interfaceProfiles";

export const STORAGE_V1_KEY = "vector-state-v1";
export const STORAGE_V2_KEY = "vector-state-v2";

export function migrateStoredData(rawV2: string | null, rawV1: string | null, demos: Scenario[]): StoredAppData {
  const defaults: AppSettings = { light: false, routeVisible: true, statusVisible: true, locked: false, interfaceProfile: "vector", saveProfileWithScenario: false };
  try {
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<StoredAppData>;
      const custom = Array.isArray(parsed.scenarios)
        ? parsed.scenarios.map((s, i) => normalizeScenario(s, `recovered-${i}`)).filter((s): s is Scenario => !!s && !s.builtIn && !demos.some(d => d.id === s.id))
        : [];
      let current = normalizeScenario(parsed.current ?? {}, "current") ?? demos[0];
      if (!current.builtIn && demos.some(d => d.id === current.id)) {
        current = { ...current, id: `recovered-${current.id}`, name: `${current.name} Recovered`, builtIn: false };
        custom.push(current);
      }
      const settings = { ...defaults, ...(parsed.settings ?? {}), interfaceProfile: normalizeProfile(parsed.settings?.interfaceProfile) };
      return { version: 2, scenarios: [...demos, ...custom], activeScenarioId: parsed.activeScenarioId ?? current.id, current, settings };
    }
  } catch {}
  try {
    if (rawV1) {
      const old = JSON.parse(rawV1) as { current?: Partial<Scenario>; scenarios?: Partial<Scenario>[]; light?: boolean; logo?: string };
      const custom = (old.scenarios ?? []).filter(s => !demos.some(d => d.id === s.id)).map((s, i) => {
        const migrated = normalizeScenario(s, `migrated-${i}`);
        if (!migrated) return null;
        migrated.builtIn = false;
        if (!migrated.appearance.customIcon && typeof old.logo === "string" && old.logo.startsWith("data:image/")) migrated.appearance.customIcon = old.logo;
        return migrated;
      }).filter((s): s is Scenario => !!s);
      let current = normalizeScenario(old.current ?? {}, "migrated-current") ?? demos[0];
      if (!current.appearance.customIcon && typeof old.logo === "string" && old.logo.startsWith("data:image/")) current.appearance.customIcon = old.logo;
      if (!current.builtIn && demos.some(d => d.id === current.id)) {
        current = { ...current, id: `migrated-${current.id}`, name: `${current.name} Recovered`, builtIn: false };
        custom.push(current);
      }
      return { version: 2, scenarios: [...demos, ...custom], activeScenarioId: current.id, current, settings: { ...defaults, light: Boolean(old.light) } };
    }
  } catch {}
  return { version: 2, scenarios: demos, activeScenarioId: demos[0].id, current: demos[0], settings: defaults };
}

export function serializeStoredData(data: StoredAppData) {
  return JSON.stringify(data);
}

export function createCustomScenario(base: Scenario, id: string, name = "New Scenario"): Scenario {
  return { ...structuredClone(base), id, name: name.trim() || "New Scenario", builtIn: false };
}

export function duplicateScenario(base: Scenario, id: string): Scenario {
  return createCustomScenario(base, id, `${base.name} Copy`);
}

export function renameScenario(scenarios: Scenario[], id: string, name: string) {
  return scenarios.map(s => s.id === id && !s.builtIn ? { ...s, name: name.trim() || s.name } : s);
}

export function deleteScenario(scenarios: Scenario[], id: string) {
  const target = scenarios.find(s => s.id === id);
  return !target || target.builtIn ? scenarios : scenarios.filter(s => s.id !== id);
}
