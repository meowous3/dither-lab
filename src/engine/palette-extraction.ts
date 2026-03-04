// Palette extraction algorithms for images
// All accept a Float32Array (RGB 0-1) and return Color[] (RGB 0-255)

import type { Color } from './types';

const MAX_SAMPLES = 100000;

function samplePixels(buf: Float32Array, width: number, height: number): number[][] {
  const totalPixels = width * height;
  const step = totalPixels > MAX_SAMPLES ? Math.floor(totalPixels / MAX_SAMPLES) : 1;
  const pixels: number[][] = [];
  for (let i = 0; i < totalPixels; i += step) {
    pixels.push([
      Math.round(buf[i * 3] * 255),
      Math.round(buf[i * 3 + 1] * 255),
      Math.round(buf[i * 3 + 2] * 255),
    ]);
  }
  return pixels;
}

// ─── Median Cut ─────────────────────────────────────────────

interface Box {
  pixels: number[][];
  rMin: number; rMax: number;
  gMin: number; gMax: number;
  bMin: number; bMax: number;
}

function computeBox(pixels: number[][]): Box {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const p of pixels) {
    if (p[0] < rMin) rMin = p[0];
    if (p[0] > rMax) rMax = p[0];
    if (p[1] < gMin) gMin = p[1];
    if (p[1] > gMax) gMax = p[1];
    if (p[2] < bMin) bMin = p[2];
    if (p[2] > bMax) bMax = p[2];
  }
  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function splitBox(box: Box): [Box, Box] {
  const rRange = box.rMax - box.rMin;
  const gRange = box.gMax - box.gMin;
  const bRange = box.bMax - box.bMin;
  let channel: number;
  if (rRange >= gRange && rRange >= bRange) channel = 0;
  else if (gRange >= bRange) channel = 1;
  else channel = 2;
  box.pixels.sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(box.pixels.length / 2);
  return [
    computeBox(box.pixels.slice(0, mid)),
    computeBox(box.pixels.slice(mid)),
  ];
}

function boxAverage(box: Box): Color {
  let r = 0, g = 0, b = 0;
  for (const p of box.pixels) { r += p[0]; g += p[1]; b += p[2]; }
  const n = box.pixels.length;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

export function medianCutPalette(
  buf: Float32Array, width: number, height: number, colorCount: number
): Color[] {
  const pixels = samplePixels(buf, width, height);
  if (colorCount <= 1) return [boxAverage(computeBox(pixels))];

  let boxes = [computeBox(pixels)];
  while (boxes.length < colorCount) {
    let bestIdx = -1, bestVolume = 0;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pixels.length < 2) continue;
      const volume = (b.rMax - b.rMin + 1) * (b.gMax - b.gMin + 1) * (b.bMax - b.bMin + 1);
      if (volume > bestVolume) { bestVolume = volume; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    const [a, b] = splitBox(boxes[bestIdx]);
    boxes.splice(bestIdx, 1, a, b);
  }
  return boxes.map(boxAverage);
}

// ─── K-Means (with K-Means++ initialization) ───────────────

function distSq(a: number[], b: number[]): number {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function kmeansppInit(pixels: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  // Pick first centroid randomly
  centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

  for (let c = 1; c < k; c++) {
    // Compute distance from each pixel to nearest existing centroid
    const dists = new Float64Array(pixels.length);
    let totalDist = 0;
    for (let i = 0; i < pixels.length; i++) {
      let minD = Infinity;
      for (const centroid of centroids) {
        const d = distSq(pixels[i], centroid);
        if (d < minD) minD = d;
      }
      dists[i] = minD;
      totalDist += minD;
    }
    // Weighted random pick proportional to distance squared
    let r = Math.random() * totalDist;
    for (let i = 0; i < pixels.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        centroids.push(pixels[i]);
        break;
      }
    }
    if (centroids.length <= c) {
      centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }
  }
  return centroids;
}

export function kmeansPalette(
  buf: Float32Array, width: number, height: number, colorCount: number
): Color[] {
  const pixels = samplePixels(buf, width, height);
  if (colorCount <= 1) {
    let r = 0, g = 0, b = 0;
    for (const p of pixels) { r += p[0]; g += p[1]; b += p[2]; }
    const n = pixels.length;
    return [{ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }];
  }

  const k = Math.min(colorCount, pixels.length);
  let centroids = kmeansppInit(pixels, k);
  const maxIter = 20;
  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign pixels to nearest centroid
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      let bestC = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = distSq(pixels[i], centroids[c]);
        if (d < bestD) { bestD = d; bestC = c; }
      }
      if (assignments[i] !== bestC) { assignments[i] = bestC; changed = true; }
    }
    if (!changed) break;

    // Recompute centroids
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Int32Array(k);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }
    centroids = sums.map((s, c) =>
      counts[c] > 0 ? [s[0] / counts[c], s[1] / counts[c], s[2] / counts[c]] : centroids[c]
    );
  }

  return centroids.map(c => ({
    r: Math.round(c[0]),
    g: Math.round(c[1]),
    b: Math.round(c[2]),
  }));
}

