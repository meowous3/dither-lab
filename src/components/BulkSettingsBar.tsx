interface BulkSettingsBarProps {
  hasOverrides: boolean;
  onApplyToAll: () => void;
  onResetToGlobal: () => void;
}

export function BulkSettingsBar({ hasOverrides, onApplyToAll, onResetToGlobal }: BulkSettingsBarProps) {
  return (
    <div className="bulk-settings-bar">
      <button className="bulk-settings-btn" onClick={onApplyToAll}>
        Apply to All
      </button>
      <button
        className="bulk-settings-btn"
        onClick={onResetToGlobal}
        disabled={!hasOverrides}
      >
        Reset to Global
      </button>
    </div>
  );
}
