// Gradient rasterizer with multiple color space interpolation

import type { Color, ColorSpace, GradientConfig, GradientStop } from './types';

// --- Color space conversions ---

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, v * 255));
}

function rgbToOklab(color: Color): [number, number, number] {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

function oklabToRgb(L: number, a: number, b: number): Color {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  };
}

function rgbToOklch(color: Color): [number, number, number] {
  const [L, a, b] = rgbToOklab(color);
  const C = Math.sqrt(a * a + b * b);
  const h = Math.atan2(b, a); // radians
  return [L, C, h];
}

function oklchToRgb(L: number, C: number, h: number): Color {
  return oklabToRgb(L, C * Math.cos(h), C * Math.sin(h));
}

function rgbToHsl(color: Color): [number, number, number] {
  const r = color.r / 255, g = color.g / 255, b = color.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l]; // h in 0-1
}

function hslToRgb(h: number, s: number, l: number): Color {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}

/** Shortest-arc lerp for angles (hue). Works in radians or 0-1 normalized. */
function lerpAngle(a: number, b: number, t: number, period: number): number {
  let diff = ((b - a) % period + period * 1.5) % period - period / 2;
  return a + diff * t;
}

// --- Interpolation ---

function lerpColor(a: Color, b: Color, t: number, space: ColorSpace): Color {
  switch (space) {
    case 'rgb':
      return {
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
      };

    case 'hsl': {
      const [ah, as, al] = rgbToHsl(a);
      const [bh, bs, bl] = rgbToHsl(b);
      const h = lerpAngle(ah, bh, t, 1);
      return hslToRgb(h, as + (bs - as) * t, al + (bl - al) * t);
    }

    case 'oklab': {
      const [aL, aa, ab] = rgbToOklab(a);
      const [bL, ba, bb] = rgbToOklab(b);
      return oklabToRgb(
        aL + (bL - aL) * t,
        aa + (ba - aa) * t,
        ab + (bb - ab) * t,
      );
    }

    case 'oklch': {
      const [aL, aC, ah] = rgbToOklch(a);
      const [bL, bC, bh] = rgbToOklch(b);
      const h = lerpAngle(ah, bh, t, 2 * Math.PI);
      return oklchToRgb(
        aL + (bL - aL) * t,
        aC + (bC - aC) * t,
        h,
      );
    }
  }
}

// --- Gradient sampling ---

function sampleGradientColor(
  stops: GradientStop[],
  t: number,
  space: ColorSpace
): Color {
  const clamped = Math.max(0, Math.min(1, t));
  if (stops.length === 0) return { r: 0, g: 0, b: 0 };
  if (stops.length === 1) return stops[0].color;

  if (clamped <= stops[0].position) return stops[0].color;
  if (clamped >= stops[stops.length - 1].position) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped >= a.position && clamped <= b.position) {
      const range = b.position - a.position;
      const local = range === 0 ? 0 : (clamped - a.position) / range;
      return lerpColor(a.color, b.color, local, space);
    }
  }
  return stops[stops.length - 1].color;
}

/**
 * For conic/spiral gradients: append a copy of the first stop at position 1
 * so the gradient wraps seamlessly (no harsh seam).
 */
function wrapStops(stops: GradientStop[]): GradientStop[] {
  if (stops.length === 0) return stops;
  const last = stops[stops.length - 1];
  // Only add wrap stop if the last stop doesn't already end at position 1
  // with the same color as the first
  if (last.position >= 1) return stops;
  return [...stops, { position: 1, color: stops[0].color }];
}

function roundColor(c: Color): Color {
  return {
    r: Math.max(0, Math.min(255, Math.round(c.r))),
    g: Math.max(0, Math.min(255, Math.round(c.g))),
    b: Math.max(0, Math.min(255, Math.round(c.b))),
  };
}

/**
 * Generate a palette of N colors sampled from the gradient.
 * Always includes every stop color. Extra slots are distributed
 * between adjacent key positions (0, stops, 1) proportional to gap size.
 */
export function generateGradientPalette(config: GradientConfig, count: number): Color[] {
  const isCyclic = config.type === 'conic' || config.type === 'spiral';
  const stops = isCyclic ? wrapStops(config.stops) : config.stops;
  const space = config.colorSpace || 'rgb';

  if (count <= 1) return [roundColor(sampleGradientColor(stops, 0, space))];

  const keys = [...new Set([0, ...stops.map(s => s.position), 1])].sort((a, b) => a - b);

  if (count <= keys.length) {
    return Array.from({ length: count }, (_, i) =>
      roundColor(sampleGradientColor(stops, i / (count - 1), space))
    );
  }

  const segLens = keys.slice(1).map((k, i) => k - keys[i]);
  const totalLen = segLens.reduce((a, b) => a + b, 0) || 1;
  const extra = count - keys.length;

  const segExtras = segLens.map(len => len / totalLen * extra);
  const allocated = segExtras.map(Math.floor);
  let remainder = extra - allocated.reduce((a, b) => a + b, 0);
  const byFraction = segExtras.map((_, i) => i).sort((a, b) =>
    (segExtras[b] - allocated[b]) - (segExtras[a] - allocated[a])
  );
  for (const idx of byFraction) {
    if (remainder <= 0) break;
    allocated[idx]++;
    remainder--;
  }

  const palette: Color[] = [];
  for (let s = 0; s < segLens.length; s++) {
    palette.push(roundColor(sampleGradientColor(stops, keys[s], space)));
    const n = allocated[s];
    for (let i = 1; i <= n; i++) {
      const t = keys[s] + segLens[s] * i / (n + 1);
      palette.push(roundColor(sampleGradientColor(stops, t, space)));
    }
  }
  palette.push(roundColor(sampleGradientColor(stops, keys[keys.length - 1], space)));

  return palette;
}

/**
 * Rasterize a gradient into a flat Float32 RGB buffer (values 0-1).
 */
export function rasterizeGradient(
  width: number,
  height: number,
  config: GradientConfig
): Float32Array {
  const buf = new Float32Array(width * height * 3);
  const angleRad = (config.angle * Math.PI) / 180;
  const sinA = Math.sin(angleRad);
  const cosA = Math.cos(angleRad);
  const space = config.colorSpace || 'rgb';
  const isCyclic = config.type === 'conic' || config.type === 'spiral';
  const stops = isCyclic ? wrapStops(config.stops) : config.stops;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1 || 1);
      const ny = y / (height - 1 || 1);
      const dx = nx - 0.5;
      const dy = ny - 0.5;

      let t: number;
      switch (config.type) {
        case 'linear':
          t = dx * sinA + dy * (-cosA) + 0.5;
          break;
        case 'radial':
          t = Math.sqrt(dx * dx + dy * dy) * 2;
          break;
        case 'conic': {
          let angle = Math.atan2(dy, dx) + angleRad;
          t = ((angle / (2 * Math.PI)) % 1 + 1) % 1;
          break;
        }
        case 'diamond':
          t = (Math.abs(dx) + Math.abs(dy)) * 2;
          break;
        case 'square':
          t = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
          break;
        case 'spiral': {
          const dist = Math.sqrt(dx * dx + dy * dy) * 2;
          let sAngle = Math.atan2(dy, dx) + angleRad;
          const angular = ((sAngle / (2 * Math.PI)) % 1 + 1) % 1;
          t = (angular + dist) % 1;
          break;
        }
      }

      const color = sampleGradientColor(stops, t, space);
      const idx = (y * width + x) * 3;
      buf[idx]     = color.r / 255;
      buf[idx + 1] = color.g / 255;
      buf[idx + 2] = color.b / 255;
    }
  }
  return buf;
}
