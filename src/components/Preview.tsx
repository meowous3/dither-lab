import { useEffect, useRef, useCallback } from 'react';
import type { DitherResult } from '../engine/types';

interface PreviewProps {
  result: DitherResult | null;
  rendering: boolean;
}

export function Preview({ result, rendering }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !result) return;

    const dpr = window.devicePixelRatio || 1;
    const maxW = container.clientWidth * 0.9;
    const maxH = container.clientHeight * 0.9;

    // Scale in device pixels so each source pixel maps to exactly N device pixels
    const maxDevW = maxW * dpr;
    const maxDevH = maxH * dpr;
    const fitScale = Math.min(maxDevW / result.width, maxDevH / result.height);

    // For upscaling (fitScale >= 1): snap to integer device-pixel multiple
    // For downscaling (fitScale < 1): use 1/ceil(1/fitScale) so K source pixels → 1 device pixel
    let devScale: number;
    if (fitScale >= 1) {
      devScale = Math.max(1, Math.floor(fitScale));
    } else {
      devScale = 1 / Math.ceil(1 / fitScale);
    }

    const devW = Math.round(result.width * devScale);
    const devH = Math.round(result.height * devScale);

    // Canvas backing size = device pixels, CSS size = CSS pixels
    canvas.width = devW;
    canvas.height = devH;
    canvas.style.width = `${devW / dpr}px`;
    canvas.style.height = `${devH / dpr}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Draw source at 1:1 into a temp canvas, then scale up
    const tmp = document.createElement('canvas');
    tmp.width = result.width;
    tmp.height = result.height;
    tmp.getContext('2d')!.putImageData(result.imageData, 0, 0);

    ctx.drawImage(tmp, 0, 0, devW, devH);
  }, [result]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <div className="preview-container" ref={containerRef}>
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
