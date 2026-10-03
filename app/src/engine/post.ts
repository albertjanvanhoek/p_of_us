// Global post-processing: the press. Prints the composited ink coverage (r = red, g = blue,
// b = graphite; see press.ts) on paper: plate misregistration, ink edges roughened along the paper
// fibre, dot gain, halftone screens at the inks' own angles, multiply over the paper texture
// (red x blue = plum), a roller streak, light grain. Light comes from the paper: no bloom, no glow.
import * as THREE from 'three';
import { FSPass, W, H } from './gl';
import { Press } from './press';

/** Tone shoulder (kept for the engine's motion-blur sampling-error estimate, which compares displayed values). */
export const SHOULDER_GLSL = /* glsl */ `
vec3 shoulder(vec3 x) { return min(x, vec3(1.0)); }`;

export interface PostParams {
  /** Registration offset between the red and blue plates (logical px). NaN = the song's (Press.reg). */
  reg: number;
  /** Halftone: 0 = solid ink, 1 = fully screened. Partial coverage (soft edges, tints) shows the dots. */
  screen: number;
  /** Halftone cell size (logical px on the sheet). */
  screenPx: number;
  /** Ink edge roughness along the paper fibre (logical px of displacement). */
  rough: number;
  /** Dot gain: ink spreads into the paper (0..1). */
  gain: number;
  /** Global ink density multiplier (1 = normal; the chorus 3 bloom may push it up). */
  density: number;
  /** Both inks everywhere, 0..1 (the plum page in `stop`). */
  flood: number;
  /** Paper fibre and mottling visibility. */
  fibre: number;
  /** Roller streak strength (the sheet as it is fed into the press). */
  streak: number;
  /** Light per-frame grain (sRGB units). */
  grain: number;
  /** Paper shading towards the edges. */
  vignette: number;
  /** HUD opacity multiplier (corner registration marks, crop marks). */
  hud: number;
  /** Corner registration marks opacity (0..1). */
  marks: number;
  /** Graphite crop marks opacity (0..1). */
  crop: number;
  /** Fade to blank paper 0..1. */
  fade: number;
  /** Frame offset in logical px (a jolt). */
  shake: [number, number];
  /** Frame zoom (1 = none), for punch-ins on hits. */
  zoom: number;
}

export const DEFAULT_POST: PostParams = {
  reg: NaN,
  screen: 0.55,
  screenPx: 4.5,
  rough: 0.7,
  gain: 0.12,
  density: 1,
  flood: 0,
  fibre: 1,
  streak: 0,
  grain: 0.012,
  vignette: 0.35,
  hud: 1,
  marks: 0,
  crop: 0,
  fade: 0,
  shake: [0, 0],
  zoom: 1,
};

export class Post {
  private final: FSPass;

