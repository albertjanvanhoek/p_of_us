// loop ×3 — different minds, same learning loop (the chorus; docs/TREATMENT.md "loop").
// Two loop glyphs: red drawn by hand (egg-shaped, stations hand-lettered outside), blue plotted
// (exact circle, stations in mono inside). Their dots step one station per beat
// (guess → world → error → update). The escalation over the three choruses (params.n):
//   1: loops apart, dots two beats out of phase, the P(us) slam double-printed with an offset;
//   2: loops closer, rims touch (a sliver of plum), dots closer in phase, the slam tighter;
//   3: in register: one plum ring, dots in phase, the halftone moiré blooms full frame on the kick,
//      "Not the same / and not alone", the ghosts of every update, the slam lands as one clean print.
// Per line: arrows of each ink cross into the other loop on "change"; a neuron sketch and a weight
// matrix on "Neurons here and weights in you"; fit curves converge on "closer to true"; a balance on
// "We weigh the doom"; the P(us) slam; "Me learning you" hand-lettered red with "you" plotted blue.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, W, H } from '../engine/gl';
import { InkLayer, ink, drawPUs, type Ink } from '../engine/press';
import type { Line, Word } from '../engine/lyrics';
import { F, font } from '../engine/type';
import { strokeText, drawStrokeText, writtenLength, type StrokeText } from '../engine/stroke';
import { clamp, ease, lerp, prog, smoothstep, mulberry32, type V2 } from '../engine/util';
import { setLine, drawSetLine, key, type SetLine } from './_karaoke';
import { makeStroke, resample, tremor, arc, drawPen, drawPlotter, type Stroke } from './_pen';

const STATIONS = ['guess', 'world', 'error', 'update'];
const R = 190, CY = 610;
const LYR_X = 150, LYR_Y = 205, LYR_SIZE = 74;
/** Loop centres per chorus: apart, rims touching, one ring. */
const CENTRES: Record<number, [number, number]> = { 1: [610, 1310], 2: [770, 1150], 3: [960, 960] };
/** Extra offset of the slam's blue pass (px) on top of the press's registration: tighter each chorus. */
const SLAM_OFF: Record<number, number> = { 1: 26, 2: 10, 3: 0 };

const findWord = (l: Line | undefined, w: string, nth = 0) => l?.words.filter((x) => key(x.w) === w)[nth];

export default class Loop extends Scene {
  n = 1;
  art = new InkLayer();
  text = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  redLoop!: Stroke;
  blueLoop!: Stroke;
  redLabels: StrokeText[] = [];
  neuron: Stroke[] = [];
  me = new Map<Line, { a: StrokeText; b: StrokeText; ta: [number, number][]; tb: [number, number][] }>();
  bloom = new FSPass(/* glsl */ `
    uniform float k, kick; uniform vec4 knock;
    void main() {
      vec2 px = vec2(vUv.x, 1.0 - vUv.y) * vec2(${W}.0, ${H}.0);
      float kx = smoothstep(knock.x - 80.0, knock.x, px.x) * (1.0 - smoothstep(knock.z, knock.z + 80.0, px.x));
      float ky = smoothstep(knock.y - 60.0, knock.y, px.y) * (1.0 - smoothstep(knock.w, knock.w + 60.0, px.y));
      // both inks as a tint: the two screens beat into rosettes (the moiré is "us": made of both, owned by neither)
      float d = k * (0.10 + 0.15 * kick) * (1.0 - kx * ky);
      fragColor = vec4(d, d, 0.0, 1.0);
    }`, { k: { value: 0 }, kick: { value: 0 }, knock: { value: new THREE.Vector4() } });

