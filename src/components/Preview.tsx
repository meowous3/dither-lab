import { useEffect, useRef } from 'react';
import type { DitherResult } from '../engine/types';

interface PreviewProps {
  result: DitherResult | null;
  rendering: boolean;
}

export function Preview({ result, rendering }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;

    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(result.imageData, 0, 0);
  }, [result]);

  return (
    <div className="preview-container">
      <canvas
        ref={canvasRef}
        className="preview-canvas"
        style={{ imageRendering: 'pixelated' }}
      />
      {rendering && <div className="preview-spinner">Rendering...</div>}
      {!result && !rendering && (
        <div className="preview-placeholder">Adjust settings to generate</div>
      )}
    </div>
  );
}
