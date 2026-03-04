// Unified dithering entry point

import type { DitherParams, DitherResult, DitherTechnique, ImagePaletteMode } from './types';
import { rasterizeGradient, generateGradientPalette } from './gradient';
import { orderedDither } from './ordered-dither';
import { errorDiffusionDither, ERROR_DIFFUSION_ALGORITHMS } from './error-diffusion';
import { loadBlueNoise, getBlueNoiseThreshold } from './blue-noise';
import { medianCutPalette, kmeansPalette, octreePalette, popularityPalette } from './palette-extraction';
import { quantizeChannel, findClosestPaletteColor, findTwoClosestPaletteColors, pixelHash } from './quantize';
import { computeEdgeMap } from './edge-detect';
import type { Color } from './types';

/**
 * Downsample, run dithering at scale=1, then nearest-neighbor upsample.
 */
function downsample(buf: Float32Array, w: number, h: number, scale: number): { buf: Float32Array; w: number; h: number } {
  if (scale <= 1) return { buf, w, h };
  const nw = Math.max(1, Math.ceil(w / scale));
  const nh = Math.max(1, Math.ceil(h / scale));
  const out = new Float32Array(nw * nh * 3);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(x * scale, w - 1);
      const sy = Math.min(y * scale, h - 1);
      const si = (sy * w + sx) * 3;
      const di = (y * nw + x) * 3;
      out[di]     = buf[si];
      out[di + 1] = buf[si + 1];
      out[di + 2] = buf[si + 2];
    }
  }
  return { buf: out, w: nw, h: nh };
}

function upsample(buf: Float32Array, sw: number, sh: number, tw: number, th: number): Float32Array {
  if (sw === tw && sh === th) return buf;
  const out = new Float32Array(tw * th * 3);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(Math.floor(x * sw / tw), sw - 1);
      const sy = Math.min(Math.floor(y * sh / th), sh - 1);
      const si = (sy * sw + sx) * 3;
      const di = (y * tw + x) * 3;
      out[di]     = buf[si];
      out[di + 1] = buf[si + 1];
      out[di + 2] = buf[si + 2];
    }
  }
  return out;
}

// --- Image palette generation ---

/** Uniform RGB cube: levels^3 total colors */
function generateUniformPalette(levels: number): Color[] {
  const palette: Color[] = [];
  const n = levels - 1;
  for (let r = 0; r < levels; r++) {
    for (let g = 0; g < levels; g++) {
      for (let b = 0; b < levels; b++) {
        palette.push({
          r: Math.round(r / n * 255),
          g: Math.round(g / n * 255),
          b: Math.round(b / n * 255),
        });
      }
    }
  }
  return palette;
}

/** N evenly spaced grayscale levels */
function generateGrayscalePalette(count: number): Color[] {
  const palette: Color[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.round(i / (count - 1) * 255);
    palette.push({ r: v, g: v, b: v });
  }
  return palette;
}

/** Black and white only */
function generateMonochromePalette(): Color[] {
  return [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
  ];
}

/** N sepia tones */
function generateSepiaPalette(count: number): Color[] {
  const palette: Color[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    palette.push({
      r: Math.round(t * 215 + (1 - t) * 30),
      g: Math.round(t * 175 + (1 - t) * 15),
      b: Math.round(t * 130 + (1 - t) * 5),
    });
  }
  return palette;
}

// --- Hardware preset palettes ---

