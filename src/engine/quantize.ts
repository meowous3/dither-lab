// Color quantization

import type { Color, ColorDistanceMetric } from './types';

// --- sRGB → CIE Lab conversion ---

function srgbToLinearComp(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear → XYZ (D65)
  const lr = srgbToLinearComp(r), lg = srgbToLinearComp(g), lb = srgbToLinearComp(b);
  let x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047;
  let y = (0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb);
  let z = (0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb) / 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export type DistanceFn = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => number;

function euclideanRgbDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

function redmeanDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) * 0.5;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return (2 + rMean) * dr * dr + 4 * dg * dg + (3 - rMean) * db * db;
}

function cie76Dist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const [l1, a1, b1_] = rgbToLab(r1, g1, b1);
  const [l2, a2, b2_] = rgbToLab(r2, g2, b2);
  const dl = l1 - l2, da = a1 - a2, db = b1_ - b2_;
  return dl * dl + da * da + db * db;
}

export function getDistanceFn(metric: ColorDistanceMetric): DistanceFn {
  switch (metric) {
    case 'redmean': return redmeanDist;
    case 'cie76': return cie76Dist;
    default: return euclideanRgbDist;
  }
}

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
  palette: Color[],
  distFn: DistanceFn = euclideanRgbDist
): Color {
  let bestDist = Infinity;
  let best = palette[0];
  for (const c of palette) {
    const dist = distFn(r, g, b, c.r / 255, c.g / 255, c.b / 255);
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
  palette: Color[],
  distFn: DistanceFn = euclideanRgbDist
): [Color, Color, number] {
  let bestDist = Infinity;
  let secondDist = Infinity;
  let best = palette[0];
  let second = palette[Math.min(1, palette.length - 1)];

  for (const c of palette) {
    const dist = distFn(r, g, b, c.r / 255, c.g / 255, c.b / 255);
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
