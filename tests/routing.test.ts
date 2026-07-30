import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedGoogleMapsHost, parseGoogleMapsUrl } from "../app/routing/googleMapsUrlParser";
import { OsrmProvider } from "../app/routing/osrmProvider";

test("parses Google Maps api route coordinates and waypoints", () => {
  const parsed = parseGoogleMapsUrl("https://www.google.com/maps/dir/?api=1&origin=59.9139,10.7522&destination=59.9290,10.7110&waypoints=59.9200,10.7400");
  assert.deepEqual(parsed.start, { lat: 59.9139, lng: 10.7522 });
  assert.deepEqual(parsed.destination, { lat: 59.929, lng: 10.711 });
  assert.equal(parsed.waypoints.length, 1);
});
test("parses /maps/dir and rejects arbitrary domains", () => {
  const parsed = parseGoogleMapsUrl("https://google.com/maps/dir/59.91,10.75/59.92,10.76");
  assert.equal(parsed.shortLink, false);
  assert.equal(isAllowedGoogleMapsHost("evil.example"), false);
  assert.throws(() => parseGoogleMapsUrl("https://evil.example/maps/dir/1,2/3,4"));
});
test("recognizes approved short links without scraping them", () => {
  assert.equal(parseGoogleMapsUrl("https://maps.app.goo.gl/abc123").shortLink, true);
});
test("converts OSRM GeoJSON to internal route", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ code: "Ok", routes: [{ distance: 1234, duration: 100, geometry: { coordinates: [[10.7, 59.9], [10.8, 60]] } }] }));
  try {
    const result = await new OsrmProvider().generate({ points: [{ lat: 59.9, lng: 10.7 }, { lat: 60, lng: 10.8 }] });
    assert.deepEqual(result.points[1], { lat: 60, lng: 10.8 });
    assert.equal(result.provider, "OSRM");
  } finally { globalThis.fetch = originalFetch; }
});