const PRESET_PALETTES: Record<string, Color[]> = {
  cga: [
    { r: 0, g: 0, b: 0 },       { r: 0, g: 0, b: 170 },
    { r: 0, g: 170, b: 0 },     { r: 0, g: 170, b: 170 },
    { r: 170, g: 0, b: 0 },     { r: 170, g: 0, b: 170 },
    { r: 170, g: 85, b: 0 },    { r: 170, g: 170, b: 170 },
    { r: 85, g: 85, b: 85 },    { r: 85, g: 85, b: 255 },
    { r: 85, g: 255, b: 85 },   { r: 85, g: 255, b: 255 },
    { r: 255, g: 85, b: 85 },   { r: 255, g: 85, b: 255 },
    { r: 255, g: 255, b: 85 },  { r: 255, g: 255, b: 255 },
  ],
  gameboy: [
    { r: 15, g: 56, b: 15 },
    { r: 48, g: 98, b: 48 },
    { r: 139, g: 172, b: 15 },
    { r: 155, g: 188, b: 15 },
  ],
  commodore64: [
    { r: 0, g: 0, b: 0 },       { r: 255, g: 255, b: 255 },
    { r: 136, g: 0, b: 0 },     { r: 170, g: 255, b: 238 },
    { r: 204, g: 68, b: 204 },  { r: 0, g: 204, b: 85 },
    { r: 0, g: 0, b: 170 },     { r: 238, g: 238, b: 119 },
    { r: 221, g: 136, b: 85 },  { r: 102, g: 68, b: 0 },
    { r: 255, g: 119, b: 119 }, { r: 51, g: 51, b: 51 },
    { r: 119, g: 119, b: 119 }, { r: 170, g: 255, b: 102 },
    { r: 0, g: 136, b: 255 },   { r: 187, g: 187, b: 187 },
  ],
  nes: [
    { r: 84, g: 84, b: 84 },    { r: 0, g: 30, b: 116 },
    { r: 8, g: 16, b: 144 },    { r: 48, g: 0, b: 136 },
    { r: 68, g: 0, b: 100 },    { r: 92, g: 0, b: 48 },
    { r: 84, g: 4, b: 0 },      { r: 60, g: 24, b: 0 },
    { r: 32, g: 42, b: 0 },     { r: 8, g: 58, b: 0 },
    { r: 0, g: 64, b: 0 },      { r: 0, g: 60, b: 0 },
    { r: 0, g: 50, b: 60 },     { r: 0, g: 0, b: 0 },
    { r: 152, g: 150, b: 152 }, { r: 8, g: 76, b: 196 },
    { r: 48, g: 50, b: 236 },   { r: 92, g: 30, b: 228 },
    { r: 136, g: 20, b: 176 },  { r: 160, g: 20, b: 100 },
    { r: 152, g: 34, b: 32 },   { r: 120, g: 60, b: 0 },
    { r: 84, g: 90, b: 0 },     { r: 40, g: 114, b: 0 },
    { r: 8, g: 124, b: 0 },     { r: 0, g: 118, b: 40 },
    { r: 0, g: 102, b: 120 },   { r: 236, g: 238, b: 236 },
    { r: 76, g: 154, b: 236 },  { r: 120, g: 124, b: 236 },
    { r: 176, g: 98, b: 236 },  { r: 228, g: 84, b: 236 },
    { r: 236, g: 88, b: 180 },  { r: 236, g: 106, b: 100 },
    { r: 212, g: 136, b: 32 },  { r: 160, g: 170, b: 0 },
    { r: 116, g: 196, b: 0 },   { r: 76, g: 208, b: 32 },
    { r: 56, g: 204, b: 108 },  { r: 56, g: 180, b: 204 },
    { r: 60, g: 60, b: 60 },    { r: 236, g: 238, b: 236 },
    { r: 168, g: 204, b: 236 }, { r: 188, g: 188, b: 236 },
    { r: 212, g: 178, b: 236 }, { r: 236, g: 174, b: 236 },
    { r: 236, g: 174, b: 212 }, { r: 236, g: 180, b: 176 },
    { r: 228, g: 196, b: 144 }, { r: 204, g: 210, b: 120 },
    { r: 180, g: 222, b: 120 }, { r: 168, g: 226, b: 144 },
    { r: 152, g: 226, b: 180 }, { r: 160, g: 214, b: 228 },
    { r: 160, g: 162, b: 160 },
  ],
  pico8: [
    { r: 0, g: 0, b: 0 },       { r: 29, g: 43, b: 83 },
    { r: 126, g: 37, b: 83 },   { r: 0, g: 135, b: 81 },
    { r: 171, g: 82, b: 54 },   { r: 95, g: 87, b: 79 },
    { r: 194, g: 195, b: 199 }, { r: 255, g: 241, b: 232 },
    { r: 255, g: 0, b: 77 },    { r: 255, g: 163, b: 0 },
    { r: 255, g: 236, b: 39 },  { r: 0, g: 228, b: 54 },
    { r: 41, g: 173, b: 255 },  { r: 131, g: 118, b: 156 },
    { r: 255, g: 119, b: 168 }, { r: 255, g: 204, b: 170 },
  ],
  pc9801: [
    { r: 0, g: 0, b: 0 },       { r: 0, g: 0, b: 255 },
    { r: 255, g: 0, b: 0 },     { r: 255, g: 0, b: 255 },
    { r: 0, g: 255, b: 0 },     { r: 0, g: 255, b: 255 },
    { r: 255, g: 255, b: 0 },   { r: 255, g: 255, b: 255 },
  ],
};

