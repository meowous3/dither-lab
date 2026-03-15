// Ordered (Bayer) dithering
// Ported from Canvas2DPostProcess.tsx:104-118

import { getBayerMatrix } from './bayer';
import { quantizeChannel, getDistanceFn } from './quantize';
import { findClosestPaletteColor, findTwoClosestPaletteColors, pixelHash } from './quantize';
import type { Color, DitherTechnique, ColorDistanceMetric } from './types';

/**
 * Apply ordered (Bayer) dithering to a gradient buffer in-place.
 * Buffer is Float32Array of [r,g,b,...] with values 0-1.
 */
export function orderedDither(
  buf: Float32Array,
  width: number,
  height: number,
  matrixSize: 2 | 4 | 8,
  ditherScale: number,
  colorCount: number,
  ditherStrength: number = 1,
  palette?: Color[],
  technique: DitherTechnique = 'continuous',
  edgeMap?: Float32Array,
  customMatrix?: number[][],
  colorDistanceMetric: ColorDistanceMetric = 'euclidean-rgb',
  pixelAspectRatio: number = 1
): void {
  const matrix = customMatrix ?? getBayerMatrix(matrixSize);
  const distFn = getDistanceFn(colorDistanceMetric);
  const size = matrix.length;
  // Compensate pattern for non-square pixels: scale x lookup by PAR so
  // the pattern appears uniform on the target display.
  // PAR < 1 (tall pixels) → slower x advance → wider pattern in pixel space
  // PAR > 1 (wide pixels) → faster x advance → narrower pattern in pixel space
  const par = pixelAspectRatio || 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const mx = (Math.floor(x * par / ditherScale) % size + size) % size;
      const my = Math.floor(y / ditherScale) % size;
      let threshold = matrix[my][mx];

      const r = buf[idx];
      const g = buf[idx + 1];
      const b = buf[idx + 2];

      // Technique-specific strength modulation
      let localStrength = ditherStrength;
      if (technique === 'edge-aware' && edgeMap) {
        localStrength = ditherStrength * (1 - edgeMap[y * width + x]);
      }

      // Noise-modulated: add per-pixel jitter to threshold
      if (technique === 'noise-modulated') {
        threshold += (pixelHash(x, y) - 0.5) * 0.5;
        threshold = Math.max(0, Math.min(1, threshold));
      }

      if (technique === 'intermediate') {
        // Intermediate: find 2 closest palette colors, threshold picks between them
        if (palette) {
          const [a, bCol, blend] = findTwoClosestPaletteColors(r, g, b, palette, distFn);
          const pick = blend > threshold * localStrength ? bCol : a;
          buf[idx]     = pick.r / 255;
          buf[idx + 1] = pick.g / 255;
          buf[idx + 2] = pick.b / 255;
        } else {
          const n = colorCount - 1;
          if (n <= 0) {
            buf[idx] = buf[idx + 1] = buf[idx + 2] = 0;
            continue;
          }
          const qr = intermediateChannel(r, n, threshold, localStrength);
          const qg = intermediateChannel(g, n, threshold, localStrength);
          const qb = intermediateChannel(b, n, threshold, localStrength);
          buf[idx]     = qr;
          buf[idx + 1] = qg;
          buf[idx + 2] = qb;
        }
      } else {
        // Continuous (default), noise-modulated, edge-aware all use bias approach
        if (palette) {
          const bias = (threshold - 0.5) / colorCount * localStrength;
          const br = Math.max(0, Math.min(1, r + bias));
          const bg = Math.max(0, Math.min(1, g + bias));
          const bb = Math.max(0, Math.min(1, b + bias));
          const c = findClosestPaletteColor(br, bg, bb, palette, distFn);
          buf[idx]     = c.r / 255;
          buf[idx + 1] = c.g / 255;
          buf[idx + 2] = c.b / 255;
        } else {
          const bias = (threshold - 0.5) / colorCount * localStrength;
          buf[idx]     = Math.max(0, Math.min(1, quantizeChannel(r + bias, colorCount)));
          buf[idx + 1] = Math.max(0, Math.min(1, quantizeChannel(g + bias, colorCount)));
          buf[idx + 2] = Math.max(0, Math.min(1, quantizeChannel(b + bias, colorCount)));
        }
      }
    }
  }
}

/** Intermediate dither for a single channel (non-palette path) */
function intermediateChannel(v: number, n: number, threshold: number, strength: number): number {
  const scaled = v * n;
  const lo = Math.floor(scaled) / n;
  const hi = Math.min(Math.ceil(scaled) / n, 1);
  const blend = scaled - Math.floor(scaled); // fractional part
  return blend > threshold * strength ? hi : lo;
}
