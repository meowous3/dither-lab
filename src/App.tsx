import { useState, useCallback, useRef, useEffect } from 'react';
import { useDitherEngine } from './hooks/useDitherEngine';
import { useBulkImages } from './hooks/useBulkImages';
import { Preview } from './components/Preview';
import { SourcePicker } from './components/SourcePicker';
import { GradientControls } from './components/GradientControls';
import { AlgorithmPicker } from './components/AlgorithmPicker';
import { TechniquePicker } from './components/TechniquePicker';
import { OutputControls } from './components/OutputControls';
import { DownloadBar } from './components/DownloadBar';
import { ColorPaletteEditor } from './components/ColorPaletteEditor';
import { PaletteFromImage } from './components/PaletteFromImage';
import { PresetBar } from './components/PresetBar';
import { BulkCarousel } from './components/BulkCarousel';
import { BulkSettingsBar } from './components/BulkSettingsBar';
import { exportZip } from './lib/zip-export';
import { isGifFile } from './lib/gif-loader';
import type { DitherSettings } from './engine/bulk-types';
import type { DitherState } from './hooks/useDitherEngine';

function extractSettings(state: DitherState): DitherSettings {
  const { sourceType: _, imageBuffer: _b, alphaBuffer: _a, imageName: _n, width: _w, height: _h, ...settings } = state;
  return settings;
}

// --- Shareable URL ---

function serializeToHash(state: DitherState): string {
  const { sourceType: _, imageBuffer: _b, alphaBuffer: _a, imageName: _n, ...rest } = state;
  try {
    return '#' + btoa(JSON.stringify(rest));
  } catch {
    return '';
  }
}

function deserializeFromHash(hash: string): Partial<DitherState> | null {
  if (!hash || hash.length < 2) return null;
  try {
    return JSON.parse(atob(hash.slice(1)));
  } catch {
    return null;
  }
}

