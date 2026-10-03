// The two hands (docs/TREATMENT.md, "Line quality"), shared by every scene:
// - the red PEN: variable width from pressure/speed, a slow tremor (never jitter), ink pooling
//   where the pen rests;
// - the blue PLOTTER: constant width, exact segments and arcs, a visible pen-down dot at the start
//   of every move.
// Strokes are polylines in logical px; `len` is how much of the stroke has been drawn (px).
import { ink, type Ink } from '../engine/press';
import { noise1, polylineLengths, type V2 } from '../engine/util';

export interface Stroke { pts: V2[]; L: Float32Array; total: number }

export function makeStroke(pts: V2[]): Stroke {
  const L = polylineLengths(pts);
  return { pts, L, total: L[L.length - 1] ?? 0 };
}

/** Resample a polyline every `step` px (even spacing for width and tremor). */
export function resample(pts: V2[], step = 3): V2[] {
  const L = polylineLengths(pts), total = L[L.length - 1]!;
  const out: V2[] = [];
  let j = 1;
  for (let s = 0; s <= total; s += step) {
    while (j < pts.length - 1 && L[j]! < s) j++;
    const a = pts[j - 1]!, b = pts[j]!, k = (s - L[j - 1]!) / Math.max(1e-6, L[j]! - L[j - 1]!);
    out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** The hand's tremor: a slow displacement along the normal, `amp` px, wavelength ~`wave` px of stroke. */
export function tremor(pts: V2[], amp = 1.6, wave = 140, seed = 1): V2[] {
  const L = polylineLengths(pts);
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    const d = amp * (noise1(L[i]! / wave, seed) + 0.35 * noise1(L[i]! / (wave * 0.37), seed + 7));
    return { x: p.x - (dy / n) * d, y: p.y + (dx / n) * d };
  });
}

/** Points of a circle arc (exact: the plotter's arcs). Angles in radians, y down. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, step = 4): V2[] {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

/**
 * Draw the first `len` px of a pen stroke. `widthAt(s)` gives the nib width at arclength s (thicker
 * where the pen moved slowly). `pool` (0..1) grows an ink pool at the pen's current position.
 */
export function drawPen(c: CanvasRenderingContext2D, st: Stroke, len: number, o: { widthAt: (s: number) => number; k?: Ink; density?: number; pool?: number; poolStart?: number }) {
  const { pts, L } = st;
  const k = o.k ?? 'red', d = o.density ?? 1;
  if (len <= 0 || pts.length < 2) return null;
  c.save();
  c.strokeStyle = ink(k, d);
  c.fillStyle = ink(k, d);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // segments of similar width are batched into one path (fewer draw calls, no overlap seams)
  let i = 1, head: V2 = pts[0]!;
  while (i < pts.length && L[i - 1]! < len) {
    const w = Math.round(o.widthAt(L[i]!) * 4) / 4;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
    while (i < pts.length && L[i - 1]! < len && Math.round(o.widthAt(L[i]!) * 4) / 4 === w) {
      const a = pts[i - 1]!, b = pts[i]!;
      if (L[i]! > len) {
        const f = (len - L[i - 1]!) / Math.max(1e-6, L[i]! - L[i - 1]!);
        head = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      } else head = b;
      c.lineTo(head.x, head.y);
      i++;
    }
    c.stroke();
  }
  // pen-down blot at the start, and the pool where the pen rests
  if (o.poolStart) { c.beginPath(); c.arc(pts[0]!.x, pts[0]!.y, o.widthAt(0) * 0.5 * (1 + o.poolStart), 0, Math.PI * 2); c.fill(); }
  if (o.pool) { c.beginPath(); c.arc(head.x, head.y, o.widthAt(Math.min(len, st.total)) * 0.5 * (1 + 0.9 * o.pool), 0, Math.PI * 2); c.fill(); }
  c.restore();
  return head;
}

/**
 * Draw the first `len` px of a plotter stroke: constant width, with a small pen-down dot at each
 * arclength in `downs` already reached (the start of every move).
 */
export function drawPlotter(c: CanvasRenderingContext2D, st: Stroke, len: number, o: { w?: number; k?: Ink; density?: number; downs?: number[] } = {}) {
  const { pts, L } = st;
  const w = o.w ?? 2.6, k = o.k ?? 'blue', d = o.density ?? 1;
  if (len <= 0 || pts.length < 2) return null;
  c.save();
  c.strokeStyle = ink(k, d);
  c.fillStyle = ink(k, d);
  c.lineWidth = w;
  c.lineCap = 'butt';
  c.lineJoin = 'miter';
  c.beginPath();
  c.moveTo(pts[0]!.x, pts[0]!.y);
  let head: V2 = pts[0]!;
  for (let i = 1; i < pts.length && L[i - 1]! < len; i++) {
    const a = pts[i - 1]!, b = pts[i]!;
    if (L[i]! > len) {
      const f = (len - L[i - 1]!) / Math.max(1e-6, L[i]! - L[i - 1]!);
      head = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    } else head = b;
    c.lineTo(head.x, head.y);
  }
  c.stroke();
  for (const s of o.downs ?? []) {
    if (s > len) break;
    const p = pointAt(st, s);
    c.beginPath(); c.arc(p.x, p.y, w * 0.9, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  return head;
}

/** Point at arclength s along a stroke. */
export function pointAt(st: Stroke, s: number): V2 {
  const { pts, L } = st;
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m]! <= s) lo = m; else hi = m; }
  const a = pts[lo]!, b = pts[hi]!, f = Math.min(1, Math.max(0, (s - L[lo]!) / Math.max(1e-6, L[hi]! - L[lo]!)));
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
