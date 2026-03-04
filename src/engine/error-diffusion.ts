// Unified error diffusion dithering engine
// All algorithms use serpentine scanning (alternating row direction)

import { quantizeChannel, findClosestPaletteColor } from './quantize';
import type { Color } from './types';

interface KernelEntry {
  dx: number;
  dy: number;
  weight: number;
}

// Kernels defined for left-to-right scanning.
// For right-to-left rows, dx is flipped (multiplied by -1).
const KERNELS: Record<string, KernelEntry[]> = {
  'floyd-steinberg': [
    //        * 7
    //  3  5  1   (divisor: 16)
    { dx: 1, dy: 0, weight: 7 / 16 },
    { dx: -1, dy: 1, weight: 3 / 16 },
    { dx: 0, dy: 1, weight: 5 / 16 },
    { dx: 1, dy: 1, weight: 1 / 16 },
  ],
  'jarvis-judice-ninke': [
    //           * 7  5
    //  3  5  7  5  3
    //  1  3  5  3  1   (divisor: 48)
    { dx: 1, dy: 0, weight: 7 / 48 },
    { dx: 2, dy: 0, weight: 5 / 48 },
    { dx: -2, dy: 1, weight: 3 / 48 },
    { dx: -1, dy: 1, weight: 5 / 48 },
    { dx: 0, dy: 1, weight: 7 / 48 },
    { dx: 1, dy: 1, weight: 5 / 48 },
    { dx: 2, dy: 1, weight: 3 / 48 },
    { dx: -2, dy: 2, weight: 1 / 48 },
    { dx: -1, dy: 2, weight: 3 / 48 },
    { dx: 0, dy: 2, weight: 5 / 48 },
    { dx: 1, dy: 2, weight: 3 / 48 },
    { dx: 2, dy: 2, weight: 1 / 48 },
  ],
  'stucki': [
    //           * 8  4
    //  2  4  8  4  2
    //  1  2  4  2  1   (divisor: 42)
    { dx: 1, dy: 0, weight: 8 / 42 },
    { dx: 2, dy: 0, weight: 4 / 42 },
    { dx: -2, dy: 1, weight: 2 / 42 },
    { dx: -1, dy: 1, weight: 4 / 42 },
    { dx: 0, dy: 1, weight: 8 / 42 },
    { dx: 1, dy: 1, weight: 4 / 42 },
    { dx: 2, dy: 1, weight: 2 / 42 },
    { dx: -2, dy: 2, weight: 1 / 42 },
    { dx: -1, dy: 2, weight: 2 / 42 },
    { dx: 0, dy: 2, weight: 4 / 42 },
    { dx: 1, dy: 2, weight: 2 / 42 },
    { dx: 2, dy: 2, weight: 1 / 42 },
  ],
  'burkes': [
    //           * 8  4
    //  2  4  8  4  2   (divisor: 32)
    { dx: 1, dy: 0, weight: 8 / 32 },
    { dx: 2, dy: 0, weight: 4 / 32 },
    { dx: -2, dy: 1, weight: 2 / 32 },
    { dx: -1, dy: 1, weight: 4 / 32 },
    { dx: 0, dy: 1, weight: 8 / 32 },
    { dx: 1, dy: 1, weight: 4 / 32 },
    { dx: 2, dy: 1, weight: 2 / 32 },
  ],
  'atkinson': [
    //      * 1  1
    //  1  1  1
    //      1        (divisor: 8, propagates 75%)
    { dx: 1, dy: 0, weight: 1 / 8 },
    { dx: 2, dy: 0, weight: 1 / 8 },
    { dx: -1, dy: 1, weight: 1 / 8 },
    { dx: 0, dy: 1, weight: 1 / 8 },
    { dx: 1, dy: 1, weight: 1 / 8 },
    { dx: 0, dy: 2, weight: 1 / 8 },
  ],
  'sierra': [
    //           * 5  3
    //  2  4  5  4  2
    //     2  3  2      (divisor: 32)
    { dx: 1, dy: 0, weight: 5 / 32 },
    { dx: 2, dy: 0, weight: 3 / 32 },
    { dx: -2, dy: 1, weight: 2 / 32 },
    { dx: -1, dy: 1, weight: 4 / 32 },
    { dx: 0, dy: 1, weight: 5 / 32 },
    { dx: 1, dy: 1, weight: 4 / 32 },
    { dx: 2, dy: 1, weight: 2 / 32 },
    { dx: -1, dy: 2, weight: 2 / 32 },
    { dx: 0, dy: 2, weight: 3 / 32 },
    { dx: 1, dy: 2, weight: 2 / 32 },
  ],
  'sierra-two-row': [
    //           * 4  3
    //  1  2  3  2  1   (divisor: 16)
    { dx: 1, dy: 0, weight: 4 / 16 },
    { dx: 2, dy: 0, weight: 3 / 16 },
    { dx: -2, dy: 1, weight: 1 / 16 },
    { dx: -1, dy: 1, weight: 2 / 16 },
    { dx: 0, dy: 1, weight: 3 / 16 },
    { dx: 1, dy: 1, weight: 2 / 16 },
    { dx: 2, dy: 1, weight: 1 / 16 },
  ],
  'sierra-lite': [
    //  * 2
    //  1 1   (divisor: 4)
    { dx: 1, dy: 0, weight: 2 / 4 },
    { dx: -1, dy: 1, weight: 1 / 4 },
    { dx: 0, dy: 1, weight: 1 / 4 },
  ],
};

export const ERROR_DIFFUSION_ALGORITHMS = Object.keys(KERNELS);

export function errorDiffusionDither(
  algorithmName: string,
  buf: Float32Array,
  width: number,
  height: number,
  colorCount: number,
  ditherStrength: number = 1,
  palette?: Color[]
): void {
  const kernel = KERNELS[algorithmName];
  if (!kernel) throw new Error(`Unknown error diffusion algorithm: ${algorithmName}`);

  for (let y = 0; y < height; y++) {
    const leftToRight = y % 2 === 0;
    for (let i = 0; i < width; i++) {
      const x = leftToRight ? i : width - 1 - i;
      const idx = (y * width + x) * 3;
      // Clamp before quantizing to prevent runaway error accumulation at high strength
      const oldR = Math.max(0, Math.min(1, buf[idx]));
      const oldG = Math.max(0, Math.min(1, buf[idx + 1]));
      const oldB = Math.max(0, Math.min(1, buf[idx + 2]));

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

      const dir = leftToRight ? 1 : -1;
      for (const entry of kernel) {
        const nx = x + entry.dx * dir;
        const ny = y + entry.dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = (ny * width + nx) * 3;
          buf[ni]     += errR * entry.weight;
          buf[ni + 1] += errG * entry.weight;
          buf[ni + 2] += errB * entry.weight;
        }
      }
    }
  }
}
