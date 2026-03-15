// ImageData -> SVG string with <rect> elements
// Run-length optimized: merges same-color adjacent rects horizontally

export function renderSVG(imageData: ImageData): string {
  const { width, height, data } = imageData;
  const rects: string[] = [];

  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Skip fully transparent pixels
      if (a === 0) { x++; continue; }

      // Run-length: find consecutive pixels with same color and alpha
      let runLen = 1;
      while (x + runLen < width) {
        const ni = (y * width + x + runLen) * 4;
        if (data[ni] === r && data[ni + 1] === g && data[ni + 2] === b && data[ni + 3] === a) {
          runLen++;
        } else {
          break;
        }
      }

      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      if (a < 255) {
        const opacity = (a / 255).toFixed(2);
        rects.push(`<rect x="${x}" y="${y}" width="${runLen}" height="1" fill="${hex}" fill-opacity="${opacity}"/>`);
      } else {
        rects.push(`<rect x="${x}" y="${y}" width="${runLen}" height="1" fill="${hex}"/>`);
      }
      x += runLen;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" shape-rendering="crispEdges">`,
    ...rects,
    '</svg>',
  ].join('\n');
}

export function estimateSVGSize(width: number, height: number, colorCount: number): number {
  // Rough estimate: each rect is ~60 bytes, run-length reduces count by 30-50%
  const avgRunLength = Math.max(1, Math.floor(colorCount / 2));
  const rectCount = (width / avgRunLength) * height;
  return Math.round(rectCount * 60 + 200);
}
