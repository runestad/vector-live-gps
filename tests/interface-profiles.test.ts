import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { INTERFACE_PROFILES, PROFILE_ORDER, isTypingTarget, nextProfile, normalizeProfile } from "../app/interfaceProfiles";
import type { Scenario } from "../app/types";
import { DEFAULT_APPEARANCE } from "../app/utils";
import { createCustomScenario, migrateStoredData } from "../app/storage";

test("VECTOR is default and profile cycling/direct profile order is stable", () => {
  assert.equal(normalizeProfile(undefined), "vector");
  assert.deepEqual(PROFILE_ORDER, ["vector", "kartspor", "trackpoint-2002"]);
  assert.equal(nextProfile("vector"), "kartspor");
  assert.equal(nextProfile("kartspor"), "trackpoint-2002");
  assert.equal(nextProfile("trackpoint-2002"), "vector");
});

test("all profiles have centralized identity, labels and static assets", () => {
  for (const profile of Object.values(INTERFACE_PROFILES)) {
    assert.ok(profile.name && profile.tagline && profile.labels.presenterMode);
    assert.ok(fs.existsSync(new URL(`../public${profile.logo}`, import.meta.url)));
  }
  assert.equal(INTERFACE_PROFILES.kartspor.labels.position, "Posisjon");
});

test("shortcuts are ignored in form and editable targets", () => {
  assert.equal(isTypingTarget({ tagName: "INPUT", isContentEditable: false } as HTMLElement), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true } as HTMLElement), true);
  assert.equal(isTypingTarget({ tagName: "BUTTON", isContentEditable: false } as HTMLElement), false);
});

test("profile preference migrates safely and scenario profile is opt-in", () => {
  const demo: Scenario = { id: "demo", name: "Demo", builtIn: true, position: { lat: 1, lng: 2 }, route: [], speed: 1, loop: false, status: "Active", battery: 80, signal: "Good", trackerName: "A", deviceId: "1", vehicle: "", registration: "", note: "", appearance: DEFAULT_APPEARANCE, zoom: 10 };
  const migrated = migrateStoredData(JSON.stringify({ version: 2, scenarios: [], current: demo, settings: { interfaceProfile: "kartspor", saveProfileWithScenario: true } }), null, [demo]);
  assert.equal(migrated.settings.interfaceProfile, "kartspor");
  assert.equal(migrated.settings.saveProfileWithScenario, true);
  const independent = createCustomScenario(demo, "one");
  const linked = createCustomScenario({ ...demo, interfaceProfile: "trackpoint-2002" }, "two");
  assert.equal(independent.interfaceProfile, undefined);
  assert.equal(linked.interfaceProfile, "trackpoint-2002");
});

test("profile changes invalidate map without resetting progress or simulation", () => {
  const component = fs.readFileSync(new URL("../app/VectorApp.tsx", import.meta.url), "utf8");
  assert.match(component, /\[presenter, profileId\]/);
  assert.match(component, /data-interface-profile=\{profileId\}/);
  assert.match(component, /\["Digit1", "Digit2", "Digit3"\]/);
  const switchBlock = component.match(/const switchProfile = useCallback\([^]*?\}, \[\]\);/)?.[0] ?? "";
  assert.ok(switchBlock);
  assert.doesNotMatch(switchBlock, /setProgress|setPlaying|setScenario/);
});
