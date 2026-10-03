// hold — the sheet goes in; two lines, then down into the paper (docs/TREATMENT.md: press + hold).
// The vocal starts at 0:00, so the press intro and "hold" share one plate:
// - the sheet is fed in (roller streak), the registration marks print on the first beat;
// - a red pen line from the left and a blue plotter line from the right meet in the middle and
//   loop around each other once on "hold" … "hand" (motif 6): the first plum where they cross;
// - "We tumble down to wonderland": the camera falls into a crossing, through the paper fibre, into
//   the halftone (red dots at 15°, blue at 75°, moiré rosettes where both overlap). "tumble"
//   tumbles letter by letter; "wonderland" is plum and resolves out of the moiré.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { FSPass, W, H } from '../engine/gl';
import { InkLayer, ink } from '../engine/press';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { F, font, glyphX } from '../engine/type';
import { clamp, ease, lerp, prog, smoothstep, type V2 } from '../engine/util';
import { setLine, drawSetLine, drawWord, type SetLine } from './_karaoke';
import { makeStroke, resample, tremor, arc, drawPen, drawPlotter, type Stroke } from './_pen';

const LX = 150, LY = 900, SIZE = 84;
// the two loops: overlapping circles, linked like two rings
const CR = { x: 915, y: 520 }, CB = { x: 1005, y: 560 }, R = 112;

/** The middle of the lens where the two loops overlap: where the camera falls in. */
const LENS: V2 = { x: (CR.x + CB.x) / 2, y: (CR.y + CB.y) / 2 };

export default class Hold extends Scene {
  art = new InkLayer();
  text = new InkLayer();
  red!: Stroke;
  blue!: Stroke;
  blueDowns: number[] = [];
  redKeys: [number, number][] = [];
  blueSteps: number[] = [];
  l1!: Line; l2!: Line;
  s1!: SetLine; s2!: SetLine;
  P = LENS;
  fall = new FSPass(/* glsl */ `
    uniform sampler2D art;
    uniform vec2 res, anchor, target;
    uniform float z, rot, k, fibre;
    uniform vec4 knock;   // knockout band behind the lyric (x0, y0, x1, y1 screen px), paper left unprinted
    uniform float knockK;
    float screened(float c, vec2 p, float ang, float cell) {
      vec2 q = rot2(ang) * p / cell;
      float v = 0.5 - 0.25 * (cos(TAU * q.x) + cos(TAU * q.y));
      float aa = max(fwidth(v) * 0.8, 1e-4);
      return smoothstep(v - aa, v + aa, c);
    }
    void main() {
      vec2 px = vec2(vUv.x, 1.0 - vUv.y) * res;                  // screen px, y down
      vec2 s = target + rot2(-rot) * (px - anchor) / z;          // sheet px under this pixel
      vec4 a = texture(art, vUv);
      a.rgb *= a.a;                                              // canvas texture: coverage = rgb x alpha
      float kx = smoothstep(knock.x - 60.0, knock.x, px.x) * (1.0 - smoothstep(knock.z, knock.z + 60.0, px.x));
      float ky = smoothstep(knock.y - 50.0, knock.y, px.y) * (1.0 - smoothstep(knock.w, knock.w + 50.0, px.y));
      a.rg *= 1.0 - knockK * kx * ky;
      // the solid ink turns out to be a tint made of dots: screen it at the magnified sheet scale
      float tint = mix(1.0, 0.62, k);
      float r = mix(a.r, screened(a.r * tint, s, radians(15.0), 4.5), k);
      float b = mix(a.g, screened(a.g * tint, s, radians(75.0), 4.5), k);
      // paper fibre, magnified, on the way through
      float fl = 1.0 - abs(snoise(vec2(s.x * 0.08, s.y * 1.6)));
      float g = fibre * smoothstep(0.82, 0.97, fl) * 0.55 + a.b;
      fragColor = vec4(r, b, g, 1.0);
    }`, { art: { value: null }, res: { value: new THREE.Vector2(W, H) }, anchor: { value: new THREE.Vector2() }, target: { value: new THREE.Vector2() },
    z: { value: 1 }, rot: { value: 0 }, k: { value: 0 }, fibre: { value: 0 },
    knock: { value: new THREE.Vector4() }, knockK: { value: 0 } });

