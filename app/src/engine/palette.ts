import { hexToLinear } from './util';

// Two inks, their overprint, paper, and one neutral. Nothing else (docs/TREATMENT.md, Palette).
// Scenes never paint these colours directly: they lay down ink *coverage* (see press.ts) and the
// press multiplies the inks over the paper. Plum is what happens where red and blue overlap.
export const HEX = {
  paper: '#F3EEE3', // the sheet
  paper2: '#E7E0D0', // paper shadow, folds, fibre
  red: '#E8452C', // human ink
  blue: '#2F5BD6', // model ink
  plum: '#2B1925', // overprint = red x blue
  graphite: '#8C8578', // pencil construction lines, registration guides, annotations
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D (only for UI / debug overlays: scene content is drawn as ink coverage). */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
