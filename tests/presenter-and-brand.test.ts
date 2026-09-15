import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const component = fs.readFileSync(new URL("../app/VectorApp.tsx", import.meta.url), "utf8");
test("Presenter Mode preserves a full-size map and invalidates Leaflet", () => {
  assert.match(css, /\.presenter\{grid-template-rows:1fr!important/);
  assert.match(css, /\.presenter \.map-wrap,\.presenter \.map\{[^}]*height:100%!important/);
  assert.match(component, /invalidateSize/);
  assert.match(component, /centerBeforeResize/);
  assert.match(component, /data-testid="map-container"/);
  assert.match(component, /data-presenter=\{presenter\}/);
  assert.doesNotMatch(component, /className="presenter-tools"/);
  assert.match(css, /presenter\[data-interface-profile="trackpoint-2002"\] \.workspace\{[^}]*grid-template-columns:1fr!important/);
});
test("tracker remains draggable outside Presenter Mode", () => {
  assert.match(component, /if \(presenter\) draggable\.disable\(\); else draggable\.enable\(\);/);
  assert.doesNotMatch(component, /presenter \|\| scenario\.lockMarker/);
});
test("brand logo remains static and tracker upload is isolated", () => {
  assert.match(component, /src=\{profile\.logo\}[^>]*data-brand-logo/);
  assert.match(component, /appearance: \{ \.\.\.scenario\.appearance/);
  assert.doesNotMatch(component, /src=\{scenario\.appearance\.customIcon\}[^]*data-brand-logo/);
  assert.match(component, /Remove Uploaded Icon/);
});
test("twelve standard tracker SVG assets exist", () => {
  const files = fs.readdirSync(new URL("../public/tracker-icons/", import.meta.url)).filter(f => f.endsWith(".svg"));
  assert.ok(files.length >= 12);
});
test("profile-specific KARTSPOR and TrackPoint marker sets exist", () => {
  for (const profile of ["kartspor", "trackpoint-2002"]) {
    for (const icon of ["beacon", "vehicle", "arrow", "dot"]) {
      assert.equal(fs.existsSync(new URL(`../public/tracker-icons/${profile}/${icon}.svg`, import.meta.url)), true);
    }
  }
});
