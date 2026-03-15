import { zipSync, strToU8 } from 'fflate';
import { dither } from '../engine/dither';
import { renderPNG } from '../renderers/png-renderer';
import type { BulkImage, DitherSettings } from '../engine/bulk-types';
import type { DitherParams, DitherResult } from '../engine/types';

function buildParams(image: BulkImage, settings: DitherSettings): DitherParams {
  const effective = { ...settings, ...image.overrides };
  return {
    width: image.width,
    height: image.height,
    source: { type: 'image', imageBuffer: image.buffer, alphaBuffer: image.alphaBuffer },
    algorithm: effective.algorithm,
    ditherScale: effective.ditherScale,
    colorCount: effective.colorCount,
    ditherStrength: effective.ditherStrength,
    gammaCorrection: effective.gammaCorrection,
    imagePaletteMode: effective.imagePaletteMode,
    palette: effective.palette,
    ditherTechnique: effective.ditherTechnique,
    directionAngle: effective.directionAngle,
    alphaThreshold: effective.alphaThreshold,
  };
}

function deduplicateNames(images: BulkImage[]): Map<string, string> {
  const counts = new Map<string, number>();
  const result = new Map<string, string>();

  for (const img of images) {
    const base = img.name.replace(/\.[^.]+$/, '');
    const ext = img.name.includes('.') ? img.name.slice(img.name.lastIndexOf('.')) : '';
    const count = counts.get(img.name) ?? 0;
    counts.set(img.name, count + 1);

    const suffix = count > 0 ? `-${count}` : '';
    result.set(img.id, `${base}${suffix}${ext}`);
  }

  // Second pass: if any name appeared more than once, rename all occurrences
  const finalCounts = new Map<string, number>();
  const finalResult = new Map<string, string>();

  for (const img of images) {
    const base = img.name.replace(/\.[^.]+$/, '');
    const ext = img.name.includes('.') ? img.name.slice(img.name.lastIndexOf('.')) : '';
    const total = counts.get(img.name) ?? 0;

    if (total > 1) {
      const idx = (finalCounts.get(img.name) ?? 0) + 1;
      finalCounts.set(img.name, idx);
      finalResult.set(img.id, `${base}-${idx}${ext}`);
    } else {
      finalResult.set(img.id, result.get(img.id)!);
    }
  }

  return finalResult;
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function exportZip(
  images: BulkImage[],
  globalSettings: DitherSettings,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const names = deduplicateNames(images);
  const zipData: Record<string, Uint8Array> = {};

  for (let i = 0; i < images.length; i++) {
    onProgress?.(i, images.length);
    await yieldToUI();

    const img = images[i];
    let ditherResult: DitherResult;

    if (img.result && !img.stale) {
      ditherResult = img.result;
    } else {
      const params = buildParams(img, globalSettings);
      ditherResult = await dither(params);
    }

    const pngBlob = await renderPNG(ditherResult.imageData);
    const arrayBuf = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(arrayBuf);

    // Use .png extension for the output
    const originalName = names.get(img.id) ?? img.name;
    const pngName = originalName.replace(/\.[^.]+$/, '.png');
    zipData[pngName] = pngBytes;
  }

  onProgress?.(images.length, images.length);

  const zipped = zipSync(zipData, { level: 1 });
  const blob = new Blob([zipped], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dithered-images.zip';
  a.click();
  URL.revokeObjectURL(url);
}
