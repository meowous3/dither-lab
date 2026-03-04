import { CollapsibleGroup } from './CollapsibleGroup';

interface OutputControlsProps {
  width: number;
  height: number;
  ditherScale: number;
  colorCount: number;
  ditherStrength: number;
  gammaCorrection: boolean;
  onUpdate: (partial: { width?: number; height?: number; ditherScale?: number; colorCount?: number; ditherStrength?: number; gammaCorrection?: boolean }) => void;
}

export function OutputControls({ width, height, ditherScale, colorCount, ditherStrength, gammaCorrection, onUpdate }: OutputControlsProps) {
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
        Dither Scale
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

      <label>
        Colors
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
        Transition
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
