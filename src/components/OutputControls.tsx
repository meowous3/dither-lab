interface OutputControlsProps {
  width: number;
  height: number;
  ditherScale: number;
  colorCount: number;
  onUpdate: (partial: { width?: number; height?: number; ditherScale?: number; colorCount?: number }) => void;
}

export function OutputControls({ width, height, ditherScale, colorCount, onUpdate }: OutputControlsProps) {
  return (
    <div className="control-group">
      <h3>Output</h3>

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
        Colors per Channel
        <div className="range-row">
          <input
            type="range"
            min={2}
            max={32}
            value={colorCount}
            onChange={(e) => onUpdate({ colorCount: Number(e.target.value) })}
          />
          <span className="range-value">{colorCount}</span>
        </div>
      </label>
    </div>
  );
}
