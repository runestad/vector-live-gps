import type { MobilePanelState } from "./types";

export type Tap = { x: number; y: number; at: number };
export const nextPanelState = (state: MobilePanelState): MobilePanelState => state === "collapsed" ? "half" : state === "half" ? "expanded" : "collapsed";
export function panelStateFromGesture(start: MobilePanelState, deltaY: number, velocityY: number): MobilePanelState {
  if (velocityY > .55 || deltaY > 110) return "collapsed";
  if (velocityY < -.55 || deltaY < -110) return "expanded";
  if (Math.abs(deltaY) < 28) return nextPanelState(start);
  return deltaY > 0 ? (start === "expanded" ? "half" : "collapsed") : (start === "collapsed" ? "half" : "expanded");
}
export function registerTripleTap(taps: Tap[], tap: Tap, windowMs = 900, maxDistance = 40) {
  const recent = [...taps, tap].filter(item => tap.at - item.at <= windowMs).slice(-3);
  const first = recent[0];
  const matched = recent.length === 3 && recent.every(item => Math.hypot(item.x - first.x, item.y - first.y) <= maxDistance);
  return { taps: matched ? [] : recent, matched };
}
