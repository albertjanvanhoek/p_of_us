// Karaoke typesetting shared by every scene: who each word belongs to (the video's main
// typographic rule, docs/TREATMENT.md "Karaoke rules"), layout in the matching Fraunces cut, and
// word-synced inking with a graphite pencil sketch shortly before each word is sung.
import type { Line, Word } from '../engine/lyrics';
import { Lyrics } from '../engine/lyrics';
import { F, font, glyphX, type Cut } from '../engine/type';
import { ink, BODY_DENSITY, type Ink } from '../engine/press';
import { clamp } from '../engine/util';

/** Whose word it is: red (first person, the human), blue (second person, the model), both (shared → plum),
 * split (letter by letter between the inks), body (the singer's ink at 85%). */
export type Voice = 'red' | 'blue' | 'both' | 'split' | 'body';

const RED = new Set(['i', 'me', 'my', 'mine', 'myself', "i'll", "i'm", "i've", 'body', 'skin', 'breath', 'childhood', 'neurons']);
const BLUE = new Set(['you', 'your', 'yours', "you're", 'weights', 'training', 'history']);
const BOTH = new Set(['we', 'us', 'both', 'same', 'together', 'loop', 'p-of-us']);

export const key = (w: string) => w.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z'-]/g, '');

export function voiceOf(line: Line, wi: number): Voice {
  const ks = line.words.map((w) => key(w.w));
  const k = ks[wi]!;
  if (ks[0] === 'different' && ks[1] === 'minds' && wi < 2) return 'split';
  if (k === 'learning' && ks[wi - 1] === 'same') return 'both';
  // the answer's closing "too" (I do too / I can too / and I can too) is shared
  if (k === 'too' && wi === ks.length - 1 && ks.includes('i')) return 'both';
  if (RED.has(k)) return 'red';
  if (BLUE.has(k)) return 'blue';
  if (BOTH.has(k)) return 'both';
  return 'body';
}

export type Singer = 'red' | 'blue';
const cutOf = (v: Voice, singer: Singer): Cut => (v === 'red' ? 'red' : v === 'blue' ? 'blue' : v === 'body' ? singer : 'mid');

/** A run of glyphs in one font (a word is one run, except P(us): an italic P and a roman "(us)"). */
interface Run { text: string; family: string; dx: number }
export interface SetWord { word: Word; voice: Voice; runs: Run[]; x: number; w: number; row: number }
export interface SetLine { line: Line; size: number; singer: Singer; words: SetWord[]; rows: number; rowWidths: number[]; leading: number }

const mctx = (() => { let c: CanvasRenderingContext2D | null = null; return () => (c ??= document.createElement('canvas').getContext('2d')!); })();
const width = (text: string, family: string, size: number) => { const c = mctx(); c.font = font(family, size); return c.measureText(text).width; };

function runsFor(w: string, v: Voice, singer: Singer, weight: number, size: number): Run[] {
  if (key(w) === 'p-of-us') {
    const fi = F.display('mid', weight, true), fr = F.display('mid', weight);
    const tail = w.replace(/^P-of-us/i, '(us)');
    return [{ text: 'P', family: fi, dx: 0 }, { text: tail, family: fr, dx: width('P', fi, size) + size * 0.02 }];
  }
  return [{ text: w, family: F.display(cutOf(v, singer), weight), dx: 0 }];
}

/** Lay out a lyric line at `size` px, wrapping at `maxWidth`. Cache the result (layout is not free). */
export function setLine(line: Line, size: number, o: { singer?: Singer; weight?: number; maxWidth?: number; leading?: number } = {}): SetLine {
  const singer = o.singer ?? 'red', weight = o.weight ?? 700, maxW = o.maxWidth ?? Infinity;
  const space = width(' ', F.display('mid', weight), size);
  const words: SetWord[] = [];
  const rowWidths: number[] = [0];
  let x = 0, row = 0;
  line.words.forEach((w, wi) => {
    const v = voiceOf(line, wi);
    const runs = runsFor(w.w, v, singer, weight, size);
    const last = runs[runs.length - 1]!;
    const ww = last.dx + width(last.text, last.family, size);
    if (x > 0 && x + ww > maxW) { row++; x = 0; rowWidths.push(0); }
    words.push({ word: w, voice: v, runs, x, w: ww, row });
    rowWidths[row] = x + ww;
    x += ww + space;
  });
  return { line, size, singer, words, rows: row + 1, rowWidths, leading: o.leading ?? size * 1.02 };
}

