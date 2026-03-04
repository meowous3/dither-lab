interface LockToggleProps {
  locked: boolean;
  onToggle: () => void;
}

export function LockToggle({ locked, onToggle }: LockToggleProps) {
  return (
    <button
      className={`lock-toggle ${locked ? 'locked' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={locked ? 'Unlock' : 'Lock (Random will skip this)'}
    >
      <svg viewBox="0 0 12 14" width="10" height="12" fill="currentColor">
        <rect x="1" y="6" width="10" height="7" rx="1.5" />
        {locked
          ? <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          : <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        }
      </svg>
    </button>
  );
}
