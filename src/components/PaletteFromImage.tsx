import { useState, useRef, useCallback, useEffect } from 'react';
import type { Color } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { loadImageFile } from '../lib/image-loader';
import { medianCutPalette, kmeansPalette, octreePalette, popularityPalette } from '../engine/palette-extraction';

type ExtractionAlgorithm = 'median-cut' | 'k-means' | 'octree' | 'popularity';

interface PaletteFromImageProps {
  onApply: (palette: Color[]) => void;
}

function colorToHex(c: Color): string {
  return '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function extractPalette(
  buffer: Float32Array,
  width: number,
  height: number,
  count: number,
  algorithm: ExtractionAlgorithm,
): Color[] {
  switch (algorithm) {
    case 'median-cut': return medianCutPalette(buffer, width, height, count);
    case 'k-means': return kmeansPalette(buffer, width, height, count);
    case 'octree': return octreePalette(buffer, width, height, count);
    case 'popularity': return popularityPalette(buffer, width, height, count);
  }
}

export function PaletteFromImage({ onApply }: PaletteFromImageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceImage, setSourceImage] = useState<{ name: string; buffer: Float32Array; width: number; height: number; thumbUrl: string } | null>(null);
  const [algorithm, setAlgorithm] = useState<ExtractionAlgorithm>('median-cut');
  const [colorCount, setColorCount] = useState(8);
  const [sortBy, setSortBy] = useState<'none' | 'luminance' | 'hue'>('none');
  const [colors, setColors] = useState<Color[]>([]);

  const loadSource = useCallback((file: File) => {
    // Create thumbnail URL
    const thumbUrl = URL.createObjectURL(file);
    loadImageFile(file).then((loaded) => {
      setSourceImage({ name: loaded.name, buffer: loaded.buffer, width: loaded.width, height: loaded.height, thumbUrl });
    });
  }, []);

  // Re-extract when source, algorithm, or count changes
  useEffect(() => {
    if (!sourceImage) return;
    const extracted = extractPalette(sourceImage.buffer, sourceImage.width, sourceImage.height, Math.max(2, colorCount), algorithm);
    setColors(sortColors(extracted, sortBy));
  }, [sourceImage, algorithm, colorCount, sortBy]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) loadSource(file);
  }, [loadSource]);

  return (
    <CollapsibleGroup title="Palette from Image" defaultOpen={false}>
      <div
        className={`source-dropzone ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileRef.current?.click()}
      >
        {sourceImage ? (
          <div className="palette-source-preview">
            <img src={sourceImage.thumbUrl} alt="" className="palette-source-thumb" />
            <span className="source-filename">{sourceImage.name}</span>
          </div>
        ) : (
          <span className="source-hint">Drop image or click to browse</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadSource(file);
          e.target.value = '';
        }}
      />

      {sourceImage && (
        <>
          <label>
            Algorithm
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as ExtractionAlgorithm)}>
              <option value="median-cut">Median Cut</option>
              <option value="k-means">K-Means</option>
              <option value="octree">Octree</option>
              <option value="popularity">Popularity</option>
            </select>
          </label>

          <label>
            Colors
            <div className="range-row">
              <input
                type="range"
                min={2}
                max={64}
                value={colorCount}
                onChange={(e) => setColorCount(Number(e.target.value))}
              />
              <span className="range-value">{colorCount}</span>
            </div>
          </label>

          <label>
            Sort
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'none' | 'luminance' | 'hue')}>
              <option value="none">Extraction Order</option>
              <option value="luminance">Luminance</option>
              <option value="hue">Hue</option>
            </select>
          </label>

          {colors.length > 0 && (
            <>
              <div className="palette-swatches-grid">
                {colors.map((c, i) => (
                  <span
                    key={i}
                    className="palette-swatch-lg"
                    style={{ backgroundColor: colorToHex(c) }}
                    title={colorToHex(c)}
                  />
                ))}
              </div>
              <button className="palette-apply-btn" onClick={() => onApply(colors)}>
                Apply as Custom Palette
              </button>
            </>
          )}
        </>
      )}
    </CollapsibleGroup>
  );
}

function luminance(c: Color): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

function hue(c: Color): number {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return h * 60;
}

function sortColors(colors: Color[], by: 'none' | 'luminance' | 'hue'): Color[] {
  if (by === 'none') return colors;
  const sorted = [...colors];
  if (by === 'luminance') sorted.sort((a, b) => luminance(a) - luminance(b));
  else sorted.sort((a, b) => hue(a) - hue(b));
  return sorted;
}
