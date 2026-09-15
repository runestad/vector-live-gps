import test from "node:test";
import assert from "node:assert/strict";
import { GREEN_FINGERS_LOCATIONS, GREEN_FINGERS_SCENARIOS, ROUTE_261 } from "../app/productionScenarios";
import { migrateStoredData } from "../app/storage";

test("installs the five stable Grønne Fingre scenes without duplicates", () => {
  assert.deepEqual(GREEN_FINGERS_SCENARIOS.map(s => s.name), ["261", "265", "267", "268", "275"]);
  assert.equal(new Set(GREEN_FINGERS_SCENARIOS.map(s => s.id)).size, 5);
  assert.ok(GREEN_FINGERS_SCENARIOS.every(s => s.category === "Grønne Fingre" && s.trackerName === "William" && s.deviceId === "GF-WILLIAM-01"));
});

test("scenes share positions and preserve the scripted signal behavior", () => {
  const scene = (name: string) => GREEN_FINGERS_SCENARIOS.find(s => s.name === name)!;
  assert.deepEqual(scene("265").position, GREEN_FINGERS_LOCATIONS.industrial);
  assert.deepEqual(scene("267").position, GREEN_FINGERS_LOCATIONS.industrial);
  assert.deepEqual(scene("268").position, GREEN_FINGERS_LOCATIONS.industrial);
  assert.equal(scene("267").updateBehavior, "aging");
  assert.equal(scene("268").lastUpdateStartSeconds, 120);
  assert.equal(scene("275").mapLabel?.text, "Grønne Fingre");
  assert.equal(scene("275").lockMarker, true);
});

test("scene 261 contains a cached non-looping road route and start alert", () => {
  const scene = GREEN_FINGERS_SCENARIOS[0];
  assert.ok(ROUTE_261.length > 35);
  assert.deepEqual(scene.route.at(-1), GREEN_FINGERS_LOCATIONS.industrial);
  assert.equal(scene.loop, false);
  assert.match(scene.startAlert ?? "", /bevegelse registrert/);
});

test("installed scenes are added alongside older custom browser data", () => {
  const custom = { ...GREEN_FINGERS_SCENARIOS[1], id: "user-existing", name: "My take", builtIn: false };
  const stored = migrateStoredData(JSON.stringify({ version: 2, scenarios: [custom], current: custom, settings: {} }), null, GREEN_FINGERS_SCENARIOS);
  assert.ok(stored.scenarios.some(s => s.id === "user-existing"));
  assert.equal(stored.scenarios.filter(s => s.id === "gf-scene-261").length, 1);
});
