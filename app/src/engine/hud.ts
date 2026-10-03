// The global HUD: the print's own furniture, drawn as ink coverage so the press prints (and
// misregisters) it like everything else: the registration marks in both inks at top-left and
// bottom-right (the video's progress bar for alignment, motif 1) and graphite crop marks.
// P(us) is not a corner HUD: scenes stage it in their own idiom (press.ts, drawPUs).
import { InkLayer, drawCornerMarks, drawCropMarks } from './press';

export interface HudState {
  /** Corner registration marks opacity (0..1). */
  marks: number;
  /** Crop marks opacity (0..1). */
  crop: number;
}

export class Hud {
  private layer = new InkLayer();
  private key = '';

  /** Returns the HUD coverage texture; it only changes when its state does. */
  draw(s: HudState) {
    const k = `${s.marks.toFixed(3)}|${s.crop.toFixed(3)}`;
    if (k !== this.key) {
      this.key = k;
      const c = this.layer.ctx;
      this.layer.clear();
      if (s.marks > 0) drawCornerMarks(c, { density: s.marks });
      if (s.crop > 0) drawCropMarks(c, { density: s.crop * 0.8 });
      this.layer.upload();
    }
    return this.layer.texture;
  }
}