function generateWebSafePalette(): Color[] {
  const palette: Color[] = [];
  const vals = [0, 51, 102, 153, 204, 255];
  for (const r of vals) {
    for (const g of vals) {
      for (const b of vals) {
        palette.push({ r, g, b });
      }
    }
  }
  return palette;
}

function generateImagePalette(
  imageBuffer: Float32Array,
  width: number,
  height: number,
  colorCount: number,
  mode: ImagePaletteMode
): Color[] {
  switch (mode) {
    case 'median-cut':
      return medianCutPalette(imageBuffer, width, height, colorCount);
    case 'k-means':
      return kmeansPalette(imageBuffer, width, height, colorCount);
    case 'octree':
      return octreePalette(imageBuffer, width, height, colorCount);
    case 'popularity':
      return popularityPalette(imageBuffer, width, height, colorCount);
    case 'uniform': {
      const levels = Math.max(2, Math.ceil(Math.pow(colorCount, 1 / 3)));
      return generateUniformPalette(levels);
    }
    case 'grayscale':
      return generateGrayscalePalette(colorCount);
    case 'monochrome':
      return generateMonochromePalette();
    case 'sepia':
      return generateSepiaPalette(colorCount);
    case 'websafe':
      return generateWebSafePalette();
    case 'cga':
    case 'gameboy':
    case 'commodore64':
    case 'nes':
    case 'pico8':
    case 'pc9801':
      return PRESET_PALETTES[mode];
  }
}

// --- Gamma correction (sRGB <-> linear) ---

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(1, v));
}

function linearizeBuffer(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = srgbToLinear(buf[i]);
  }
}

function delinearizeBuffer(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = linearToSrgb(buf[i]);
  }
}

function linearizePalette(palette: Color[]): Color[] {
  return palette.map(c => ({
    r: Math.round(srgbToLinear(c.r / 255) * 255),
    g: Math.round(srgbToLinear(c.g / 255) * 255),
    b: Math.round(srgbToLinear(c.b / 255) * 255),
  }));
}

// --- "None" algorithm: just quantize to nearest palette color ---

function quantizeOnly(
  buf: Float32Array,
  width: number,
  height: number,
  colorCount: number,
  palette?: Color[]
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      if (palette) {
        const c = findClosestPaletteColor(buf[idx], buf[idx + 1], buf[idx + 2], palette);
        buf[idx]     = c.r / 255;
        buf[idx + 1] = c.g / 255;
        buf[idx + 2] = c.b / 255;
      } else {
        buf[idx]     = quantizeChannel(buf[idx], colorCount);
        buf[idx + 1] = quantizeChannel(buf[idx + 1], colorCount);
        buf[idx + 2] = quantizeChannel(buf[idx + 2], colorCount);
      }
    }
  }
}

// --- Blue noise dithering ---

