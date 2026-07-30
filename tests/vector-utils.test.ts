import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APPEARANCE, interpolatePosition, isPulseActive, isValidCoordinates, parseCoordinateLine, routeDistance } from "../app/utils";

test("validates coordinate limits", () => {
  assert.equal(isValidCoordinates(59.9, 10.7), true);
  assert.equal(isValidCoordinates(91, 0), false);
  assert.equal(parseCoordinateLine("59.9139, 10.7522")?.lat, 59.9139);
});
test("interpolates by actual segment distance", () => {
  const route = [{ lat: 0, lng: 0 }, { lat: 0, lng: .01 }, { lat: 0, lng: .03 }];
  const p = interpolatePosition(route, .5);
  assert.ok(p.lng > .014 && p.lng < .016);
  assert.ok(routeDistance(route) > 3000);
});
test("pulse settings respect status", () => {
  assert.equal(isPulseActive(DEFAULT_APPEARANCE, "Active"), true);
  assert.equal(isPulseActive(DEFAULT_APPEARANCE, "Offline"), false);
  assert.equal(isPulseActive({ ...DEFAULT_APPEARANCE, pulse: false }, "Moving"), false);
});
