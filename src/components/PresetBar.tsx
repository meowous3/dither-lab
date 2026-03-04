import type { DitherState } from '../hooks/useDitherEngine';

interface PresetBarProps {
  onApply: (partial: Partial<DitherState>) => void;
}

interface Preset {
  name: string;
  state: Partial<DitherState>;
}

const PRESETS: Preset[] = [
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
        stops: [
          { position: 0, color: { r: 255, g: 255, b: 255 } },
          { position: 1, color: { r: 20, g: 20, b: 20 } },
        ],
      },
    },
  },
];

export function PresetBar({ onApply }: PresetBarProps) {
  return (
    <div className="control-group">
      <h3>Presets</h3>
      <div className="preset-bar">
        {PRESETS.map((p) => (
          <button key={p.name} onClick={() => onApply(p.state)} className="preset-bar-btn">
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
