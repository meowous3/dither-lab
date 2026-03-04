import type { ColorSpace, GradientConfig, GradientStop } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { LockToggle } from './LockToggle';

interface GradientControlsProps {
  gradient: GradientConfig;
  onUpdate: (partial: Partial<GradientConfig>) => void;
  locks: Set<string>;
  toggleLock: (key: string) => void;
}

function colorToHex(c: { r: number; g: number; b: number }): string {
  return '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToColor(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function GradientControls({ gradient, onUpdate, locks, toggleLock }: GradientControlsProps) {
  const updateStop = (index: number, partial: Partial<GradientStop>) => {
    const stops = gradient.stops.map((s, i) =>
      i === index ? { ...s, ...partial } : s
    );
    onUpdate({ stops });
  };

  const addStop = () => {
    if (gradient.stops.length >= 8) return;
    const newPos = 0.5;
    const stops = [...gradient.stops, { position: newPos, color: { r: 128, g: 128, b: 128 } }];
    stops.sort((a, b) => a.position - b.position);
    onUpdate({ stops });
  };

  const removeStop = (index: number) => {
    if (gradient.stops.length <= 2) return;
    onUpdate({ stops: gradient.stops.filter((_, i) => i !== index) });
  };

  return (
    <CollapsibleGroup title="Gradient">
      <label>
        <span className="label-with-lock">
          Type
          <LockToggle locked={locks.has('gradient.type')} onToggle={() => toggleLock('gradient.type')} />
        </span>
        <select
          value={gradient.type}
          onChange={(e) => onUpdate({ type: e.target.value as GradientConfig['type'] })}
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
          <option value="conic">Conic</option>
          <option value="diamond">Diamond</option>
          <option value="square">Square</option>
          <option value="spiral">Spiral</option>
        </select>
      </label>

      <label>
        <span className="label-with-lock">
          Color Space
          <LockToggle locked={locks.has('gradient.colorSpace')} onToggle={() => toggleLock('gradient.colorSpace')} />
        </span>
        <select
          value={gradient.colorSpace || 'rgb'}
          onChange={(e) => onUpdate({ colorSpace: e.target.value as ColorSpace })}
        >
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
          <option value="oklab">OKLab</option>
          <option value="oklch">OKLCH</option>
        </select>
      </label>

      <label>
        <span className="label-with-lock">
          Angle
          <LockToggle locked={locks.has('gradient.angle')} onToggle={() => toggleLock('gradient.angle')} />
        </span>
        <div className="range-row">
          <input
            type="range"
            min={0}
            max={360}
            value={gradient.angle}
            onChange={(e) => onUpdate({ angle: Number(e.target.value) })}
          />
          <span className="range-value">{gradient.angle}&deg;</span>
        </div>
      </label>

      <div className="stops-list">
        <div className="stops-header">
          <span className="label-with-lock">
            Color Stops
            <LockToggle locked={locks.has('gradient.stops')} onToggle={() => toggleLock('gradient.stops')} />
          </span>
          <button onClick={addStop} disabled={gradient.stops.length >= 8} title="Add stop">+</button>
        </div>
        {gradient.stops.map((stop, i) => (
          <div key={i} className="stop-row">
            <input
              type="color"
              value={colorToHex(stop.color)}
              onChange={(e) => updateStop(i, { color: hexToColor(e.target.value) })}
            />
            <input
              type="range"
              min={-1.5}
              max={1.5}
              step={0.01}
              value={stop.position}
              onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
            />
            <span className="range-value">{Math.round(stop.position * 100)}%</span>
            {gradient.stops.length > 2 && (
              <button onClick={() => removeStop(i)} className="stop-remove" title="Remove stop">&times;</button>
            )}
          </div>
        ))}
      </div>
    </CollapsibleGroup>
  );
}
