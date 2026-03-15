// Unified error diffusion dithering engine
// All algorithms use serpentine scanning (alternating row direction)

import { quantizeChannel, findClosestPaletteColor, findTwoClosestPaletteColors, pixelHash, getDistanceFn } from './quantize';
import type { Color, DitherTechnique, ColorDistanceMetric } from './types';

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
  palette?: Color[],
  technique: DitherTechnique = 'continuous',
  edgeMap?: Float32Array,
  directionAngle: number = 0,
  colorDistanceMetric: ColorDistanceMetric = 'euclidean-rgb',
  pixelAspectRatio: number = 1
): void {
  const distFn = getDistanceFn(colorDistanceMetric);
  const par = pixelAspectRatio || 1;
  const baseKernel = KERNELS[algorithmName];
  if (!baseKernel) throw new Error(`Unknown error diffusion algorithm: ${algorithmName}`);

  // Adjust kernel weights for non-square pixels: reweight by inverse physical distance
  let kernel = baseKernel;
  if (par !== 1) {
    const adjusted = baseKernel.map((e) => {
      const physDist = Math.sqrt((e.dx * par) ** 2 + e.dy ** 2);
      const origDist = Math.sqrt(e.dx ** 2 + e.dy ** 2);
      const scale = origDist > 0 ? origDist / physDist : 1;
      return { ...e, weight: e.weight * scale };
    });
    // Renormalize to preserve total weight
    const origTotal = baseKernel.reduce((s, e) => s + e.weight, 0);
    const adjTotal = adjusted.reduce((s, e) => s + e.weight, 0);
    const norm = adjTotal > 0 ? origTotal / adjTotal : 1;
    kernel = adjusted.map((e) => ({ ...e, weight: e.weight * norm }));
  }

  // Compute stable error propagation limit: strength * totalWeight must not exceed 1.0
  const totalKernelWeight = kernel.reduce((s, e) => s + e.weight, 0);
  const stableLimit = totalKernelWeight > 0 ? 1.0 / totalKernelWeight : 1.0;
  const errorStrength = Math.min(ditherStrength, stableLimit);
  // Excess strength beyond stable limit drives pre-quantization jitter
  const excessStrength = Math.max(0, ditherStrength - stableLimit);

  // Precompute direction vector for directional technique
  const rad = directionAngle * Math.PI / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);

  // Intermediate needs original pixel values (before error accumulation)
  // to find stable two-color candidates that don't shift as error propagates
  const origBuf = technique === 'intermediate' ? new Float32Array(buf) : null;

  for (let y = 0; y < height; y++) {
    const leftToRight = y % 2 === 0;
    for (let i = 0; i < width; i++) {
      const x = leftToRight ? i : width - 1 - i;
      const idx = (y * width + x) * 3;
      // Clamp before quantizing to prevent runaway error accumulation
      let oldR = Math.max(0, Math.min(1, buf[idx]));
      let oldG = Math.max(0, Math.min(1, buf[idx + 1]));
      let oldB = Math.max(0, Math.min(1, buf[idx + 2]));

      // Excess strength beyond stable limit adds per-pixel jitter
      if (excessStrength > 0) {
        const jitter = (pixelHash(x, y) - 0.5) * 0.3 * excessStrength;
        oldR = Math.max(0, Math.min(1, oldR + jitter));
        oldG = Math.max(0, Math.min(1, oldG + jitter));
        oldB = Math.max(0, Math.min(1, oldB + jitter));
      }

      // Noise-modulated: add per-pixel jitter before quantizing
      if (technique === 'noise-modulated') {
        const jitter = (pixelHash(x, y) - 0.5) * 0.15 * ditherStrength;
        oldR = Math.max(0, Math.min(1, oldR + jitter));
        oldG = Math.max(0, Math.min(1, oldG + jitter));
        oldB = Math.max(0, Math.min(1, oldB + jitter));
      }

      let newR: number, newG: number, newB: number;

      if (technique === 'intermediate' && origBuf) {
        // Find two candidate colors from ORIGINAL pixel (no error),
        // then let accumulated error decide which to pick.
        // This prevents error from jumping to distant wrong palette colors.
        if (palette) {
          const [a, bCol] = findTwoClosestPaletteColors(
            origBuf[idx], origBuf[idx + 1], origBuf[idx + 2], palette, distFn
          );
          // Use error-adjusted pixel to decide between the two candidates
          const da = (oldR - a.r / 255) ** 2 + (oldG - a.g / 255) ** 2 + (oldB - a.b / 255) ** 2;
          const db = (oldR - bCol.r / 255) ** 2 + (oldG - bCol.g / 255) ** 2 + (oldB - bCol.b / 255) ** 2;
          const pick = db < da ? bCol : a;
          newR = pick.r / 255; newG = pick.g / 255; newB = pick.b / 255;
        } else {
          const n = colorCount - 1;
          if (n <= 0) {
            newR = newG = newB = 0;
          } else {
            newR = intermediateChannel(oldR, n);
            newG = intermediateChannel(oldG, n);
            newB = intermediateChannel(oldB, n);
          }
        }
      } else if (palette) {
        const c = findClosestPaletteColor(oldR, oldG, oldB, palette, distFn);
        newR = c.r / 255; newG = c.g / 255; newB = c.b / 255;
      } else {
        newR = quantizeChannel(oldR, colorCount);
        newG = quantizeChannel(oldG, colorCount);
        newB = quantizeChannel(oldB, colorCount);
      }

      buf[idx]     = newR;
      buf[idx + 1] = newG;
      buf[idx + 2] = newB;

      let errR = (oldR - newR) * errorStrength;
      let errG = (oldG - newG) * errorStrength;
      let errB = (oldB - newB) * errorStrength;

      // Edge-aware: reduce error at edges
      if (technique === 'edge-aware' && edgeMap) {
        const edgeFactor = 1 - edgeMap[y * width + x];
        errR *= edgeFactor;
        errG *= edgeFactor;
        errB *= edgeFactor;
      }

      const dir = leftToRight ? 1 : -1;

      if (technique === 'directional') {
        // Weight kernel entries by alignment with direction angle
        let totalWeight = 0;
        const modifiedWeights: number[] = [];
        for (const entry of kernel) {
          const edx = entry.dx * dir;
          const edy = entry.dy;
          const len = Math.sqrt(edx * edx + edy * edy);
          let alignment = 0;
          if (len > 0) {
            alignment = (edx * dirX + edy * dirY) / len;
          }
          const modifier = Math.max(0.1, (1 + alignment) / 2);
          const w = entry.weight * modifier;
          modifiedWeights.push(w);
          totalWeight += w;
        }
        // Renormalize to preserve original total weight sum
        const origTotal = kernel.reduce((s, e) => s + e.weight, 0);
        const scale = totalWeight > 0 ? origTotal / totalWeight : 0;
        for (let k = 0; k < kernel.length; k++) {
          const entry = kernel[k];
          const nx = x + entry.dx * dir;
          const ny = y + entry.dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const ni = (ny * width + nx) * 3;
            const w = modifiedWeights[k] * scale;
            buf[ni]     += errR * w;
            buf[ni + 1] += errG * w;
            buf[ni + 2] += errB * w;
          }
        }
      } else {
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
}

/** Intermediate quantization for a single channel (non-palette path) */
function intermediateChannel(v: number, n: number): number {
  const scaled = v * n;
  const lo = Math.floor(scaled) / n;
  const hi = Math.min(Math.ceil(scaled) / n, 1);
  const blend = scaled - Math.floor(scaled);
  return blend > 0.5 ? hi : lo;
}
