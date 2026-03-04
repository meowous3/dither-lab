import type { DitherTechnique } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';

interface TechniquePickerProps {
  value: DitherTechnique;
  directionAngle: number;
  onChange: (technique: DitherTechnique) => void;
  onAngleChange: (angle: number) => void;
}

const TECHNIQUES: { id: DitherTechnique; label: string; desc: string }[] = [
  { id: 'reduce-only',     label: 'Reduce Only',     desc: 'Snap to palette, no dithering' },
  { id: 'intermediate',    label: 'Intermediate',    desc: 'Pick between 2 closest colors' },
  { id: 'continuous',      label: 'Continuous',      desc: 'Bias pixel, find closest globally' },
  { id: 'noise-modulated', label: 'Noise-Modulated', desc: 'Per-pixel jitter breaks patterns' },
  { id: 'edge-aware',      label: 'Edge-Aware',      desc: 'Reduce dithering at edges' },
  { id: 'directional',     label: 'Directional',     desc: 'Error follows an angle' },
];

export function TechniquePicker({ value, directionAngle, onChange, onAngleChange }: TechniquePickerProps) {
  return (
    <CollapsibleGroup title="Technique">
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
          Direction Angle
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