export function App() {
  const engine = useDitherEngine();
  const { state, result, rendering, update, updateGradient, uploadImage, loadBuffer, clearImage, undo, redo } = engine;
  const bulk = useBulkImages();
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  const navigationRef = useRef(false);
  const initializedRef = useRef(false);

  // Restore state from URL hash on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const restored = deserializeFromHash(window.location.hash);
    if (restored) {
      update(restored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL hash when settings change (debounced via debouncedState in engine)
  useEffect(() => {
    if (state.sourceType === 'image') return; // Don't serialize image state
    const hash = serializeToHash(state);
    if (hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [state]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const toggleLock = useCallback((key: string) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Handle bulk image upload
  const handleUploadImages = useCallback(async (files: File[]) => {
    // Snapshot global settings when entering bulk mode
    if (!bulk.globalSettings) {
      bulk.snapshotGlobal(extractSettings(state));
    }

    const newImages = await bulk.addImages(files);
    if (newImages.length > 0 && bulk.images.length === 0) {
      const first = newImages[0];
      loadBuffer(first.buffer, first.width, first.height, first.name, first.alphaBuffer);
    }
  }, [bulk, state, loadBuffer]);

  // When active index changes, load the corresponding image into the engine
  const handleNavigate = useCallback((index: number) => {
    if (bulk.activeImage && result) {
      bulk.cacheResult(bulk.activeImage.id, result);
    }
    bulk.navigate(index);
    navigationRef.current = true;
  }, [bulk, result]);

  // Load image into engine when activeIndex changes
  useEffect(() => {
    if (!navigationRef.current) return;
    navigationRef.current = false;

    const img = bulk.activeImage;
    if (!img) return;

    const effective = bulk.getEffectiveSettings(img);
    if (effective) {
      update({ ...effective });
    }
    loadBuffer(img.buffer, img.width, img.height, img.name, img.alphaBuffer);
  }, [bulk.activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // After first bulk upload, load the first image
  const prevImagesLen = useRef(0);
  useEffect(() => {
    const prev = prevImagesLen.current;
    prevImagesLen.current = bulk.images.length;

    if (prev === 0 && bulk.images.length > 0) {
      const first = bulk.images[0];
      const effective = bulk.getEffectiveSettings(first);
      if (effective) {
        update({ ...effective });
      }
      loadBuffer(first.buffer, first.width, first.height, first.name, first.alphaBuffer);
    }
  }, [bulk.images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intercept settings changes in bulk mode to store overrides
  const handleUpdate = useCallback((partial: Partial<DitherState>) => {
    update(partial);

    if (bulk.bulkMode && bulk.activeImage) {
      const overrideKeys: Partial<DitherSettings> = {};
      const settingsKeys: (keyof DitherSettings)[] = [
        'gradient', 'algorithm', 'ditherScale', 'patternScale', 'colorCount',
        'ditherStrength', 'gammaCorrection', 'imagePaletteMode',
        'palette', 'ditherTechnique', 'directionAngle', 'alphaThreshold',
        'colorDistanceMetric', 'pixelAspectRatio',
      ];
      for (const key of settingsKeys) {
        if (key in partial) {
          (overrideKeys as any)[key] = (partial as any)[key];
        }
      }
      if (Object.keys(overrideKeys).length > 0) {
        bulk.setOverride(bulk.activeImage.id, overrideKeys);
      }
    }
  }, [update, bulk]);

  const handleApplyToAll = useCallback(() => {
    if (!bulk.activeImage) return;
    const effective = bulk.getEffectiveSettings(bulk.activeImage);
    if (effective) {
      bulk.snapshotGlobal(effective);
      bulk.clearOverrides();
    }
  }, [bulk]);

  const handleResetToGlobal = useCallback(() => {
    if (!bulk.activeImage) return;
    bulk.resetOverrides(bulk.activeImage.id);
    if (bulk.globalSettings) {
      update({ ...bulk.globalSettings });
    }
  }, [bulk, update]);

  const handleRemoveImage = useCallback(() => {
    if (!bulk.activeImage) return;
    const id = bulk.activeImage.id;
    const remaining = bulk.images.filter((img) => img.id !== id);

    bulk.removeImage(id);

    if (remaining.length === 0) {
      clearImage();
    } else if (remaining.length === 1) {
      const single = remaining[0];
      loadBuffer(single.buffer, single.width, single.height, single.name, single.alphaBuffer);
    } else {
      const nextIdx = Math.min(bulk.activeIndex, remaining.length - 1);
      const next = remaining[nextIdx];
      const effective = bulk.getEffectiveSettings(next);
      if (effective) update({ ...effective });
      loadBuffer(next.buffer, next.width, next.height, next.name, next.alphaBuffer);
    }
  }, [bulk, clearImage, loadBuffer, update]);

  const handleClearAll = useCallback(() => {
    bulk.clearAll();
    clearImage();
  }, [bulk, clearImage]);

  const handleDownloadZip = useCallback(async () => {
    if (bulk.images.length === 0) return;

    if (bulk.activeImage && result) {
      bulk.cacheResult(bulk.activeImage.id, result);
    }

    const globalSettings = bulk.globalSettings ?? extractSettings(state);
    setZipProgress({ current: 0, total: bulk.images.length });

    try {
      await exportZip(bulk.images, globalSettings, (current, total) => {
        setZipProgress({ current, total });
      });
    } finally {
      setZipProgress(null);
    }
  }, [bulk, result, state]);

  const handleSingleUpload = useCallback((file: File) => {
    if (isGifFile(file)) {
      // GIFs always go through bulk to handle frames
      handleUploadImages([file]);
    } else if (bulk.images.length > 0) {
      handleUploadImages([file]);
    } else {
      uploadImage(file);
    }
  }, [bulk.images.length, handleUploadImages, uploadImage]);

  const handleSelectGradient = useCallback(() => {
    if (bulk.images.length > 0) {
      bulk.clearAll();
    }
    clearImage();
  }, [bulk, clearImage]);

  return (
    <div className="app">
      <div className="panel-left">
        <Preview result={result} rendering={rendering} pixelAspectRatio={state.pixelAspectRatio} />
      </div>
      <div className="panel-right">
        <h1 className="app-title">webdither</h1>
        <SourcePicker
          sourceType={state.sourceType}
          imageName={state.imageName}
          imagePaletteMode={state.imagePaletteMode}
          onSelectGradient={handleSelectGradient}
          onUploadImage={handleSingleUpload}
          onUploadImages={handleUploadImages}
          onPaletteModeChange={(imagePaletteMode) => handleUpdate({ imagePaletteMode })}
          bulkCount={bulk.images.length > 1 ? bulk.images.length : undefined}
          locks={locks}
          toggleLock={toggleLock}
        />
        {bulk.bulkMode && bulk.activeImage && (
          <>
            <BulkCarousel
              imageName={bulk.activeImage.name}
              activeIndex={bulk.activeIndex}
              totalCount={bulk.images.length}
              onNavigate={handleNavigate}
              onRemove={handleRemoveImage}
              onClear={handleClearAll}
            />
            <BulkSettingsBar
              hasOverrides={Object.keys(bulk.activeImage.overrides).length > 0}
              onApplyToAll={handleApplyToAll}
              onResetToGlobal={handleResetToGlobal}
            />
          </>
        )}
        <PresetBar
          sourceType={state.sourceType}
          locks={locks}
          currentGradient={state.gradient}
          onApply={(partial) => {
            handleUpdate(partial);
          }}
        />
        {state.sourceType === 'gradient' && (
          <GradientControls
            gradient={state.gradient}
            onUpdate={updateGradient}
            locks={locks}
            toggleLock={toggleLock}
          />
        )}
        <AlgorithmPicker
          value={state.algorithm}
          onChange={(algorithm) => handleUpdate({ algorithm })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <TechniquePicker
          value={state.ditherTechnique}
          directionAngle={state.directionAngle}
          onChange={(ditherTechnique) => handleUpdate({ ditherTechnique })}
          onAngleChange={(directionAngle) => handleUpdate({ directionAngle })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <OutputControls
          width={state.width}
          height={state.height}
          algorithm={state.algorithm}
          ditherScale={state.ditherScale}
          patternScale={state.patternScale}
          colorCount={state.colorCount}
          ditherStrength={state.ditherStrength}
          gammaCorrection={state.gammaCorrection}
          alphaThreshold={state.alphaThreshold}
          hasAlpha={state.alphaBuffer != null}
          colorDistanceMetric={state.colorDistanceMetric}
          pixelAspectRatio={state.pixelAspectRatio}
          onUpdate={handleUpdate}
          locks={locks}
          toggleLock={toggleLock}
        />
        <ColorPaletteEditor
          palette={state.palette}
          onUpdate={(palette) => handleUpdate({ palette })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <PaletteFromImage
          onApply={(palette) => handleUpdate({ palette })}
        />
        <DownloadBar
          result={result}
          colorCount={state.colorCount}
          bulkMode={bulk.bulkMode}
          onDownloadZip={handleDownloadZip}
          zipProgress={zipProgress}
          imageName={state.imageName}
        />
      </div>
    </div>
  );
}
