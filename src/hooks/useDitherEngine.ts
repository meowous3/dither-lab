import { useState, useEffect, useCallback, useRef } from 'react';
import { dither } from '../engine/dither';
import { useDebounce } from './useDebounce';
import { loadImageFile } from '../lib/image-loader';
import type { DitherAlgorithm, DitherTechnique, DitherParams, DitherResult, DitherSource, GradientConfig, Color, ImagePaletteMode, ColorDistanceMetric } from '../engine/types';

export interface DitherState {
  width: number;
  height: number;
  gradient: GradientConfig;
  algorithm: DitherAlgorithm;
  ditherScale: number;
  patternScale: number;
  colorCount: number;
  ditherStrength: number;
  gammaCorrection: boolean;
  imagePaletteMode: ImagePaletteMode;
  palette: Color[] | undefined;
  ditherTechnique: DitherTechnique;
  directionAngle: number;
  alphaThreshold: number;
  colorDistanceMetric: ColorDistanceMetric;
  pixelAspectRatio: number;
  sourceType: 'gradient' | 'image';
  imageBuffer: Float32Array | null;
  alphaBuffer: Float32Array | null;
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
  patternScale: 1,
  colorCount: 2,
  ditherStrength: 1,
  gammaCorrection: false,
  imagePaletteMode: 'median-cut',
  palette: undefined,
  ditherTechnique: 'intermediate',
  directionAngle: 0,
  alphaThreshold: 128,
  colorDistanceMetric: 'euclidean-rgb',
  pixelAspectRatio: 1,
  sourceType: 'gradient',
  imageBuffer: null,
  alphaBuffer: null,
  imageName: null,
};

const MAX_HISTORY = 50;

export function useDitherEngine() {
  const [state, setState] = useState<DitherState>(DEFAULT_STATE);
  const [result, setResult] = useState<DitherResult | null>(null);
  const [rendering, setRendering] = useState(false);
  const abortRef = useRef(0);

  // Undo/redo history
  const historyRef = useRef<DitherState[]>([]);
  const futureRef = useRef<DitherState[]>([]);
  const skipHistoryRef = useRef(false);

  const debouncedState = useDebounce(state, 50);

  useEffect(() => {
    const { sourceType, imageBuffer, alphaBuffer, gradient, width, height, algorithm, ditherScale, patternScale, colorCount, ditherStrength, gammaCorrection, imagePaletteMode, palette, ditherTechnique, directionAngle, alphaThreshold, colorDistanceMetric, pixelAspectRatio } = debouncedState;

    // Skip if image mode but no image loaded yet
    if (sourceType === 'image' && !imageBuffer) return;

    const id = ++abortRef.current;
    setRendering(true);

    const source: DitherSource = sourceType === 'image' && imageBuffer
      ? { type: 'image', imageBuffer, alphaBuffer }
      : { type: 'gradient', gradient };

    const params: DitherParams = {
      width,
      height,
      source,
      algorithm,
      ditherScale,
      patternScale,
      colorCount,
      ditherStrength,
      gammaCorrection,
      imagePaletteMode,
      palette,
      ditherTechnique,
      directionAngle,
      alphaThreshold,
      colorDistanceMetric,
      pixelAspectRatio,
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
      // Push to undo history
      if (!skipHistoryRef.current) {
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev];
        futureRef.current = [];
      }
      skipHistoryRef.current = false;

      const next = { ...prev, ...partial };
      // When colorCount changes without an explicit palette in the update,
      // clear any preset palette so auto-generation uses the new count
      if ('colorCount' in partial && !('palette' in partial) && prev.palette) {
        next.palette = undefined;
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setState((current) => {
      futureRef.current.push(current);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    setState((current) => {
      historyRef.current.push(current);
      return next;
    });
  }, []);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const updateGradient = useCallback((partial: Partial<GradientConfig>) => {
    setState((prev) => {
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev];
      futureRef.current = [];
      return {
        ...prev,
        gradient: { ...prev.gradient, ...partial },
      };
    });
  }, []);

  const uploadImage = useCallback((file: File) => {
    loadImageFile(file).then((loaded) => {
      setState((prev) => ({
        ...prev,
        sourceType: 'image',
        imageBuffer: loaded.buffer,
        alphaBuffer: loaded.alphaBuffer,
        imageName: loaded.name,
        width: loaded.width,
        height: loaded.height,
      }));
    });
  }, []);

  const loadBuffer = useCallback((buffer: Float32Array, width: number, height: number, name: string, alphaBuffer?: Float32Array | null) => {
    setState((prev) => ({
      ...prev,
      sourceType: 'image',
      imageBuffer: buffer,
      alphaBuffer: alphaBuffer ?? null,
      imageName: name,
      width,
      height,
    }));
  }, []);

  const clearImage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sourceType: 'gradient',
      imageBuffer: null,
      alphaBuffer: null,
      imageName: null,
    }));
  }, []);

  return { state, result, rendering, update, updateGradient, uploadImage, loadBuffer, clearImage, undo, redo, canUndo, canRedo };
}
