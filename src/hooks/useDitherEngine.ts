import { useState, useEffect, useCallback, useRef } from 'react';
import { ditherGradient } from '../engine/dither';
import { useDebounce } from './useDebounce';
import type { DitherAlgorithm, DitherParams, DitherResult, GradientConfig, Color } from '../engine/types';

export interface DitherState {
  width: number;
  height: number;
  gradient: GradientConfig;
  algorithm: DitherAlgorithm;
  ditherScale: number;
  colorCount: number;
  palette: Color[] | undefined;
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
  },
  algorithm: 'bayer8x8',
  ditherScale: 1,
  colorCount: 2,
  palette: undefined,
};

export function useDitherEngine() {
  const [state, setState] = useState<DitherState>(DEFAULT_STATE);
  const [result, setResult] = useState<DitherResult | null>(null);
  const [rendering, setRendering] = useState(false);
  const abortRef = useRef(0);

  const debouncedState = useDebounce(state, 50);

  useEffect(() => {
    const id = ++abortRef.current;
    setRendering(true);

    const params: DitherParams = {
      width: debouncedState.width,
      height: debouncedState.height,
      gradient: debouncedState.gradient,
      algorithm: debouncedState.algorithm,
      ditherScale: debouncedState.ditherScale,
      colorCount: debouncedState.colorCount,
      palette: debouncedState.palette,
    };

    ditherGradient(params).then((res) => {
      if (abortRef.current === id) {
        setResult(res);
        setRendering(false);
      }
    });
  }, [debouncedState]);

  const update = useCallback((partial: Partial<DitherState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateGradient = useCallback((partial: Partial<GradientConfig>) => {
    setState((prev) => ({
      ...prev,
      gradient: { ...prev.gradient, ...partial },
    }));
  }, []);

  return { state, result, rendering, update, updateGradient };
}
