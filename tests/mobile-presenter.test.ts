import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { nextPanelState, panelStateFromGesture, registerTripleTap } from "../app/presenterGestures";

const component = fs.readFileSync(new URL("../app/VectorApp.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("mobile sheet supports collapsed, half and expanded gestures", () => {
  assert.equal(nextPanelState("collapsed"), "half");
  assert.equal(nextPanelState("half"), "expanded");
  assert.equal(panelStateFromGesture("expanded", 130, .7), "collapsed");
  assert.equal(panelStateFromGesture("collapsed", -130, -.7), "expanded");
  assert.match(component, /data-panel-state=\{panelState\}/);
  for (const state of ["collapsed", "half", "expanded"]) assert.match(css, new RegExp(`data-panel-state="${state}"`));
});

test("triple tap matches nearby taps inside 900ms but rejects dragging or distant taps", () => {
  let taps: Array<{ x: number; y: number; at: number }> = [];
  let result = registerTripleTap(taps, { x: 100, y: 100, at: 0 }); taps = result.taps;
  result = registerTripleTap(taps, { x: 108, y: 102, at: 300 }); taps = result.taps;
  result = registerTripleTap(taps, { x: 103, y: 110, at: 700 });
  assert.equal(result.matched, true);
  const rejected = registerTripleTap([{ x: 0, y: 0, at: 0 }, { x: 2, y: 2, at: 200 }], { x: 80, y: 80, at: 400 });
  assert.equal(rejected.matched, false);
  assert.match(component, /Math\.hypot\(e\.clientX - start\.x, e\.clientY - start\.y\) > 12/);
});

test("Presenter Mode conditionally removes editing UI and preserves map sizing", () => {
  assert.match(component, /\{!presenter && <header>/);
  assert.match(component, /\{!presenter && <aside className="control-panel"/);
  assert.doesNotMatch(component, /className="presenter-tools"/);
  assert.match(component, /exitPresenterOpen/);
  assert.match(component, /setPanelState\("collapsed"\); setPresenter\(true\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.match(component, /\[presenter, profileId, panelState\]/);
});

test("Presenter defaults and settings are persisted", () => {
  const storage = fs.readFileSync(new URL("../app/storage.ts", import.meta.url), "utf8");
  assert.match(storage, /presenterLock: "triple-confirm"/);
  assert.match(storage, /presenterZoomControls: false/);
  assert.match(storage, /presenterAttribution: true/);
  assert.match(component, /Attribution \(required for OpenStreetMap\)/);
});
