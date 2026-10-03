// Fallback plate for scenes that are not built yet: the lyric of the entry's window set in the
// karaoke rule on bare paper, with the entry id and P(us) as margin notes. Keeps the whole song
// previewable while the real scenes are written.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { clearRT } from '../engine/gl';
import { InkLayer, ink, drawPUs } from '../engine/press';
import { F, font } from '../engine/type';
import { setLine, drawSetLine, type SetLine } from './_karaoke';

const X = 150, BASE = 640, SIZE = 92, MAXW = 1500;

export default class Typeset extends Scene {
  layer = new InkLayer();
  sets: SetLine[] = [];

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.sets = lyrics.lines.filter((l) => l.start >= start - 0.05 && l.start < end).map((l) => setLine(l, SIZE, { maxWidth: MAXW }));
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp, press, id } = this.ctx;
    clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();
    // the current line (the last one whose sketch has appeared), the previous one above it in graphite
    const ant = 0.4;
    let cur = -1;
    this.sets.forEach((s, i) => { if (f.t >= s.line.words[0]!.start - ant) cur = i; });
    if (cur >= 0) {
      const s = this.sets[cur]!;
      const prev = this.sets[cur - 1];
      if (prev) {
        const small = setLine(prev.line, SIZE * 0.42, { maxWidth: MAXW });
        drawSetLine(c, small, X, BASE - SIZE * 1.25, f.t, { done: true, density: 0.55 });
      }
      drawSetLine(c, s, X, BASE, f.t, { anticipate: ant });
    }
    // margin notes
    c.font = font(F.mono(400), 15);
    c.fillStyle = ink('graphite', 0.9);
    c.fillText(`plate: ${id} (draft)`, X, 1080 - 110);
    if (press.pus(f.t) > 0) drawPUs(c, 1920 - 330, 1080 - 104, press.pus(f.t), { size: 20 });
    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return { marks: 1, crop: 1 };
  }
}
