// recognize — not because you're just like me (the bridge; docs/TREATMENT.md "recognize").
// The music thins out; so does the page: plain paper, big type, almost nothing else.
// "That's where I recognize you" set large. On each negation ("Not because you're just like me /
// Not because we share one feeling / Or one kind of memory") one of the earlier images (the breathing
// contour, the door frame, the checkpoint log) slides in faintly and is lifted off the page like a
// print being peeled away: the negations remove things. Then the fit once more, slowly, and for the
// first time both inks update in the same moment: one dot lands, two residuals drop, two curves bend
// together on *rearranged*.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { clamp, ease, prog, smoothstep } from '../engine/util';
import { setLine, drawSetLine, currentLine, wordIn, type SetLine } from './_karaoke';
import { makeStroke, tremor, drawPen, drawPlotter } from './_pen';
import { Chart, polyfit, blend, worldDots, type Fn } from './_fit';

const BIG = 112, LX = 150;

export default class Recognize extends Scene {
  layer = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  chart = new Chart(360, 560, 1200, 380);
  world = worldDots(8, 21, (u) => 0.18 + 1.0 * u - 0.55 * u * u);
  dot: [number, number] = [0.88, 0.42];
  red0!: Fn; blue0!: Fn; fit1!: Fn;

  override init() {
    const { lyrics } = this.ctx;
    this.lines = lyrics.inSection('bridge');
    this.lines.forEach((l, i) => this.sets.set(l, setLine(l, i < 4 ? BIG : 92, { maxWidth: i >= 1 && i <= 3 ? 1250 : 1640 })));
    const q = polyfit(this.world, 2), lin = polyfit(this.world, 1);
    this.red0 = (u) => q(u) + 0.12 * u * u + 0.02;
    this.blue0 = (u) => lin(u) - 0.02;
    this.fit1 = polyfit([...this.world, this.dot], 2);
  }

  /** One of verse 2's records, small, at (x, y): 0 = breathing contour, 1 = door frame, 2 = checkpoint log. */
  record(c: CanvasRenderingContext2D, which: number, x: number, y: number, d: number) {
    if (which === 0) {
      const pts = Array.from({ length: 121 }, (_, i) => { const a = (i / 120) * Math.PI * 2, r = 110 * (1 + 0.08 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a)); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; });
      drawPen(c, makeStroke(tremor(pts, 1, 100, 3)), Infinity, { widthAt: () => 3, density: d });
    } else if (which === 1) {
      const pts = [{ x: x - 70, y: y + 190 }, { x: x - 70, y: y - 190 }, { x: x + 70, y: y - 190 }, { x: x + 70, y: y + 190 }];
      drawPen(c, makeStroke(tremor(pts, 1, 120, 4)), Infinity, { widthAt: () => 3, density: d });
      c.strokeStyle = ink('red', d); c.lineWidth = 2.6;
      c.beginPath(); for (let i = 0; i < 6; i++) { const yy = y + 150 - i * 42; c.moveTo(x - 64, yy); c.lineTo(x + 6, yy + 1); } c.stroke();
    } else {
      c.strokeStyle = ink('blue', d); c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x - 170, y - 160); c.lineTo(x - 170, y + 160); c.lineTo(x + 170, y + 160); c.stroke();
      const pts = Array.from({ length: 61 }, (_, i) => { const u = i / 60; return { x: x - 170 + u * 340, y: y + 160 - (0.1 + 0.84 * Math.exp(-4.3 * u)) * 300 }; });
      drawPlotter(c, makeStroke(pts), Infinity, { w: 2, density: d });
      c.fillStyle = ink('blue', d);
      for (const u of [0.1, 0.25, 0.4, 0.55, 0.7]) { const p = pts[Math.round(u * 60)]!; c.beginPath(); c.arc(p.x, p.y, 4, 0, Math.PI * 2); c.fill(); }
    }
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const L = this.lines;
    const cur = currentLine(L, t);
    const ci = cur ? L.indexOf(cur) : -1;

    // the negations: an earlier image slides in faintly and is peeled off the page
    for (let k = 0; k < 3; k++) {
      const l = L[k + 1];
      if (!l) continue;
      const a = l.words[0]!.start - 0.3, b = l.end + 0.2;
      if (t < a || t > b + 0.6) continue;
      const inP = ease.outCubic(prog(t, a, a + 0.5)), peel = ease.inCubic(prog(t, (a + b) / 2, b + 0.5));
      c.save();
      c.translate(1580 + 120 * (1 - inP), 600 - 260 * peel);
      c.transform(1, 0, -0.5 * peel, 1 - 0.4 * peel, 0, 0);
      c.rotate(-0.25 * peel);
      this.record(c, k, 0, 0, 0.42 * inP * (1 - peel));
      c.restore();
    }

    // the fit, at half time: both inks update in the same moment
    if (ci >= 4 || (L[4] && t > L[4].words[0]!.start - 0.5)) {
      const l4 = L[4]!, l5 = L[5], l6 = L[6];
      const on = prog(t, l4.words[0]!.start - 0.5, l4.words[0]!.start + 0.5, ease.outCubic);
      const ch = this.chart;
      ch.grid(c, on, 0.35);
      ch.dots(c, this.world, { appear: this.world.map((_, i) => clamp(on * 2 - i * 0.12)) });
      const { red0, blue0, fit1 } = this;
      const tLand = (wordIn(l4, 'world') ?? l4.words[l4.words.length - 1]!).start;
      const fails = wordIn(l5, 'fails'), rearr = wordIn(l6, 'rearranged') ?? l6?.words[l6.words.length - 1];
      const k = rearr ? ease.inOutCubic(prog(t, rearr.start, rearr.end + 0.4)) : 0;
      if (k > 0) { ch.curve(c, red0, 'red', { u1: 0.98, density: 0.25 }); ch.curve(c, blue0, 'blue', { u1: 0.98, density: 0.25 }); }
      ch.curve(c, blend(red0, (u) => fit1(u) + 0.008, k), 'red', { u1: 0.98, p: on, seed: 9 });
      ch.curve(c, blend(blue0, (u) => fit1(u) - 0.008, k), 'blue', { u1: 0.98, p: on });
      if (ch.landing(c, this.dot[0], this.dot[1], t, tLand) && fails) {
        const p = prog(t, fails.start, fails.end + 0.2);
        ch.residual(c, this.dot[0] - 0.006, this.dot[1], red0, 'red', p * (1 - k));
        ch.residual(c, this.dot[0] + 0.006, this.dot[1], blue0, 'blue', p * (1 - k));
      }
    }

    // big type
    if (cur) {
      const s = this.sets.get(cur)!;
      const y = ci < 4 ? 560 - (s.rows - 1) * s.leading * 0.5 : 330;
      const fadeIn = smoothstep(cur.words[0]!.start - 0.4, cur.words[0]!.start - 0.1, t);
      drawSetLine(c, s, LX, y, t, { anticipate: 0.4, density: Math.max(0.6, fadeIn) });
    }

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return { marks: 1, crop: 0.4 };
  }
}
