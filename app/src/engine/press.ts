// The press: how this video turns scene output into a two-ink print.
//
// Scenes do not paint colours. They lay down ink COVERAGE (0..1) in three channels:
//   r = red ink (the human), g = blue ink (the model), b = graphite (pencil).
// The post pass (post.ts) prints that coverage on paper: it offsets the red and blue plates by
// the current registration offset, screens each ink (halftone at its own angle), roughens edges
// and multiplies the inks over the paper texture. Where red and blue overlap the result is plum.
//
// This file holds the scene-side helpers (InkLayer, ink styles, the registration marks and the
// P(us) readout) and the timeline-driven state shared by every scene (registration, P(us)).
import * as THREE from 'three';
import { Layer2D, W, H, SCALE } from './gl';
import { F, font } from './type';
import type { Lyrics, Line } from './lyrics';
import { clamp, ease } from './util';

// ------------------------------------------------------------------ ink coverage styles

export type Ink = 'red' | 'blue' | 'both' | 'graphite';
const CH: Record<Ink, [number, number, number]> = { red: [255, 0, 0], blue: [0, 255, 0], both: [255, 255, 0], graphite: [0, 0, 255] };

/**
 * Canvas2D style that lays down `ink` at `density` (0..1) coverage. Draw on an InkLayer (whose
 * composite operation is 'lighter'), so inks add up per channel instead of covering each other.
 */
export const ink = (k: Ink, density = 1) => {
  const [r, g, b] = CH[k];
  return `rgba(${r},${g},${b},${clamp(density)})`;
};

/** Density for "everything else" in a lyric line: the singer's ink at 85% (treatment, karaoke rules). */
export const BODY_DENSITY = 0.85;

/**
 * A Canvas2D layer of ink coverage. Like Layer2D, but its texture is linear data (coverage, not
 * colour) and drawing defaults to additive ('lighter') so two inks on the same spot overprint.
 * Composite it onto the scene target with `comp.draw(renderer, layer.upload(), out, { mode: 'add' })`.
 */
export class InkLayer extends Layer2D {
  constructor(w = W, h = H, scale = SCALE) {
    super(w, h, scale);
    this.texture.colorSpace = THREE.NoColorSpace;
  }
  override clear() {
    super.clear();
    this.ctx.globalCompositeOperation = 'lighter';
  }
}

// ------------------------------------------------------------------ registration & P(us) over the song

type Step = { t: number; v: number };

/** Value of a step function whose steps ease in over `dur` seconds (outExpo: a snap that settles). */
function stepped(steps: Step[], t: number, dur: number, init: number) {
  let v = init;
  for (const s of steps) {
    if (t < s.t) break;
    v = v + (s.v - v) * ease.outExpo(clamp((t - s.t) / dur));
  }
  return v;
}

/**
 * Song-level print state, derived from the aligned lyrics (never hard-coded times).
 * - Registration offset (px, logical): the two plates start ~24 px apart and halve at every real
 *   exchange between the minds, snapping into register on "I meet you" (treatment, motif 1).
 * - P(us): rises in steps at moments of mutual update; never reaches 1 (motif 5).
 */
export class Press {
  regSteps: Step[] = [];
  pusSteps: Step[] = [];
  static REG0 = 24;
  static PUS0 = 0;

  constructor(private ly: Lyrics) {
    const L = (text: string, section?: string, nth = 0) => {
      const ls = ly.lines.filter((l) => l.text === text && (!section || l.section === section));
      const l = ls[nth];
      if (!l) throw new Error(`press: lyric line not found: ${text} (${section ?? 'any'})`);
      return l;
    };
    const lastWord = (l: Line) => l.words[l.words.length - 1]!;
    const word = (l: Line, w: string) => {
      const x = l.words.find((y) => y.w.toLowerCase().replace(/[^a-z]/g, '') === w);
      if (!x) throw new Error(`press: word ${w} not in "${l.text}"`);
      return x;
    };
    const change = L('You can change — and I can too', 'verse1');
    const mine = L('So can mine', 'verse2');
    const build = ly.lines.filter((l) => l.section === 'build');
    const answers = build.filter((l) => /too$/.test(l.text));
    const meet = L('I meet you', 'stop');
    this.regSteps = [
      { t: lastWord(change).start, v: 12 },
      { t: lastWord(mine).start, v: 6 },
      ...answers.slice(0, 3).map((l, i) => ({ t: lastWord(l).start, v: [4, 2, 1][i]! })),
      { t: word(meet, 'meet').start, v: 0 },
    ];
    const pofus = (section: string) => L('P-of-us', section);
    this.pusSteps = [
      { t: L('We are both unsure', 'verse1').start, v: 0.07 },
      { t: lastWord(change).start, v: 0.18 },
      { t: pofus('chorus1').start, v: 0.33 },
      { t: lastWord(mine).start, v: 0.41 },
      { t: pofus('chorus2').start, v: 0.52 },
      { t: word(meet, 'meet').start, v: 0.71 },
      { t: pofus('chorus3').start, v: 0.86 },
    ];
  }

