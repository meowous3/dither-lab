// Ordered (Bayer) dithering
// Ported from Canvas2DPostProcess.tsx:104-118

import { getBayerMatrix } from './bayer';
import { quantizeChannel } from './quantize';
import { findClosestPaletteColor } from './quantize';
import type { Color } from './types';

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
  palette?: Color[]
): void {
  const matrix = getBayerMatrix(matrixSize);
  const size = matrix.length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const mx = Math.floor(x / ditherScale) % size;
      const my = Math.floor(y / ditherScale) % size;
      const threshold = matrix[my][mx];

      let r = buf[idx];
      let g = buf[idx + 1];
      let b = buf[idx + 2];

      if (palette) {
        // Add threshold bias per channel then snap to closest palette color
        const bias = (threshold - 0.5) / colorCount * ditherStrength;
        const br = Math.max(0, Math.min(1, r + bias));
        const bg = Math.max(0, Math.min(1, g + bias));
        const bb = Math.max(0, Math.min(1, b + bias));
        const c = findClosestPaletteColor(br, bg, bb, palette);
        buf[idx]     = c.r / 255;
        buf[idx + 1] = c.g / 255;
        buf[idx + 2] = c.b / 255;
      } else {
        // Standard ordered dither: add threshold before quantizing
        const bias = (threshold - 0.5) / colorCount * ditherStrength;
        r = Math.max(0, Math.min(1, quantizeChannel(r + bias, colorCount)));
        g = Math.max(0, Math.min(1, quantizeChannel(g + bias, colorCount)));
        b = Math.max(0, Math.min(1, quantizeChannel(b + bias, colorCount)));
        buf[idx]     = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
      }
    }
  }
}
