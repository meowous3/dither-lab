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

/**
 * Find the two closest palette colors to the given RGB (0-1).
 * Returns [closest, secondClosest, blendFactor].
 * blendFactor: 0.0 = exactly closest, 1.0 = exactly secondClosest.
 */
export function findTwoClosestPaletteColors(
  r: number, g: number, b: number,
  palette: Color[]
): [Color, Color, number] {
  let bestDist = Infinity;
  let secondDist = Infinity;
  let best = palette[0];
  let second = palette[Math.min(1, palette.length - 1)];

  for (const c of palette) {
    const dr = r - c.r / 255;
    const dg = g - c.g / 255;
    const db = b - c.b / 255;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      secondDist = bestDist;
      second = best;
      bestDist = dist;
      best = c;
    } else if (dist < secondDist) {
      secondDist = dist;
      second = c;
    }
  }

  const total = bestDist + secondDist;
  const blend = total < 1e-10 ? 0 : bestDist / total;
  return [best, second, blend];
}

/**
 * Deterministic per-pixel hash → 0-1 float.
 */
export function pixelHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
  h = ((h >> 13) ^ h) | 0;
  h = (h * 1274126177) | 0;
  return ((h >>> 0) & 0xffff) / 0xffff;
}
