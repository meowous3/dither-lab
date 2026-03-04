// Color quantization
// Ported from DitheredShader.tsx:99-101

import type { Color } from './types';

/**
 * Quantize a single channel value (0-1) to n levels.
 */
export function quantizeChannel(value: number, levels: number): number {
  const n = levels - 1;
  if (n <= 0) return 0;
  return Math.round(value * n) / n;
}

/**
 * Quantize RGB color (0-1 per channel) to n levels per channel.
 */
export function quantizeColor(r: number, g: number, b: number, levels: number): [number, number, number] {
  return [
    quantizeChannel(r, levels),
    quantizeChannel(g, levels),
    quantizeChannel(b, levels),
  ];
}

/**
 * Find the closest color in a palette to the given RGB (0-1).
 */
export function findClosestPaletteColor(
  r: number, g: number, b: number,
  palette: Color[]
): Color {
  let bestDist = Infinity;
  let best = palette[0];
  for (const c of palette) {
    const dr = r - c.r / 255;
    const dg = g - c.g / 255;
    const db = b - c.b / 255;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}
