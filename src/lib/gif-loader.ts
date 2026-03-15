import { parseGIF, decompressFrames } from 'gifuct-js';
import type { LoadedImage } from './image-loader';

export async function loadGifFrames(file: File): Promise<LoadedImage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  if (frames.length === 0) return [];

  const width = gif.lsd.width;
  const height = gif.lsd.height;
  const baseName = file.name.replace(/\.gif$/i, '');

  // Composite canvas for handling disposal types
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const results: LoadedImage[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const { dims, patch } = frame;

    // Create frame ImageData from the patch
    const frameImageData = new ImageData(
      new Uint8ClampedArray(patch),
      dims.width,
      dims.height
    );

    // Draw frame patch onto composite canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dims.width;
    tempCanvas.height = dims.height;
    tempCanvas.getContext('2d')!.putImageData(frameImageData, 0, 0);
    ctx.drawImage(tempCanvas, dims.left, dims.top);

    // Extract full-frame pixel data
    const fullFrame = ctx.getImageData(0, 0, width, height);
    const pixels = fullFrame.data;
    const totalPixels = width * height;

    const buf = new Float32Array(totalPixels * 3);
    let hasAlpha = false;
    for (let p = 0; p < totalPixels; p++) {
      buf[p * 3] = pixels[p * 4] / 255;
      buf[p * 3 + 1] = pixels[p * 4 + 1] / 255;
      buf[p * 3 + 2] = pixels[p * 4 + 2] / 255;
      if (pixels[p * 4 + 3] < 255) hasAlpha = true;
    }

    let alphaBuffer: Float32Array | null = null;
    if (hasAlpha) {
      alphaBuffer = new Float32Array(totalPixels);
      for (let p = 0; p < totalPixels; p++) {
        alphaBuffer[p] = pixels[p * 4 + 3] / 255;
      }
    }

    results.push({
      name: `${baseName}-frame-${String(i + 1).padStart(3, '0')}.png`,
      buffer: buf,
      alphaBuffer,
      width,
      height,
    });

    // Handle disposal
    if (frame.disposalType === 2) {
      // Restore to background (clear the frame area)
      ctx.clearRect(dims.left, dims.top, dims.width, dims.height);
    }
    // disposalType 3 (restore to previous) would need a snapshot, skip for simplicity
  }

  return results;
}

export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}
