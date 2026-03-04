// ImageData -> PNG Blob via OffscreenCanvas

export async function renderPNG(imageData: ImageData): Promise<Blob> {
  // Try OffscreenCanvas first (faster, no DOM needed)
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
  }

  // Fallback to regular canvas
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export function estimatePNGSize(width: number, height: number): number {
  // Rough estimate: dithered images compress well due to limited colors
  // PNG overhead + compressed pixel data (assume ~2 bits/pixel for dithered)
  return Math.round(width * height * 0.25 + 1024);
}
