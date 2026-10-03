// interval — we are both unsure (the outro; docs/TREATMENT.md "interval").
// Back to quiet paper. "We are both unsure / About the certainty we feel": the P(us) readout prints
// large, 0.86, then word by word turns into an interval: two brackets, red on the left and blue on
// the right, [ 0.71 , 0.95 ], error bar breathing. The video declines to be certain.
// "You build a model / I do too": the two brackets bend into the two lines from the opening and
// loop around each other once more. "P-of-us": the finished print, both registration marks aligned,
// a small graphite colophon, and one wink at the P(doom) video.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink, type Ink } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { F, font } from '../engine/type';
import { strokeText, drawStrokeText, writtenLength, type StrokeText } from '../engine/stroke';
import { clamp, ease, lerp, prog, smoothstep, type V2 } from '../engine/util';
import { setLine, drawSetLine, currentLine, wordIn, charTimes, key, type SetLine } from './_karaoke';
import { makeStroke, resample, tremor, arc, drawPen, drawPlotter, type Stroke } from './_pen';

const LX = 150, LY = 205, SIZE = 80;
const NY = 560;                                         // the readout's baseline
const CR = { x: 915, y: 470 }, CB = { x: 1005, y: 510 }, R = 112;

export default class Interval extends Scene {
  layer = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  red!: Stroke; blue!: Stroke;
  me?: { a: StrokeText; b: StrokeText; ta: [number, number][]; tb: [number, number][]; l: Line };

  override init() {
    this.lines = this.ctx.lyrics.inSection('outro');
    for (const l of this.lines) this.sets.set(l, setLine(l, SIZE, { maxWidth: 1620 }));
    // the brackets become the opening's two lines: red from the left bracket, one loop, a tail;
    // blue from the right bracket, straight runs, one exact loop
    const redPts: V2[] = [{ x: 470, y: NY - 40 }, { x: 600, y: NY - 10 }, { x: 760, y: CR.y + R + 20 }, { x: CR.x, y: CR.y + R }];
    this.red = makeStroke(tremor([...resample(redPts, 3), ...arc(CR.x, CR.y, R, Math.PI / 2, Math.PI / 2 - Math.PI * 2, 3).slice(1),
      ...resample([{ x: CR.x, y: CR.y + R }, { x: CR.x + 140, y: CR.y + R + 10 }], 3).slice(1)], 1.6, 150, 8));
    this.blue = makeStroke([...resample([{ x: 1440, y: NY - 40 }, { x: 1440, y: CB.y - R }, { x: CB.x, y: CB.y - R }], 3),
      ...arc(CB.x, CB.y, R, -Math.PI / 2, Math.PI * 1.5, 3).slice(1), ...resample([{ x: CB.x, y: CB.y - R }, { x: CB.x - 150, y: CB.y - R }], 3).slice(1)]);
    const l = this.lines.find((x) => /^me learning you$/i.test(x.text));
    if (l) this.me = { a: strokeText('Me learning', 'hscript', 56), b: strokeText('you', 'sans', 50), ta: charTimes('Me learning', l.words.slice(0, 2)), tb: charTimes('you', l.words.slice(2)), l };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, press } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const [l0, l1, l2, l3, l4] = this.lines;
    const pofus = this.lines.find((l) => key(l.text) === 'p-of-us');

    // ---- 0.86 → [ 0.71 , 0.95 ]
    const into = l2 ? smoothstep(l2.words[0]!.start - 0.2, l2.words[0]!.start + 0.6, t) : 0;   // fades as the brackets become lines
    const about = l1?.words[0], cert = wordIn(l1, 'certainty'), feel = wordIn(l1, 'feel');
    const split = cert ? ease.inOutCubic(prog(t, cert.start, cert.end + 0.2)) : 0;
    const brL = about ? ease.outExpo(prog(t, about.start, about.end + 0.2)) : 0;
    const brR = feel ? ease.outExpo(prog(t, feel.start, feel.end + 0.2)) : 0;
    const show = l0 ? smoothstep(l0.words[0]!.start, l0.words[0]!.start + 0.3, t) : 1;
    const num = (txt: string, k: Ink, x: number, d: number) => {
      c.font = font(F.mono(500), 150); const w = c.measureText(txt).width;
      c.fillStyle = ink(k, d); c.fillText(txt, x - w / 2, NY); return w;
    };
    const d = show * (1 - into);
    if (d > 0) {
      if (split < 1) num(press.pus(t).toFixed(2), 'both', 960, d * (1 - split));
      if (split > 0) { num('0.71', 'red', lerp(960, 735, split), d * split); num('0.95', 'blue', lerp(960, 1185, split), d * split); }
      c.font = font(F.mono(300), 190);
      if (brL > 0) { c.fillStyle = ink('red', d * brL); c.fillText('[', lerp(330, 425, brL), NY + 10); }
      if (brR > 0) { c.fillStyle = ink('blue', d * brR); c.fillText(']', lerp(1500, 1405, brR), NY + 10); c.fillStyle = ink('graphite', d * brR); c.font = font(F.mono(400), 150); c.fillText(',', 922, NY); }
      // the error bar, breathing on the beat
      if (split > 0.5) {
        const breathe = 1 + 0.06 * (1 - f.beatPhase), half = 200 * breathe, y = NY + 90;
        c.strokeStyle = ink('graphite', d * smoothstep(0.5, 1, split)); c.lineWidth = 2;
        c.beginPath(); c.moveTo(960 - half, y); c.lineTo(960 + half, y); c.moveTo(960 - half, y - 14); c.lineTo(960 - half, y + 14); c.moveTo(960 + half, y - 14); c.lineTo(960 + half, y + 14); c.stroke();
        c.fillStyle = ink('both', d); c.beginPath(); c.arc(960 + 30 * Math.sin(f.beat * 0.5), y, 7, 0, Math.PI * 2); c.fill();
      }
    }

