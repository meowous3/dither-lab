// Unified dithering entry point

import type { DitherParams, DitherResult } from './types';
import { rasterizeGradient, generateGradientPalette } from './gradient';
import { orderedDither } from './ordered-dither';
import { floydSteinbergDither } from './floyd-steinberg';
import { atkinsonDither } from './atkinson';
import { sierraLiteDither } from './sierra';
import { loadBlueNoise, getBlueNoiseThreshold } from './blue-noise';
import { quantizeChannel, findClosestPaletteColor } from './quantize';
import type { Color } from './types';

/**
 * For error diffusion + ditherScale > 1:
 * Downsample, run diffusion, then nearest-neighbor upsample.
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

/** Build a uniform RGB cube palette with `levels` steps per channel. */
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

function applyBlueNoiseDither(
  buf: Float32Array,
  width: number,
  height: number,
  noiseData: Float32Array,
  ditherScale: number,
  colorCount: number,
  ditherStrength: number,
  palette?: Color[]
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const threshold = getBlueNoiseThreshold(noiseData, x, y, ditherScale);

      if (palette) {
        const bias = (threshold - 0.5) * 0.2 * ditherStrength;
        const r = Math.max(0, Math.min(1, buf[idx]     + bias));
        const g = Math.max(0, Math.min(1, buf[idx + 1] + bias));
        const b = Math.max(0, Math.min(1, buf[idx + 2] + bias));
        const c = findClosestPaletteColor(r, g, b, palette);
        buf[idx]     = c.r / 255;
        buf[idx + 1] = c.g / 255;
        buf[idx + 2] = c.b / 255;
      } else {
        const bias = (threshold - 0.5) / colorCount * ditherStrength;
        buf[idx]     = Math.max(0, Math.min(1, quantizeChannel(buf[idx]     + bias, colorCount)));
        buf[idx + 1] = Math.max(0, Math.min(1, quantizeChannel(buf[idx + 1] + bias, colorCount)));
        buf[idx + 2] = Math.max(0, Math.min(1, quantizeChannel(buf[idx + 2] + bias, colorCount)));
      }
    }
  }
}

export async function dither(params: DitherParams): Promise<DitherResult> {
  const { width, height, source, algorithm, ditherScale, colorCount, ditherStrength } = params;
  let { palette } = params;

  // Get source buffer: either rasterize gradient or copy uploaded image
  let buf: Float32Array;
  if (source.type === 'gradient') {
    buf = rasterizeGradient(width, height, source.gradient);
    // For gradients: auto-generate palette from the gradient colors
    // so dithering only uses colors that actually exist on the gradient path.
    if (!palette) {
      palette = generateGradientPalette(source.gradient, colorCount);
    }
  } else {
    buf = new Float32Array(source.imageBuffer);
    // For images: build a uniform RGB cube palette from colorCount levels
    // so dithering uses findClosestPaletteColor in 3D space.
    if (!palette) {
      palette = generateUniformPalette(colorCount);
    }
  }

  // All algorithms: downsample to block resolution, dither at scale=1, upsample
  const ds = downsample(buf, width, height, ditherScale);

  switch (algorithm) {
    case 'bayer2x2':
      orderedDither(ds.buf, ds.w, ds.h, 2, 1, colorCount, ditherStrength, palette);
      break;
    case 'bayer4x4':
      orderedDither(ds.buf, ds.w, ds.h, 4, 1, colorCount, ditherStrength, palette);
      break;
    case 'bayer8x8':
      orderedDither(ds.buf, ds.w, ds.h, 8, 1, colorCount, ditherStrength, palette);
      break;

    case 'floyd-steinberg':
      floydSteinbergDither(ds.buf, ds.w, ds.h, colorCount, ditherStrength, palette);
      break;
    case 'atkinson':
      atkinsonDither(ds.buf, ds.w, ds.h, colorCount, ditherStrength, palette);
      break;
    case 'sierra-lite':
      sierraLiteDither(ds.buf, ds.w, ds.h, colorCount, ditherStrength, palette);
      break;

    case 'blue-noise': {
      const noiseData = await loadBlueNoise();
      applyBlueNoiseDither(ds.buf, ds.w, ds.h, noiseData, 1, colorCount, ditherStrength, palette);
      break;
    }
  }

  buf = upsample(ds.buf, ds.w, ds.h, width, height);

  return {
    imageData: bufferToImageData(buf, width, height),
    width,
    height,
  };
}
