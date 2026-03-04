// Atkinson error diffusion dithering
// Propagates only 75% of the error (6/8 = 75%), giving higher contrast
// Classic Macintosh look
//
//      * 1/8 1/8
// 1/8 1/8 1/8
//      1/8

import { quantizeChannel, findClosestPaletteColor } from './quantize';
import type { Color } from './types';

export function atkinsonDither(
  buf: Float32Array,
  width: number,
  height: number,
  colorCount: number,
  palette?: Color[]
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
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

      // Atkinson distributes 1/8 to each of 6 neighbors (total 6/8 = 75%)
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;
      const f = 1 / 8;

      distribute(buf, width, height, x + 1, y,     errR, errG, errB, f);
      distribute(buf, width, height, x + 2, y,     errR, errG, errB, f);
      distribute(buf, width, height, x - 1, y + 1, errR, errG, errB, f);
      distribute(buf, width, height, x,     y + 1, errR, errG, errB, f);
      distribute(buf, width, height, x + 1, y + 1, errR, errG, errB, f);
      distribute(buf, width, height, x,     y + 2, errR, errG, errB, f);
    }
  }
}

function distribute(
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