    // ---- the brackets bend into the two lines and loop around each other once more
    if (l2 && t > l2.words[0]!.start - 0.2) {
      const end = (l3 ?? l2).end;
      const pr = prog(t, l2.words[0]!.start, end, ease.inOutCubic);
      const pb = Math.floor(prog(t, l2.words[0]!.start, end) * 12) / 12 + ease.outExpo(clamp((prog(t, l2.words[0]!.start, end) * 12) % 1 / 0.3)) / 12;
      drawPen(c, this.red, this.red.total * pr, { widthAt: (s) => 3.4 + 1.4 * Math.sin(s * 0.012), pool: smoothstep(end, end + 1, t) });
      drawPlotter(c, this.blue, this.blue.total * Math.min(1, pb), { w: 2.6 });
      const lens = 0.34 * smoothstep(end - 0.3, end + 0.4, t);
      if (lens > 0) {
        c.save(); c.beginPath(); c.arc(CR.x, CR.y, R - 2, 0, Math.PI * 2); c.clip();
        c.beginPath(); c.arc(CB.x, CB.y, R - 2, 0, Math.PI * 2); c.fillStyle = ink('both', lens); c.fill(); c.restore();
      }
    }

    // ---- the finished print: P(us) once, in register; "Me learning you"; the colophon
    if (pofus && t > pofus.words[0]!.start) {
      const a = ease.outExpo(prog(t, pofus.words[0]!.start, pofus.words[0]!.start + 0.18));
      const size = 150, fi = F.display('mid', 700, true), fr = F.display('mid', 700);
      c.font = font(fi, size); const wp = c.measureText('P').width;
      c.font = font(fr, size); const wu = c.measureText('(us)').width;
      const x0 = 960 - (wp + wu + 3) / 2, s = lerp(1.08, 1, a);
      c.save(); c.translate(960, 780); c.scale(s, s); c.translate(-960, -780);
      c.fillStyle = ink('both', 1);
      c.font = font(fi, size); c.fillText('P', x0, 820);
      c.font = font(fr, size); c.fillText('(us)', x0 + wp + 3, 820);
      c.restore();
    }
    if (this.me && t > this.me.l.words[0]!.start) {
      const m = this.me, gap = 22, w = m.a.width + gap + m.b.width, x0 = 960 - w / 2, y0 = 930;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      c.translate(x0, y0); c.strokeStyle = ink('red', 1); c.lineWidth = 2.8; drawStrokeText(c, m.a, writtenLength(m.a, m.ta, t));
      c.translate(m.a.width + gap, 0); c.strokeStyle = ink('blue', 1); c.lineWidth = 2.3; c.lineCap = 'butt'; drawStrokeText(c, m.b, writtenLength(m.b, m.tb, t));
      c.restore();
    }
    const colo = l4 ? smoothstep(l4.end + 0.4, l4.end + 1.4, t) : 0;
    if (colo > 0) {
      c.font = font(F.text(true), 20); c.fillStyle = ink('graphite', colo);
      const txt = 'Printed in two inks. Emergence, 2026.'; c.fillText(txt, 1770 - c.measureText(txt).width, 1010);
      c.font = font(F.mono(400), 11); c.fillStyle = ink('graphite', 0.8 * colo); c.fillText('P(doom): see previous print', 150, 1012);
    }

    // the lyric (the last two lines are staged above)
    const cur = currentLine(this.lines, t);
    if (cur && cur !== pofus && cur !== this.me?.l) drawSetLine(c, this.sets.get(cur)!, LX, LY, t);

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    // the sheet is fed out of the press: a last roller streak, then the finished print holds
    const feed = pofus ? smoothstep(pofus.words[0]!.start, pofus.words[0]!.start + 0.6, t) * (1 - smoothstep(pofus.end, pofus.end + 1.5, t)) : 0;
    return { marks: 1, crop: 1, streak: 0.7 * feed };
  }
}
