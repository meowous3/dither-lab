import { useState } from 'react';
import type { Color } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';

interface ColorPaletteEditorProps {
  palette: Color[] | undefined;
  onUpdate: (palette: Color[] | undefined) => void;
}

interface Preset {
  name: string;
  colors: Color[];
}

const PRESETS: Preset[] = [
  {
    name: '1-bit',
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ],
  },
  {
    name: 'CGA',
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 85, g: 255, b: 255 },
      { r: 255, g: 85, b: 255 },
      { r: 255, g: 255, b: 255 },
    ],
  },
  {
    name: 'Game Boy',
    colors: [
      { r: 15, g: 56, b: 15 },
      { r: 48, g: 98, b: 48 },
      { r: 139, g: 172, b: 15 },
      { r: 155, g: 188, b: 15 },
    ],
  },
  {
    name: 'C64',
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 136, g: 0, b: 0 },
      { r: 170, g: 255, b: 238 },
      { r: 204, g: 68, b: 204 },
      { r: 0, g: 204, b: 85 },
      { r: 0, g: 0, b: 170 },
      { r: 238, g: 238, b: 119 },
    ],
  },
];

function colorToHex(c: Color): string {
  return '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToColor(hex: string): Color {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function ColorPaletteEditor({ palette, onUpdate }: ColorPaletteEditorProps) {
  const [enabled, setEnabled] = useState(!!palette);

  const toggle = () => {
    if (enabled) {
      setEnabled(false);
      onUpdate(undefined);
    } else {
      setEnabled(true);
      onUpdate(PRESETS[0].colors);
    }
  };

  const applyPreset = (preset: Preset) => {
    setEnabled(true);
    onUpdate([...preset.colors]);
  };

  const updateColor = (index: number, hex: string) => {
    if (!palette) return;
    const next = [...palette];
    next[index] = hexToColor(hex);
    onUpdate(next);
  };

  const addColor = () => {
    if (!palette || palette.length >= 16) return;
    onUpdate([...palette, { r: 128, g: 128, b: 128 }]);
  };

  const removeColor = (index: number) => {
    if (!palette || palette.length <= 2) return;
    onUpdate(palette.filter((_, i) => i !== index));
  };

  const toggleBtn = (
    <button onClick={toggle} className={`toggle-btn ${enabled ? 'active' : ''}`}>
      {enabled ? 'ON' : 'OFF'}
    </button>
  );

  return (
    <CollapsibleGroup title="Custom Palette" defaultOpen={false} headerRight={toggleBtn}>
      {enabled && (
        <>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => applyPreset(p)} className="preset-btn">
                <span className="preset-swatches">
                  {p.colors.slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className="preset-swatch"
                      style={{ backgroundColor: colorToHex(c) }}
                    />
                  ))}
                </span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          {palette && (
            <div className="palette-colors">
              {palette.map((c, i) => (
                <div key={i} className="palette-color-row">
                  <input
                    type="color"
                    value={colorToHex(c)}
                    onChange={(e) => updateColor(i, e.target.value)}
                  />
                  <span className="palette-hex">{colorToHex(c)}</span>
                  {palette.length > 2 && (
                    <button onClick={() => removeColor(i)} className="stop-remove">&times;</button>
                  )}
                </div>
              ))}
              {palette.length < 16 && (
                <button onClick={addColor} className="add-color-btn">+ Add Color</button>
              )}
            </div>
          )}
        </>
      )}
    </CollapsibleGroup>
  );
}
