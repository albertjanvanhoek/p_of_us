// The YouTube thumbnail, printed by the same press as the video (render: --thumb a|b, see README).
// A huge P(us) in both inks, a hair out of register so the red and blue edges show around the plum
// (the idea of the video in one glance), the two loops linked with the plum lens where they overlap,
// one line of the chorus and the artist. Variant 'b' prints it over the chorus 3 moiré.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, clearRT } from '../engine/gl';
import { InkLayer, ink } from '../engine/press';
import { F, font } from '../engine/type';
import { LoopGlyph } from './_glyph';

const LX = 960 + 500, LY = 455;          // the loops (right)

export default class Thumb extends Scene {
  layer = new InkLayer();
  glyph = new LoopGlyph(170, 31);
  bloom = new FSPass(/* glsl */ `
    uniform float k;
    void main() {
      vec2 px = vec2(vUv.x, 1.0 - vUv.y) * vec2(1920.0, 1080.0);
      // paper left clear behind the title
      float clearT = smoothstep(80.0, 0.0, max(abs(px.x - 560.0) - 440.0, abs(px.y - 560.0) - 230.0));
      float d = k * 0.14 * (1.0 - clearT);
      fragColor = vec4(d, d, 0.0, 1.0);
    }`, { k: { value: 0 } });

  render(_f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, params } = this.ctx;
    const variant = params.variant === 'b' ? 'b' : 'a';
    if (variant === 'b') { this.bloom.u.k!.value = 1; this.bloom.render(renderer, out); }
    else clearRT(renderer, out, [0, 0, 0]);
    const c = this.layer.ctx;
    this.layer.clear();

    // the two loops, linked: red drawn by hand, blue plotted; plum where they overlap
    const dx = 105;
    this.glyph.draw(c, 'red', LX - dx, LY, { pos: 1, labels: 0.9, dotR: 15 });
    this.glyph.draw(c, 'blue', LX + dx, LY + 30, { pos: 3, labels: 0.9, dotR: 14 });
    c.save();
    c.beginPath(); c.arc(LX - dx, LY, 166, 0, Math.PI * 2); c.clip();
    c.beginPath(); c.arc(LX + dx, LY + 30, 166, 0, Math.PI * 2); c.fillStyle = ink('both', 0.36); c.fill();
    c.restore();

    // P(us), huge, both inks (the press prints them a hair out of register)
    const size = 430, fi = F.display('mid', 700, true), fr = F.display('mid', 700);
    c.font = font(fi, size); const wp = c.measureText('P').width;
    const x0 = 130, y0 = 650;
    for (const k of ['red', 'blue'] as const) {
      c.fillStyle = ink(k, 1);
      c.font = font(fi, size); c.fillText('P', x0, y0);
      c.font = font(fr, size); c.fillText('(us)', x0 + wp + 6, y0);
    }

    // one line of the chorus in the karaoke rule, and the artist
    const ly = 820, s = 66;
    let x = x0 + 14;
    const run = (txt: string, k: 'red' | 'blue' | 'both' | 'graphite', fam: string, d = 1) => {
      c.font = font(fam, s); c.fillStyle = ink(k, d); c.fillText(txt, x, ly); x += c.measureText(txt).width;
    };
    run('not the same', 'red', F.display('red', 700));
    run('  ·  ', 'graphite', F.display('mid', 400), 0.8);
    run('not alone', 'both', F.display('mid', 700));
    c.font = font(F.mono(500), 34); c.fillStyle = ink('graphite', 1);
    c.fillText('Emergence', x0 + 16, 925);
    c.font = font(F.mono(400), 30); c.fillStyle = ink('blue', 1);
    c.fillText('P(us) = 0.86', LX - 110, 790);

    comp.draw(renderer, this.layer.upload(), out, { mode: 'add' });
    return {
      reg: 5, marks: 1, crop: 1, streak: 0, fibre: 0.5,
      screen: variant === 'b' ? 1 : 0.55, screenPx: variant === 'b' ? 8 : 4.5, grain: 0.008,
    };
  }
}
