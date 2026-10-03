// The fit (docs/TREATMENT.md, motif 3): the concrete picture of learning. Plum dots are the world
// (printed in both inks: both minds see it); a model curve in one ink; a dashed prediction past the
// last dot; a new dot landing off the line; a residual; the curve bending. Each superseded curve
// stays behind as a faint ghost, so every chart is a record of being wrong.
// Chart coordinates: u (0..1, left to right), v (0..1, bottom to top) inside a screen rect.
import { ink, type Ink } from '../engine/press';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, type V2 } from '../engine/util';
import { makeStroke, tremor, drawPen, drawPlotter } from './_pen';

export type Fn = (u: number) => number;

/** Least-squares polynomial of degree `deg` through (u, v) points. */
export function polyfit(pts: [number, number][], deg = 2): Fn {
  const n = deg + 1;
  const A = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  for (const [x, y] of pts) {
    const p = Array.from({ length: n }, (_, i) => x ** i);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i]![j]! += p[i]! * p[j]!; A[i]![n]! += p[i]! * y; }
  }
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r]![i]!) > Math.abs(A[m]![i]!)) m = r;
    [A[i], A[m]] = [A[m]!, A[i]!];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r]![i]! / (A[i]![i]! || 1e-12);
      for (let c = i; c <= n; c++) A[r]![c]! -= f * A[i]![c]!;
    }
  }
  const coef = A.map((row, i) => row[n]! / (row[i] || 1e-12));
  return (u) => coef.reduce((s, c, i) => s + c * u ** i, 0);
}

/** Blend two curves (a model updating: k 0 → 1). */
export const blend = (a: Fn, b: Fn, k: number): Fn => (u) => lerp(a(u), b(u), k);

export class Chart {
  constructor(public x: number, public y: number, public w: number, public h: number) {}

  px(u: number, v: number): V2 { return { x: this.x + u * this.w, y: this.y + (1 - v) * this.h }; }

