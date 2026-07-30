"use client";
/* eslint-disable @next/next/no-img-element -- uploaded data URLs and SVG tracker assets intentionally bypass image optimization */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import type { Appearance, Coordinates, Scenario, StandardIcon, StoredAppData, TrackerStatus } from "./types";
import { DEFAULT_APPEARANCE, headingAtProgress, interpolatePosition, parseCoordinateLine, routeDistance, validateScenario } from "./utils";
import { createCustomScenario, deleteScenario, duplicateScenario, migrateStoredData, serializeStoredData, STORAGE_V1_KEY, STORAGE_V2_KEY } from "./storage";
import { parseGoogleMapsUrl } from "./routing/googleMapsUrlParser";
import { generateRoute } from "./routing/routeProvider";

const osloRoute = [{ lat: 59.9139, lng: 10.7522 }, { lat: 59.9162, lng: 10.7581 }, { lat: 59.9188, lng: 10.7644 }, { lat: 59.9222, lng: 10.7713 }];
const demos: Scenario[] = [
  { id: "oslo", name: "Oslo sentrum", builtIn: true, position: osloRoute[0], route: osloRoute, routeDistanceMeters: routeDistance(osloRoute), speed: 42, loop: true, status: "Active", battery: 84, signal: "Strong", trackerName: "VECTOR-01", deviceId: "VT-8347", vehicle: "Unknown", registration: "—", note: "Demo route through central Oslo", appearance: DEFAULT_APPEARANCE, zoom: 14 },
  { id: "road", name: "Landevei", builtIn: true, position: { lat: 60.0938, lng: 11.1882 }, route: [{ lat: 60.0938, lng: 11.1882 }, { lat: 60.1102, lng: 11.231 }, { lat: 60.127, lng: 11.276 }], speed: 80, loop: false, status: "Moving", battery: 67, signal: "Good", trackerName: "VECTOR-02", deviceId: "VT-2914", vehicle: "Van", registration: "—", note: "Rural movement test", appearance: { ...DEFAULT_APPEARANCE, standardIcon: "van" }, zoom: 12 },
  { id: "offline", name: "Tracker offline", builtIn: true, position: { lat: 59.9281, lng: 10.7174 }, route: [], routeDistanceMeters: 0, speed: 0, loop: false, status: "Offline", battery: 12, signal: "Offline", trackerName: "VECTOR-03", deviceId: "VT-6108", vehicle: "Unknown", registration: "—", note: "Last seen 4 minutes ago", appearance: { ...DEFAULT_APPEARANCE, pulse: false, standardIcon: "magnetic-tracker" }, zoom: 14 },
];
const statuses: TrackerStatus[] = ["Active", "Moving", "Stationary", "Weak Signal", "Offline", "Signal Lost", "Low Battery", "Unknown"];
const iconChoices: Array<{ id: StandardIcon; label: string }> = [
  { id: "gps-tracker", label: "GPS tracker" }, { id: "car", label: "Car" }, { id: "van", label: "Van" },
  { id: "motorcycle", label: "Motorcycle" }, { id: "truck", label: "Truck" }, { id: "suv", label: "SUV" },
  { id: "phone", label: "Phone" }, { id: "arrow", label: "Arrow" }, { id: "dot", label: "Dot" },
  { id: "magnetic-tracker", label: "Magnetic tracker" }, { id: "boat", label: "Boat" }, { id: "bicycle", label: "Bicycle" },
];
const makeId = () => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