export interface DrawOpts {
  /** Seconds before a word is sung that its pencil sketch appears (0 = none). */
  anticipate?: number;
  /** Graphite density of the sketch. */
  sketch?: number;
  /** Ink density multiplier. */
  density?: number;
  /** Override the time used for inking (e.g. to show a line fully inked). */
  done?: boolean;
}

function inkOf(v: Voice, singer: Singer): [Ink, number] {
  if (v === 'red' || v === 'blue' || v === 'both') return [v, 1];
  return [singer, BODY_DENSITY];
}

/** Draw one word (all its runs) at x,y in an ink; split words alternate the inks letter by letter. */
export function drawWord(c: CanvasRenderingContext2D, sw: SetWord, x: number, y: number, size: number, singer: Singer, style: string | null, density = 1) {
  for (const r of sw.runs) {
    c.font = font(r.family, size);
    if (sw.voice === 'split' && !style) {
      const chars = Array.from(r.text);
      chars.forEach((ch, i) => {
        c.fillStyle = ink(i % 2 === 0 ? 'red' : 'blue', density);
        c.fillText(ch, x + r.dx + glyphX(r.text, i, r.family, size), y);
      });
    } else {
      const [k, d] = inkOf(sw.voice, singer);
      c.fillStyle = style ?? ink(k, d * density);
      c.fillText(r.text, x + r.dx, y);
    }
  }
}

/**
 * Draw a set line with its first row's baseline at (x, y). Each word inks in left to right while it
 * is sung (never ahead of the voice); before that it shows as a faint graphite sketch for `anticipate` s.
 */
export function drawSetLine(c: CanvasRenderingContext2D, sl: SetLine, x: number, y: number, t: number, o: DrawOpts = {}) {
  const ant = o.anticipate ?? 0.4, sk = o.sketch ?? 0.4, dens = o.density ?? 1;
  const asc = sl.size * 1.05, desc = sl.size * 0.4;
  c.save();
  c.textBaseline = 'alphabetic';
  for (const sw of sl.words) {
    const wx = x + sw.x, wy = y + sw.row * sl.leading;
    const p = o.done ? 1 : Lyrics.wordProgress(sw.word, t);
    const pad = sl.size * 0.15; // italic overhang and wonky terminals
    if (p < 1 && ant > 0 && t >= sw.word.start - ant) {
      const a = clamp((t - (sw.word.start - ant)) / ant);
      c.save();
      c.beginPath(); c.rect(wx + sw.w * p, wy - asc, sw.w * (1 - p) + pad, asc + desc); c.clip();
      drawWord(c, sw, wx, wy, sl.size, sl.singer, ink('graphite', sk * a));
      c.restore();
    }
    if (p > 0) {
      c.save();
      c.beginPath(); c.rect(wx - pad, wy - asc, sw.w * p + (p >= 1 ? 2 * pad : pad), asc + desc); c.clip();
      drawWord(c, sw, wx, wy, sl.size, sl.singer, null, dens);
      c.restore();
    }
  }
  c.restore();
}

/** Seconds from the line's first word to fully sung, and whether t is inside the line. */
export const lineSpan = (l: Line) => [l.words[0]!.start, l.words[l.words.length - 1]!.end] as const;

/** The line on screen at t: the last one whose pencil sketch has appeared (`ant` s before its first word). */
export function currentLine(lines: Line[], t: number, ant = 0.4): Line | undefined {
  let cur: Line | undefined;
  for (const l of lines) if (t >= l.words[0]!.start - ant) cur = l;
  return cur;
}

/** Find a line by its opening words (lyric text as typeset, curly quotes). */
export const lineStarting = (lines: Line[], text: string, nth = 0) => lines.filter((l) => l.text.toLowerCase().startsWith(text.toLowerCase()))[nth];

/** Find a word in a line by its key (lower-case letters), the nth occurrence. */
export const wordIn = (l: Line | undefined, w: string, nth = 0) => l?.words.filter((x) => key(x.w) === w)[nth];

/** Per-char [start, end] times for a phrase from its words (chars of a word spread over the word, spaces instant). */
export function charTimes(text: string, words: Word[]): [number, number][] {
  const out: [number, number][] = [];
  const toks = text.split(' ');
  toks.forEach((tok, i) => {
    const w = words[i] ?? words[words.length - 1]!;
    for (let j = 0; j < tok.length; j++) out.push([w.start + ((w.end - w.start) * j) / tok.length, w.start + ((w.end - w.start) * (j + 1)) / tok.length]);
    if (i < toks.length - 1) out.push([w.end, w.end]);
  });
  return out;
}
