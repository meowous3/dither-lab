// Custom dithering threshold patterns

// Halftone dot pattern (8x8) - circular dots that grow from center
export const halftone8x8: number[][] = (() => {
  const m: number[][] = Array.from({ length: 8 }, () => new Array(8));
  // Distance from center of each 4x4 quadrant, tiled 2x2
  const order = [
    [24, 10,  6, 14, 22, 10,  6, 14],
    [12,  4,  2,  8, 12,  4,  2,  8],
    [ 7,  1,  0,  3,  7,  1,  0,  3],
    [16,  5,  9, 18, 16,  5,  9, 18],
    [24, 10,  6, 14, 22, 10,  6, 14],
    [12,  4,  2,  8, 12,  4,  2,  8],
    [ 7,  1,  0,  3,  7,  1,  0,  3],
    [16,  5,  9, 18, 16,  5,  9, 18],
  ];
  // Remap to unique ranks, normalize to 0-1
  const flat = order.flat();
  const sorted = [...new Set(flat)].sort((a, b) => a - b);
  const rankMap = new Map(sorted.map((v, i) => [v, i]));
  const maxRank = sorted.length - 1;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      m[y][x] = (rankMap.get(order[y][x])! + 0.5) / (maxRank + 1);
    }
  }
  return m;
})();

// Crosshatch pattern (8x8) - diagonal crossing lines
export const crosshatch8x8: number[][] = (() => {
  const m: number[][] = Array.from({ length: 8 }, () => new Array(8));
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // Two diagonal distances, take min for cross effect
      const d1 = Math.abs((x - y + 8) % 8);
      const d2 = Math.abs((x + y) % 8);
      const d = Math.min(d1, d2, 8 - d1, 8 - d2);
      m[y][x] = (d + 0.5) / 4.5;
    }
  }
  return m;
})();

// Horizontal line pattern (4x4)
export const horizontalLine4x4: number[][] = [
  [0.125, 0.125, 0.125, 0.125],
  [0.375, 0.375, 0.375, 0.375],
  [0.625, 0.625, 0.625, 0.625],
  [0.875, 0.875, 0.875, 0.875],
];

export function getPatternMatrix(pattern: 'halftone' | 'crosshatch' | 'horizontal-line'): number[][] {
  switch (pattern) {
    case 'halftone': return halftone8x8;
    case 'crosshatch': return crosshatch8x8;
    case 'horizontal-line': return horizontalLine4x4;
  }
}