  /** Graphite grid and axes, pencilled in to `p` (0..1). */
  grid(c: CanvasRenderingContext2D, p = 1, density = 0.45, cells = 8) {
    c.save();
    c.strokeStyle = ink('graphite', density * 0.6); c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < cells; i++) {
      const u = i / cells, a = clamp(p * 1.4 - u * 0.4);
      if (a <= 0) continue;
      const q = this.px(u, 0), r = this.px(0, u);
      c.moveTo(q.x, this.y + this.h); c.lineTo(q.x, this.y + this.h - this.h * a);
      c.moveTo(this.x, r.y); c.lineTo(this.x + this.w * a, r.y);
    }
    c.stroke();
    c.strokeStyle = ink('graphite', density * 1.6); c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(this.x, this.y + this.h * (1 - p)); c.lineTo(this.x, this.y + this.h); c.lineTo(this.x + this.w * p, this.y + this.h);
    c.stroke();
    c.restore();
  }

  /** World dots (both inks = plum). `appear[i]` = 0..1 per dot (printed in), default all 1. */
  dots(c: CanvasRenderingContext2D, pts: [number, number][], o: { r?: number; density?: number; appear?: number[] } = {}) {
    const r = o.r ?? 7;
    for (let i = 0; i < pts.length; i++) {
      const a = o.appear?.[i] ?? 1;
      if (a <= 0) continue;
      const p = this.px(pts[i]![0], pts[i]![1]);
      c.fillStyle = ink('both', (o.density ?? 1) * clamp(a * 2));
      c.beginPath(); c.arc(p.x, p.y, r * (0.6 + 0.4 * ease.outBack(clamp(a))), 0, Math.PI * 2); c.fill();
    }
  }

  /** A dot that lands at (u, v) at time t0: falls from above with a small bounce, prints in both inks. */
  landing(c: CanvasRenderingContext2D, u: number, v: number, t: number, t0: number, o: { r?: number; density?: number } = {}) {
    if (t < t0 - 0.35) return 0;
    const k = clamp((t - (t0 - 0.35)) / 0.35);
    const p = this.px(u, v);
    const y = p.y - (1 - ease.inQuad(k)) * 260 + (t > t0 ? -14 * Math.exp(-9 * (t - t0)) * Math.abs(Math.sin(18 * (t - t0))) : 0);
    c.fillStyle = ink('both', (o.density ?? 1) * clamp(k * 1.5));
    c.beginPath(); c.arc(p.x, y, (o.r ?? 7) * (t > t0 ? 1 + 0.5 * Math.exp(-10 * (t - t0)) : 1), 0, Math.PI * 2); c.fill();
    return t >= t0 ? 1 : 0;
  }

  /** Curve points from u0 to u1. */
  points(fn: Fn, u0 = 0, u1 = 1, n = 80): V2[] {
    return Array.from({ length: n + 1 }, (_, i) => { const u = u0 + ((u1 - u0) * i) / n; return this.px(u, fn(u)); });
  }

  /**
   * A model curve drawn by its hand: red = pen (tremor, width from `width`), blue = plotter. `p` = how
   * much is drawn (0..1). `dashed` for predictions. Ghosts: pass density ~0.25.
   */
  curve(c: CanvasRenderingContext2D, fn: Fn, k: Ink, o: { u0?: number; u1?: number; p?: number; density?: number; width?: number | ((s: number) => number); dashed?: boolean; seed?: number } = {}) {
    const pts = this.points(fn, o.u0 ?? 0, o.u1 ?? 1);
    const p = o.p ?? 1, d = o.density ?? 1;
    if (o.dashed) {
      c.save(); c.setLineDash(k === 'red' ? [10, 9] : [8, 8]); c.lineCap = 'butt';
      c.strokeStyle = ink(k, d); c.lineWidth = typeof o.width === 'number' ? o.width : k === 'red' ? 3 : 2.2;
      const st = makeStroke(pts), len = st.total * p;
      c.beginPath(); let acc = 0;
      c.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length && acc < len; i++) { acc = st.L[i]!; c.lineTo(pts[i]!.x, pts[i]!.y); }
      c.stroke(); c.restore();
      return;
    }
    if (k === 'red') {
      const st = makeStroke(tremor(pts, 1.4, 90, o.seed ?? 5));
      const w = o.width ?? 3.2;
      drawPen(c, st, st.total * p, { widthAt: typeof w === 'number' ? () => w : w, density: d });
    } else {
      const st = makeStroke(pts);
      drawPlotter(c, st, st.total * p, { w: typeof o.width === 'number' ? o.width : 2.4, density: d, k: k === 'blue' ? 'blue' : k });
    }
  }

  /** Residual: a short line from the dot to the curve, in the model's ink. */
  residual(c: CanvasRenderingContext2D, u: number, v: number, fn: Fn, k: Ink, p = 1, density = 1) {
    if (p <= 0) return;
    const a = this.px(u, v), b = this.px(u, fn(u));
    c.save();
    c.strokeStyle = ink(k, density); c.lineWidth = k === 'red' ? 2.6 : 1.8;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x, a.y + (b.y - a.y) * ease.outCubic(p)); c.stroke();
    if (p >= 1) { c.beginPath(); c.moveTo(b.x - 7, b.y); c.lineTo(b.x + 7, b.y); c.stroke(); }
    c.restore();
  }

  /** A mono caption next to a chart point (the model's voice). */
  caption(c: CanvasRenderingContext2D, text: string, u: number, v: number, k: Ink = 'blue', density = 1, dx = 14, dy = -12, size = 20) {
    const p = this.px(u, v);
    c.font = font(F.mono(500), size);
    c.fillStyle = ink(k, density);
    c.fillText(text, p.x + dx, p.y + dy);
  }
}

/** The world: dots along a gentle curve with a little scatter (deterministic). */
export function worldDots(n = 8, seed = 3, f: Fn = (u) => 0.22 + 0.5 * u - 0.12 * u * u): [number, number][] {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, (_, i) => { const u = 0.06 + (0.66 * i) / (n - 1) + (rnd() - 0.5) * 0.03; return [u, f(u) + (rnd() - 0.5) * 0.09] as [number, number]; });
}
