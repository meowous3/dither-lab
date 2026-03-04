import type { DitherAlgorithm } from '../engine/types';

interface AlgorithmPickerProps {
  value: DitherAlgorithm;
  onChange: (alg: DitherAlgorithm) => void;
}

const ALGORITHMS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  { id: 'bayer2x2',        label: 'Bayer 2x2',        desc: 'Smallest pattern, visible grid' },
  { id: 'bayer4x4',        label: 'Bayer 4x4',        desc: 'Balanced pattern and smoothness' },
  { id: 'bayer8x8',        label: 'Bayer 8x8',        desc: 'Classic smooth cross-hatch' },
  { id: 'floyd-steinberg',  label: 'Floyd-Steinberg',  desc: 'Smooth organic diffusion' },
  { id: 'atkinson',         label: 'Atkinson',         desc: 'High contrast, classic Mac' },
  { id: 'sierra-lite',      label: 'Sierra Lite',      desc: 'Fast 3-neighbor diffusion' },
  { id: 'blue-noise',       label: 'Blue Noise',       desc: 'Organic, no visible grid' },
];

export function AlgorithmPicker({ value, onChange }: AlgorithmPickerProps) {
  return (
    <div className="control-group">
      <h3>Algorithm</h3>
      <div className="algorithm-grid">
        {ALGORITHMS.map((alg) => (
          <button
            key={alg.id}
            className={`algorithm-btn ${value === alg.id ? 'active' : ''}`}
            onClick={() => onChange(alg.id)}
            title={alg.desc}
          >
            <span className="algorithm-label">{alg.label}</span>
            <span className="algorithm-desc">{alg.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
