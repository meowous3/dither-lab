import type { DitherState } from '../hooks/useDitherEngine';
import type { DitherAlgorithm, DitherTechnique, ColorSpace, GradientConfig, ImagePaletteMode } from '../engine/types';

interface PresetBarProps {
  sourceType: 'gradient' | 'image';
  locks: Set<string>;
  currentGradient: GradientConfig;
  onApply: (partial: Partial<DitherState>) => void;
}

// Top-level lock keys that map directly to DitherState fields
const TOP_LEVEL_LOCKS: (keyof DitherState)[] = [
  'algorithm', 'ditherTechnique', 'directionAngle',
  'colorCount', 'ditherScale', 'ditherStrength',
  'palette', 'imagePaletteMode',
];

// Gradient sub-field lock keys
const GRADIENT_SUB_KEYS = ['gradient.type', 'gradient.angle', 'gradient.colorSpace', 'gradient.stops'] as const;

interface Preset {
  name: string;
  state: Partial<DitherState>;
}

const GRADIENT_PRESETS: Preset[] = [
  {
    name: '1-bit',
    state: {
      colorCount: 2,
      algorithm: 'bayer8x8',
      ditherScale: 2,
      palette: undefined,
      gradient: {
        type: 'linear',
        angle: 135,
        colorSpace: 'oklab',
        stops: [
          { position: 0, color: { r: 0, g: 0, b: 0 } },
          { position: 1, color: { r: 255, g: 255, b: 255 } },
        ],
      },
    },
  },
  {
    name: 'Retro Mac',
    state: {
      colorCount: 2,
      algorithm: 'atkinson',
      ditherScale: 1,
      palette: [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      ],
      gradient: {
        type: 'linear',
        angle: 180,
        colorSpace: 'oklab',
        stops: [
          { position: 0, color: { r: 0, g: 0, b: 0 } },
          { position: 1, color: { r: 255, g: 255, b: 255 } },
        ],
      },
    },
  },
  {
    name: 'Gameboy',
    state: {
      colorCount: 4,
      algorithm: 'bayer4x4',
      ditherScale: 2,
      palette: [
        { r: 15, g: 56, b: 15 },
        { r: 48, g: 98, b: 48 },
        { r: 139, g: 172, b: 15 },
        { r: 155, g: 188, b: 15 },
      ],
      gradient: {
        type: 'radial',
        angle: 0,
        colorSpace: 'oklab',
        stops: [
          { position: 0, color: { r: 155, g: 188, b: 15 } },
          { position: 1, color: { r: 15, g: 56, b: 15 } },
        ],
      },
    },
  },
  {
    name: 'Vaporwave',
    state: {
      colorCount: 4,
      algorithm: 'floyd-steinberg',
      ditherScale: 2,
      palette: undefined,
      gradient: {
        type: 'linear',
        angle: 180,
        colorSpace: 'oklch',
        stops: [
          { position: 0, color: { r: 255, g: 113, b: 206 } },
          { position: 0.5, color: { r: 185, g: 103, b: 255 } },
          { position: 1, color: { r: 1, g: 205, b: 254 } },
        ],
      },
    },
  },
  {
    name: 'Halftone',
    state: {
      colorCount: 2,
      algorithm: 'blue-noise',
      ditherScale: 3,
      palette: undefined,
      gradient: {
        type: 'radial',
        angle: 0,
        colorSpace: 'oklab',
        stops: [
          { position: 0, color: { r: 255, g: 255, b: 255 } },
          { position: 1, color: { r: 20, g: 20, b: 20 } },
        ],
      },
    },
  },
];

const IMAGE_PRESETS: Preset[] = [
  {
    name: 'Retro Mac',
    state: {
      algorithm: 'atkinson',
      ditherScale: 1,
      imagePaletteMode: 'monochrome' as ImagePaletteMode,
      palette: undefined,
    },
  },
  {
    name: 'Game Boy',
    state: {
      algorithm: 'bayer4x4',
      ditherScale: 2,
      imagePaletteMode: 'gameboy' as ImagePaletteMode,
      palette: undefined,
    },
  },
  {
    name: 'CGA',
    state: {
      algorithm: 'floyd-steinberg',
      ditherScale: 1,
      imagePaletteMode: 'cga' as ImagePaletteMode,
      palette: undefined,
    },
  },
  {
    name: 'PICO-8',
    state: {
      algorithm: 'bayer8x8',
      ditherScale: 2,
      imagePaletteMode: 'pico8' as ImagePaletteMode,
      palette: undefined,
    },
  },
  {
    name: 'C64',
    state: {
      algorithm: 'jarvis-judice-ninke',
      ditherScale: 1,
      imagePaletteMode: 'commodore64' as ImagePaletteMode,
      palette: undefined,
    },
  },
];

