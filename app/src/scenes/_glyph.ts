// The loop glyph (docs/TREATMENT.md, motif 2) at any size: a circle with four stations
// (guess · world · error · update) and a travelling dot. Red draws it by hand (egg-shaped, stations
// hand-lettered outside); blue plots it (exact circle, stations in mono inside).
import { ink, type Ink } from '../engine/press';
import { F, font } from '../engine/type';
import { strokeText, drawStrokeText, type StrokeText } from '../engine/stroke';
import { clamp, ease } from '../engine/util';
import { makeStroke, resample, tremor, arc, drawPen, drawPlotter, type Stroke } from './_pen';

export const STATIONS = ['guess', 'world', 'error', 'update'];

/** Station position from a continuous beat index: one station per beat, snapping (hold, then a quick move). */
export const snapPos = (beat: number) => Math.floor(beat) + ease.outExpo(clamp((beat - Math.floor(beat)) / 0.3));

export class LoopGlyph {
  red: Stroke;
  blue: Stroke;
  labels: StrokeText[];
  constructor(public R: number, seed = 11) {
    const egg = Array.from({ length: 241 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 240) * Math.PI * 2.04;
      const r = R * (1 + 0.045 * Math.sin(a + 0.6) + 0.025 * Math.sin(2 * a - 0.4));
      return { x: Math.cos(a) * r, y: Math.sin(a) * r * 1.03 };
    });
    this.red = makeStroke(tremor(resample(egg, 3), Math.max(0.6, R / 140), 180, seed));
    this.blue = makeStroke(arc(0, 0, R, -Math.PI / 2, Math.PI * 1.5, 3));
    this.labels = STATIONS.map((s) => strokeText(s, 'hscript', Math.max(14, R * 0.18)));
  }

  /**
   * Draw one hand's glyph centred at (cx, cy). `draw` 0..1 = how much of the circle is drawn;
   * `pos` = continuous station position of the dot (NaN = no dot); `labels` = label density (0 = none).
   */
  draw(c: CanvasRenderingContext2D, k: 'red' | 'blue', cx: number, cy: number, o: { draw?: number; pos?: number; labels?: number; density?: number; dotR?: number; flash?: number } = {}) {
    const R = this.R, d = o.density ?? 1, draw = o.draw ?? 1;
    c.save(); c.translate(cx, cy);
    if (k === 'red') drawPen(c, this.red, this.red.total * draw, { widthAt: (s) => Math.max(2, R / 55) + 1.1 * Math.sin(s * 0.011 + 1), density: d });
    else drawPlotter(c, this.blue, this.blue.total * draw, { w: Math.max(1.6, R / 70), density: d, downs: [0, 1, 2, 3].map((i) => (this.blue.total * i) / 4) });
    const pos = o.pos ?? NaN;
    const st = Number.isFinite(pos) ? ((Math.round(pos) % 4) + 4) % 4 : -1;
    if ((o.labels ?? 0) > 0) {
      STATIONS.forEach((name, i) => {
        const la = -Math.PI / 2 + i * (Math.PI / 2), on = i === st ? o.flash ?? 1 : 0;
        const dd = (o.labels ?? 0) * (0.42 + 0.58 * on) * draw * d;
        if (k === 'red') {
          const lt = this.labels[i]!, rr = R + R * 0.24;
          c.save(); c.translate(Math.cos(la) * rr - lt.width / 2, Math.sin(la) * rr + lt.size * 0.3);
          c.strokeStyle = ink('red', dd); c.lineWidth = Math.max(1.4, R / 85); c.lineCap = 'round'; c.lineJoin = 'round';
          drawStrokeText(c, lt, lt.total);
          c.restore();
        } else {
          const sz = Math.max(12, R * 0.1);
          c.font = font(F.mono(500), sz); c.fillStyle = ink('blue', dd);
          const tw = c.measureText(name).width, rr = R - R * 0.21;
          c.fillText(name, Math.cos(la) * rr - tw / 2, Math.sin(la) * rr + sz * 0.35);
        }
      });
    }
    if (Number.isFinite(pos) && draw >= 1) {
      const a = -Math.PI / 2 + pos * (Math.PI / 2), r = o.dotR ?? Math.max(6, R * 0.07);
      const x = Math.cos(a) * R, y = Math.sin(a) * R * (k === 'red' ? 1.03 : 1);
      c.fillStyle = ink(k, d);
      c.beginPath();
      if (k === 'red') c.ellipse(x, y, r * 1.12, r, 0.4, 0, Math.PI * 2); else c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      if (k === 'blue') { c.strokeStyle = ink('blue', d); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - r * 1.8, y); c.lineTo(x + r * 1.8, y); c.moveTo(x, y - r * 1.8); c.lineTo(x, y + r * 1.8); c.stroke(); }
    }
    c.restore();
  }

  /** Point on the glyph's circle at a station position (for things attached to the dot). */
  at(k: 'red' | 'blue', cx: number, cy: number, pos: number) {
    const a = -Math.PI / 2 + pos * (Math.PI / 2);
    return { x: cx + Math.cos(a) * this.R, y: cy + Math.sin(a) * this.R * (k === 'red' ? 1.03 : 1) };
  }
}

export type { Ink };
