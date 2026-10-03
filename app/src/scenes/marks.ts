// marks — a body, a training history (docs/TREATMENT.md "marks"). Split page: red on the left, blue
// on the right, a graphite fold down the middle.
// - "I have a body, skin and breath": one red contour that breathes on the half-notes.
// - "A childhood, memory, fear and depth": it becomes a door frame with pencil height marks of a
//   growing child, each with a hand-written year, inked one per beat.
// - "You have a training history": the blue training log, checkpoint marks stepping down a loss curve.
// - "A different kind of memory": the two records side by side at the same scale; they rhyme.
// - "I won't pretend our inner lives / Are somehow built the same inside": two cut-aways, a loose red
//   sketch and a blue exploded tensor stack, deliberately non-matching, a hand-drawn ≠ between them.
// - "…test what you believe / …leave / An old prediction far behind": the blue curve takes a new dot
//   and re-fits; the old fit stays as a ghost and slides left, left behind.
// - "So can mine": the door frame gets a new mark above the others; the old frame ghosts the same way.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink, drawPUs } from '../engine/press';
import type { Line } from '../engine/lyrics';
import { F, font } from '../engine/type';
import { strokeText, drawStrokeText, type StrokeText } from '../engine/stroke';
import { clamp, ease, lerp, prog, smoothstep, mulberry32, type V2 } from '../engine/util';
import { setLine, drawSetLine, currentLine, wordIn, type SetLine } from './_karaoke';
import { makeStroke, tremor, drawPen, drawPlotter, resample } from './_pen';

const LX = 150, LY = 205, SIZE = 76;
const CX = 520, CY = 640;                                  // the red side
const DL = 410, DR = 630, DT = 340, DB = 935;              // the door frame
const AX = 1170, AY = 905, AW = 540, AH = 520;             // the blue training log
const YEARS = ['1994', '1996', '1998', '2000', '2003', '2006', '2009'];
const MARK_Y = (i: number) => DB - 70 - i * 62;
const loss = (u: number) => 0.1 + 0.84 * Math.exp(-4.3 * u) + 0.018 * Math.sin(u * 37);
const CKPT = [0.08, 0.18, 0.28, 0.38, 0.5, 0.62, 0.74];

export default class Marks extends Scene {
  layer = new InkLayer();
  lines: Line[] = [];
  sets = new Map<Line, SetLine>();
  years: StrokeText[] = [];
  now!: StrokeText;
  cutRed: V2[][] = [];

  override init() {
    const { lyrics } = this.ctx;
    this.lines = lyrics.inSection('verse2');
    for (const l of this.lines) this.sets.set(l, setLine(l, SIZE, { maxWidth: 1620 }));
    this.years = YEARS.map((y) => strokeText(y, 'hscript', 26));
    this.now = strokeText('now', 'hscript', 30);
    const rnd = mulberry32(17);
    for (let i = 0; i < 6; i++) {
      const r0 = 40 + i * 28, ph = rnd() * 6;
      this.cutRed.push(Array.from({ length: 90 }, (_, j) => {
        const a = (j / 89) * Math.PI * 2.1, r = r0 * (1 + 0.12 * Math.sin(3 * a + ph) + 0.06 * Math.sin(7 * a));
        return { x: CX + Math.cos(a) * r * 1.1, y: CY + Math.sin(a) * r * 0.9 };
      }));
    }
  }

  /** The red contour: an organic closed shape that breathes, morphing (k) into the door frame. */
  contour(t: number, beat: number, k: number): V2[] {
    const breathe = 1 + 0.07 * Math.sin(Math.PI * beat) * (1 - k);
    return Array.from({ length: 241 }, (_, i) => {
      // (starts at the bottom: when the bottom edge is dropped for the door, nothing bridges the gap)
      const a = Math.PI / 2 + (i / 240) * Math.PI * 2;
      const r = 165 * breathe * (1 + 0.08 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a - 0.5));
      const blob = { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
      // the same angle on the door's rectangle (ray from the centre)
      const dx = Math.cos(a), dy = Math.sin(a);
      const sx = dx > 0 ? (DR - CX) / dx : dx < 0 ? (DL - CX) / dx : Infinity;
      const sy = dy > 0 ? (DB - CY) / dy : dy < 0 ? (DT - CY) / dy : Infinity;
      const s = Math.min(sx, sy);
      const door = { x: CX + dx * s, y: CY + dy * s };
      return { x: lerp(blob.x, door.x, k), y: lerp(blob.y, door.y, k) };
    });
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, press, audio } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    const L = this.lines;
    const beatOf = (x: number) => audio.beatAt(x);

    // the fold
    c.strokeStyle = ink('graphite', 0.55); c.lineWidth = 1; c.setLineDash([2, 6]);
    c.beginPath(); c.moveTo(960, 300 - 200 * (1 - prog(t, this.ctx.start, this.ctx.start + 0.8))); c.lineTo(960, 1000); c.stroke(); c.setLineDash([]);

