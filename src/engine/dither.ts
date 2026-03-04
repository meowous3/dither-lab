// Unified dithering entry point

import type { DitherParams, DitherResult } from './types';
import { rasterizeGradient } from './gradient';
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
  palette?: Color[]
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const threshold = getBlueNoiseThreshold(noiseData, x, y, ditherScale);

      if (palette) {
        const lum = 0.299 * buf[idx] + 0.587 * buf[idx + 1] + 0.114 * buf[idx + 2];
        const biased = Math.max(0, Math.min(1, lum + (threshold - 0.5) * 0.2));
        const c = findClosestPaletteColor(biased, biased, biased, palette);
        buf[idx]     = c.r / 255;
        buf[idx + 1] = c.g / 255;
        buf[idx + 2] = c.b / 255;
      } else {
        const bias = (threshold - 0.5) / colorCount;
        buf[idx]     = Math.max(0, Math.min(1, quantizeChannel(buf[idx]     + bias, colorCount)));
        buf[idx + 1] = Math.max(0, Math.min(1, quantizeChannel(buf[idx + 1] + bias, colorCount)));
        buf[idx + 2] = Math.max(0, Math.min(1, quantizeChannel(buf[idx + 2] + bias, colorCount)));
      }
    }
  }
}

export async function ditherGradient(params: DitherParams): Promise<DitherResult> {
  const { width, height, gradient, algorithm, ditherScale, colorCount, palette } = params;

  // Rasterize the gradient
  let buf = rasterizeGradient(width, height, gradient);

  switch (algorithm) {
    case 'bayer2x2':
      orderedDither(buf, width, height, 2, ditherScale, colorCount, palette);
      break;
    case 'bayer4x4':
      orderedDither(buf, width, height, 4, ditherScale, colorCount, palette);
      break;
    case 'bayer8x8':
      orderedDither(buf, width, height, 8, ditherScale, colorCount, palette);
      break;

    case 'floyd-steinberg': {
      const ds = downsample(buf, width, height, ditherScale);
      floydSteinbergDither(ds.buf, ds.w, ds.h, colorCount, palette);
      buf = upsample(ds.buf, ds.w, ds.h, width, height);
      break;
    }
    case 'atkinson': {
      const ds = downsample(buf, width, height, ditherScale);
      atkinsonDither(ds.buf, ds.w, ds.h, colorCount, palette);
      buf = upsample(ds.buf, ds.w, ds.h, width, height);
      break;
    }
    case 'sierra-lite': {
      const ds = downsample(buf, width, height, ditherScale);
      sierraLiteDither(ds.buf, ds.w, ds.h, colorCount, palette);
      buf = upsample(ds.buf, ds.w, ds.h, width, height);
      break;
    }

    case 'blue-noise': {
      const noiseData = await loadBlueNoise();
      applyBlueNoiseDither(buf, width, height, noiseData, ditherScale, colorCount, palette);
      break;
    }
  }

  return {
    imageData: bufferToImageData(buf, width, height),
    width,
    height,
  };
}
