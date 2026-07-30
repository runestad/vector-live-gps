"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import type { Appearance, Coordinates, Scenario, TrackerStatus } from "./types";
import { bearing, interpolatePosition, parseCoordinateLine, validateScenario } from "./utils";

const defaultAppearance: Appearance = { size: 46, opacity: 1, rotation: 0, pulse: true, ring: true, shadow: true, directionRotation: true };
const osloRoute = [
  { lat: 59.9139, lng: 10.7522 }, { lat: 59.9162, lng: 10.7581 },
  { lat: 59.9188, lng: 10.7644 }, { lat: 59.9222, lng: 10.7713 },
];
const demos: Scenario[] = [
  { id: "oslo", name: "Oslo sentrum", position: osloRoute[0], route: osloRoute, speed: 42, loop: true, status: "Active", battery: 84, signal: "Strong", trackerName: "VECTOR-01", deviceId: "VT-8347", vehicle: "Unknown", registration: "—", note: "Demo route through central Oslo", appearance: defaultAppearance, zoom: 14 },
  { id: "road", name: "Landevei", position: { lat: 60.0938, lng: 11.1882 }, route: [{ lat: 60.0938, lng: 11.1882 }, { lat: 60.1102, lng: 11.231 }, { lat: 60.127, lng: 11.276 }], speed: 80, loop: false, status: "Moving", battery: 67, signal: "Good", trackerName: "VECTOR-02", deviceId: "VT-2914", vehicle: "Van", registration: "—", note: "Rural movement test", appearance: defaultAppearance, zoom: 12 },
  { id: "offline", name: "Tracker offline", position: { lat: 59.9281, lng: 10.7174 }, route: [], speed: 0, loop: false, status: "Offline", battery: 12, signal: "Offline", trackerName: "VECTOR-03", deviceId: "VT-6108", vehicle: "Unknown", registration: "—", note: "Last seen 4 minutes ago", appearance: { ...defaultAppearance, pulse: false }, zoom: 14 },
];
const statuses: TrackerStatus[] = ["Active", "Moving", "Stationary", "Weak Signal", "Offline", "Signal Lost", "Low Battery", "Unknown"];
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function VectorApp() {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const line = useRef<Polyline | null>(null);
  const animation = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const activeTabRef = useRef("position");
  const lockedRef = useRef(false);
  const [scenario, setScenario] = useState<Scenario>(demos[0]);
  const [scenarios, setScenarios] = useState<Scenario[]>(demos);
  const [activeTab, setActiveTab] = useState("position");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [routeVisible, setRouteVisible] = useState(true);
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

  const position = useMemo(() => interpolatePosition(scenario.route.length ? scenario.route : [scenario.position], progress), [scenario, progress]);
  const angle = scenario.route.length > 1 ? bearing(scenario.route[Math.min(Math.floor(progress * (scenario.route.length - 1)), scenario.route.length - 2)], scenario.route[Math.min(Math.floor(progress * (scenario.route.length - 1)) + 1, scenario.route.length - 1)]) : 0;
  const statusTone = scenario.status === "Offline" || scenario.status === "Signal Lost" ? "danger" : scenario.status === "Weak Signal" || scenario.status === "Low Battery" ? "warning" : "active";

  const patch = useCallback((value: Partial<Scenario>) => setScenario(s => ({ ...s, ...value })), []);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  useEffect(() => {
    const saved = localStorage.getItem("vector-state-v1");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        queueMicrotask(() => {
          if (validateScenario(data.current)) setScenario(data.current);
          if (Array.isArray(data.scenarios)) setScenarios([...demos, ...data.scenarios.filter((s: unknown) => validateScenario(s) && !demos.some(d => d.id === (s as Scenario).id))]);
          setLight(Boolean(data.light));
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vector-state-v1", JSON.stringify({ current: scenario, scenarios, light }));
  }, [scenario, scenarios, light]);

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    let cancelled = false;
    import("leaflet").then(L => {
      if (cancelled || !mapNode.current) return;
      const m = L.map(mapNode.current, { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([scenario.position.lat, scenario.position.lng], scenario.zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
      const mk = L.marker([scenario.position.lat, scenario.position.lng], { draggable: true, icon: trackerIcon(L, scenario.appearance, scenario.status, 0) }).addTo(m);
      mk.on("dragend", () => {
        const p = mk.getLatLng(); patch({ position: { lat: p.lat, lng: p.lng }, route: [] }); setProgress(0);
      });
      m.on("click", e => {
        if (lockedRef.current) return;
        setScenario(s => activeTabRef.current === "movement" ? ({ ...s, route: [...s.route, { lat: e.latlng.lat, lng: e.latlng.lng }] }) : ({ ...s, position: { lat: e.latlng.lat, lng: e.latlng.lng }, route: [] }));
        setProgress(0);
      });
      map.current = m; marker.current = mk; line.current = L.polyline(scenario.route.map(p => [p.lat, p.lng]), { color: "#35e0a1", weight: 3, opacity: .8, dashArray: "2 10" }).addTo(m);
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
    if (!playing || scenario.route.length < 2) return;
    const run = () => {
      lastFrame.current = performance.now();
      const frame = (now: number) => {
        const delta = (now - lastFrame.current) / 1000; lastFrame.current = now;
        setProgress(p => {
          const next = p + delta / Math.max(4, 80 / Math.max(1, scenario.speed) * scenario.route.length);
          if (next >= 1) {
            if (scenario.loop) return 0;
            setPlaying(false); return 1;
          }
          return next;
        });
        setUpdated(0);
        animation.current = requestAnimationFrame(frame);
      };
      animation.current = requestAnimationFrame(frame);
    };
    const delayTimer = setTimeout(run, delay * 1000);
    return () => { clearTimeout(delayTimer); if (animation.current) cancelAnimationFrame(animation.current); };
  }, [playing, scenario.route.length, scenario.speed, scenario.loop, delay]);

  useEffect(() => {
    const tick = window.setInterval(() => setUpdated(v => v + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  const center = useCallback(() => map.current?.flyTo([position.lat, position.lng], Math.max(map.current.getZoom(), 14), { duration: .6 }), [position]);
  const setPositionFromText = () => {
    const p = parseCoordinateLine(coordText);
    if (!p) { setError("Enter a valid latitude (−90–90) and longitude (−180–180)."); return; }
    setError(""); patch({ position: p, route: [] }); setProgress(0); map.current?.flyTo([p.lat, p.lng], 15);
  };
  const applyRouteText = () => {
    const points = routeText.split("\n").filter(Boolean).map(parseCoordinateLine);
    if (points.length < 2 || points.some(p => !p)) { setError("The route needs at least two valid coordinate lines."); return; }
    const route = points as Coordinates[]; setError(""); patch({ route, position: route[0] }); setProgress(0); map.current?.fitBounds(route.map(p => [p.lat, p.lng]), { padding: [50, 50] });
  };
  const load = (s: Scenario) => { setScenario(structuredClone(s)); setProgress(0); setRouteText(s.route.map(p => `${p.lat}, ${p.lng}`).join("\n")); window.setTimeout(() => map.current?.setView([s.position.lat, s.position.lng], s.zoom), 20); notify(`Loaded “${s.name}”`); };
  const save = () => {
    const existing = scenarios.findIndex(s => s.id === scenario.id);
    const next = existing >= 0 ? scenarios.map(s => s.id === scenario.id ? scenario : s) : [...scenarios, { ...scenario, id: makeId() }];
    setScenarios(next); notify("Scenario saved locally");
  };
  const exportScenario = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${scenario.name.replace(/\s+/g, "-").toLowerCase()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importScenario = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const s = JSON.parse(String(reader.result)); if (!validateScenario(s)) throw new Error(); load({ ...s, id: makeId() }); notify("Scenario imported"); } catch { setError("This is not a valid VECTOR scenario file."); } };
    reader.readAsText(file);
  };
  const uploadIcon = (file?: File) => {
    if (!file || !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 1_500_000) { setError("Choose a PNG, JPG, WEBP or SVG image under 1.5 MB."); return; }
    const reader = new FileReader(); reader.onload = () => patch({ appearance: { ...scenario.appearance, customIcon: String(reader.result) } }); reader.readAsDataURL(file);
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
    if (!presenter) return;
    let timer = window.setTimeout(() => setHideCursor(true), 2500);
    const move = () => { setHideCursor(false); clearTimeout(timer); timer = window.setTimeout(() => setHideCursor(true), 2500); };
    window.addEventListener("mousemove", move); return () => { clearTimeout(timer); window.removeEventListener("mousemove", move); };
  }, [presenter]);

  return (
    <main className={`${light ? "light" : ""} ${presenter ? "presenter" : ""} ${!uiVisible ? "ui-hidden" : ""} ${hideCursor ? "hide-cursor" : ""}`}>
      <header>
        <div className="brand"><img src="/vector-logo.svg" alt="" /><div><b>VECTOR</b><span>LIVE GPS TRACKING</span></div></div>
        <div className="header-state"><i className={statusTone} /> <b>{scenario.status.toUpperCase()}</b><span>SECURE LOCAL SIMULATION</span></div>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setLight(v => !v)} title="Toggle theme">{light ? "◐" : "◑"}</button>
          <button className="present-button" onClick={() => setPresenter(true)}>Presenter mode <kbd>P</kbd></button>
        </div>
      </header>

      <section className="workspace">
        <div className="map-wrap">
          <div ref={mapNode} className="map" aria-label="Interactive OpenStreetMap" />
          <div className="map-shade" />
          <div className="map-tools">
            <button onClick={() => map.current?.zoomIn()} title="Zoom in">＋</button>
            <button onClick={() => map.current?.zoomOut()} title="Zoom out">−</button>
            <button onClick={center} title="Center tracker">◎</button>
            <button onClick={fullscreen} title="Fullscreen">⛶</button>
          </div>
          <div className="map-style"><span className="active">Street</span><span title="Prepared for a future imagery provider">Satellite*</span></div>

          <aside className={`status-card ${statusTone}`}>
            <div className="eyebrow"><span><i /> {scenario.status}</span><span>GPS / LIVE</span></div>
            <h2>{scenario.trackerName}</h2>
            <div className="coords">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</div>
            <div className="metrics">
              <div><span>Speed</span><b>{playing ? scenario.speed : 0}<small> km/h</small></b></div>
              <div><span>Heading</span><b>{Math.round(angle)}°<small> NE</small></b></div>
              <div><span>Battery</span><b>{scenario.battery}<small>%</small></b></div>
              <div><span>Signal</span><b>{scenario.signal}</b></div>
            </div>
            <div className="updated"><span>Last update</span><b>{scenario.status === "Offline" ? "4 min ago" : updated < 2 ? "Just now" : `${updated}s ago`}</b></div>
          </aside>

          <div className="simulation-bar">
            <button onClick={() => { setPlaying(false); setProgress(0); }} title="Stop">■</button>
            <button className="play" onClick={() => setPlaying(v => !v)} title="Play or pause">{playing ? "Ⅱ" : "▶"}</button>
            <button onClick={() => setProgress(v => Math.max(0, v - .02))}>−5s</button>
            <input aria-label="Simulation progress" type="range" min="0" max="1" step=".001" value={progress} onChange={e => setProgress(+e.target.value)} />
            <time>{Math.round(progress * 100)}%</time>
            <button onClick={() => setProgress(v => Math.min(1, v + .02))}>+5s</button>
            <button className={scenario.loop ? "toggle-on" : ""} onClick={() => patch({ loop: !scenario.loop })}>↻ Loop</button>
          </div>
        </div>

        <aside className="control-panel">
          <nav aria-label="Control panel">
            {[["position", "⌖", "Position"], ["movement", "↝", "Movement"], ["appearance", "◇", "Appearance"], ["scenarios", "▣", "Scenarios"], ["settings", "⚙", "Settings"]].map(([id, icon, label]) =>
              <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><span>{icon}</span>{label}</button>)}
          </nav>
          <div className="panel-content">
            {activeTab === "position" && <>
              <PanelTitle kicker="Tracker coordinates" title="Set Position" text="Enter coordinates or place the tracker directly on the map." />
              <label>Latitude, longitude<input value={coordText} onChange={e => setCoordText(e.target.value)} placeholder="59.913900, 10.752200" /></label>
              <div className="split"><button className="secondary" onClick={() => navigator.clipboard?.readText().then(setCoordText)}>Paste</button><button className="secondary" onClick={() => { const c = map.current?.getCenter(); if (c) setCoordText(`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`); }}>Use map center</button></div>
              <button className="primary" onClick={setPositionFromText}>Update Position</button>
              <div className="hint"><b>Map input enabled</b><span>Click anywhere or drag the tracker to place it.</span></div>
              <SectionLabel>Tracker status</SectionLabel>
              <label>Status<select value={scenario.status} onChange={e => patch({ status: e.target.value as TrackerStatus })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
              <div className="two-col"><label>Battery %<input type="number" min="0" max="100" value={scenario.battery} onChange={e => patch({ battery: +e.target.value })} /></label><label>Signal<input value={scenario.signal} onChange={e => patch({ signal: e.target.value })} /></label></div>
            </>}
            {activeTab === "movement" && <>
              <PanelTitle kicker="Route editor" title="Movement Simulator" text="Click map points or paste one coordinate pair per line." />
              <label>Route coordinates<textarea rows={7} value={routeText} onChange={e => setRouteText(e.target.value)} /></label>
              <button className="primary" onClick={applyRouteText}>Apply route</button>
              <div className="two-col"><label>Speed (km/h)<input type="number" min="1" max="200" value={scenario.speed} onChange={e => patch({ speed: +e.target.value })} /></label><label>Start delay<input type="number" min="0" max="30" value={delay} onChange={e => setDelay(+e.target.value)} /></label></div>
              <div className="split"><button className="secondary" onClick={() => { setPlaying(false); setProgress(0); }}>Restart</button><button className="secondary" onClick={() => { patch({ route: [] }); setRouteText(""); setProgress(0); }}>Clear route</button></div>
              <label className="check"><input type="checkbox" checked={routeVisible} onChange={e => setRouteVisible(e.target.checked)} /> Show route trace</label>
              <label className="check"><input type="checkbox" checked={scenario.loop} onChange={e => patch({ loop: e.target.checked })} /> Loop continuously</label>
            </>}
            {activeTab === "appearance" && <>
              <PanelTitle kicker="Visual identity" title="Tracker Appearance" text="Upload a production asset or tune the original VECTOR marker." />
              <div className="appearance-preview"><div className="mini-marker" style={{ opacity: scenario.appearance.opacity, transform: `rotate(${scenario.appearance.rotation}deg)` }}>{scenario.appearance.customIcon ? <img src={scenario.appearance.customIcon} alt="" /> : "V"}</div></div>
              <label className="upload">Upload tracker icon<input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={e => uploadIcon(e.target.files?.[0])} /></label>
              <label>Size <output>{scenario.appearance.size}px</output><input type="range" min="24" max="96" value={scenario.appearance.size} onChange={e => patch({ appearance: { ...scenario.appearance, size: +e.target.value } })} /></label>
              <label>Opacity <output>{Math.round(scenario.appearance.opacity * 100)}%</output><input type="range" min=".2" max="1" step=".05" value={scenario.appearance.opacity} onChange={e => patch({ appearance: { ...scenario.appearance, opacity: +e.target.value } })} /></label>
              {(["pulse", "ring", "shadow", "directionRotation"] as const).map(k => <label className="check" key={k}><input type="checkbox" checked={scenario.appearance[k]} onChange={e => patch({ appearance: { ...scenario.appearance, [k]: e.target.checked } })} /> {k === "directionRotation" ? "Rotate with direction" : `${k[0].toUpperCase()}${k.slice(1)} effect`}</label>)}
            </>}
            {activeTab === "scenarios" && <>
              <PanelTitle kicker="Local library" title="Scenarios" text="Saved only in this browser. Import or export portable JSON files." />
              <label>Scenario name<input value={scenario.name} onChange={e => patch({ name: e.target.value })} /></label>
              <button className="primary" onClick={save}>Save Scenario</button>
              <div className="split"><button className="secondary" onClick={exportScenario}>Export JSON</button><label className="secondary file-button">Import JSON<input type="file" accept=".json" onChange={e => importScenario(e.target.files?.[0])} /></label></div>
              <SectionLabel>Ready to use</SectionLabel>
              <div className="scenario-list">{scenarios.map(s => <button key={s.id} onClick={() => load(s)}><span className={`scenario-dot ${s.status.toLowerCase().replaceAll(" ", "-")}`} /><span><b>{s.name}</b><small>{s.trackerName} · {s.status}</small></span><em>›</em></button>)}</div>
            </>}
            {activeTab === "settings" && <>
              <PanelTitle kicker="Device metadata" title="Settings" text="Edit all on-screen production details." />
              <label>Tracker name<input value={scenario.trackerName} onChange={e => patch({ trackerName: e.target.value })} /></label>
              <div className="two-col"><label>Device ID<input value={scenario.deviceId} onChange={e => patch({ deviceId: e.target.value })} /></label><label>Registration<input value={scenario.registration} onChange={e => patch({ registration: e.target.value })} /></label></div>
              <label>Vehicle<input value={scenario.vehicle} onChange={e => patch({ vehicle: e.target.value })} /></label>
              <label>Note<textarea rows={3} value={scenario.note} onChange={e => patch({ note: e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} /> Lock map during filming</label>
              <div className="privacy">VECTOR is a fictional GPS simulation interface. No real devices are being tracked.</div>
              <details><summary>Keyboard shortcuts</summary><p><kbd>Space</kbd> Play/pause · <kbd>R</kbd> Restart · <kbd>F</kbd> Fullscreen · <kbd>P</kbd> Presenter · <kbd>C</kbd> Center · <kbd>H</kbd> Hide UI · <kbd>← →</kbd> Seek</p></details>
            </>}
            {error && <div className="error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
          </div>
          <footer><span>VECTOR / LOCAL</span><b>v1.0</b></footer>
        </aside>
      </section>
      {presenter && <div className="presenter-tools"><button onClick={() => setLocked(v => !v)}>{locked ? "🔒 Locked" : "◇ Lock map"}</button><button onClick={() => setPresenter(false)}>Exit presenter <kbd>Esc</kbd></button></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function PanelTitle({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return <div className="panel-title"><span>{kicker}</span><h1>{title}</h1><p>{text}</p></div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) { return <h3 className="section-label">{children}</h3>; }
function trackerIcon(L: typeof import("leaflet"), a: Appearance, status: TrackerStatus, angle: number) {
  const color = status === "Offline" || status === "Signal Lost" ? "#ff5c6c" : status === "Weak Signal" || status === "Low Battery" ? "#ffb84d" : "#35e0a1";
  const img = a.customIcon ? `<img src="${a.customIcon}" alt="">` : `<b>V</b><i></i>`;
  return L.divIcon({
    className: "vector-marker-host",
    iconSize: [a.size + 26, a.size + 26],
    iconAnchor: [(a.size + 26) / 2, (a.size + 26) / 2],
    html: `<div class="marker-shell ${a.pulse && status !== "Offline" ? "pulse" : ""} ${a.ring ? "ring" : ""} ${a.shadow ? "shadow" : ""}" style="--marker:${color};--size:${a.size}px;opacity:${a.opacity};transform:rotate(${a.rotation + (a.directionRotation ? angle : 0)}deg)">${img}</div>`,
  });
}