export default function VectorApp() {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const line = useRef<Polyline | null>(null);
  const animation = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const activeTabRef = useRef("position");
  const lockedRef = useRef(false);
  const hydrated = useRef(false);
  const [scenario, setScenario] = useState<Scenario>(demos[0]);
  const [scenarios, setScenarios] = useState<Scenario[]>(demos);
  const [activeTab, setActiveTab] = useState("position");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [routeVisible, setRouteVisible] = useState(true);
  const [statusVisible, setStatusVisible] = useState(true);
  const [presenter, setPresenter] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [light, setLight] = useState(false);
  const [coordText, setCoordText] = useState("59.913900, 10.752200");
  const [routeText, setRouteText] = useState(osloRoute.map(p => `${p.lat}, ${p.lng}`).join("\n"));
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [delay, setDelay] = useState(0);
  const [hideCursor, setHideCursor] = useState(false);
  const [updated, setUpdated] = useState(0);
  const [newScenarioOpen, setNewScenarioOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("New Scenario");
  const [routeLink, setRouteLink] = useState("");
  const [routeStart, setRouteStart] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeVia, setRouteVia] = useState("");
  const [parsedRoute, setParsedRoute] = useState<Array<Coordinates | string>>([]);
  const [routing, setRouting] = useState(false);

  const position = useMemo(() => interpolatePosition(scenario.route.length ? scenario.route : [scenario.position], progress), [scenario.route, scenario.position, progress]);
  const angle = scenario.route.length > 1 ? headingAtProgress(scenario.route, progress) : 0;
  const statusTone = scenario.status === "Offline" || scenario.status === "Signal Lost" ? "danger" : scenario.status === "Weak Signal" || scenario.status === "Low Battery" ? "warning" : "active";
  const distanceMeters = scenario.routeDistanceMeters ?? routeDistance(scenario.route);
  const simulationSeconds = scenario.speed > 0 ? distanceMeters / (scenario.speed / 3.6) : 0;

  const patch = useCallback((value: Partial<Scenario>) => setScenario(s => ({ ...s, ...value })), []);
  const patchAppearance = (value: Partial<Appearance>) => patch({ appearance: { ...scenario.appearance, ...value } });
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => {
    const stored = migrateStoredData(localStorage.getItem(STORAGE_V2_KEY), localStorage.getItem(STORAGE_V1_KEY), demos);
    queueMicrotask(() => {
      setScenario(stored.current); setScenarios(stored.scenarios); setLight(stored.settings.light);
      setRouteVisible(stored.settings.routeVisible); setStatusVisible(stored.settings.statusVisible); setLocked(stored.settings.locked);
      setRouteText(stored.current.route.map(p => `${p.lat}, ${p.lng}`).join("\n")); hydrated.current = true;
    });
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    const stored: StoredAppData = { version: 2, scenarios, activeScenarioId: scenario.id, current: scenario, settings: { light, routeVisible, statusVisible, locked } };
    localStorage.setItem(STORAGE_V2_KEY, serializeStoredData(stored));
  }, [scenario, scenarios, light, routeVisible, statusVisible, locked]);

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    let cancelled = false;
    import("leaflet").then(L => {
      if (cancelled || !mapNode.current) return;
      const m = L.map(mapNode.current, { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([scenario.position.lat, scenario.position.lng], scenario.zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
      const mk = L.marker([scenario.position.lat, scenario.position.lng], { draggable: true, icon: trackerIcon(L, scenario.appearance, scenario.status, 0) }).addTo(m);
      mk.on("dragend", () => { const p = mk.getLatLng(); patch({ position: { lat: p.lat, lng: p.lng }, route: [], routeDistanceMeters: 0 }); setProgress(0); });
      m.on("click", e => {
        if (lockedRef.current) return;
        setScenario(s => activeTabRef.current === "movement"
          ? ({ ...s, route: [...s.route, { lat: e.latlng.lat, lng: e.latlng.lng }], routeDistanceMeters: undefined })
          : ({ ...s, position: { lat: e.latlng.lat, lng: e.latlng.lng }, route: [], routeDistanceMeters: 0 }));
        setProgress(0);
      });
      map.current = m; marker.current = mk;
      line.current = L.polyline(scenario.route.map(p => [p.lat, p.lng]), { color: "#35e0a1", weight: 3, opacity: .85, dashArray: "2 9" }).addTo(m);
    });
    return () => { cancelled = true; };
  }, [patch, scenario.appearance, scenario.position, scenario.route, scenario.status, scenario.zoom]);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    import("leaflet").then(L => {
      marker.current?.setLatLng([position.lat, position.lng]);
      marker.current?.setIcon(trackerIcon(L, scenario.appearance, scenario.status, angle));
      line.current?.setLatLngs(scenario.route.map(p => [p.lat, p.lng]));
      if (line.current) {
        if (routeVisible) line.current.addTo(map.current!);
        else line.current.remove();
      }
    });
  }, [position, scenario.route, scenario.appearance, scenario.status, angle, routeVisible]);

  useEffect(() => {
    const refresh = () => map.current?.invalidateSize({ animate: false, pan: false });
    const frame = requestAnimationFrame(refresh);
    const short = window.setTimeout(refresh, 80);
    const long = window.setTimeout(refresh, 280);
    document.addEventListener("fullscreenchange", refresh);
    return () => { cancelAnimationFrame(frame); clearTimeout(short); clearTimeout(long); document.removeEventListener("fullscreenchange", refresh); };
  }, [presenter]);

  useEffect(() => {
    if (!playing || scenario.route.length < 2) return;
    const run = () => {
      lastFrame.current = performance.now();
      const frame = (now: number) => {
        const delta = (now - lastFrame.current) / 1000; lastFrame.current = now;
        const duration = Math.max(1, (scenario.routeDistanceMeters ?? routeDistance(scenario.route)) / Math.max(.3, scenario.speed / 3.6));
        setProgress(p => { const next = p + delta / duration; if (next >= 1) { if (scenario.loop) return 0; setPlaying(false); return 1; } return next; });
        setUpdated(0); animation.current = requestAnimationFrame(frame);
      };
      animation.current = requestAnimationFrame(frame);
    };
    const delayTimer = setTimeout(run, delay * 1000);
    return () => { clearTimeout(delayTimer); if (animation.current) cancelAnimationFrame(animation.current); };
  }, [playing, scenario.route, scenario.speed, scenario.loop, scenario.routeDistanceMeters, delay]);
  useEffect(() => { const tick = window.setInterval(() => setUpdated(v => v + 1), 1000); return () => clearInterval(tick); }, []);

  const center = useCallback(() => map.current?.flyTo([position.lat, position.lng], Math.max(map.current.getZoom(), 14), { duration: .6 }), [position]);
  const fitRoute = () => scenario.route.length > 1 && map.current?.fitBounds(scenario.route.map(p => [p.lat, p.lng]), { padding: [45, 45] });
  const applyRoute = (route: Coordinates[], meters = routeDistance(route)) => {
    patch({ route, routeDistanceMeters: meters, position: route[0] }); setProgress(0);
    setRouteText(route.map(p => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).join("\n"));
    window.setTimeout(fitRoute, 20);
  };
  const setPositionFromText = () => {
    const p = parseCoordinateLine(coordText);
    if (!p) { setError("Enter a valid latitude (−90–90) and longitude (−180–180)."); return; }
    setError(""); patch({ position: p, route: [], routeDistanceMeters: 0 }); setProgress(0); map.current?.flyTo([p.lat, p.lng], 15);
  };
  const applyRouteText = () => {
    const points = routeText.split("\n").filter(Boolean).map(parseCoordinateLine);
    if (points.length < 2 || points.some(p => !p)) { setError("The route needs at least two valid coordinate lines."); return; }
    setError(""); applyRoute(points as Coordinates[]);
  };
  const load = (s: Scenario) => {
    const source = s.builtIn ? demos.find(d => d.id === s.id) ?? s : s;
    const copy = structuredClone(source); setScenario(copy); setProgress(0); setRouteText(copy.route.map(p => `${p.lat}, ${p.lng}`).join("\n"));
    window.setTimeout(() => map.current?.setView([copy.position.lat, copy.position.lng], copy.zoom), 20); notify(`Loaded “${copy.name}”`);
  };
  const save = () => {
    if (scenario.builtIn) {
      const custom = createCustomScenario(scenario, makeId(), `${scenario.name} Custom`);
      setScenario(custom); setScenarios(s => [...s, custom]); notify("Demo saved as a custom scenario"); return;
    }
    setScenarios(s => s.some(item => item.id === scenario.id) ? s.map(item => item.id === scenario.id ? scenario : item) : [...s, scenario]);
    notify("Scenario saved locally");
  };
  const createScenario = () => {
    const custom = createCustomScenario(scenario, makeId(), newScenarioName);
    setScenarios(s => [...s, custom]); setScenario(custom); setNewScenarioOpen(false); setNewScenarioName("New Scenario"); notify("New scenario created");
  };
  const duplicate = (s: Scenario) => { const copy = duplicateScenario(s, makeId()); setScenarios(items => [...items, copy]); setScenario(copy); notify("Scenario duplicated"); };
  const rename = (s: Scenario) => {
    if (s.builtIn) { notify("Duplicate the demo before renaming"); return; }
    const name = window.prompt("Scenario name", s.name)?.trim(); if (!name) return;
    setScenarios(items => items.map(item => item.id === s.id ? { ...item, name } : item)); if (scenario.id === s.id) patch({ name }); notify("Scenario renamed");
  };
  const removeScenario = (s: Scenario) => {
    if (s.builtIn) { notify("Built-in demos cannot be deleted"); return; }
    if (!window.confirm(`Delete “${s.name}”?`)) return;
    const remaining = deleteScenario(scenarios, s.id); setScenarios(remaining); if (scenario.id === s.id) load(demos[0]); notify("Scenario deleted");
  };
  const exportScenario = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${scenario.name.replace(/\s+/g, "-").toLowerCase()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importScenario = (file?: File) => {
    if (!file) return; const reader = new FileReader();
    reader.onload = () => { try { const s = JSON.parse(String(reader.result)); if (!validateScenario(s)) throw new Error(); const custom = createCustomScenario(s, makeId(), s.name); setScenarios(items => [...items, custom]); load(custom); notify("Scenario imported"); } catch { setError("This is not a valid VECTOR scenario file."); } };
    reader.readAsText(file);
  };
  const uploadIcon = (file?: File) => {
    if (!file || !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 1_500_000) { setError("Choose a PNG, JPG, WEBP or SVG image under 1.5 MB."); return; }
    const reader = new FileReader(); reader.onload = () => patchAppearance({ customIcon: String(reader.result) }); reader.readAsDataURL(file);
  };
  const removeUploadedIcon = () => { const appearance = { ...scenario.appearance }; delete appearance.customIcon; patch({ appearance }); notify("Uploaded icon removed"); };
  const resetAppearance = () => { patch({ appearance: structuredClone(DEFAULT_APPEARANCE) }); notify("Tracker appearance reset"); };
  const inspectRouteLink = () => {
    try {
      const parsed = parseGoogleMapsUrl(routeLink);
      if (parsed.shortLink) { setError("This short link must first be expanded in Google Maps. Paste the final google.com/maps/dir URL."); return; }
      const points = [parsed.start!, ...parsed.waypoints, parsed.destination!]; setParsedRoute(points);
      setRouteStart(formatPoint(parsed.start)); setRouteDestination(formatPoint(parsed.destination)); setRouteVia(parsed.waypoints.map(formatPoint).join("\n")); setError("");
    } catch (e) { setParsedRoute([]); setError(e instanceof Error ? e.message : "The route link could not be read."); }
  };
  const generateImportedRoute = async () => {
    const manual = [routeStart, ...routeVia.split("\n").filter(Boolean), routeDestination].filter(Boolean);
    const inputs = parsedRoute.length >= 2 ? parsedRoute : manual;
    if (inputs.length < 2) { setError("Add a start and destination first."); return; }
    setRouting(true); setError("");
    try { const result = await generateRoute(inputs); applyRoute(result.points, result.distanceMeters); notify(`Route generated with ${result.provider}`); }
    catch (e) { setError(`${e instanceof Error ? e.message : "Route generation failed"} You can still use coordinate points or a straight-line fallback.`); }
    finally { setRouting(false); }
  };
  const straightFallback = async () => {
    try {
      const inputs = parsedRoute.length >= 2 ? parsedRoute : [routeStart, routeDestination];
      const resolved = await Promise.all(inputs.map(async p => typeof p === "string" ? (parseCoordinateLine(p) ?? (await import("./routing/routeProvider")).geocodePlace(p)) : p));
      applyRoute(resolved); notify("Straight-line fallback created");
    } catch { setError("Start and destination could not be resolved."); }
  };
  const fullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      if (e.code === "Space") { e.preventDefault(); setPlaying(v => !v); }
      else if (e.key.toLowerCase() === "r") { setProgress(0); setPlaying(false); }
      else if (e.key.toLowerCase() === "f") fullscreen();
      else if (e.key.toLowerCase() === "p") setPresenter(v => !v);
      else if (e.key.toLowerCase() === "c") center();
      else if (e.key.toLowerCase() === "h") setUiVisible(v => !v);
      else if (e.key === "ArrowLeft") setProgress(v => Math.max(0, v - .02));
      else if (e.key === "ArrowRight") setProgress(v => Math.min(1, v + .02));
      else if (e.key === "Escape") setPresenter(false);
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [center]);
  useEffect(() => {
    if (!presenter) return; let timer = window.setTimeout(() => setHideCursor(true), 2500);
    const move = () => { setHideCursor(false); clearTimeout(timer); timer = window.setTimeout(() => setHideCursor(true), 2500); };
    window.addEventListener("mousemove", move); return () => { clearTimeout(timer); window.removeEventListener("mousemove", move); };
  }, [presenter]);

  return (
    <main className={`${light ? "light" : ""} ${presenter ? "presenter" : ""} ${!uiVisible ? "ui-hidden" : ""} ${hideCursor ? "hide-cursor" : ""}`} data-presenter={presenter}>
      <header>
        <div className="brand"><img src="/vector-logo.svg" alt="VECTOR" data-brand-logo /><div><b>VECTOR</b><span>LIVE GPS TRACKING</span></div></div>
        <div className="header-state"><i className={statusTone} /> <b>{scenario.status.toUpperCase()}</b><span>{scenario.builtIn ? "DEMO SCENARIO" : "CUSTOM SCENARIO"}</span></div>
        <div className="header-actions"><button className="icon-button" onClick={() => setLight(v => !v)} title="Toggle theme">{light ? "◐" : "◑"}</button><button className="present-button" onClick={() => setPresenter(true)}>Presenter mode <kbd>P</kbd></button></div>
      </header>

      <section className="workspace">
        <div className="map-wrap" data-testid="map-wrap">
          <div ref={mapNode} className="map" aria-label="Interactive OpenStreetMap" data-testid="map-container" />
          <div className="map-shade" />
          <div className="map-tools"><button onClick={() => map.current?.zoomIn()} title="Zoom in">＋</button><button onClick={() => map.current?.zoomOut()} title="Zoom out">−</button><button onClick={center} title="Center tracker">◎</button><button onClick={fullscreen} title="Fullscreen">⛶</button></div>
          <div className="map-style"><span className="active">Street</span><span title="Prepared for a future imagery provider">Satellite*</span></div>
          {statusVisible && <aside className={`status-card ${statusTone}`} data-testid="tracker-status">
            <div className="eyebrow"><span><i /> {scenario.status}</span><span>GPS / LIVE</span></div><h2>{scenario.trackerName}</h2>
            <div className="coords">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</div>
            <div className="metrics"><div><span>Speed</span><b>{playing ? scenario.speed : 0}<small> km/h</small></b></div><div><span>Heading</span><b>{Math.round(angle)}°</b></div><div><span>Battery</span><b>{scenario.battery}<small>%</small></b></div><div><span>Signal</span><b>{scenario.signal}</b></div></div>
            <div className="updated"><span>Last update</span><b>{scenario.status === "Offline" ? "4 min ago" : updated < 2 ? "Just now" : `${updated}s ago`}</b></div>
          </aside>}
          <div className="simulation-bar" data-testid="simulation-bar">
            <button onClick={() => { setPlaying(false); setProgress(0); }} title="Stop">■</button><button className="play" onClick={() => setPlaying(v => !v)} title="Play or pause">{playing ? "Ⅱ" : "▶"}</button>
            <button onClick={() => setProgress(v => Math.max(0, v - .02))}>−5s</button><input aria-label="Simulation progress" type="range" min="0" max="1" step=".001" value={progress} onChange={e => setProgress(+e.target.value)} />
            <time>{Math.round(progress * 100)}%</time><button onClick={() => setProgress(v => Math.min(1, v + .02))}>+5s</button><button className={scenario.loop ? "toggle-on" : ""} onClick={() => patch({ loop: !scenario.loop })}>↻ Loop</button>
          </div>
        </div>

        <aside className="control-panel">
          <nav aria-label="Control panel">{[["position", "⌖", "Position"], ["movement", "↝", "Movement"], ["appearance", "◇", "Appearance"], ["scenarios", "▣", "Scenarios"], ["settings", "⚙", "Settings"]].map(([id, icon, label]) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><span>{icon}</span>{label}</button>)}</nav>
          <div className="panel-content">
            {activeTab === "position" && <>
              <PanelTitle kicker="Tracker coordinates" title="Set Position" text="Enter coordinates or place the tracker directly on the map." />
              <label>Latitude, longitude<input value={coordText} onChange={e => setCoordText(e.target.value)} placeholder="59.913900, 10.752200" /></label>
              <div className="split"><button className="secondary" onClick={() => navigator.clipboard?.readText().then(setCoordText)}>Paste</button><button className="secondary" onClick={() => { const c = map.current?.getCenter(); if (c) setCoordText(`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`); }}>Use map center</button></div>
              <button className="primary" onClick={setPositionFromText}>Update Position</button><div className="hint"><b>Map input enabled</b><span>Click anywhere or drag the tracker to place it.</span></div>
              <SectionLabel>Tracker status</SectionLabel><label>Status<select value={scenario.status} onChange={e => patch({ status: e.target.value as TrackerStatus })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
              <div className="two-col"><label>Battery %<input type="number" min="0" max="100" value={scenario.battery} onChange={e => patch({ battery: +e.target.value })} /></label><label>Signal<input value={scenario.signal} onChange={e => patch({ signal: e.target.value })} /></label></div>
            </>}
            {activeTab === "movement" && <>
              <PanelTitle kicker="Route editor" title="Movement Simulator" text="Generate a road route, click map points, or paste coordinate pairs." />
              <details className="route-import" open><summary>Import Route Link</summary>
                <label>Google Maps route URL<input value={routeLink} onChange={e => setRouteLink(e.target.value)} placeholder="https://www.google.com/maps/dir/..." /></label>
                <button className="secondary full" onClick={inspectRouteLink}>Analyze Link</button>
                <div className="two-col"><label>Start address<input value={routeStart} onChange={e => { setRouteStart(e.target.value); setParsedRoute([]); }} /></label><label>Destination<input value={routeDestination} onChange={e => { setRouteDestination(e.target.value); setParsedRoute([]); }} /></label></div>
                <label>Via / waypoint (one per line)<textarea rows={2} value={routeVia} onChange={e => { setRouteVia(e.target.value); setParsedRoute([]); }} /></label>
                <button className="primary route-generate" disabled={routing} onClick={generateImportedRoute}>{routing ? <><span className="spinner" /> Generating route…</> : "Generate Route"}</button>
                <button className="text-button" onClick={straightFallback}>Use straight-line fallback</button>
                <small className="routing-attribution">Road geometry: OSRM/OpenStreetMap · Address search: Nominatim/OpenStreetMap</small>
              </details>
              <SectionLabel>Coordinate route</SectionLabel><label>Route coordinates<textarea rows={5} value={routeText} onChange={e => setRouteText(e.target.value)} /></label><button className="primary" onClick={applyRouteText}>Apply coordinate route</button>
              <div className="route-stats"><span><b>{scenario.route.length}</b> points</span><span><b>{formatDistance(distanceMeters)}</b> length</span><span><b>{Math.round(simulationSeconds)}s</b> simulation</span></div>
              <div className="two-col"><label>Speed (km/h)<input type="number" min="1" max="200" value={scenario.speed} onChange={e => patch({ speed: +e.target.value })} /></label><label>Start delay<input type="number" min="0" max="30" value={delay} onChange={e => setDelay(+e.target.value)} /></label></div>
              <div className="split"><button className="secondary" onClick={fitRoute}>Fit Route in View</button><button className="secondary" onClick={() => { patch({ route: [], routeDistanceMeters: 0 }); setRouteText(""); setProgress(0); }}>Clear Route</button></div>
              <label className="check"><input type="checkbox" checked={routeVisible} onChange={e => setRouteVisible(e.target.checked)} /> Show route trace</label><label className="check"><input type="checkbox" checked={scenario.loop} onChange={e => patch({ loop: e.target.checked })} /> Loop continuously</label>
            </>}
            {activeTab === "appearance" && <>
              <PanelTitle kicker="Visual identity" title="Tracker Appearance" text="The tracker asset is separate from the permanent VECTOR brand." />
              <div className="appearance-preview"><TrackerPreview appearance={scenario.appearance} /></div>
              <SectionLabel>Standard icons</SectionLabel><div className="icon-grid">{iconChoices.map(icon => <button key={icon.id} className={scenario.appearance.standardIcon === icon.id && !scenario.appearance.customIcon ? "active" : ""} onClick={() => patchAppearance({ standardIcon: icon.id, customIcon: undefined })} title={icon.label}><span className="icon-mask" style={{ "--icon-url": `url(/tracker-icons/${icon.id}.svg)` } as React.CSSProperties} /><small>{icon.label}</small></button>)}</div>
              <label className="upload">Upload tracker icon<input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={e => uploadIcon(e.target.files?.[0])} /></label>
              {scenario.appearance.customIcon && <button className="secondary full danger-outline" onClick={removeUploadedIcon}>Remove Uploaded Icon</button>}
              <button className="secondary full" onClick={resetAppearance}>Reset Tracker Appearance</button>
              <label>Size <output>{scenario.appearance.size}px</output><input type="range" min="24" max="96" value={scenario.appearance.size} onChange={e => patchAppearance({ size: +e.target.value })} /></label>
              <label>Rotation <output>{scenario.appearance.rotation}°</output><input type="range" min="-180" max="180" value={scenario.appearance.rotation} onChange={e => patchAppearance({ rotation: +e.target.value })} /></label>
              <label>Opacity <output>{Math.round(scenario.appearance.opacity * 100)}%</output><input type="range" min=".2" max="1" step=".05" value={scenario.appearance.opacity} onChange={e => patchAppearance({ opacity: +e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={scenario.appearance.pulse} onChange={e => patchAppearance({ pulse: e.target.checked })} /> Pulse enabled</label>
              <div className="two-col"><label>Pulse intensity<select value={scenario.appearance.pulseIntensity} onChange={e => patchAppearance({ pulseIntensity: e.target.value as Appearance["pulseIntensity"] })}><option>Subtle</option><option>Normal</option><option>Strong</option></select></label><label>Pulse speed<select value={scenario.appearance.pulseSpeed} onChange={e => patchAppearance({ pulseSpeed: e.target.value as Appearance["pulseSpeed"] })}><option>Slow</option><option>Normal</option><option>Fast</option></select></label></div>
              <label>Pulse size <output>{scenario.appearance.pulseSize.toFixed(1)}×</output><input type="range" min="1.8" max="3.4" step=".1" value={scenario.appearance.pulseSize} onChange={e => patchAppearance({ pulseSize: +e.target.value })} /></label>
              <label>Pulse opacity <output>{Math.round(scenario.appearance.pulseOpacity * 100)}%</output><input type="range" min=".2" max="1" step=".05" value={scenario.appearance.pulseOpacity} onChange={e => patchAppearance({ pulseOpacity: +e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={scenario.appearance.shadow} onChange={e => patchAppearance({ shadow: e.target.checked })} /> Shadow effect</label><label className="check"><input type="checkbox" checked={scenario.appearance.directionRotation} onChange={e => patchAppearance({ directionRotation: e.target.checked })} /> Rotate with direction</label>
            </>}
            {activeTab === "scenarios" && <>
              <PanelTitle kicker="Local library" title="Scenarios" text="Built-in demos stay pristine. Custom scenarios are saved only in this browser." />
              <button className="primary new-scenario" onClick={() => setNewScenarioOpen(true)}>＋ New Scenario</button><button className="secondary full" onClick={save}>Save Active Scenario</button>
              <div className="split"><button className="secondary" onClick={exportScenario}>Export JSON</button><label className="secondary file-button">Import JSON<input type="file" accept=".json" onChange={e => importScenario(e.target.files?.[0])} /></label></div>
              <div className="scenario-list">{scenarios.map(s => <div className={`scenario-row ${scenario.id === s.id ? "active" : ""}`} key={s.id}><button className="scenario-main" onClick={() => load(s)}><span className={`scenario-dot ${s.status.toLowerCase().replaceAll(" ", "-")}`} /><span><b>{s.name}</b><small>{s.builtIn ? "Demo" : "Custom"} · {s.trackerName}</small></span><em>›</em></button><div className="scenario-actions"><button onClick={() => duplicate(s)}>Duplicate</button>{!s.builtIn && <><button onClick={() => rename(s)}>Rename</button><button onClick={() => removeScenario(s)}>Delete</button></>}</div></div>)}</div>
            </>}
            {activeTab === "settings" && <>
              <PanelTitle kicker="Device metadata" title="Settings" text="Edit on-screen production details and presenter options." />
              <label>Tracker name<input value={scenario.trackerName} onChange={e => patch({ trackerName: e.target.value })} /></label><div className="two-col"><label>Device ID<input value={scenario.deviceId} onChange={e => patch({ deviceId: e.target.value })} /></label><label>Registration<input value={scenario.registration} onChange={e => patch({ registration: e.target.value })} /></label></div>
              <label>Vehicle<input value={scenario.vehicle} onChange={e => patch({ vehicle: e.target.value })} /></label><label>Note<textarea rows={3} value={scenario.note} onChange={e => patch({ note: e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={statusVisible} onChange={e => setStatusVisible(e.target.checked)} /> Show status in Presenter Mode</label><label className="check"><input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} /> Lock map during filming</label>
              <div className="privacy">VECTOR is a fictional GPS simulation interface. No real devices are being tracked.</div><details><summary>Keyboard shortcuts</summary><p><kbd>Space</kbd> Play/pause · <kbd>R</kbd> Restart · <kbd>F</kbd> Fullscreen · <kbd>P</kbd> Presenter · <kbd>C</kbd> Center · <kbd>H</kbd> Hide UI · <kbd>← →</kbd> Seek</p></details>
            </>}
            {error && <div className="error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
          </div><footer><span>VECTOR / LOCAL</span><b>v2.0</b></footer>
        </aside>
      </section>
      {presenter && <div className="presenter-tools"><button onClick={() => setLocked(v => !v)}>{locked ? "🔒 Locked" : "◇ Lock map"}</button><button onClick={() => setStatusVisible(v => !v)}>{statusVisible ? "Hide status" : "Show status"}</button><button onClick={() => setPresenter(false)}>Exit presenter <kbd>Esc</kbd></button></div>}
      {newScenarioOpen && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-scenario-title"><span>Custom scenario</span><h2 id="new-scenario-title">New Scenario</h2><p>Create a new scenario from the current map, route, tracker and status setup.</p><label>Scenario name<input autoFocus value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)} onKeyDown={e => e.key === "Enter" && createScenario()} /></label><div className="split"><button className="secondary" onClick={() => setNewScenarioOpen(false)}>Cancel</button><button className="primary" onClick={createScenario}>Create Scenario</button></div></div></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function PanelTitle({ kicker, title, text }: { kicker: string; title: string; text: string }) { return <div className="panel-title"><span>{kicker}</span><h1>{title}</h1><p>{text}</p></div>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <h3 className="section-label">{children}</h3>; }
function formatPoint(value?: Coordinates | string) { return !value ? "" : typeof value === "string" ? value : `${value.lat}, ${value.lng}`; }
function TrackerPreview({ appearance }: { appearance: Appearance }) {
  return <div className="preview-icon" style={{ opacity: appearance.opacity, transform: `rotate(${appearance.rotation}deg)` }}>{appearance.customIcon ? <img src={appearance.customIcon} alt="Uploaded tracker" /> : <span className="icon-mask" style={{ "--icon-url": `url(/tracker-icons/${appearance.standardIcon}.svg)` } as React.CSSProperties} />}</div>;
}
function trackerIcon(L: typeof import("leaflet"), appearance: Appearance, status: TrackerStatus, angle: number) {
  const color = status === "Offline" || status === "Signal Lost" ? "#ff5c6c" : status === "Weak Signal" || status === "Low Battery" ? "#ffb84d" : "#35e0a1";
  const canPulse = appearance.pulse && status !== "Offline";
  const uploaded = appearance.customIcon ? `<img src="${appearance.customIcon}" alt="">` : `<span class="tracker-svg" style="--icon-url:url(/tracker-icons/${appearance.standardIcon}.svg)"></span>`;
  return L.divIcon({
    className: "vector-marker-host", iconSize: [appearance.size * 3, appearance.size * 3], iconAnchor: [appearance.size * 1.5, appearance.size * 1.5],
    html: `<div class="marker-anchor" style="--size:${appearance.size}px;--anchor-x:${appearance.anchorX}%;--anchor-y:${appearance.anchorY}%"><div class="marker-shell ${canPulse ? "pulse" : ""} ${appearance.ring ? "ring" : ""} ${appearance.shadow ? "shadow" : ""} ${status.toLowerCase().replaceAll(" ", "-")}" style="--marker:${color};--pulse-scale:${appearance.pulseSize};--pulse-opacity:${appearance.pulseOpacity};--pulse-duration:${appearance.pulseSpeed === "Fast" ? "1.15s" : appearance.pulseSpeed === "Slow" ? "2.25s" : "1.6s"};--pulse-width:${appearance.pulseIntensity === "Subtle" ? "1px" : appearance.pulseIntensity === "Normal" ? "2px" : "3px"};opacity:${appearance.opacity};transform:translate(-50%,-50%) rotate(${appearance.rotation + (appearance.directionRotation ? angle : 0)}deg)">${uploaded}<i class="pulse-ring one"></i><i class="pulse-ring two"></i></div></div>`,
  });
}
