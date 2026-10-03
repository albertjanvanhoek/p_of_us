// The edit: which scene plays when (docs/TREATMENT.md, Scenes). Boundaries are anchored to lyric
// lines of a given section and snapped to the beat grid, so they follow the aligned data
// (data/lyrics.json, data/audio.json). Never hard-code times.
//
// Scenes that are not built yet fall back to `typeset` (the lyric set in the karaoke rule), so the
// whole song can always be previewed.
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics, Line } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`] ?? modules['./scenes/typeset.ts'];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** The nth line of a section (optionally the first one with this text). */
  const line = (section: string, text?: string): Line => {
    const ls = ly.inSection(section).filter((l) => !text || l.text.startsWith(text));
    if (!ls[0]) throw new Error(`timeline: no line ${text ?? ''} in ${section}`);
    return ls[0];
  };
  /** Cut on the last beat at/before the first word of the line (never after the word). */
  const cut = (section: string, text?: string, tol = 0.02) => {
    const s = line(section, text).words[0]!.start;
    return Math.max(0, au.timeOfBeat(Math.floor(au.beatAt(s + tol))));
  };

  const b = {
    hold: 0,
    screens: cut('verse1', 'I look you in the eye'),
    fit: cut('verse1', 'You build a model'),
    overlay1: cut('pre1'),
    loop1: cut('chorus1'),
    marks: cut('verse2'),
    overlay2: cut('pre2'),
    loop2: cut('chorus2'),
    recognize: cut('bridge'),
    register: cut('build'),
    meet: cut('stop'),
    loop3: cut('chorus3'),
    interval: cut('outro'),
    end: au.duration,
  };

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  // ?thumb=a|b: the YouTube thumbnail instead of the song (render.ts stills --thumb a)
  const thumb = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('thumb') : null;
  if (thumb) return [E('thumb', 'thumb', 0, au.duration, { params: { variant: thumb } })];

  return [
    E('hold', 'hold', b.hold, b.screens),
    E('screens', 'screens', b.screens, b.fit),
    E('fit', 'fit', b.fit, b.overlay1),
    E('overlay1', 'overlay', b.overlay1, b.loop1, { params: { n: 1 } }),
    E('loop1', 'loop', b.loop1, b.marks, { params: { n: 1 } }),
    E('marks', 'marks', b.marks, b.overlay2),
    E('overlay2', 'overlay', b.overlay2, b.loop2, { params: { n: 2 } }),
    E('loop2', 'loop', b.loop2, b.recognize, { params: { n: 2 } }),
    E('recognize', 'recognize', b.recognize, b.register),
    E('register', 'register', b.register, b.meet),
    E('meet', 'meet', b.meet, b.loop3),
    E('loop3', 'loop', b.loop3, b.interval, { params: { n: 3 } }),
    E('interval', 'interval', b.interval, b.end),
  ];
}