// ─── Octree Quantization ────────────────────────────────────

const OCTREE_DEPTH = 5; // 32k max leaves — fast and sufficient

interface OctreeNode {
  r: number; g: number; b: number;
  count: number;
  children: (OctreeNode | null)[];
  leaf: boolean;
  depth: number;
}

// Track reducible nodes per level and leaf count globally
interface OctreeState {
  root: OctreeNode;
  leafCount: number;
  reducible: OctreeNode[][]; // nodes at each depth that have children
}

function createOctreeNode(depth: number): OctreeNode {
  return { r: 0, g: 0, b: 0, count: 0, children: new Array(8).fill(null), leaf: depth >= OCTREE_DEPTH, depth };
}

function insertOctreePixel(state: OctreeState, r: number, g: number, b: number): void {
  let node = state.root;
  for (let depth = 0; depth < OCTREE_DEPTH; depth++) {
    if (node.leaf) break;
    const shift = 7 - depth;
    const idx = ((r >> shift) & 1) << 2 | ((g >> shift) & 1) << 1 | ((b >> shift) & 1);
    if (!node.children[idx]) {
      const child = createOctreeNode(depth + 1);
      node.children[idx] = child;
      if (child.leaf) {
        state.leafCount++;
      } else {
        state.reducible[depth + 1].push(child);
      }
    }
    node = node.children[idx]!;
  }
  node.r += r;
  node.g += g;
  node.b += b;
  node.count++;
}

function reduceOctreeNode(state: OctreeState, node: OctreeNode): void {
  // Merge children into this node, making it a leaf
  let childLeaves = 0;
  for (const child of node.children) {
    if (child) {
      node.r += child.r;
      node.g += child.g;
      node.b += child.b;
      node.count += child.count;
      childLeaves++;
    }
  }
  node.children = new Array(8).fill(null);
  node.leaf = true;
  // Removed N child leaves, added 1 parent leaf
  state.leafCount -= (childLeaves - 1);
}

function collectLeaves(node: OctreeNode, result: OctreeNode[]): void {
  if (node.leaf) {
    if (node.count > 0) result.push(node);
    return;
  }
  for (const child of node.children) {
    if (child) collectLeaves(child, result);
  }
}

export function octreePalette(
  buf: Float32Array, width: number, height: number, colorCount: number
): Color[] {
  const pixels = samplePixels(buf, width, height);

  const state: OctreeState = {
    root: createOctreeNode(0),
    leafCount: 0,
    reducible: Array.from({ length: OCTREE_DEPTH + 1 }, () => []),
  };

  for (const p of pixels) {
    insertOctreePixel(state, p[0], p[1], p[2]);
  }

  // Reduce from deepest level upward
  for (let depth = OCTREE_DEPTH; depth >= 1 && state.leafCount > colorCount; depth--) {
    const nodes = state.reducible[depth];
    // Sort by count ascending — merge least-populated first
    nodes.sort((a, b) => a.count - b.count);
    for (const node of nodes) {
      if (state.leafCount <= colorCount) break;
      if (!node.leaf) reduceOctreeNode(state, node);
    }
  }

  const leaves: OctreeNode[] = [];
  collectLeaves(state.root, leaves);
  return leaves.map(n => ({
    r: Math.round(n.r / n.count),
    g: Math.round(n.g / n.count),
    b: Math.round(n.b / n.count),
  }));
}

// ─── Popularity (most frequent colors) ──────────────────────

export function popularityPalette(
  buf: Float32Array, width: number, height: number, colorCount: number
): Color[] {
  const pixels = samplePixels(buf, width, height);

  // Quantize to 5-bit per channel (32768 buckets) to group similar colors
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  for (const p of pixels) {
    const qr = p[0] >> 3, qg = p[1] >> 3, qb = p[2] >> 3;
    const key = (qr << 10) | (qg << 5) | qb;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += p[0];
      existing.g += p[1];
      existing.b += p[2];
      existing.count++;
    } else {
      buckets.set(key, { r: p[0], g: p[1], b: p[2], count: 1 });
    }
  }

  // Sort by popularity, take top N
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  return sorted.slice(0, colorCount).map(b => ({
    r: Math.round(b.r / b.count),
    g: Math.round(b.g / b.count),
    b: Math.round(b.b / b.count),
  }));
}