  constructor() {
    this.final = new FSPass(/* glsl */ `
      uniform sampler2D src; uniform sampler2D hudTex;
      uniform vec2 res, dR, dB, shake;
      uniform float screen, screenPx, rough, gain, density, flood, fibre, streak, grain, vignette, hud, fade, zoom, time;

      vec3 cov(vec2 uv) {
        vec3 c = texture(src, uv).rgb;
        vec4 h = texture(hudTex, uv);
        return c + h.rgb * h.a * hud;
      }
      // amplitude-modulated screen: ink where coverage exceeds the spot function (dots grow from the
      // cell centres and merge into holes past 50%)
      float screened(float c, vec2 p, float ang) {
        vec2 q = rot2(ang) * p / screenPx;
        float v = 0.5 - 0.25 * (cos(TAU * q.x) + cos(TAU * q.y));
        float aa = max(fwidth(v) * 0.75, 1e-4);
        // full and empty coverage stay exact (no pinholes in solids, no specks on bare paper)
        return c > 0.985 ? 1.0 : c < 0.015 ? 0.0 : smoothstep(v - aa, v + aa, c);
      }
      void main() {
        vec2 uv = (vUv - 0.5) / zoom + 0.5 - shake / res;
        vec2 p = uv * res;                           // sheet coordinates, logical px
        // fibre: anisotropic noise along the paper grain; also displaces ink edges (bleed along fibres)
        float fl = snoise(vec2(p.x * 0.012, p.y * 0.18)) * 0.5 + snoise(p * 0.05) * 0.3 + snoise(p * 0.004) * 0.6;
        vec2 bleed = rough * vec2(snoise(p * 0.45 + 17.0), snoise(p * 0.45 - 31.0)) / res;
        float cr = cov(uv + dR + bleed).r;
        float cb = cov(uv + dB + bleed.yx).g;
        float cg = cov(uv + bleed * 0.5).b;
        cr = max(sat(cr * density), flood);
        cb = max(sat(cb * density), flood);
        cg = sat(cg);
        // dot gain
        cr = 1.0 - pow(1.0 - cr, 1.0 + gain * 1.5);
        cb = 1.0 - pow(1.0 - cb, 1.0 + gain * 1.5);
        // halftone screens: red at 15 deg, blue at 75 deg; graphite stays continuous (pencil)
        cr = mix(cr, screened(cr, p, radians(15.0)), screen);
        cb = mix(cb, screened(cb, p, radians(75.0)), screen);
        // ink density varies a little across the sheet (uneven inking)
        // (damped under a flood: on a fully inked sheet the variation reads as blotches)
        float inkVar = 1.0 - 0.06 * fibre * (1.0 - 0.8 * flood) * (snoise(p * 0.008 + 5.0) * 0.5 + 0.5);
        cr *= inkVar; cb *= inkVar;
        // paper: mottling, fibre, roller streak
        float st = streak * exp(-pow((p.y - res.y * 0.62 + 30.0 * snoise(vec2(p.x * 0.002, 3.0))) / 46.0, 2.0));
        vec3 paper = mix(C_PAPER, C_PAPER2, sat(0.22 * fibre * (fl * 0.5 + 0.5) + 0.55 * st));
        // inks multiply over the paper; red x blue is corrected to land exactly on plum
        vec3 col = paper * mix(vec3(1.0), C_RED / C_PAPER, cr) * mix(vec3(1.0), C_BLUE / C_PAPER, cb)
                         * mix(vec3(1.0), C_GRAPHITE / C_PAPER, cg);
        col *= mix(vec3(1.0), C_PLUM * C_PAPER / (C_RED * C_BLUE), cr * cb);
        // paper shading towards the edges (the sheet, not a lens)
        vec2 dc = vUv - 0.5;
        col *= 1.0 - vignette * 0.12 * smoothstep(0.35, 0.95, length(dc * vec2(1.0, 0.75)) * 1.6);
        col = mix(col, paper, fade);
        vec3 s = toSRGB(sat(col));
        s += (hash12(FRAG_PX + fract(time * 13.37) * 1000.0) - 0.5) * grain;
        s += (hash12(gl_FragCoord.xy * 1.37 + time) - 0.5) / 255.0; // dither
        fragColor = vec4(sat(s), 1.0);
      }`, {
      src: { value: null }, hudTex: { value: null },
      res: { value: new THREE.Vector2(W, H) }, dR: { value: new THREE.Vector2() }, dB: { value: new THREE.Vector2() }, shake: { value: new THREE.Vector2() },
      screen: { value: 0 }, screenPx: { value: 4 }, rough: { value: 0 }, gain: { value: 0 }, density: { value: 1 }, flood: { value: 0 },
      fibre: { value: 1 }, streak: { value: 0 }, grain: { value: 0 }, vignette: { value: 0 }, hud: { value: 1 }, fade: { value: 0 },
      zoom: { value: 1 }, time: { value: 0 },
    });
  }

  /** Print src (ink coverage) + hud (ink coverage) -> out (sRGB 8-bit target or screen). `reg`: resolved registration offset (px). */
  render(renderer: THREE.WebGLRenderer, src: THREE.Texture, hud: THREE.Texture, out: THREE.WebGLRenderTarget | null, p: PostParams, time: number, reg: number) {
    const f = this.final.u;
    f.src!.value = src;
    f.hudTex!.value = hud;
    // texture uv is y-up; Press.DIR is in screen px (y down)
    const [dx, dy] = Press.DIR;
    (f.dR!.value as THREE.Vector2).set((-0.5 * reg * dx) / W, (0.5 * reg * dy) / H);
    (f.dB!.value as THREE.Vector2).set((0.5 * reg * dx) / W, (-0.5 * reg * dy) / H);
    f.screen!.value = p.screen;
    f.screenPx!.value = p.screenPx;
    f.rough!.value = p.rough;
    f.gain!.value = p.gain;
    f.density!.value = p.density;
    f.flood!.value = p.flood;
    f.fibre!.value = p.fibre;
    f.streak!.value = p.streak;
    f.grain!.value = p.grain;
    f.vignette!.value = p.vignette;
    f.hud!.value = p.hud;
    f.fade!.value = p.fade;
    f.zoom!.value = p.zoom;
    f.time!.value = time;
    (f.shake!.value as THREE.Vector2).set(p.shake[0], -p.shake[1]);
    this.final.render(renderer, out);
  }
}
