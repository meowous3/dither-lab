export type DitherAlgorithm =
  | 'bayer2x2'
  | 'bayer4x4'
  | 'bayer8x8'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'sierra-lite'
  | 'blue-noise';

export interface Color {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface GradientStop {
  position: number; // 0-1
  color: Color;
}

export interface GradientConfig {
  type: 'linear' | 'radial' | 'conic';
  angle: number; // degrees (for linear/conic)
  stops: GradientStop[];
}

export interface DitherParams {
  width: number;
  height: number;
  gradient: GradientConfig;
  algorithm: DitherAlgorithm;
  ditherScale: number;   // pixel block size 1-16
  colorCount: number;    // quantization levels per channel
  palette?: Color[];     // optional fixed palette
}

export interface DitherResult {
  imageData: ImageData;
  width: number;
  height: number;
}