function applyBlueNoiseDither(
  buf: Float32Array,
  width: number,
  height: number,
  noiseData: Float32Array,
  ditherScale: number,
  colorCount: number,
  ditherStrength: number,
  palette?: Color[],
  technique: DitherTechnique = 'continuous',
  edgeMap?: Float32Array
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      let threshold = getBlueNoiseThreshold(noiseData, x, y, ditherScale);

      const r = buf[idx];
      const g = buf[idx + 1];
      const b = buf[idx + 2];

      let localStrength = ditherStrength;
      if (technique === 'edge-aware' && edgeMap) {
        localStrength = ditherStrength * (1 - edgeMap[y * width + x]);
      }

      if (technique === 'noise-modulated') {
        threshold += (pixelHash(x, y) - 0.5) * 0.5;
        threshold = Math.max(0, Math.min(1, threshold));
      }

      if (technique === 'intermediate') {
        if (palette) {
          const [a, bCol, blend] = findTwoClosestPaletteColors(r, g, b, palette);
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
          buf[idx]     = intermediateChannel(r, n, threshold, localStrength);
          buf[idx + 1] = intermediateChannel(g, n, threshold, localStrength);
          buf[idx + 2] = intermediateChannel(b, n, threshold, localStrength);
        }
      } else {
        if (palette) {
          const bias = (threshold - 0.5) * 0.2 * localStrength;
          const br = Math.max(0, Math.min(1, r + bias));
          const bg = Math.max(0, Math.min(1, g + bias));
          const bb = Math.max(0, Math.min(1, b + bias));
          const c = findClosestPaletteColor(br, bg, bb, palette);
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

function intermediateChannel(v: number, n: number, threshold: number, strength: number): number {
  const scaled = v * n;
  const lo = Math.floor(scaled) / n;
  const hi = Math.min(Math.ceil(scaled) / n, 1);
  const blend = scaled - Math.floor(scaled);
  return blend > threshold * strength ? hi : lo;
}

function bufferToImageData(buf: Float32Array, width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4]     = Math.round(buf[i * 3]     * 255);
    data[i * 4 + 1] = Math.round(buf[i * 3 + 1] * 255);
    data[i * 4 + 2] = Math.round(buf[i * 3 + 2] * 255);
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, width, height);
}

export async function dither(params: DitherParams): Promise<DitherResult> {
  const { width, height, source, algorithm, ditherScale, colorCount, ditherStrength, gammaCorrection, imagePaletteMode, ditherTechnique, directionAngle } = params;
  let { palette } = params;

  const technique = ditherTechnique || 'continuous';

  // Get source buffer
  let buf: Float32Array;
  if (source.type === 'gradient') {
    buf = rasterizeGradient(width, height, source.gradient);
    if (!palette) {
      palette = generateGradientPalette(source.gradient, colorCount);
    }
  } else {
    buf = new Float32Array(source.imageBuffer);
    if (!palette) {
      palette = generateImagePalette(source.imageBuffer, width, height, colorCount, imagePaletteMode);
    }
  }

  // Downsample to block resolution
  const ds = downsample(buf, width, height, ditherScale);

  // Apply gamma correction: linearize before dithering
  let ditherPalette = palette;
  if (gammaCorrection) {
    linearizeBuffer(ds.buf);
    if (ditherPalette) {
      ditherPalette = linearizePalette(ditherPalette);
    }
  }

  // Technique: none / reduce-only → skip algorithm, just quantize
  if (technique === 'reduce-only') {
    // Quantize to palette without any dithering
    quantizeOnly(ds.buf, ds.w, ds.h, colorCount, ditherPalette);
  } else {
    // Compute edge map for edge-aware technique
    let edgeMap: Float32Array | undefined;
    if (technique === 'edge-aware') {
      edgeMap = computeEdgeMap(ds.buf, ds.w, ds.h);
    }

    // Apply dithering algorithm
    switch (algorithm) {
      case 'none':
        quantizeOnly(ds.buf, ds.w, ds.h, colorCount, ditherPalette);
        break;

      case 'bayer2x2':
        orderedDither(ds.buf, ds.w, ds.h, 2, 1, colorCount, ditherStrength, ditherPalette, technique, edgeMap);
        break;
      case 'bayer4x4':
        orderedDither(ds.buf, ds.w, ds.h, 4, 1, colorCount, ditherStrength, ditherPalette, technique, edgeMap);
        break;
      case 'bayer8x8':
        orderedDither(ds.buf, ds.w, ds.h, 8, 1, colorCount, ditherStrength, ditherPalette, technique, edgeMap);
        break;

      case 'blue-noise': {
        const noiseData = await loadBlueNoise();
        applyBlueNoiseDither(ds.buf, ds.w, ds.h, noiseData, 1, colorCount, ditherStrength, ditherPalette, technique, edgeMap);
        break;
      }

      default:
        // All error diffusion algorithms handled by unified engine
        if (ERROR_DIFFUSION_ALGORITHMS.includes(algorithm)) {
          errorDiffusionDither(algorithm, ds.buf, ds.w, ds.h, colorCount, ditherStrength, ditherPalette, technique, edgeMap, directionAngle);
        }
        break;
    }
  }

  // Reverse gamma correction
  if (gammaCorrection) {
    delinearizeBuffer(ds.buf);
  }

  buf = upsample(ds.buf, ds.w, ds.h, width, height);

  return {
    imageData: bufferToImageData(buf, width, height),
    width,
    height,
  };
}
