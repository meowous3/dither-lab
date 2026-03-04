// Gradient rasterizer
// Linear formula ported from BackgroundAlt.tsx:72-96

import type { Color, GradientConfig, GradientStop } from './types';

function lerpColor(a: Color, b: Color, t: number): Color {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function sampleGradient(stops: GradientStop[], t: number): Color {
  const clamped = Math.max(0, Math.min(1, t));
  if (stops.length === 0) return { r: 0, g: 0, b: 0 };
  if (stops.length === 1) return stops[0].color;

  // Find the two surrounding stops
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped >= a.position && clamped <= b.position) {
      const range = b.position - a.position;
      const local = range === 0 ? 0 : (clamped - a.position) / range;
      return lerpColor(a.color, b.color, local);
    }
  }
  // Past the last stop
  return stops[stops.length - 1].color;
}

/**
 * Rasterize a gradient into a flat Float32 RGB buffer (values 0-1).
 * Returns [r,g,b, r,g,b, ...] with width*height*3 entries.
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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1 || 1);
      const ny = y / (height - 1 || 1);

      let t: number;
      switch (config.type) {
        case 'linear':
          // CSS gradient formula: ported from BackgroundAlt.tsx
          t = (nx - 0.5) * sinA + (ny - 0.5) * (-cosA) + 0.5;
          break;
        case 'radial': {
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          t = Math.sqrt(dx * dx + dy * dy) * 2; // 0 at center, 1 at edge
          break;
        }
        case 'conic': {
          const cx = nx - 0.5;
          const cy = ny - 0.5;
          let angle = Math.atan2(cy, cx) + angleRad;
          // Normalize to 0-1
          t = ((angle / (2 * Math.PI)) % 1 + 1) % 1;
          break;
        }
      }

      const color = sampleGradient(config.stops, t);
      const idx = (y * width + x) * 3;
      buf[idx]     = color.r / 255;
      buf[idx + 1] = color.g / 255;
      buf[idx + 2] = color.b / 255;
    }
  }
  return buf;
}
