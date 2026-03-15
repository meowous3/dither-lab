import { useState, useCallback, useRef } from 'react';
import { loadImageFile } from '../lib/image-loader';
import type { BulkImage, DitherSettings } from '../engine/bulk-types';
import type { DitherResult } from '../engine/types';

export function useBulkImages() {
  const [images, setImages] = useState<BulkImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalSettings, setGlobalSettings] = useState<DitherSettings | null>(null);
  const idCounterRef = useRef(0);

  const bulkMode = images.length > 1;
  const activeImage = images[activeIndex] ?? null;

  const addImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return [];

    const loaded = await Promise.all(
      imageFiles.map((f) => loadImageFile(f).catch(() => null))
    );

    const newImages: BulkImage[] = [];
    for (const img of loaded) {
      if (!img) continue;
      newImages.push({
        id: `bulk-${++idCounterRef.current}`,
        name: img.name,
        buffer: img.buffer,
        alphaBuffer: img.alphaBuffer,
        width: img.width,
        height: img.height,
        overrides: {},
        result: null,
        stale: true,
      });
    }

    setImages((prev) => {
      const next = [...prev, ...newImages];
      return next;
    });

    return newImages;
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      return next;
    });
    setActiveIndex((prev) => {
      // Adjust index if needed
      return Math.min(prev, Math.max(0, images.length - 2));
    });
  }, [images.length]);

  const clearAll = useCallback(() => {
    setImages([]);
    setActiveIndex(0);
    setGlobalSettings(null);
  }, []);

  const navigate = useCallback((index: number) => {
    setActiveIndex((prev) => {
      const clamped = Math.max(0, Math.min(index, images.length - 1));
      return clamped === prev ? prev : clamped;
    });
  }, [images.length]);

  const setOverride = useCallback((id: string, partial: Partial<DitherSettings>) => {
    setImages((prev) => prev.map((img) =>
      img.id === id
        ? { ...img, overrides: { ...img.overrides, ...partial }, stale: true, result: null }
        : img
    ));
  }, []);

  const resetOverrides = useCallback((id: string) => {
    setImages((prev) => prev.map((img) =>
      img.id === id
        ? { ...img, overrides: {}, stale: true, result: null }
        : img
    ));
  }, []);

  const applyToAll = useCallback((settings: Partial<DitherSettings>) => {
    setImages((prev) => prev.map((img) => ({
      ...img,
      overrides: { ...settings },
      stale: true,
      result: null,
    })));
  }, []);

  const clearOverrides = useCallback(() => {
    setImages((prev) => prev.map((img) => ({
      ...img,
      overrides: {},
      stale: true,
      result: null,
    })));
  }, []);

  const getEffectiveSettings = useCallback((image: BulkImage): DitherSettings | null => {
    if (!globalSettings) return null;
    return { ...globalSettings, ...image.overrides };
  }, [globalSettings]);

  const cacheResult = useCallback((id: string, result: DitherResult) => {
    setImages((prev) => prev.map((img) =>
      img.id === id
        ? { ...img, result, stale: false }
        : img
    ));
  }, []);

  const snapshotGlobal = useCallback((settings: DitherSettings) => {
    setGlobalSettings(settings);
  }, []);

  return {
    images,
    activeIndex,
    activeImage,
    bulkMode,
    globalSettings,
    addImages,
    removeImage,
    clearAll,
    navigate,
    setOverride,
    resetOverrides,
    applyToAll,
    clearOverrides,
    getEffectiveSettings,
    cacheResult,
    snapshotGlobal,
  };
}