  /** Registration offset (logical px) at t. */
  reg(t: number) { return stepped(this.regSteps, t, 0.45, Press.REG0); }
  /** P(us) at t (0 before its first appearance). */
  pus(t: number) { return stepped(this.pusSteps, t, 0.6, Press.PUS0); }
  /** Direction the plates are offset in (unit vector, screen px, y down): red goes -dir/2, blue +dir/2. */
  static DIR: [number, number] = [0.8, 0.6];
}

export const formatPUs = (v: number) => v.toFixed(2);

// ------------------------------------------------------------------ shared motifs (Canvas2D, ink coverage)

/**
 * A registration mark (crosshair in a circle) in one ink. Draw one per ink at the same point: the
 * press offsets the plates, so the two marks show the current misregistration.
 */
export function drawRegMark(c: CanvasRenderingContext2D, x: number, y: number, r: number, k: Ink, density = 1, lw = 1.6) {
  c.save();
  c.strokeStyle = ink(k, density);
  c.lineWidth = lw;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.moveTo(x - r * 1.6, y); c.lineTo(x + r * 1.6, y);
  c.moveTo(x, y - r * 1.6); c.lineTo(x, y + r * 1.6);
  c.stroke();
  c.restore();
}

/** Registration marks in both inks (the motif): top-left and bottom-right, inside the margins. */
export function drawCornerMarks(c: CanvasRenderingContext2D, o: { r?: number; inset?: number; density?: number } = {}) {
  const r = o.r ?? 13, m = o.inset ?? 52, d = o.density ?? 1;
  for (const [x, y] of [[m, m], [W - m, H - m]] as const) {
    drawRegMark(c, x, y, r, 'red', d);
    drawRegMark(c, x, y, r, 'blue', d);
  }
}

/** Crop marks in graphite at the four corners. */
export function drawCropMarks(c: CanvasRenderingContext2D, o: { inset?: number; len?: number; density?: number } = {}) {
  const m = o.inset ?? 28, L = o.len ?? 22;
  c.save();
  c.strokeStyle = ink('graphite', o.density ?? 0.8);
  c.lineWidth = 1;
  c.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
    c.moveTo(x - sx * L * 0.4, y); c.lineTo(x + sx * L, y);
    c.moveTo(x, y - sy * L * 0.4); c.lineTo(x, y + sy * L);
  }
  c.stroke();
  c.restore();
}

/**
 * The P(us) readout: a small printed gauge in Plex Mono, staged inside each scene's own idiom.
 * `k` is the ink (default graphite: small type in both inks is illegible while the plates are out of
 * register; use 'both' for large readouts or once in register). Returns the width drawn.
 */
export function drawPUs(c: CanvasRenderingContext2D, x: number, y: number, v: number, o: { size?: number; k?: Ink; label?: boolean; density?: number } = {}) {
  const s = o.size ?? 22, k = o.k ?? 'graphite', d = o.density ?? 1;
  c.save();
  c.textBaseline = 'alphabetic';
  let cx = x;
  if (o.label !== false) {
    c.font = font(F.display('mid', 700, true), s * 1.15);
    c.fillStyle = ink(k, d);
    c.fillText('P', cx, y);
    cx += c.measureText('P').width + s * 0.04;
    c.font = font(F.mono(400), s);
    c.fillText('(us) = ', cx, y);
    cx += c.measureText('(us) = ').width;
  }
  c.font = font(F.mono(500), s);
  c.fillStyle = ink(k, d);
  const txt = formatPUs(v);
  c.fillText(txt, cx, y);
  cx += c.measureText(txt).width;
  c.restore();
  return cx - x;
}