const ALGORITHMS: DitherAlgorithm[] = [
  'bayer2x2', 'bayer4x4', 'bayer8x8',
  'floyd-steinberg', 'jarvis-judice-ninke', 'stucki', 'atkinson', 'burkes',
  'sierra', 'sierra-two-row', 'sierra-lite', 'blue-noise',
];
const GRADIENT_TYPES = ['linear', 'radial', 'conic', 'diamond', 'square', 'spiral'] as const;
const COLOR_SPACES: ColorSpace[] = ['rgb', 'hsl', 'oklab', 'oklch'];
const IMAGE_PALETTE_MODES: ImagePaletteMode[] = [
  'median-cut', 'k-means', 'octree', 'popularity',
  'uniform', 'grayscale', 'monochrome', 'sepia',
  'cga', 'gameboy', 'commodore64', 'nes', 'pico8', 'pc9801',
];
const TECHNIQUES: DitherTechnique[] = [
  'reduce-only', 'intermediate', 'continuous', 'noise-modulated', 'edge-aware', 'directional',
];

function randomColor(): { r: number; g: number; b: number } {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  };
}

function randomGradientPreset(): Partial<DitherState> {
  const stopCount = 2 + Math.floor(Math.random() * 3); // 2-4 stops
  const stops = Array.from({ length: stopCount }, (_, i) => ({
    position: i / (stopCount - 1),
    color: randomColor(),
  }));

  const technique = TECHNIQUES[Math.floor(Math.random() * TECHNIQUES.length)];
  return {
    colorCount: 2 + Math.floor(Math.random() * 7), // 2-8
    algorithm: ALGORITHMS[Math.floor(Math.random() * ALGORITHMS.length)],
    ditherScale: 1 + Math.floor(Math.random() * 4), // 1-4
    ditherStrength: 0.5 + Math.random(), // 0.5-1.5
    ditherTechnique: technique,
    directionAngle: Math.floor(Math.random() * 360),
    palette: undefined,
    gradient: {
      type: GRADIENT_TYPES[Math.floor(Math.random() * GRADIENT_TYPES.length)],
      angle: Math.floor(Math.random() * 360),
      colorSpace: COLOR_SPACES[Math.floor(Math.random() * COLOR_SPACES.length)],
      stops,
    },
  };
}

function randomImagePreset(): Partial<DitherState> {
  const technique = TECHNIQUES[Math.floor(Math.random() * TECHNIQUES.length)];
  return {
    colorCount: 2 + Math.floor(Math.random() * 15), // 2-16
    algorithm: ALGORITHMS[Math.floor(Math.random() * ALGORITHMS.length)],
    ditherScale: 1 + Math.floor(Math.random() * 4), // 1-4
    ditherStrength: 0.5 + Math.random(), // 0.5-1.5
    ditherTechnique: technique,
    directionAngle: Math.floor(Math.random() * 360),
    imagePaletteMode: IMAGE_PALETTE_MODES[Math.floor(Math.random() * IMAGE_PALETTE_MODES.length)],
    palette: undefined,
  };
}

export function PresetBar({ sourceType, locks, currentGradient, onApply }: PresetBarProps) {
  const presets = sourceType === 'gradient' ? GRADIENT_PRESETS : IMAGE_PRESETS;
  const randomFn = sourceType === 'gradient' ? randomGradientPreset : randomImagePreset;

  const handleRandom = () => {
    const preset = randomFn();
    if (locks.size === 0) return onApply(preset);

    const filtered: Partial<DitherState> = { ...preset };

    // Filter top-level locked fields
    for (const key of TOP_LEVEL_LOCKS) {
      if (locks.has(key)) delete filtered[key];
    }

    // Filter gradient sub-fields by merging locked values from current state
    if (filtered.gradient) {
      const g = { ...filtered.gradient };
      if (locks.has('gradient.type')) g.type = currentGradient.type;
      if (locks.has('gradient.angle')) g.angle = currentGradient.angle;
      if (locks.has('gradient.colorSpace')) g.colorSpace = currentGradient.colorSpace;
      if (locks.has('gradient.stops')) g.stops = currentGradient.stops;

      // If all gradient sub-fields are locked, skip gradient entirely
      if (GRADIENT_SUB_KEYS.every((k) => locks.has(k))) {
        delete filtered.gradient;
      } else {
        filtered.gradient = g;
      }
    }

    onApply(filtered);
  };

  return (
    <div className="control-group">
      <h3>Presets</h3>
      <div className="preset-bar">
        {presets.map((p) => (
          <button key={p.name} onClick={() => onApply(p.state)} className="preset-bar-btn">
            {p.name}
          </button>
        ))}
        <button onClick={handleRandom} className="preset-bar-btn preset-bar-random">
          <svg className="random-icon" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 8a6 6 0 0 1 10.5-4" />
            <path d="M14 8a6 6 0 0 1-10.5 4" />
            <path d="M12.5 1v3h-3" />
            <path d="M3.5 15v-3h3" />
          </svg>
          Random
        </button>
      </div>
    </div>
  );
}