  override init() {
    const { lyrics, audio } = this.ctx;
    const v1 = lyrics.inSection('verse1');
    this.l1 = v1[0]!; this.l2 = v1[1]!;
    this.s1 = setLine(this.l1, SIZE);
    this.s2 = setLine(this.l2, SIZE);
    // red: from the left edge, a hand-drawn approach, one full loop (counter-clockwise from the bottom), a short tail
    const approach = [{ x: -40, y: 610 }, { x: 260, y: 585 }, { x: 520, y: 650 }, { x: 760, y: 660 }, { x: CR.x, y: CR.y + R }];
    const smooth = (ps: V2[]) => resample(catmull(ps), 3);
    const loopR = arc(CR.x, CR.y, R, Math.PI / 2, Math.PI / 2 - Math.PI * 2, 3);
    const tailR = [{ x: CR.x, y: CR.y + R }, { x: CR.x + 90, y: CR.y + R + 14 }, { x: CR.x + 150, y: CR.y + R + 6 }];
    this.red = makeStroke(tremor([...smooth(approach), ...loopR.slice(1), ...smooth(tailR).slice(1)], 1.8, 160, 3));
    // the red pen: reaches the loop as "hold" starts, closes it by the end of "hand", then the tail
    const hold = this.l1.words.find((w) => /hold/i.test(w.w))!, hand = this.l1.words.find((w) => /hand/i.test(w.w))!;
    const lenA = makeStroke(smooth(approach)).total, lenL = 2 * Math.PI * R;
    this.redKeys = [[0.05, 0], [hold.start, lenA], [hand.end, lenA + lenL], [hand.end + 0.45, this.red.total]];
    // blue: plotter from the right edge: straight runs, then one exact loop (clockwise from the top), a straight tail
    const appB = [{ x: W + 40, y: 470 }, { x: 1500, y: 470 }, { x: 1500, y: 430 }, { x: 1240, y: 430 }, { x: CB.x, y: CB.y - R }];
    const loopB = arc(CB.x, CB.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, 3);
    const tailB = [{ x: CB.x, y: CB.y - R }, { x: CB.x - 160, y: CB.y - R }];
    const ptsB = [...resample(appB, 3), ...loopB.slice(1), ...resample(tailB, 3).slice(1)];
    this.blue = makeStroke(ptsB);
    // the plotter steps on eighth notes from the first beat until "hand" ends: pen-down at every step
    const e0 = Math.ceil(audio.beatAt(0.2) * 2), e1 = Math.floor(audio.beatAt(hand.end + 0.3) * 2);
    this.blueSteps = [];
    for (let e = e0; e <= e1; e++) this.blueSteps.push(audio.timeOfBeat(e / 2));
    const n = this.blueSteps.length;
    this.blueDowns = this.blueSteps.map((_, i) => (this.blue.total * i) / n);
  }

  redLen(t: number) {
    const k = this.redKeys;
    if (t <= k[0]![0]) return 0;
    for (let i = 1; i < k.length; i++) {
      const [t0, v0] = k[i - 1]!, [t1, v1] = k[i]!;
      if (t < t1) return lerp(v0, v1, ease.inOutQuad((t - t0) / (t1 - t0)));
    }
    return k[k.length - 1]![1];
  }
  blueLen(t: number) {
    const S = this.blueSteps, n = S.length;
    let len = 0;
    for (let i = 0; i < n; i++) {
      if (t < S[i]!) break;
      len = (this.blue.total * (i + ease.outExpo(clamp((t - S[i]!) / 0.14)))) / n;
    }
    return len;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, audio } = this.ctx;
    const t = f.t;
    const fallT0 = this.l2.words[0]!.start + 0.2, fallT1 = this.l2.words[this.l2.words.length - 1]!.end;
    const fp = clamp((t - fallT0) / (fallT1 - fallT0));
    const z = Math.exp(Math.log(34) * ease.inCubic(fp));                       // 1 → 34
    const tumble = this.l2.words.find((w) => /tumble/i.test(w.w))!;
    const rot = 0.32 * Math.sin(prog(t, tumble.start, tumble.end + 0.6, ease.outCubic) * Math.PI) * smoothstep(0, 0.3, fp);
    const anchor = { x: lerp(this.P.x, W / 2, ease.inOutQuad(clamp(fp * 1.6))), y: lerp(this.P.y, H / 2 - 40, ease.inOutQuad(clamp(fp * 1.6))) };

