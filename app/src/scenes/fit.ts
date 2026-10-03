// fit — you build a model, and so do I (docs/TREATMENT.md "fit").
// A shared figure: plum world dots on a graphite grid. Blue plots its fit, captioned fit(world);
// red draws its own by hand. Blue extends a dashed prediction, a new dot lands well off it on the
// snare, a residual drops: error. Red believes too hard, too long: its line thickens and blots.
// Another dot lands off the red line. On *change* blue bends to the new dots, on *too* red bends as
// well; both old curves stay behind as ghosts. (The registration halves on *too*: press.ts.)
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink, drawPUs } from '../engine/press';
import type { Line, Word } from '../engine/lyrics';
import { clamp, ease, prog, mulberry32, smoothstep } from '../engine/util';
import { setLine, drawSetLine, currentLine, wordIn, type SetLine } from './_karaoke';
import { Chart, polyfit, blend, worldDots, type Fn } from './_fit';

const LX = 150, LY = 205, SIZE = 80;

export default class Fit extends Scene {
  layer = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  chart = new Chart(300, 340, 1320, 540);
  // the world bends over: a straight-line model and an over-confident one both overshoot it
  world = worldDots(8, 5, (u) => 0.1 + 1.35 * u - 0.95 * u * u);
  A: [number, number] = [0.86, 0.47];
  B: [number, number] = [0.96, 0.4];
  blue0!: Fn; red0!: Fn; blue1!: Fn; red1!: Fn;
  blots: { u: number; r: number }[] = [];

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.lines = lyrics.inSection('verse1').filter((l) => l.start >= start - 0.1 && l.start < end);
    for (const l of this.lines) this.sets.set(l, setLine(l, SIZE, { maxWidth: 1620 }));
    this.blue0 = polyfit(this.world, 1);
    const r = polyfit(this.world, 2);
    this.red0 = (u) => r(u) + 0.035 * Math.sin(u * 8 + 1) + 0.05 * u * u;    // her own hand, slightly different, too sure at the end
    const all = [...this.world, this.A, this.B];
    this.blue1 = polyfit(all, 2);
    const r1 = polyfit(all, 2);
    this.red1 = (u) => r1(u) + 0.02 * Math.sin(u * 8 + 1);
    const rnd = mulberry32(9);
    this.blots = Array.from({ length: 5 }, () => ({ u: 0.15 + rnd() * 0.8, r: 0.6 + rnd() * 0.8 }));
  }

  /** The snare nearest to a word's start (the dot lands on it), within 0.35 s. */
  onSnare(w: Word) {
    const ev = this.ctx.audio.events('snare', w.start - 0.35, w.start + 0.35);
    return ev.length ? ev.reduce((b, e) => (Math.abs(e[0] - w.start) < Math.abs(b[0] - w.start) ? e : b))[0] : w.start;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, press } = this.ctx;
    const t = f.t, ch = this.chart;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const [l0, l1, l2, l3, l4, l5] = this.lines;

    // the figure: grid pencilled in, the world printed dot by dot on the beat
    ch.grid(c, prog(t, this.ctx.start, this.ctx.start + 0.8, ease.outCubic));
    const appear = this.world.map((_, i) => clamp((t - (this.ctx.start + 0.25 + i * 0.12)) / 0.2));
    ch.dots(c, this.world, { appear });

    const change = wordIn(l5, 'change'), too = wordIn(l5, 'too');
    const kBlue = change ? ease.inOutCubic(prog(t, change.start, change.end + 0.25)) : 0;
    const kRed = too ? ease.inOutCubic(prog(t, too.start, too.end + 0.3)) : 0;

    // blue: plots its fit while "You build a model of the world"
    if (l0) {
      const p = prog(t, l0.words[1]!.start, l0.end, ease.inOutQuad);
      if (kBlue > 0) ch.curve(c, this.blue0, 'blue', { u1: 0.75, density: 0.28 });          // ghost of the old fit
      ch.curve(c, blend(this.blue0, this.blue1, kBlue), 'blue', { u1: 0.75 + 0.23 * kBlue, p });
      if (p > 0.6) ch.caption(c, 'fit(world)', 0.62, this.blue0(0.62), 'blue', smoothstep(0.6, 0.9, p), 16, -18);
    }
    // red: draws her own, by hand, while "And so do I"; presses down while "I can believe too hard, too long"
    const press3 = l3 ? prog(t, l3.words[0]!.start, l3.end, ease.inQuad) : 0;
    if (l1) {
      const p = prog(t, l1.words[0]!.start, l1.end, ease.inOutQuad);
      const u1 = 0.75 + 0.23 * press3;                        // too sure: carries on past the world, solid
      if (kRed > 0) ch.curve(c, this.red0, 'red', { u1: 0.98, density: 0.28, width: 3 + 7 * press3 });
      ch.curve(c, blend(this.red0, this.red1, kRed), 'red', { u1: kRed > 0 ? 0.98 : u1, p, width: 3.2 + 9 * press3 * (1 - kRed) });
      // blots where she pressed hardest
      if (press3 > 0) {
        for (const b of this.blots) {
          const k = clamp(press3 * 1.6 - b.u * 0.5), q = ch.px(b.u, this.red0(b.u));
          if (k <= 0 || b.u > u1) continue;
          c.fillStyle = ink('red', 1 - 0.7 * kRed);
          c.beginPath(); c.ellipse(q.x, q.y, 9 * b.r * k, 7 * b.r * k, b.u * 4, 0, Math.PI * 2); c.fill();
        }
      }
    }

    // blue's guess: a dashed prediction, a dot lands well off it on the snare, the residual drops
    const wrong = wordIn(l2, 'wrong');
    if (l2 && t > l2.words[0]!.start) {
      const p = prog(t, l2.words[0]!.start, l2.words[3]?.end ?? l2.end, ease.outCubic);
      ch.curve(c, this.blue0, 'blue', { u0: 0.75, u1: 0.98, p, dashed: true, density: 1 - kBlue });
    }
    if (wrong) {
      const tA = this.onSnare(wrong);
      if (ch.landing(c, this.A[0], this.A[1], t, tA)) {
        ch.residual(c, this.A[0], this.A[1], this.blue0, 'blue', prog(t, tA, tA + 0.3) * (1 - kBlue));
        ch.caption(c, 'error', this.A[0], (this.A[1] + this.blue0(this.A[0])) / 2, 'blue', (1 - kBlue) * smoothstep(tA, tA + 0.3, t), 14, 6);
      }
    }
    // "Something new comes into view": another dot, off the red line this time
    const view = wordIn(l4, 'view') ?? wordIn(l4, 'new');
    if (view) {
      const tB = this.onSnare(view);
      if (ch.landing(c, this.B[0], this.B[1], t, tB)) ch.residual(c, this.B[0], this.B[1], this.red0, 'red', prog(t, tB, tB + 0.3) * (1 - kRed));
    }

    // the lyric
    const cur = currentLine(this.lines, t);
    if (cur) drawSetLine(c, this.sets.get(cur)!, LX, LY, t);
    // figure label with P(us)
    drawPUs(c, 1430, 950, press.pus(t), { size: 20 });

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return { marks: 1, crop: 0.6 };
  }
}
