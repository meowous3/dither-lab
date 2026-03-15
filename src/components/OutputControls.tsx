import type { ColorDistanceMetric, DitherAlgorithm } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { LockToggle } from './LockToggle';

const PATTERN_ALGORITHMS = new Set<DitherAlgorithm>([
  'bayer2x2', 'bayer4x4', 'bayer8x8',
  'halftone', 'crosshatch', 'horizontal-line',
  'blue-noise',
]);

interface OutputControlsProps {
  width: number;
  height: number;
  algorithm: DitherAlgorithm;
  ditherScale: number;
  patternScale: number;
  colorCount: number;
  ditherStrength: number;
  gammaCorrection: boolean;
  alphaThreshold: number;
  hasAlpha: boolean;
  colorDistanceMetric: ColorDistanceMetric;
  pixelAspectRatio: number;
  onUpdate: (partial: Record<string, unknown>) => void;
  locks: Set<string>;
  toggleLock: (key: string) => void;
}

const PAR_PRESETS = [
  { label: '1:1 Square', value: 1 },
  { label: '5:6 CGA 320x200', value: 5 / 6 },
  { label: '8:7 C64 Multicolor', value: 8 / 7 },
];

export function OutputControls({ width, height, algorithm, ditherScale, patternScale, colorCount, ditherStrength, gammaCorrection, alphaThreshold, hasAlpha, colorDistanceMetric, pixelAspectRatio, onUpdate, locks, toggleLock }: OutputControlsProps) {
  return (
    <CollapsibleGroup title="Output">
      <div className="dimension-row">
        <label>
          Width
          <input
            type="number"
            min={8}
            max={2048}
            value={width}
            onChange={(e) => onUpdate({ width: Math.max(8, Math.min(2048, Number(e.target.value))) })}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            min={8}
            max={2048}
            value={height}
            onChange={(e) => onUpdate({ height: Math.max(8, Math.min(2048, Number(e.target.value))) })}
          />
        </label>
      </div>

      <label>
        <span className="label-with-lock">
          Dither Scale
          <LockToggle locked={locks.has('ditherScale')} onToggle={() => toggleLock('ditherScale')} />
        </span>
        <div className="range-row">
          <input
            type="range"
            min={1}
            max={16}
            value={ditherScale}
            onChange={(e) => onUpdate({ ditherScale: Number(e.target.value) })}
          />
          <span className="range-value">{ditherScale}px</span>
        </div>
      </label>

      {PATTERN_ALGORITHMS.has(algorithm) && (
        <label>
          <span className="label-with-lock">
            Pattern Scale
            <LockToggle locked={locks.has('patternScale')} onToggle={() => toggleLock('patternScale')} />
          </span>
          <div className="range-row">
            <input
              type="range"
              min={1}
              max={16}
              value={patternScale}
              onChange={(e) => onUpdate({ patternScale: Number(e.target.value) })}
            />
            <span className="range-value">{patternScale}x</span>
          </div>
        </label>
      )}

      <label>
        <span className="label-with-lock">
          Colors
          <LockToggle locked={locks.has('colorCount')} onToggle={() => toggleLock('colorCount')} />
        </span>
        <div className="range-row">
          <input
            type="range"
            min={1}
            max={64}
            value={colorCount}
            onChange={(e) => onUpdate({ colorCount: Number(e.target.value) })}
          />
          <span className="range-value">{colorCount}</span>
        </div>
      </label>

      <label>
        <span className="label-with-lock">
          Transition
          <LockToggle locked={locks.has('ditherStrength')} onToggle={() => toggleLock('ditherStrength')} />
        </span>
        <div className="range-row">
          <input
            type="range"
            min={0}
            max={200}
            value={Math.round(ditherStrength * 100)}
            onChange={(e) => onUpdate({ ditherStrength: Number(e.target.value) / 100 })}
          />
          <span className="range-value">{Math.round(ditherStrength * 100)}%</span>
        </div>
      </label>

      <label>
        <span className="label-with-lock">
          Color Distance
          <LockToggle locked={locks.has('colorDistanceMetric')} onToggle={() => toggleLock('colorDistanceMetric')} />
        </span>
        <select
          value={colorDistanceMetric}
          onChange={(e) => onUpdate({ colorDistanceMetric: e.target.value })}
        >
          <option value="euclidean-rgb">Euclidean RGB</option>
          <option value="redmean">Redmean (weighted)</option>
          <option value="cie76">CIE76 (Lab)</option>
        </select>
      </label>

      <label>
        <span className="label-with-lock">
          Pixel Aspect Ratio
          <LockToggle locked={locks.has('pixelAspectRatio')} onToggle={() => toggleLock('pixelAspectRatio')} />
        </span>
        <select
          value={String(PAR_PRESETS.find((p) => Math.abs(p.value - pixelAspectRatio) < 0.01)?.value ?? pixelAspectRatio)}
          onChange={(e) => onUpdate({ pixelAspectRatio: Number(e.target.value) })}
        >
          {PAR_PRESETS.map((p) => (
            <option key={p.label} value={String(p.value)}>{p.label}</option>
          ))}
        </select>
      </label>

      {hasAlpha && (
        <label>
          <span className="label-with-lock">
            Alpha Threshold
            <LockToggle locked={locks.has('alphaThreshold')} onToggle={() => toggleLock('alphaThreshold')} />
          </span>
          <div className="range-row">
            <input
              type="range"
              min={0}
              max={255}
              value={alphaThreshold}
              onChange={(e) => onUpdate({ alphaThreshold: Number(e.target.value) })}
            />
            <span className="range-value">{alphaThreshold}</span>
          </div>
        </label>
      )}

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={gammaCorrection}
          onChange={(e) => onUpdate({ gammaCorrection: e.target.checked })}
        />
        Gamma Correction
      </label>
    </CollapsibleGroup>
  );
}
