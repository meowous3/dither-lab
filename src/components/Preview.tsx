import { useEffect, useRef, useCallback, useState } from 'react';
import type { DitherResult } from '../engine/types';

interface PreviewProps {
  result: DitherResult | null;
  rendering: boolean;
  pixelAspectRatio?: number;
}

export function Preview({ result, rendering, pixelAspectRatio = 1 }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [comparePos, setComparePos] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !result) return;

    const dpr = window.devicePixelRatio || 1;
    const maxW = container.clientWidth * 0.9;
    const maxH = container.clientHeight * 0.9;

    const maxDevW = maxW * dpr;
    const maxDevH = maxH * dpr;
    const fitScale = Math.min(maxDevW / result.width, maxDevH / result.height);

    let devScale: number;
    if (fitScale >= 1) {
      devScale = Math.max(1, Math.floor(fitScale));
    } else {
      devScale = 1 / Math.ceil(1 / fitScale);
    }

    const devW = Math.round(result.width * devScale);
    const devH = Math.round(result.height * devScale);

    canvas.width = devW;
    canvas.height = devH;
    canvas.style.width = `${devW / dpr}px`;
    canvas.style.height = `${devH / dpr}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Draw dithered result
    const tmp = document.createElement('canvas');
    tmp.width = result.width;
    tmp.height = result.height;
    tmp.getContext('2d')!.putImageData(result.imageData, 0, 0);
    ctx.drawImage(tmp, 0, 0, devW, devH);

    // Before/after split
    if (comparePos !== null && result.sourceImageData) {
      const splitX = Math.round(comparePos * devW);
      if (splitX > 0) {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = result.sourceImageData.width;
        srcCanvas.height = result.sourceImageData.height;
        srcCanvas.getContext('2d')!.putImageData(result.sourceImageData, 0, 0);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, devH);
        ctx.clip();
        ctx.drawImage(srcCanvas, 0, 0, devW, devH);
        ctx.restore();

        // Divider line
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(splitX - 1, 0, 2, devH);
      }
    }
  }, [result, comparePos, pixelAspectRatio]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const getRelativeX = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0.5;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!result?.sourceImageData) return;
    draggingRef.current = true;
    setComparePos(getRelativeX(e));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setComparePos(getRelativeX(e));
    };
    const handleMouseUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="preview-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="preview-canvas"
        style={{ imageRendering: 'pixelated', cursor: result?.sourceImageData ? 'col-resize' : undefined }}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setComparePos(null)}
      />
      {rendering && <div className="preview-spinner">Rendering...</div>}
      {!result && !rendering && (
        <div className="preview-placeholder">Adjust settings to generate</div>
      )}
      {result?.sourceImageData && (
        <div className="compare-hint">
          {comparePos !== null ? 'Double-click to reset' : 'Click & drag to compare'}
        </div>
      )}
    </div>
  );
}
