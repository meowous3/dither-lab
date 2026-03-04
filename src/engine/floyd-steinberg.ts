// Floyd-Steinberg error diffusion dithering
// Full error propagation (100%) with serpentine scanning
//
//        * 7/16
//  3/16 5/16 1/16

import { quantizeChannel, findClosestPaletteColor } from './quantize';
import type { Color } from './types';

export function floydSteinbergDither(
  buf: Float32Array,
  width: number,
  height: number,
  colorCount: number,
  ditherStrength: number = 1,
  palette?: Color[]
): void {
  for (let y = 0; y < height; y++) {
    const leftToRight = y % 2 === 0;
    for (let i = 0; i < width; i++) {
      const x = leftToRight ? i : width - 1 - i;
      const idx = (y * width + x) * 3;
      const oldR = buf[idx];
      const oldG = buf[idx + 1];
      const oldB = buf[idx + 2];

      let newR: number, newG: number, newB: number;
      if (palette) {
        const c = findClosestPaletteColor(oldR, oldG, oldB, palette);
        newR = c.r / 255; newG = c.g / 255; newB = c.b / 255;
      } else {
        newR = quantizeChannel(oldR, colorCount);
        newG = quantizeChannel(oldG, colorCount);
        newB = quantizeChannel(oldB, colorCount);
      }

      buf[idx]     = newR;
      buf[idx + 1] = newG;
      buf[idx + 2] = newB;

      const errR = (oldR - newR) * ditherStrength;
      const errG = (oldG - newG) * ditherStrength;
      const errB = (oldB - newB) * ditherStrength;

      // Flip horizontal offsets for right-to-left rows
      const dir = leftToRight ? 1 : -1;
      distributeError(buf, width, height, x + dir, y,     errR, errG, errB, 7 / 16);
      distributeError(buf, width, height, x - dir, y + 1, errR, errG, errB, 3 / 16);
      distributeError(buf, width, height, x,       y + 1, errR, errG, errB, 5 / 16);
      distributeError(buf, width, height, x + dir, y + 1, errR, errG, errB, 1 / 16);
    }
  }
}

function distributeError(
  buf: Float32Array,
  width: number, height: number,
  x: number, y: number,
  errR: number, errG: number, errB: number,
  factor: number
): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) * 3;
  buf[idx]     += errR * factor;
  buf[idx + 1] += errG * factor;
  buf[idx + 2] += errB * factor;
}