    // the cut-aways take the page for two lines; the records come back after them
    const cutIn = L[4] ? smoothstep(L[4].words[0]!.start - 0.2, L[4].words[0]!.start + 0.4, t) : 0;
    const cutOut = L[6] ? smoothstep(L[6].words[0]!.start - 0.4, L[6].words[0]!.start + 0.1, t) : 0;
    const cut = cutIn * (1 - cutOut), rec = 1 - 0.85 * cut;

    // ---- red: the contour, the door, the height marks
    const kDoor = L[1] ? ease.inOutCubic(prog(t, L[1].words[0]!.start, (wordIn(L[1], 'childhood') ?? L[1].words[1]!).end)) : 0;
    const drawn = prog(t, L[0]!.words[0]!.start, (wordIn(L[0], 'body') ?? L[0]!.words[3]!).end, ease.inOutQuad);
    const mine = wordIn(L[9], 'mine');
    const ghostK = mine ? ease.outCubic(prog(t, mine.start, mine.end + 1.2)) : 0;
    const outline = this.contour(t, f.beat, kDoor);
    const doorPath = (pts: V2[], dx: number, d: number) => {
      // once it is a door, its bottom edge goes (a frame, not a box)
      const keep = kDoor > 0.9 ? pts.filter((p) => p.y < DB - 3) : pts;
      const st = makeStroke(tremor(keep.map((p) => ({ x: p.x + dx, y: p.y })), 1.2, 160, 2));
      drawPen(c, st, st.total * drawn, { widthAt: () => 3.6, density: d });
    };
    if (ghostK > 0) doorPath(outline, -110 * ghostK, 0.3 * (1 - 0.5 * ghostK) * rec);
    doorPath(outline, 0, rec);
    // height marks, one per beat from "memory"
    const mem = wordIn(L[1], 'memory');
    if (mem && kDoor >= 1) {
      const b0 = Math.ceil(beatOf(mem.start));
      YEARS.forEach((_, i) => {
        const ti = audio.timeOfBeat(b0 + i), p = clamp((t - ti) / 0.12);
        if (p <= 0) return;
        const y = MARK_Y(i);
        c.strokeStyle = ink('red', rec); c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(DL + 8, y); c.lineTo(DL + 8 + 110 * p, y + 2); c.stroke();
        const st = this.years[i]!;
        c.save(); c.translate(DL + 130, y + 8); c.strokeStyle = ink('red', 0.85 * rec); c.lineWidth = 1.8; c.lineJoin = 'round';
        drawStrokeText(c, st, st.total * clamp((t - ti) / 0.35)); c.restore();
      });
    }
    // "So can mine": a new mark above the others
    if (mine && t > mine.start) {
      const y = MARK_Y(YEARS.length) - 14, p = ease.outCubic(prog(t, mine.start, mine.start + 0.25));
      c.strokeStyle = ink('red', 1); c.lineWidth = 3.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(DL + 8, y); c.lineTo(DL + 8 + 130 * p, y + 1); c.stroke();
      c.save(); c.translate(DL + 150, y + 9); c.strokeStyle = ink('red', 1); c.lineWidth = 2.2;
      drawStrokeText(c, this.now, this.now.total * prog(t, mine.start + 0.1, mine.end + 0.3)); c.restore();
    }

