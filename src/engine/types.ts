export type DitherAlgorithm =
  | 'none'
  | 'bayer2x2'
  | 'bayer4x4'
  | 'bayer8x8'
  | 'halftone'
  | 'crosshatch'
  | 'horizontal-line'
  | 'floyd-steinberg'
  | 'jarvis-judice-ninke'
  | 'stucki'
  | 'atkinson'
  | 'burkes'
  | 'sierra'
  | 'sierra-two-row'
  | 'sierra-lite'
  | 'blue-noise';

export type ColorDistanceMetric = 'euclidean-rgb' | 'redmean' | 'cie76';

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
  | { type: 'image'; imageBuffer: Float32Array; alphaBuffer?: Float32Array | null };

export interface DitherParams {
  width: number;
  height: number;
  source: DitherSource;
  algorithm: DitherAlgorithm;
  ditherScale: number;   // pixel block size 1-16 (downsamples resolution)
  patternScale: number;  // pattern tile size 1-16 (scales pattern without reducing resolution)
  colorCount: number;    // quantization levels per channel
  ditherStrength: number; // transition width multiplier (0 = hard bands, 1 = normal)
  gammaCorrection: boolean; // linearize before dithering for perceptual accuracy
  imagePaletteMode: ImagePaletteMode; // palette generation mode for images
  palette?: Color[];     // optional fixed palette
  ditherTechnique: DitherTechnique; // how the algorithm applies dithering
  directionAngle: number; // 0-360, for directional technique
  alphaThreshold: number; // 0-255, pixels below this alpha become transparent
  colorDistanceMetric: ColorDistanceMetric;
  pixelAspectRatio: number; // pixel width/height, <1 = tall pixels (e.g. CGA), >1 = wide
}

export interface DitherResult {
  imageData: ImageData;
  sourceImageData?: ImageData; // original (pre-dither) for before/after
  width: number;
  height: number;
}
