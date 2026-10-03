// screens — something like mine (docs/TREATMENT.md "screens").
// Two loop glyphs side by side like two eyes facing each other ("I look you in the eye": the dots
// look at each other). "And see a little of myself inside": a few red dots drift into the blue
// circle and blue dots into the red one; each now carries a sample of the other's ink.
// "We are both unsure / About the certainty we feel": each travelling dot becomes a point estimate
// with error bars that breathe on the beat; *certainty* prints large and its two layers slide apart
// on *feel*. P(us) appears for the first time, as a margin note.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink, drawPUs } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, prog, mulberry32, smoothstep } from '../engine/util';
import { setLine, drawSetLine, currentLine, wordIn, type SetLine } from './_karaoke';
import { LoopGlyph, snapPos } from './_glyph';

const LX = 150, LY = 205, SIZE = 80;
const R = 165, EY = 600, RX = 700, BX = 1220;

export default class Screens extends Scene {
  layer = new InkLayer();
  glyph = new LoopGlyph(R, 13);
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  /** Dots that cross into the other circle: from (own circle) → to (other circle). */
  swaps: { k: 'red' | 'blue'; x0: number; y0: number; x1: number; y1: number; r: number; d: number }[] = [];

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.lines = lyrics.inSection('verse1').filter((l) => l.start >= start - 0.1 && l.start < end);
    for (const l of this.lines) this.sets.set(l, setLine(l, SIZE, { maxWidth: 1620 }));
    const rnd = mulberry32(42);
    const inDisc = (cx: number) => { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R * 0.62; return [cx + Math.cos(a) * r, EY + Math.sin(a) * r] as const; };
    for (let i = 0; i < 14; i++) {
      const k = i % 2 ? 'blue' : 'red';
      const [x0, y0] = inDisc(k === 'red' ? RX : BX), [x1, y1] = inDisc(k === 'red' ? BX : RX);
      this.swaps.push({ k, x0, y0, x1, y1, r: 5 + rnd() * 5, d: rnd() });
    }
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, press, audio } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const [l0, l1, l2, l3] = this.lines;

    // the eyes: drawn in over the first beat, the dots looking at each other while "I look you in the eye"
    const draw = prog(t, this.ctx.start, this.ctx.start + 0.9, ease.outCubic);
    const travel0 = l1 ? l1.words[0]!.start : this.ctx.end;
    const s0 = snapPos(audio.beatAt(travel0));
    const rpos = t < travel0 ? 1 : 1 + (snapPos(f.beat) - s0);        // red starts at 'world', facing blue
    const bpos = t < travel0 ? 3 : 3 + 2 + (snapPos(f.beat) - s0);    // blue at 'update', facing red; then two beats apart
    const flash = 1 - clamp(f.beatPhase / 0.9);
    this.glyph.draw(c, 'red', RX, EY, { draw, pos: rpos, labels: 1, flash });
    this.glyph.draw(c, 'blue', BX, EY, { draw, pos: bpos, labels: 1, flash });

    // "a little of myself inside": samples of each ink cross into the other circle, staggered over the line
    if (l1 && t > l1.words[0]!.start) {
      const a = l1.words[2]?.start ?? l1.start, b = l1.end;
      for (const s of this.swaps) {
        const p = ease.inOutCubic(prog(t, lerp(a, b - 0.6, s.d), lerp(a, b - 0.6, s.d) + 0.9));
        const x = lerp(s.x0, s.x1, p), y = lerp(s.y0, s.y1, p) - Math.sin(p * Math.PI) * 120;
        c.fillStyle = ink(s.k, 0.9);
        c.beginPath(); c.arc(x, y, s.r, 0, Math.PI * 2); c.fill();
      }
    }

    // "We are both unsure": the dots become point estimates with error bars breathing on the beat
    if (l2 && t > l2.words[0]!.start) {
      const on = smoothstep(l2.words[0]!.start, l2.words[0]!.start + 0.4, t);
      const half = (22 + 16 * (1 - f.beatPhase)) * on;
      for (const [k, cx, pos] of [['red', RX, rpos], ['blue', BX, bpos]] as const) {
        const p = this.glyph.at(k, cx, EY, pos);
        c.strokeStyle = ink(k, 1); c.lineWidth = k === 'red' ? 3 : 2; c.lineCap = k === 'red' ? 'round' : 'butt';
        c.beginPath();
        c.moveTo(p.x, p.y - half - 12); c.lineTo(p.x, p.y + half + 12);
        c.moveTo(p.x - 10, p.y - half - 12); c.lineTo(p.x + 10, p.y - half - 12);
        c.moveTo(p.x - 10, p.y + half + 12); c.lineTo(p.x + 10, p.y + half + 12);
        c.stroke();
      }
    }

    // *certainty* printed large; on *feel* its red and blue layers slide apart
    const cert = wordIn(l3, 'certainty'), feel = wordIn(l3, 'feel');
    if (cert && t >= cert.start) {
      const size = 168, fam = F.display('mid', 700);
      c.font = font(fam, size);
      const w = c.measureText('certainty').width, x = 960 - w / 2, y = 950;
      const p = clamp((t - cert.start) / Math.max(0.1, cert.end - cert.start));
      const apart = feel ? 46 * ease.outExpo(prog(t, feel.start, feel.end + 0.3)) : 0;
      c.save(); c.beginPath(); c.rect(x - 30, y - size, (w + 60) * p, size * 1.4); c.clip();
      c.fillStyle = ink('red', 1); c.fillText('certainty', x - apart, y - apart * 0.35);
      c.fillStyle = ink('blue', 1); c.fillText('certainty', x + apart, y + apart * 0.35);
      c.restore();
    }

    // the lyric
    const cur = currentLine(this.lines, t);
    if (cur) drawSetLine(c, this.sets.get(cur)!, LX, LY, t);

    // P(us), first appearance: a margin note
    const v = press.pus(t);
    if (v > 0) drawPUs(c, 1500, 1000, v, { size: 21, density: smoothstep(0, 0.07, v) });

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return { marks: 1, crop: 0.6 };
  }
}
