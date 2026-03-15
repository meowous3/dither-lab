import type { DitherState } from '../hooks/useDitherEngine';
import type { DitherResult } from './types';

export type DitherSettings = Omit<DitherState,
  'sourceType' | 'imageBuffer' | 'alphaBuffer' | 'imageName' | 'width' | 'height'
>;

export interface BulkImage {
  id: string;
  name: string;
  buffer: Float32Array;
  alphaBuffer: Float32Array | null;
  width: number;
  height: number;
  overrides: Partial<DitherSettings>;
  result: DitherResult | null;
  stale: boolean;
}
