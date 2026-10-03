// register — you build a model, I do too (the build; docs/TREATMENT.md "register").
// The call-and-response becomes the registration process: each call prints in blue, each answer in
// red, stacked down the page; the *too* of each answer prints in plum. With each answer the two loop
// glyphs at the margin move one step closer in phase and the registration marks creep together (the
// offset itself steps 6 → 4 → 2 → 1 px in press.ts). The camera pulls back as the stack grows,
// energy rising with the music.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, drawPUs } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { ease, lerp, prog } from '../engine/util';
import { setLine, drawSetLine, type SetLine } from './_karaoke';
import { LoopGlyph, snapPos } from './_glyph';

const SIZE = 96, Y0 = 300, STEP = 118, CALL_X = 200, ANSWER_X = 620;
const GX = 1640, GY = 560;

export default class Register extends Scene {
  layer = new InkLayer();
  glyph = new LoopGlyph(78, 23);
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();

  override init() {
    const { lyrics } = this.ctx;
    this.lines = lyrics.inSection('build');
    // calls in the model's voice (blue), answers in the human's (red); "too" is shared (plum)
    this.lines.forEach((l, i) => this.sets.set(l, setLine(l, SIZE, { singer: i % 2 === 0 ? 'blue' : 'red' })));
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, press } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const L = this.lines;
    const answered = L.filter((l, i) => i % 2 === 1 && t >= l.words[l.words.length - 1]!.start).length;
    const shown = L.filter((l) => t >= l.words[0]!.start - 0.4).length;

    // the camera pulls back as the stack grows
    const grow = L.reduce((acc, l, i) => acc + ease.outCubic(prog(t, l.words[0]!.start - 0.3, l.words[0]!.start + 0.4)) * (i > 1 ? 1 : 0), 0);
    const s = lerp(1.18, 0.9, grow / Math.max(1, L.length - 2));
    c.save();
    c.translate(960, 540); c.scale(s, s); c.translate(-960, -540 - (1 - s) * 120);
    L.forEach((l, i) => {
      if (i >= shown) return;
      drawSetLine(c, this.sets.get(l)!, i % 2 === 0 ? CALL_X : ANSWER_X, Y0 + i * STEP, t);
    });
    c.restore();

    // the loops at the margin: one step closer in phase with each answer (3 beats apart → in phase)
    const phase = 3 - answered;
    const lastAnswer = L.filter((l, i) => i % 2 === 1 && t >= l.words[l.words.length - 1]!.start).pop();
    const ease3 = lastAnswer ? ease.outExpo(prog(t, lastAnswer.words[lastAnswer.words.length - 1]!.start, lastAnswer.words[lastAnswer.words.length - 1]!.start + 0.4)) : 1;
    const ph = lerp(phase + 1, phase, ease3);
    const pos = snapPos(f.beat);
    const draw = prog(t, this.ctx.start, this.ctx.start + 0.8, ease.outCubic);
    this.glyph.draw(c, 'red', GX, GY - 110, { draw, pos: pos + Math.max(0, ph), labels: 0.8 });
    this.glyph.draw(c, 'blue', GX, GY + 110, { draw, pos, labels: 0.8 });
    drawPUs(c, GX - 90, GY + 260, press.pus(t), { size: 18 });

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    const energy = prog(t, this.ctx.start, this.ctx.end);
    return { marks: 1, crop: 0.6, zoom: 1 + f.a.kick * 0.004 * (1 + 2 * energy) };
  }
}