  override init() {
    const { lyrics, params } = this.ctx;
    this.n = params.n ?? 1;
    const secs = this.n === 1 ? ['chorus1', 'post1'] : [`chorus${this.n}`];
    this.lines = secs.flatMap((s) => lyrics.inSection(s));
    for (const l of this.lines) this.sets.set(l, setLine(l, LYR_SIZE, { maxWidth: W - 2 * LYR_X }));
    // the red loop: a hand-drawn egg, started at the top and closed with a little overshoot
    const egg = Array.from({ length: 241 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 240) * Math.PI * 2.04;
      const r = R * (1 + 0.045 * Math.sin(a + 0.6) + 0.025 * Math.sin(2 * a - 0.4));
      return { x: Math.cos(a) * r, y: Math.sin(a) * r * 1.03 };
    });
    this.redLoop = makeStroke(tremor(resample(egg, 3), 1.4, 180, 11));
    this.blueLoop = makeStroke(arc(0, 0, R, -Math.PI / 2, Math.PI * 1.5, 3));
    this.redLabels = STATIONS.map((s) => strokeText(s, 'hscript', 34));
    // the neuron: soma, branching dendrites, an axon (hand strokes around the origin)
    const rnd = mulberry32(7);
    const branch = (x: number, y: number, a: number, len: number, depth: number): void => {
      const pts: V2[] = [{ x, y }];
      let px = x, py = y;
      for (let i = 1; i <= 6; i++) { a += (rnd() - 0.5) * 0.35; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6; pts.push({ x: px, y: py }); }
      this.neuron.push(makeStroke(resample(pts, 2)));
      if (depth > 0) { branch(px, py, a - 0.5, len * 0.55, depth - 1); branch(px, py, a + 0.45, len * 0.5, depth - 1); }
    };
    for (const a of [-2.4, -1.9, -1.2, -0.7, 2.6]) branch(0, 0, a, 34, 1);
    this.neuron.push(makeStroke(resample([{ x: 8, y: 2 }, { x: 60, y: 10 }, { x: 110, y: 4 }, { x: 150, y: 12 }], 2)));
    // "Me learning you": the red hand writes "Me learning", the plotter plots "you"
    for (const l of this.lines.filter((x) => /^me learning you$/i.test(x.text))) {
      const a = strokeText('Me learning', 'hscript', 66), b = strokeText('you', 'sans', 60);
      this.me.set(l, { a, b, ta: charTimes('Me learning', l.words.slice(0, 2)), tb: charTimes('you', l.words.slice(2)) });
    }
  }

  /** Loop centres at t: each chorus slides in from the previous chorus's layout over its first bar. */
  centres(t: number): [number, number] {
    const [a1, b1] = CENTRES[this.n]!, [a0, b0] = CENTRES[Math.max(1, this.n - 1)]!;
    const k = ease.inOutCubic(prog(t, this.ctx.start, this.ctx.start + 1.8));
    return [lerp(a0, a1, k), lerp(b0, b1, k)];
  }

  line(text: string, nth = 0) { return this.lines.filter((l) => l.text.startsWith(text))[nth]; }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, audio, press } = this.ctx;
    const t = f.t, n = this.n;
    const beatLen = audio.timeOfBeat(Math.floor(f.beat) + 1) - audio.timeOfBeat(Math.floor(f.beat));
    const [lx, bx] = this.centres(t);

    // the line on screen: karaoke lines show their pencil sketch 0.4 s early; staged lines (the slam,
    // the hand-lettering) start on the word
    const staged = (l: Line) => key(l.text) === 'p-of-us' || this.me.has(l);
    const cur = [...this.lines].reverse().find((l) => t >= l.words[0]!.start - (staged(l) ? 0 : 0.4));

    // ---- chorus 3: the moiré bloom (both inks as a tint under everything, pulsing with the kick)
    const bloomK = n === 3 ? smoothstep(this.ctx.start, this.ctx.start + 2.5, t) * (1 - smoothstep(this.ctx.end - 1.5, this.ctx.end, t)) : 0;
    this.bloom.u.k!.value = bloomK;
    this.bloom.u.kick!.value = f.a.kick;
    // paper left unprinted behind the lyric (just its width)
    const curW = cur && !staged(cur) ? (/^not the same/i.test(cur.text) ? 900 : Math.max(...this.sets.get(cur)!.rowWidths)) : 0;
    const rows = cur && /^not the same/i.test(cur.text) ? 2 : cur && !staged(cur) ? this.sets.get(cur)!.rows : 0;
    if (curW > 0) (this.bloom.u.knock!.value as THREE.Vector4).set(LYR_X - 10, LYR_Y - 80, LYR_X + curW + 10, LYR_Y + 25 + (rows - 1) * LYR_SIZE * 1.05);
    else (this.bloom.u.knock!.value as THREE.Vector4).set(-1e4, -1e4, -1e4, -1e4);
    this.bloom.render(renderer, out);

    const c = this.art.ctx;
    this.art.clear();
    const draw = prog(t, this.ctx.start, this.ctx.start + 2 * beatLen, ease.outCubic);

    // ---- "You change me, I can change you too": arrows cross into the other loop, loops wobble, dots step closer
    const ch = this.line('You change me'), learn = this.line('You learn from me');
    const w1 = findWord(ch, 'change', 0), w2 = findWord(ch, 'change', 1);
    const l1 = findWord(learn, 'learn', 0), l2 = findWord(learn, 'learn', 1);
    const wob = (w?: Word) => (w && t > w.end ? 0.07 * Math.exp(-4 * (t - w.end)) * Math.sin(14 * (t - w.end)) : 0);
    const redWob = wob(w2) + wob(l2), blueWob = wob(w1) + wob(l1);
    // phase: chorus 1 starts two beats apart, each chorus one closer; "change" closes one more beat
    const ph0 = 3 - n, ph = w2 ? lerp(ph0, Math.max(0, ph0 - 1), ease.inOutCubic(prog(t, w2.start, w2.end + 0.3))) : ph0;

    // ---- the loops
    const loopDraw = (k: Ink, cx: number) => {
      c.save(); c.translate(cx, CY);
      if (k === 'red') {
        c.scale(1 + redWob, 1 - redWob * 0.6);
        drawPen(c, this.redLoop, this.redLoop.total * draw, { widthAt: (s) => 3.6 + 1.2 * Math.sin(s * 0.011 + 1), poolStart: draw > 0 ? 0.4 : 0 });
      } else {
        c.scale(1 + blueWob, 1 - blueWob * 0.6);
        drawPlotter(c, this.blueLoop, this.blueLoop.total * draw, { w: 2.8, downs: [0, this.blueLoop.total / 4, this.blueLoop.total / 2, (3 * this.blueLoop.total) / 4] });
      }
      c.restore();
    };
    loopDraw('red', lx);
    loopDraw('blue', bx);

    // ---- stations and travelling dots (one station per beat, snapping)
    const b = f.beat, snap = Math.floor(b) + ease.outExpo(clamp((b - Math.floor(b)) / 0.3));
    const dot = (cx: number, k: Ink, offset: number) => {
      const pos = snap + offset, a = -Math.PI / 2 + pos * (Math.PI / 2);
      const st = ((Math.round(pos) % 4) + 4) % 4;
      const flash = 1 - clamp((b - Math.floor(b)) / 0.9);
      // labels: red hand-lettered outside, blue mono inside
      STATIONS.forEach((name, i) => {
        const la = -Math.PI / 2 + i * (Math.PI / 2), on = i === st ? flash : 0;
        const d = (0.42 + 0.58 * on) * draw;
        if (k === 'red') {
          const lt = this.redLabels[i]!, rr = R + 46;
          c.save(); c.translate(cx + Math.cos(la) * rr - lt.width / 2, CY + Math.sin(la) * rr + 10);
          c.strokeStyle = ink('red', d); c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
          drawStrokeText(c, lt, lt.total);
          c.restore();
        } else {
          c.font = font(F.mono(500), 19); c.fillStyle = ink('blue', d);
          const tw = c.measureText(name).width, rr = R - 40;
          c.fillText(name, cx + Math.cos(la) * rr - tw / 2, CY + Math.sin(la) * rr + 7);
        }
      });
      if (draw < 1) return;
      const x = cx + Math.cos(a) * R, y = CY + Math.sin(a) * R * (k === 'red' ? 1.03 : 1);
      c.fillStyle = ink(k, 1);
      c.beginPath();
      if (k === 'red') c.ellipse(x, y, 15, 13, 0.4, 0, Math.PI * 2);
      else c.arc(x, y, 13, 0, Math.PI * 2);
      c.fill();
      if (k === 'blue') { c.strokeStyle = ink('blue', 1); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 24, y); c.lineTo(x + 24, y); c.moveTo(x, y - 24); c.lineTo(x, y + 24); c.stroke(); }
    };
    dot(lx, 'red', ph);
    dot(bx, 'blue', 0);

    // ---- arrows into the other loop
    const arrow = (w: Word | undefined, from: 'red' | 'blue') => {
      if (!w || t < w.start) return;
      const p = prog(t, w.start, w.end + 0.15, ease.outCubic);
      const fade = 1 - smoothstep(w.end + 1.6, w.end + 2.2, t);
      if (fade <= 0) return;
      const [sx, ex] = from === 'red' ? [lx + R * 0.9, bx - R * 0.35] : [bx - R * 0.9, lx + R * 0.35];
      const sy = from === 'red' ? CY - 40 : CY + 40, ey = from === 'red' ? CY - 90 : CY + 90;
      const mid = { x: (sx + ex) / 2, y: from === 'red' ? CY - 150 : CY + 150 };
      const pts = resample(bez({ x: sx, y: sy }, mid, { x: ex, y: ey }), 3);
      const st = makeStroke(from === 'red' ? tremor(pts, 1.5, 90, 21) : pts);
      const len = st.total * p;
      if (from === 'red') drawPen(c, st, len, { widthAt: () => 3.4, density: fade });
      else drawPlotter(c, st, len, { w: 2.6, density: fade });
      if (p >= 1) {
        const a = Math.atan2(ey - mid.y, ex - mid.x);
        c.strokeStyle = ink(from, fade); c.lineWidth = from === 'red' ? 3.4 : 2.6; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(ex + Math.cos(a + 2.6) * 22, ey + Math.sin(a + 2.6) * 22); c.lineTo(ex, ey); c.lineTo(ex + Math.cos(a - 2.6) * 22, ey + Math.sin(a - 2.6) * 22);
        c.stroke();
      }
    };
    arrow(w1, 'red'); arrow(w2, 'blue'); arrow(l1, 'blue'); arrow(l2, 'red');

    // ---- "Neurons here and weights in you": a neuron sketch under the red loop, a weight matrix under the blue
    const nl = this.line('Neurons here'), ways = this.line('Different ways');
    if (nl && t >= nl.start) {
      const p = prog(t, nl.words[0]!.start, nl.words[1]!.end + 0.2, ease.outCubic);
      const fade = ways ? 1 - smoothstep(ways.end, ways.end + 0.5, t) : 1;
      const nx = n === 3 ? lx - 330 : lx, mx = n === 3 ? bx + 330 : bx, sy = n === 3 ? CY : CY + R + 125;
      c.save(); c.translate(nx - 40, sy);
      c.fillStyle = ink('red', fade); c.beginPath(); c.ellipse(0, 0, 11 * p, 9 * p, 0.3, 0, Math.PI * 2); c.fill();
      for (const s of this.neuron) drawPen(c, s, s.total * p, { widthAt: () => 2, density: fade });
      c.restore();
      const wIn = findWord(nl, 'weights');
      const q = wIn ? prog(t, wIn.start, nl.end + 0.3) : 0;
      if (q > 0) {
        const rnd = mulberry32(5 + n), rows = 3, cols = 4;
        c.font = font(F.mono(400), 17); c.fillStyle = ink('blue', fade);
        for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
          if ((r * cols + k) / (rows * cols) > q) continue;
          const v = (rnd() * 2 - 1).toFixed(2);
          c.fillText(v.startsWith('-') ? v : ' ' + v, mx - 120 + k * 64, sy - 18 + r * 24);
        }
        c.strokeStyle = ink('blue', fade); c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(mx - 126, sy - 38); c.lineTo(mx - 134, sy - 38); c.lineTo(mx - 134, sy + 52); c.lineTo(mx - 126, sy + 52);
        c.moveTo(mx + 134, sy - 38); c.lineTo(mx + 142, sy - 38); c.lineTo(mx + 142, sy + 52); c.lineTo(mx + 134, sy + 52); c.stroke();
      }
    }

    // ---- "Different ways of getting closer to true": both fits converge on the same plum dots
    if (ways && t >= ways.start - 0.2) {
      const p = ease.inOutCubic(prog(t, ways.start, ways.end));
      const fade = 1 - smoothstep(ways.end + 1.2, ways.end + 1.8, t);
      const pts = [[-0.55, 0.22], [-0.27, 0.1], [0, -0.04], [0.27, -0.12], [0.55, -0.3]] as const;
      const target = (x: number) => 0.0 - 0.38 * x - 0.12 * x * x;
      for (const [cx, k] of [[lx, 'red'], [bx, 'blue']] as const) {
        const s = R * 0.62;
        c.fillStyle = ink('both', fade);
        for (const [x, y] of pts) { c.beginPath(); c.arc(cx + x * s, CY + y * s, 5.5, 0, Math.PI * 2); c.fill(); }
        const wrong = k === 'red' ? (x: number) => 0.3 - 0.05 * x + 0.3 * x * x : (x: number) => -0.32 - 0.9 * x;
        const curve = (fn: (x: number) => number) => Array.from({ length: 41 }, (_, i) => { const x = -0.65 + (1.3 * i) / 40; return { x: cx + x * s, y: CY + fn(x) * s }; });
        // the ghost of the first guess stays behind (every chart is a record of being wrong)
        c.strokeStyle = ink('graphite', 0.5 * fade); c.lineWidth = 1.2; c.setLineDash([5, 5]);
        c.beginPath(); curve(wrong).forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); c.setLineDash([]);
        const now = curve((x) => lerp(wrong(x), target(x), p));
        if (k === 'red') drawPen(c, makeStroke(tremor(now, 1.2, 60, 4)), Infinity, { widthAt: () => 3, density: fade });
        else drawPlotter(c, makeStroke(now), Infinity, { w: 2.2, density: fade });
      }
    }

    // ---- "We weigh the doom — but count this too:": a printed balance; it does not tip all the way
    const doom = this.line('We weigh the doom');
    if (doom && t >= doom.start - 0.2) {
      const p = prog(t, doom.start, doom.end, ease.inOutCubic);
      const fade = 1 - smoothstep(doom.end + 0.3, doom.end + 0.6, t);
      if (fade > 0) {
        const pusPrev = press.pus(doom.start - 0.01), pusNext = press.pus(doom.end + 2.5);
        const v = lerp(pusPrev, pusNext, p);
        const ang = -0.11 * ease.outCubic(p) + 0.03;
        const fx = 960, fy = n === 3 ? CY + R + 115 : CY + R + 85, half = 230;
        c.save(); c.globalAlpha = fade;
        c.strokeStyle = ink('graphite', 0.95); c.fillStyle = ink('graphite', 0.95); c.lineWidth = 2;
        c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx - 16, fy + 40); c.lineTo(fx + 16, fy + 40); c.closePath(); c.stroke();
        const ex = Math.cos(ang) * half, ey = Math.sin(ang) * half;
        c.beginPath(); c.moveTo(fx - ex, fy - ey); c.lineTo(fx + ex, fy + ey); c.stroke();
        for (const s of [-1, 1]) {
          const px = fx + s * ex, py = fy + s * ey;
          c.beginPath(); c.moveTo(px, py); c.lineTo(px - 46, py + 52); c.moveTo(px, py); c.lineTo(px + 46, py + 52);
          c.moveTo(px - 60, py + 52); c.quadraticCurveTo(px, py + 78, px + 60, py + 52); c.stroke();
        }
        // DOOM stamped in graphite on the left pan; P(us) ticking up on the right
        c.save(); c.translate(fx - ex, fy - ey + 40); c.rotate(-0.06);
        c.font = font(F.mono(700), 30); c.fillStyle = ink('graphite', 0.85); const dw = c.measureText('DOOM').width; c.fillText('DOOM', -dw / 2, 0);
        c.restore();
        drawPUs(c, fx + ex - 92, fy + ey + 40, v, { size: 20, k: 'both', label: true });
        c.restore();
      }
    }

    // ---- chorus 3, "Each of us updating what we know": the ghosts of every update flicker through once
    const each = this.line('Each of us');
    if (each && t >= each.start && t < each.end + 0.2) {
      const rnd = mulberry32(1000 + Math.floor(f.beat * 2));
      c.lineWidth = 1.8;
      for (let i = 0; i < 7; i++) {
        c.strokeStyle = ink(i % 2 ? 'blue' : 'red', 0.9);
        const y0 = CY - R * 0.5 + rnd() * R, a = (rnd() - 0.5) * 0.9, bb = (rnd() - 0.5) * 0.6;
        c.beginPath();
        for (let j = 0; j <= 30; j++) { const x = -0.8 + (1.6 * j) / 30; const px = 960 + x * R, py = y0 + (a * x + bb * x * x) * R; j ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke();
      }
    }
    comp.draw(renderer, this.art.upload(), out, { mode: 'add' });

    // ---- type: the lyric line, the slam, "Me learning you", "Not the same / and not alone"
    const tc = this.text.ctx;
    this.text.clear();
    let slamHit = 0;
    if (cur) {
      const next = this.lines[this.lines.indexOf(cur) + 1];
      if (key(cur.text) === 'p-of-us') slamHit = this.slam(tc, cur, next, t);
      else if (this.me.has(cur)) {
        // keep the slam of the P(us) before it under "Me learning you"
        const prev = this.lines[this.lines.indexOf(cur) - 1];
        if (prev && key(prev.text) === 'p-of-us') slamHit = this.slam(tc, prev, next, t);
        this.meLearning(tc, cur, t);
      } else if (/^not the same/i.test(cur.text)) this.notTheSame(tc, cur, t);
      else drawSetLine(tc, this.sets.get(cur)!, LYR_X, LYR_Y, t, { anticipate: 0.4 });
    }
    comp.draw(renderer, this.text.upload(), out, { mode: 'add' });

    return {
      marks: 1,
      crop: 0.6,
      screen: n === 3 ? lerp(0.55, 1, bloomK) : 0.55,
      screenPx: n === 3 ? lerp(4.5, 8, bloomK) : 4.5,
      density: 1 + 0.12 * bloomK * f.a.kick,
      zoom: 1 + 0.005 * f.a.kick + 0.012 * slamHit,
      shake: [slamHit * (n === 3 ? 0 : 5), slamHit * (n === 3 ? 0 : -3)],
    };
  }

  /** The P(us) slam: full-frame, red pass on the word, blue pass a beat later (closer to register each chorus). */
  slam(c: CanvasRenderingContext2D, l: Line, next: Line | undefined, t: number) {
    const { audio } = this.ctx;
    const t1 = l.words[0]!.start, t2 = audio.timeOfBeat(Math.round(audio.beatAt(t1)) + 1);
    const nextAfter = next && /^me learning you$/i.test(next.text) ? this.lines[this.lines.indexOf(next) + 1] : next;
    const off = nextAfter ? nextAfter.words[0]!.start - 0.35 : this.ctx.end;
    const fade = 1 - smoothstep(off - 0.15, off + 0.1, t);
    if (t < t1 || fade <= 0) return 0;
    const size = 470, fi = F.display('mid', 700, true), fr = F.display('mid', 700);
    c.font = font(fi, size); const wp = c.measureText('P').width;
    c.font = font(fr, size); const wu = c.measureText('(us)').width;
    const x0 = 960 - (wp + wu + size * 0.02) / 2, y0 = 620 + size * 0.33;
    const pass = (k: Ink, at: number, dx: number) => {
      if (t < at) return 0;
      const a = clamp((t - at) / 0.14), s = lerp(1.1, 1, ease.outExpo(a));
      c.save(); c.translate(960 + dx, 620); c.scale(s, s); c.translate(-960, -620);
      c.fillStyle = ink(k, fade);
      c.font = font(fi, size); c.fillText('P', x0, y0);
      c.font = font(fr, size); c.fillText('(us)', x0 + wp + size * 0.02, y0);
      c.restore();
      return 1 - a;
    };
    const h1 = pass('red', t1, 0);
    const h2 = pass('blue', this.n === 3 ? t1 : t2, SLAM_OFF[this.n]!);
    return Math.max(h1, h2);
  }

  meLearning(c: CanvasRenderingContext2D, l: Line, t: number) {
    const m = this.me.get(l)!;
    const gap = 26, total = m.a.width + gap + m.b.width, x0 = 960 - total / 2, y0 = 975;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.translate(x0, y0); c.strokeStyle = ink('red', 1); c.lineWidth = 3.2;
    drawStrokeText(c, m.a, writtenLength(m.a, m.ta, t));
    c.translate(m.a.width + gap, 0); c.strokeStyle = ink('blue', 1); c.lineWidth = 2.6; c.lineCap = 'butt';
    drawStrokeText(c, m.b, writtenLength(m.b, m.tb, t));
    c.restore();
  }

  /** "Not the same" set twice, once in each ink, deliberately distinct; "and not alone" once, in plum, across both. */
  notTheSame(c: CanvasRenderingContext2D, l: Line, t: number) {
    const ws = l.words, prog3 = (i: number) => clamp((t - ws[i]!.start) / Math.max(0.05, ws[i]!.end - ws[i]!.start));
    const size = LYR_SIZE, fr = F.display('red', 700), fb = F.display('blue', 700), fm = F.display('mid', 700);
    const phrase = 'Not the same';
    c.font = font(fr, size); const wr = c.measureText(phrase).width;
    const p1 = Math.min(1, (prog3(0) + prog3(1) + prog3(2)) / 3);
    const wipe = (x: number, w: number, p: number, fn: () => void) => { c.save(); c.beginPath(); c.rect(x - 20, LYR_Y - size * 1.1, (w + 40) * p, size * 1.6); c.clip(); fn(); c.restore(); };
    wipe(LYR_X, wr, p1, () => { c.font = font(fr, size); c.fillStyle = ink('red', 1); c.fillText(phrase, LYR_X, LYR_Y); });
    const x2 = LYR_X + wr + 70;
    c.font = font(fb, size); const wb = c.measureText(phrase).width;
    wipe(x2, wb, p1, () => { c.font = font(fb, size); c.fillStyle = ink('blue', 1); c.fillText(phrase, x2, LYR_Y); });
    const tail = 'and not alone';
    c.font = font(fm, size); const wt = c.measureText(tail).width;
    const p2 = Math.min(1, (prog3(3) + prog3(4) + prog3(5)) / 3);
    const xt = LYR_X + (wr + 70 + wb - wt) / 2;
    if (t > ws[3]!.start - 0.4 && p2 < 1) { c.font = font(fm, size); c.fillStyle = ink('graphite', 0.35); c.fillText(tail, xt, LYR_Y + size * 1.05); }
    wipe(xt, wt, p2, () => { c.font = font(fm, size); c.fillStyle = ink('both', 1); c.fillText(tail, xt, LYR_Y + size * 1.05); });
  }
}

/** Quadratic bezier as points. */
function bez(a: V2, m: V2, b: V2, n = 40): V2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    return { x: v * v * a.x + 2 * v * u * m.x + u * u * b.x, y: v * v * a.y + 2 * v * u * m.y + u * u * b.y };
  });
}

/** Per-char [start, end] times for a phrase from its words (chars of a word spread over the word, spaces instant). */
function charTimes(text: string, words: Word[]): [number, number][] {
  const out: [number, number][] = [];
  const toks = text.split(' ');
  toks.forEach((tok, i) => {
    const w = words[i] ?? words[words.length - 1]!;
    for (let j = 0; j < tok.length; j++) out.push([w.start + ((w.end - w.start) * j) / tok.length, w.start + ((w.end - w.start) * (j + 1)) / tok.length]);
    if (i < toks.length - 1) out.push([w.end, w.end]);
  });
  return out;
}
