import test from "node:test";
import assert from "node:assert/strict";
import type { Scenario } from "../app/types";
import { DEFAULT_APPEARANCE } from "../app/utils";
import { createCustomScenario, deleteScenario, duplicateScenario, migrateStoredData, renameScenario, serializeStoredData } from "../app/storage";

const demo: Scenario = { id: "demo", name: "Demo", builtIn: true, position: { lat: 59.9, lng: 10.7 }, route: [], speed: 42, loop: false, status: "Active", battery: 84, signal: "Strong", trackerName: "V", deviceId: "1", vehicle: "Van", registration: "—", note: "", appearance: DEFAULT_APPEARANCE, zoom: 14 };
test("creates, renames, duplicates and deletes custom scenarios but preserves demos", () => {
  const custom = createCustomScenario(demo, "c1", "William Route");
  assert.equal(custom.builtIn, false);
  assert.equal(renameScenario([demo, custom], "c1", "Renamed")[1].name, "Renamed");
  assert.equal(duplicateScenario(demo, "c2").builtIn, false);
  assert.equal(deleteScenario([demo, custom], "demo").length, 2);
  assert.equal(deleteScenario([demo, custom], "c1").length, 1);
});
test("migrates V1 without losing tracker icons and survives serialization", () => {
  const old = JSON.stringify({ current: { ...demo, builtIn: undefined, appearance: { size: 50, customIcon: "data:image/png;base64,AAA" } }, scenarios: [], light: true });
  const data = migrateStoredData(null, old, [demo]);
  assert.equal(data.version, 2);
  assert.equal(data.settings.light, true);
  assert.equal(data.current.appearance.customIcon, "data:image/png;base64,AAA");
  assert.equal(JSON.parse(serializeStoredData(data)).version, 2);
});
