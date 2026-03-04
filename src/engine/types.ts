export type DitherAlgorithm =
  | 'none'
  | 'bayer2x2'
  | 'bayer4x4'
  | 'bayer8x8'
  | 'floyd-steinberg'
  | 'jarvis-judice-ninke'
  | 'stucki'
  | 'atkinson'
  | 'burkes'
  | 'sierra'
  | 'sierra-two-row'
  | 'sierra-lite'
  | 'blue-noise';

export type DitherTechnique =
  | 'reduce-only'
  | 'intermediate'
  | 'continuous'
  | 'noise-modulated'
  | 'edge-aware'
  | 'directional';

export interface Color {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface GradientStop {
  position: number; // 0-1
  color: Color;
}

export type ColorSpace = 'rgb' | 'hsl' | 'oklab' | 'oklch';

export interface GradientConfig {
  type: 'linear' | 'radial' | 'conic' | 'diamond' | 'square' | 'spiral';
  angle: number; // degrees (for linear/conic/spiral)
  stops: GradientStop[];
  colorSpace: ColorSpace;
}

export type ImagePaletteMode =
  | 'median-cut'
  | 'k-means'
  | 'octree'
  | 'popularity'
  | 'uniform'
  | 'grayscale'
  | 'monochrome'
  | 'cga'
  | 'gameboy'
  | 'commodore64'
  | 'nes'
  | 'pico8'
  | 'pc9801'
  | 'websafe'
  | 'sepia';

export type DitherSource =
  | { type: 'gradient'; gradient: GradientConfig }
  | { type: 'image'; imageBuffer: Float32Array };

export interface DitherParams {
  width: number;
  height: number;
  source: DitherSource;
  algorithm: DitherAlgorithm;
  ditherScale: number;   // pixel block size 1-16
  colorCount: number;    // quantization levels per channel
  ditherStrength: number; // transition width multiplier (0 = hard bands, 1 = normal)
  gammaCorrection: boolean; // linearize before dithering for perceptual accuracy
  imagePaletteMode: ImagePaletteMode; // palette generation mode for images
  palette?: Color[];     // optional fixed palette
  ditherTechnique: DitherTechnique; // how the algorithm applies dithering
  directionAngle: number; // 0-360, for directional technique
}

export interface DitherResult {
  imageData: ImageData;
  width: number;
  height: number;
}
