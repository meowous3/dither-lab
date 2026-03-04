import { useCallback, useRef, useState } from 'react';
import type { ImagePaletteMode } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { LockToggle } from './LockToggle';

interface SourcePickerProps {
  sourceType: 'gradient' | 'image';
  imageName: string | null;
  imagePaletteMode: ImagePaletteMode;
  onSelectGradient: () => void;
  onUploadImage: (file: File) => void;
  onPaletteModeChange: (mode: ImagePaletteMode) => void;
  locks: Set<string>;
  toggleLock: (key: string) => void;
}

export function SourcePicker({ sourceType, imageName, imagePaletteMode, onSelectGradient, onUploadImage, onPaletteModeChange, locks, toggleLock }: SourcePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      onUploadImage(file);
    }
  }, [onUploadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <CollapsibleGroup title="Source">
      <div className="source-tabs">
        <button
          className={`source-tab ${sourceType === 'gradient' ? 'active' : ''}`}
          onClick={onSelectGradient}
        >
          Gradient
        </button>
        <button
          className={`source-tab ${sourceType === 'image' ? 'active' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          Image
        </button>
      </div>
      {sourceType === 'image' && (
        <>
          <div
            className={`source-dropzone ${dragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileRef.current?.click()}
          >
            {imageName
              ? <span className="source-filename">{imageName}</span>
              : <span className="source-hint">Drop image or click to browse</span>
            }
          </div>
          <label>
            <span className="label-with-lock">
              Palette Mode
              <LockToggle locked={locks.has('imagePaletteMode')} onToggle={() => toggleLock('imagePaletteMode')} />
            </span>
            <select
              value={imagePaletteMode}
              onChange={(e) => onPaletteModeChange(e.target.value as ImagePaletteMode)}
            >
              <optgroup label="Adaptive">
                <option value="median-cut">Median Cut</option>
                <option value="k-means">K-Means</option>
                <option value="octree">Octree</option>
                <option value="popularity">Popularity</option>
              </optgroup>
              <optgroup label="Generated">
                <option value="uniform">Uniform RGB</option>
                <option value="grayscale">Grayscale</option>
                <option value="monochrome">Monochrome (B&W)</option>
                <option value="sepia">Sepia</option>
                <option value="websafe">Web Safe (216)</option>
              </optgroup>
              <optgroup label="Hardware">
                <option value="cga">CGA (16)</option>
                <option value="gameboy">Game Boy (4)</option>
                <option value="commodore64">Commodore 64 (16)</option>
                <option value="nes">NES (54)</option>
                <option value="pico8">PICO-8 (16)</option>
                <option value="pc9801">PC-9801 (8)</option>
              </optgroup>
            </select>
          </label>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </CollapsibleGroup>
  );
}
