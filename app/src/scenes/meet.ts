// meet — that is where I meet you (the stop; docs/TREATMENT.md "meet").
// "That is where": everything clears except the two registration marks, centred and huge; at this
// magnification the last pixel of misregistration is a visible gap. "I meet you": on *meet* they snap
// into register with a single soft hit (paper flex, no flash); on *you* the paper floods plum (both
// inks everywhere, the whole sheet is overprint) until chorus 3 comes in.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, Press, drawRegMark, drawPUs } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { clamp, ease, prog, smoothstep } from '../engine/util';
import { setLine, drawSetLine, wordIn, type SetLine } from './_karaoke';

const R = 210, MX = 960, MY = 470;

export default class Meet extends Scene {
  layer = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();

  override init() {
    this.lines = this.ctx.lyrics.inSection('stop');
    for (const l of this.lines) this.sets.set(l, setLine(l, 92));
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, press } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const [l0, l1] = this.lines;
    const meet = wordIn(l1, 'meet'), you = wordIn(l1, 'you');

    // the marks, magnified: the press's offset (1 px → 0) times the magnification, so the snap is visible
    const mag = R / 13;
    const gap = press.reg(t) * mag * 0.5;
    const [dx, dy] = Press.DIR;
    const grow = ease.outCubic(prog(t, this.ctx.start, (l0?.words[0]!.start ?? this.ctx.start) + 0.6));
    const r = R * (0.25 + 0.75 * grow);
    drawRegMark(c, MX - dx * gap, MY - dy * gap, r, 'red', 1, 5);
    drawRegMark(c, MX + dx * gap, MY + dy * gap, r, 'blue', 1, 5);

    // the words, small, under the marks
    for (const l of this.lines) {
      if (t < l.words[0]!.start - 0.4) continue;
      const s = this.sets.get(l)!, w = s.rowWidths[0]!;
      if (l === l0 && l1 && t > l1.words[0]!.start - 0.4) continue;
      drawSetLine(c, s, 960 - w / 2, 900, t);
    }
    if (meet && t > meet.start) drawPUs(c, 1500, 1010, press.pus(t), { size: 20, k: 'both' });

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    // one soft hit on "meet" (paper flex), then the plum page on "you"
    const hit = meet && t > meet.start ? Math.exp(-6 * (t - meet.start)) * Math.sin(Math.min(Math.PI, (t - meet.start) * 14)) : 0;
    const flood = you ? smoothstep(you.start - 0.02, you.start + 0.08, t) : 0;
    return { marks: 0, crop: 0, zoom: 1 + 0.012 * hit, flood: clamp(flood), screen: 0.55 * (1 - flood) };
  }
}
