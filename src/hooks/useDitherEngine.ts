import { useState, useEffect, useCallback, useRef } from 'react';
import { dither } from '../engine/dither';
import { useDebounce } from './useDebounce';
import type { DitherAlgorithm, DitherParams, DitherResult, DitherSource, GradientConfig, Color, ImagePaletteMode } from '../engine/types';

export interface DitherState {
  width: number;
  height: number;
  gradient: GradientConfig;
  algorithm: DitherAlgorithm;
  ditherScale: number;
  colorCount: number;
  ditherStrength: number;
  gammaCorrection: boolean;
  imagePaletteMode: ImagePaletteMode;
  palette: Color[] | undefined;
  sourceType: 'gradient' | 'image';
  imageBuffer: Float32Array | null;
  imageName: string | null;
}

const DEFAULT_STATE: DitherState = {
  width: 256,
  height: 256,
  gradient: {
    type: 'linear',
    angle: 135,
    stops: [
      { position: 0, color: { r: 0, g: 0, b: 0 } },
      { position: 1, color: { r: 255, g: 255, b: 255 } },
    ],
    colorSpace: 'oklab',
  },
  algorithm: 'bayer8x8',
  ditherScale: 1,
  colorCount: 2,
  ditherStrength: 1,
  gammaCorrection: false,
  imagePaletteMode: 'median-cut',
  palette: undefined,
  sourceType: 'gradient',
  imageBuffer: null,
  imageName: null,
};

export function useDitherEngine() {
  const [state, setState] = useState<DitherState>(DEFAULT_STATE);
  const [result, setResult] = useState<DitherResult | null>(null);
  const [rendering, setRendering] = useState(false);
  const abortRef = useRef(0);

  const debouncedState = useDebounce(state, 50);

  useEffect(() => {
    const { sourceType, imageBuffer, gradient, width, height, algorithm, ditherScale, colorCount, ditherStrength, gammaCorrection, imagePaletteMode, palette } = debouncedState;

    // Skip if image mode but no image loaded yet
    if (sourceType === 'image' && !imageBuffer) return;

    const id = ++abortRef.current;
    setRendering(true);

    const source: DitherSource = sourceType === 'image' && imageBuffer
      ? { type: 'image', imageBuffer }
      : { type: 'gradient', gradient };

    const params: DitherParams = {
      width,
      height,
      source,
      algorithm,
      ditherScale,
      colorCount,
      ditherStrength,
      gammaCorrection,
      imagePaletteMode,
      palette,
    };

    dither(params).then((res) => {
      if (abortRef.current === id) {
        setResult(res);
        setRendering(false);
      }
    });
  }, [debouncedState]);

  const update = useCallback((partial: Partial<DitherState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      // When colorCount changes without an explicit palette in the update,
      // clear any preset palette so auto-generation uses the new count
      if ('colorCount' in partial && !('palette' in partial) && prev.palette) {
        next.palette = undefined;
      }
      return next;
    });
  }, []);

  const updateGradient = useCallback((partial: Partial<GradientConfig>) => {
    setState((prev) => ({
      ...prev,
      gradient: { ...prev.gradient, ...partial },
    }));
  }, []);

  const uploadImage = useCallback((file: File) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imgData.data;

      // Convert RGBA uint8 to RGB float32 (0-1)
      const buf = new Float32Array(img.width * img.height * 3);
      for (let i = 0; i < img.width * img.height; i++) {
        buf[i * 3]     = pixels[i * 4]     / 255;
        buf[i * 3 + 1] = pixels[i * 4 + 1] / 255;
        buf[i * 3 + 2] = pixels[i * 4 + 2] / 255;
      }

      setState((prev) => ({
        ...prev,
        sourceType: 'image',
        imageBuffer: buf,
        imageName: file.name,
        width: img.width,
        height: img.height,
      }));

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const clearImage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sourceType: 'gradient',
      imageBuffer: null,
      imageName: null,
    }));
  }, []);

  return { state, result, rendering, update, updateGradient, uploadImage, clearImage };
}
