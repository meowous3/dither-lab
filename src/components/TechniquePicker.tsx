import type { DitherTechnique } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { LockToggle } from './LockToggle';

interface TechniquePickerProps {
  value: DitherTechnique;
  directionAngle: number;
  onChange: (technique: DitherTechnique) => void;
  onAngleChange: (angle: number) => void;
  locks: Set<string>;
  toggleLock: (key: string) => void;
}

const TECHNIQUES: { id: DitherTechnique; label: string; desc: string }[] = [
  { id: 'reduce-only',     label: 'Reduce Only',     desc: 'Snap to palette, no dithering' },
  { id: 'intermediate',    label: 'Intermediate',    desc: 'Pick between 2 closest colors' },
  { id: 'continuous',      label: 'Continuous',      desc: 'Bias pixel, find closest globally' },
  { id: 'noise-modulated', label: 'Noise-Modulated', desc: 'Per-pixel jitter breaks patterns' },
  { id: 'edge-aware',      label: 'Edge-Aware',      desc: 'Reduce dithering at edges' },
  { id: 'directional',     label: 'Directional',     desc: 'Error follows an angle' },
];

export function TechniquePicker({ value, directionAngle, onChange, onAngleChange, locks, toggleLock }: TechniquePickerProps) {
  return (
    <CollapsibleGroup title="Technique" headerRight={<LockToggle locked={locks.has('ditherTechnique')} onToggle={() => toggleLock('ditherTechnique')} />}>
      <div className="algorithm-grid">
        {TECHNIQUES.map((t) => (
          <button
            key={t.id}
            className={`algorithm-btn ${value === t.id ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
            title={t.desc}
          >
            <span className="algorithm-label">{t.label}</span>
            <span className="algorithm-desc">{t.desc}</span>
          </button>
        ))}
      </div>
      {value === 'directional' && (
        <label>
          <span className="label-with-lock">
            Direction Angle
            <LockToggle locked={locks.has('directionAngle')} onToggle={() => toggleLock('directionAngle')} />
          </span>
          <div className="range-row">
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={directionAngle}
              onChange={(e) => onAngleChange(Number(e.target.value))}
            />
            <span className="range-value">{directionAngle}&deg;</span>
          </div>
        </label>
      )}
    </CollapsibleGroup>
  );
}
