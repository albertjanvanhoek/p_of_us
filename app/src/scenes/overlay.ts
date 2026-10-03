// overlay ×2 — put both models on the line (docs/TREATMENT.md "overlay"; params.n = 1 | 2).
// Two transparent acetate sheets slide in, each carrying one model's curve: blue on "Bring what you
// know", red on "I'll bring mine". "Put both models on the line": they drop onto the shared ruled
// baseline over the world and overlap. "If they clash, then something moves": the gap between the
// curves is hatched in graphite and the frame shudders (a misregistration jolt). "That's how either
// one improves": both curves move toward the dots and the hatched gap shrinks. The second time the
// overlay is tighter and faster.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, prog, smoothstep } from '../engine/util';
import { setLine, drawSetLine, currentLine, wordIn, type SetLine } from './_karaoke';
import { Chart, polyfit, blend, worldDots, type Fn } from './_fit';

const LX = 150, LY = 205, SIZE = 80;
const CH = { x: 420, y: 370, w: 1080, h: 460 };

export default class Overlay extends Scene {
  n = 1;
  layer = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  chart = new Chart(CH.x, CH.y, CH.w, CH.h);
  world = worldDots(9, 8, (u) => 0.16 + 1.1 * u - 0.6 * u * u);
  truth!: Fn; red0!: Fn; blue0!: Fn;

  override init() {
    const { lyrics, params } = this.ctx;
    this.n = params.n ?? 1;
    this.lines = lyrics.inSection(`pre${this.n}`);
    for (const l of this.lines) this.sets.set(l, setLine(l, SIZE, { maxWidth: 1620 }));
    this.truth = polyfit(this.world, 2);
    const gap = this.n === 1 ? 1 : 0.4;
    this.red0 = (u) => this.truth(u) + gap * (0.16 + 0.1 * Math.sin(u * 5));      // the human over-reaches
    this.blue0 = (u) => this.truth(u) - gap * (0.14 + 0.12 * u);                  // the model under-reaches, precisely
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, press } = this.ctx;
    const t = f.t, ch = this.chart, fast = this.n === 2 ? 0.6 : 1;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const [l0, l1, l2, l3, l4] = this.lines;

    // the paper: the world and the shared ruled baseline
    ch.grid(c, prog(t, this.ctx.start, this.ctx.start + 0.6 * fast, ease.outCubic), 0.3);
    ch.dots(c, this.world, { appear: this.world.map((_, i) => clamp((t - this.ctx.start - 0.1 - i * 0.06 * fast) / 0.2)) });
    c.strokeStyle = ink('graphite', 0.7); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(CH.x - 60, CH.y + CH.h + 40); c.lineTo(CH.x + CH.w + 60, CH.y + CH.h + 40); c.stroke();

    // where each sheet is: slides in on its line, drops into place on "Put both models on the line"
    const arrive = (l: Line | undefined, from: number) => l ? from * (1 - ease.outExpo(prog(t, l.words[0]!.start, l.words[0]!.start + 0.7 * fast))) : from;
    const drop = l2 ? ease.outExpo(prog(t, (wordIn(l2, 'line') ?? l2.words[l2.words.length - 1]!).start - 0.1, l2.end + 0.1)) : 0;
    const clash = wordIn(l3, 'clash');
    const jolt = clash && t > clash.start ? Math.exp(-7 * (t - clash.start)) : 0;
    const improve = l4 ? ease.inOutCubic(prog(t, l4.words[0]!.start, l4.end - 0.3 * fast)) : 0;
    const red = blend(this.red0, this.truth, improve * 0.85), blue = blend(this.blue0, this.truth, improve * 0.85);

    const sheet = (k: 'red' | 'blue', fn: Fn, dx: number, dy: number, rot: number) => {
      c.save();
      c.translate(960 + dx, CH.y + CH.h / 2 + dy); c.rotate(rot); c.translate(-960, -(CH.y + CH.h / 2));
      // the acetate: a hairline edge, two corner tabs and a glint
      c.strokeStyle = ink('graphite', 0.55); c.lineWidth = 1;
      c.strokeRect(CH.x - 40, CH.y - 40, CH.w + 80, CH.h + 80);
      c.beginPath(); c.moveTo(CH.x + CH.w * 0.62, CH.y - 40); c.lineTo(CH.x + CH.w * 0.5, CH.y + CH.h + 40); c.strokeStyle = ink('graphite', 0.18); c.stroke();
      c.fillStyle = ink(k, 0.9); c.fillRect(CH.x - 40, CH.y - 40, 18, 6); c.fillRect(CH.x + CH.w + 22, CH.y + CH.h + 34, 18, 6);
      ch.curve(c, fn, k, { u0: 0.02, u1: 0.98, width: k === 'red' ? 3.6 : 2.6, seed: 7 });
      c.font = font(F.mono(500), 17); c.fillStyle = ink(k, 0.85);
      c.fillText(k === 'red' ? 'mine' : 'what you know', k === 'red' ? CH.x : CH.x + CH.w - 128, CH.y - 52);
      c.restore();
    };
    const bx = arrive(l0, 1300), rx = arrive(l1, -1300);
    if (!l1 || t > l1.words[0]!.start - 0.1) sheet('red', red, lerp(rx - 230, 0, drop), lerp(-30, 0, drop), lerp(-0.035, 0, drop));
    if (!l0 || t > l0.words[0]!.start - 0.1) sheet('blue', blue, lerp(bx + 230, 0, drop), lerp(24, 0, drop), lerp(0.03, 0, drop));

    // the clash: the gap between the curves hatched in graphite, shrinking as both improve
    if (clash && t > clash.start - 0.1 && drop >= 1) {
      const a = smoothstep(clash.start - 0.1, clash.start + 0.15, t);
      c.strokeStyle = ink('graphite', 0.75 * a); c.lineWidth = 1.2;
      c.beginPath();
      for (let u = 0.03; u < 0.97; u += 0.012) {
        const p = ch.px(u, red(u)), q = ch.px(u, blue(u));
        c.moveTo(p.x, p.y); c.lineTo(q.x - 6, q.y);
      }
      c.stroke();
    }

    const cur = currentLine(this.lines, t);
    if (cur) drawSetLine(c, this.sets.get(cur)!, LX, LY, t);
    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return {
      marks: 1, crop: 0.6,
      shake: [jolt * 7 * Math.sin(t * 90), jolt * 4 * Math.cos(t * 77)],
      reg: press.reg(t) + jolt * 10,
    };
  }
}
