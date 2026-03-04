import type { DitherAlgorithm } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { LockToggle } from './LockToggle';

interface AlgorithmPickerProps {
  value: DitherAlgorithm;
  onChange: (alg: DitherAlgorithm) => void;
  locks: Set<string>;
  toggleLock: (key: string) => void;
}

const ALGORITHMS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  { id: 'none',               label: 'None',               desc: 'Nearest color, no dithering' },
  { id: 'bayer2x2',           label: 'Bayer 2x2',          desc: 'Smallest pattern, visible grid' },
  { id: 'bayer4x4',           label: 'Bayer 4x4',          desc: 'Balanced pattern and smoothness' },
  { id: 'bayer8x8',           label: 'Bayer 8x8',          desc: 'Classic smooth cross-hatch' },
  { id: 'floyd-steinberg',    label: 'Floyd-Steinberg',     desc: 'Smooth organic diffusion' },
  { id: 'jarvis-judice-ninke', label: 'Jarvis-Judice-Ninke', desc: 'Wide kernel, very smooth' },
  { id: 'stucki',             label: 'Stucki',              desc: 'Sharp, wide error spread' },
  { id: 'atkinson',           label: 'Atkinson',            desc: 'High contrast, classic Mac' },
  { id: 'burkes',             label: 'Burkes',              desc: 'Fast wide-kernel diffusion' },
  { id: 'sierra',             label: 'Sierra',              desc: 'Full 3-row diffusion' },
  { id: 'sierra-two-row',     label: 'Sierra Two-Row',      desc: '2-row balanced diffusion' },
  { id: 'sierra-lite',        label: 'Sierra Lite',          desc: 'Fast 3-neighbor diffusion' },
  { id: 'blue-noise',         label: 'Blue Noise',           desc: 'Organic, no visible grid' },
];

export function AlgorithmPicker({ value, onChange, locks, toggleLock }: AlgorithmPickerProps) {
  return (
    <CollapsibleGroup title="Algorithm" headerRight={<LockToggle locked={locks.has('algorithm')} onToggle={() => toggleLock('algorithm')} />}>
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
    </CollapsibleGroup>
  );
}