    // ---- blue: the training log
    const hist = wordIn(L[2], 'training') ?? L[2]?.words[2];
    const logP = hist ? prog(t, hist.start - 0.3, hist.start + 0.5, ease.outCubic) : 0;
    const P = (u: number, v: number) => ({ x: AX + u * AW, y: AY - v * AH });
    if (logP > 0) {
      c.strokeStyle = ink('blue', rec); c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(AX, AY - AH * logP); c.lineTo(AX, AY); c.lineTo(AX + AW * logP, AY); c.stroke();
      c.font = font(F.mono(400), 15); c.fillStyle = ink('blue', 0.8 * rec);
      c.fillText('loss', AX - 44, AY - AH + 14); c.fillText('step', AX + AW - 34, AY + 26);
      const leave = wordIn(L[7], 'leave'), behind = wordIn(L[8], 'behind') ?? L[8]?.words[L[8].words.length - 1];
      const kRefit = leave && behind ? ease.inOutCubic(prog(t, leave.start, behind.end)) : 0;
      const tNew = (wordIn(L[7], 'new') ?? L[7]?.words[2])?.start ?? Infinity;
      const refit = (u: number) => loss(u) + 0.22 * smoothstep(0.55, 0.98, u);
      const curve = (fn: (u: number) => number, u1: number) => Array.from({ length: 81 }, (_, i) => P((u1 * i) / 80, fn((u1 * i) / 80)));
      const plotted = prog(t, hist!.start, L[2]!.end, ease.inOutQuad);
      if (kRefit > 0) {
        // the old fit stays as a ghost and slides left, left behind
        const g = curve(loss, 0.98).map((p) => ({ x: p.x - 140 * kRefit, y: p.y }));
        drawPlotter(c, makeStroke(g), Infinity, { w: 2, density: 0.3 * (1 - 0.4 * kRefit) });
      }
      const main = makeStroke(curve((u) => lerp(loss(u), refit(u), kRefit), 0.98));
      drawPlotter(c, main, main.total * plotted, { w: 2.4, density: rec });
      // checkpoints, one per beat from "history"
      const b0 = Math.ceil(beatOf((wordIn(L[2], 'history') ?? hist!).start));
      CKPT.forEach((u, i) => {
        const ti = audio.timeOfBeat(b0 + i);
        if (t < ti) return;
        const p = P(u, loss(u));
        c.strokeStyle = ink('blue', rec); c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(p.x, p.y - 14); c.lineTo(p.x, p.y + 14); c.stroke();
        c.fillStyle = ink('blue', rec); c.beginPath(); c.arc(p.x, p.y, 4.5, 0, Math.PI * 2); c.fill();
        c.font = font(F.mono(400), 14); c.fillStyle = ink('blue', 0.85 * rec);
        c.fillText(`${(i + 1) * 2}k`, p.x - 10, p.y - 22);
      });
      // a new dot lands off the curve
      if (t > tNew - 0.35) {
        const k = clamp((t - (tNew - 0.35)) / 0.35), q = P(0.95, 0.34);
        c.fillStyle = ink('both', clamp(k * 1.5));
        c.beginPath(); c.arc(q.x, q.y - (1 - ease.inQuad(k)) * 220, 7, 0, Math.PI * 2); c.fill();
      }
    }

    // "A different kind of memory": the two records at the same scale, faint guides across the fold
    if (L[3] && t > L[3].words[0]!.start) {
      const a = smoothstep(L[3].words[0]!.start, L[3].words[0]!.start + 0.6, t) * (1 - cut);
      c.strokeStyle = ink('graphite', 0.4 * a); c.lineWidth = 1; c.setLineDash([3, 7]);
      c.beginPath();
      for (let i = 0; i < YEARS.length; i++) { const y = MARK_Y(i); c.moveTo(DR + 90, y); c.lineTo(AX - 20, y); }
      c.stroke(); c.setLineDash([]);
    }

    // ---- the cut-aways, deliberately non-matching, and the ≠
    if (cut > 0) {
      const p5 = L[4] ? prog(t, L[4].words[0]!.start, L[4].end, ease.inOutQuad) : 0;
      this.cutRed.forEach((pts, i) => {
        const st = makeStroke(tremor(resample(pts, 3), 1.5, 80, 30 + i));
        drawPen(c, st, st.total * clamp(p5 * 1.4 - i * 0.08), { widthAt: () => 2.6, density: cut });
      });
      const p6 = L[5] ? prog(t, L[5].words[0]!.start - 0.6, L[5].end, ease.inOutQuad) : 0;
      for (let i = 0; i < 5; i++) {
        const q = clamp(p6 * 1.3 - i * 0.12);
        if (q <= 0) continue;
        const ox = 1290 + i * 22, oy = 420 + i * 92, w = 280, dx = 70, dy = -40;
        const pts = [{ x: ox, y: oy }, { x: ox + w, y: oy }, { x: ox + w + dx, y: oy + dy }, { x: ox + dx, y: oy + dy }, { x: ox, y: oy }];
        const st = makeStroke(pts);
        drawPlotter(c, st, st.total * q, { w: 2, density: cut });
        if (q >= 1) { c.font = font(F.mono(400), 13); c.fillStyle = ink('blue', 0.8 * cut); c.fillText(`layer ${i}  4096×4096`, ox + w + dx + 12, oy + dy + 6); }
      }
      const ne = L[4] ? prog(t, L[4].end - 0.3, L[4].end + 0.4) : 0;
      if (ne > 0) {
        c.strokeStyle = ink('red', cut); c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(915, 615); c.lineTo(915 + 90 * ne, 618); c.moveTo(915, 665); c.lineTo(915 + 90 * ne, 662);
        if (ne >= 1) { c.moveTo(985, 575); c.lineTo(935, 705); }
        c.stroke();
      }
    }

    const cur = currentLine(this.lines, t);
    if (cur) drawSetLine(c, this.sets.get(cur)!, LX, LY, t);
    // P(us), staged as a note on the door frame
    const v = press.pus(t);
    c.save(); c.translate(DR + 26, DT + 30); c.rotate(-0.05);
    drawPUs(c, 0, 0, v, { size: 18, density: rec });
    c.restore();

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return { marks: 1, crop: 0.6 };
  }
}
