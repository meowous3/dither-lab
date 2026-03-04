// Sobel edge detection for edge-aware dithering technique

/**
 * Compute edge magnitude map from an RGB Float32Array buffer.
 * Returns Float32Array with one value per pixel, normalized 0-1.
 */
export function computeEdgeMap(buf: Float32Array, w: number, h: number): Float32Array {
  const edges = new Float32Array(w * h);
  if (w < 3 || h < 3) return edges;

  // Convert to grayscale inline
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = buf[i * 3] * 0.299 + buf[i * 3 + 1] * 0.587 + buf[i * 3 + 2] * 0.114;
  }

  // Sobel 3x3
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y - 1) * w + (x - 1)];
      const tc = gray[(y - 1) * w + x];
      const tr = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)];
      const mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)];
      const bc = gray[(y + 1) * w + x];
      const br = gray[(y + 1) * w + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.sqrt(gx * gx + gy * gy);

      edges[y * w + x] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  // Normalize to 0-1
  if (maxMag > 0) {
    const inv = 1 / maxMag;
    for (let i = 0; i < edges.length; i++) {
      edges[i] *= inv;
    }
  }

  return edges;
}