    // ---- the art: both lines, under the falling camera
    const c = this.art.ctx;
    this.art.clear();
    c.save();
    c.translate(anchor.x, anchor.y); c.rotate(rot); c.scale(z, z); c.translate(-this.P.x, -this.P.y);
    // graphite construction: ruled baseline and a centre cross, pencilled in first
    const g = prog(t, 0.1, 0.9, ease.outCubic);
    c.strokeStyle = ink('graphite', 0.55);
    c.lineWidth = 1 / Math.max(1, z * 0.4);
    c.beginPath(); c.moveTo(LX - 20, LY + 22); c.lineTo(LX - 20 + (W - 2 * LX + 40) * g, LY + 22); c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 18 * g, H / 2); c.lineTo(W / 2 + 18 * g, H / 2); c.moveTo(W / 2, H / 2 - 18 * g); c.lineTo(W / 2, H / 2 + 18 * g); c.stroke();
    // the red pen: thicker where it moves slowly (the loop is drawn slower than the approach)
    const rl = this.redLen(t);
    const speedW = (s: number) => {
      const loopStart = this.redKeys[1]![1], loopEnd = this.redKeys[2]![1];
      const inLoop = s > loopStart && s < loopEnd ? 1 : 0;
      return 3.4 + 1.6 * inLoop + 0.8 * Math.sin(s * 0.013);
    };
    const resting = t > this.redKeys[3]![0] ? clamp((t - this.redKeys[3]![0]) / 1.2) : 0;
    drawPen(c, this.red, rl, { widthAt: speedW, pool: resting, poolStart: prog(t, 0.05, 0.4) });
    drawPlotter(c, this.blue, this.blueLen(t), { w: 2.6, downs: this.blueDowns });
    // where the closed loops overlap, both inks: a light plum tint (the first plum on screen). It is
    // made of dots, which is what the fall reveals
    const handEnd = this.redKeys[2]![0];
    const lens = 0.36 * smoothstep(handEnd - 0.15, handEnd + 0.35, t);
    if (lens > 0) {
      c.save();
      c.beginPath(); c.arc(CR.x, CR.y, R - 2, 0, Math.PI * 2); c.clip();
      c.beginPath(); c.arc(CB.x, CB.y, R - 2, 0, Math.PI * 2);
      c.fillStyle = ink('both', lens); c.fill();
      c.restore();
    }
    c.restore();
    this.art.upload();

    // ---- the fall: screen the art at the magnified sheet scale, fibre on the way through
    const u = this.fall.u;
    u.art!.value = this.art.texture;
    (u.anchor!.value as THREE.Vector2).set(anchor.x, anchor.y);
    (u.target!.value as THREE.Vector2).set(this.P.x, this.P.y);
    u.z!.value = z; u.rot!.value = rot;
    u.k!.value = smoothstep(1.4, 5, z);
    u.fibre!.value = smoothstep(1.6, 4, z) * (1 - smoothstep(9, 20, z));
    const lw = this.s2.rowWidths[0]!;
    (u.knock!.value as THREE.Vector4).set(LX - 30, LY - SIZE * 1.05, LX + lw + 40, LY + SIZE * 0.4);
    u.knockK!.value = smoothstep(2, 5, z);
    this.fall.render(renderer, out);

    // ---- the lyric, not zoomed
    const tc = this.text.ctx;
    this.text.clear();
    const l2on = t >= this.l2.words[0]!.start - 0.4;
    const out1 = clamp((t - (this.l2.words[0]!.start - 0.4)) / 0.5);
    if (out1 < 1) drawSetLine(tc, this.s1, LX, LY - 60 * ease.inCubic(out1), t, { density: 1 - out1, sketch: 0.4 });
    if (l2on) this.drawLine2(tc, t);
    comp.draw(renderer, this.text.upload(), out, { mode: 'add' });

    // the sheet goes in: a roller streak that fades; marks print on the first beat
    const firstBeat = audio.beats[0] ?? 0.9;
    return {
      streak: 1 - smoothstep(0, 1.6, t),
      marks: smoothstep(firstBeat, firstBeat + 0.06, t) * (1 - smoothstep(0.1, 0.5, fp)),
      crop: smoothstep(0.1, 0.8, t) * (1 - smoothstep(0.1, 0.5, fp)),
      screen: 0.55 * (1 - smoothstep(1.2, 3, z)),
    };
  }

  /** "We tumble down to wonderland": tumble letter by letter, wonderland in plum out of the moiré. */
  drawLine2(c: CanvasRenderingContext2D, t: number) {
    const s = this.s2;
    for (const sw of s.words) {
      const w = sw.word, x = LX + sw.x, y = LY;
      const p = Lyrics.wordProgress(w, t);
      if (/tumble/i.test(w.w)) this.tumbleWord(c, w, sw.runs[0]!.family, x, y, t);
      else if (/wonderland/i.test(w.w)) {
        const fam = F.display('mid', 700);
        if (p <= 0) { sketch(c, w.w, fam, x, y, t, w.start); continue; }
        // plum from a thin tint (the screens beat into rosettes) to solid ink
        c.font = font(fam, SIZE * lerp(0.94, 1, ease.outCubic(p)));
        c.fillStyle = ink('both', lerp(0.28, 1, ease.inQuad(clamp(p * 1.15))));
        c.fillText(w.w, x, y);
      } else {
        if (p <= 0) { sketch(c, w.w, sw.runs[0]!.family, x, y, t, w.start); continue; }
        c.save(); c.beginPath(); c.rect(x - 20, y - SIZE * 1.1, sw.w * p + 20, SIZE * 1.6); c.clip();
        drawWord(c, sw, x, y, SIZE, 'red', null);
        c.restore();
      }
    }
  }

  tumbleWord(c: CanvasRenderingContext2D, w: Word, fam: string, x: number, y: number, t: number) {
    const chars = Array.from(w.w), n = chars.length;
    c.font = font(fam, SIZE);
    chars.forEach((ch, i) => {
      const ti = lerp(w.start, w.end, i / n);
      const gx = x + glyphX(w.w, i, fam, SIZE);
      if (t < ti) {
        if (t > ti - 0.5) { c.fillStyle = ink('graphite', 0.4 * clamp((t - (ti - 0.5)) / 0.4)); c.fillText(ch, gx, y); }
        return;
      }
      // each letter, once inked, falls a little and turns, then settles askew (spring)
      const a = clamp((t - ti) / 0.7);
      const settle = 1 - Math.exp(-5 * a) * Math.cos(9 * a);
      const dir = i % 2 === 0 ? 1 : -1;
      c.save();
      c.translate(gx + SIZE * 0.25, y - SIZE * 0.3);
      c.rotate(dir * (0.05 + 0.025 * i) * settle);
      c.translate(0, (8 + 7 * i) * settle);
      c.fillStyle = ink('red', 0.85);
      c.fillText(ch, -SIZE * 0.25, SIZE * 0.3);
      c.restore();
    });
  }
}

function sketch(c: CanvasRenderingContext2D, text: string, fam: string, x: number, y: number, t: number, start: number) {
  if (t < start - 0.4) return;
  c.font = font(fam, SIZE);
  c.fillStyle = ink('graphite', 0.4 * clamp((t - (start - 0.4)) / 0.4));
  c.fillText(text, x, y);
}

/** Catmull-Rom through points (a hand's smooth path between waypoints). */
function catmull(ps: V2[], seg = 16): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < ps.length - 1; i++) {
    const p0 = ps[Math.max(0, i - 1)]!, p1 = ps[i]!, p2 = ps[i + 1]!, p3 = ps[Math.min(ps.length - 1, i + 2)]!;
    for (let j = 0; j < seg; j++) {
      const u = j / seg, u2 = u * u, u3 = u2 * u;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  out.push(ps[ps.length - 1]!);
  return out;
}
