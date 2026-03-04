import { useCallback, useState } from 'react';
import type { DitherResult } from '../engine/types';
import { renderPNG, estimatePNGSize } from '../renderers/png-renderer';
import { renderSVG, estimateSVGSize } from '../renderers/svg-renderer';
import { renderHTML } from '../renderers/html-renderer';

interface DownloadBarProps {
  result: DitherResult | null;
  colorCount: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  downloadBlob(blob, filename);
}

export function DownloadBar({ result, colorCount }: DownloadBarProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handlePNG = useCallback(async () => {
    if (!result) return;
    setDownloading('png');
    try {
      const blob = await renderPNG(result.imageData);
      downloadBlob(blob, 'dithered-gradient.png');
    } finally {
      setDownloading(null);
    }
  }, [result]);

  const handleSVG = useCallback(() => {
    if (!result) return;
    setDownloading('svg');
    try {
      const svg = renderSVG(result.imageData);
      downloadText(svg, 'dithered-gradient.svg', 'image/svg+xml');
    } finally {
      setDownloading(null);
    }
  }, [result]);

  const handleHTML = useCallback(() => {
    if (!result) return;
    setDownloading('html');
    try {
      const svg = renderSVG(result.imageData);
      const html = renderHTML(svg, result.width, result.height);
      downloadText(html, 'dithered-gradient.html', 'text/html');
    } finally {
      setDownloading(null);
    }
  }, [result]);

  const pngEst = result ? formatSize(estimatePNGSize(result.width, result.height)) : '—';
  const svgEst = result ? formatSize(estimateSVGSize(result.width, result.height, colorCount)) : '—';

  return (
    <div className="control-group download-bar">
      <h3>Download</h3>
      <div className="download-buttons">
        <button onClick={handlePNG} disabled={!result || downloading === 'png'}>
          {downloading === 'png' ? 'Saving...' : `PNG (~${pngEst})`}
        </button>
        <button onClick={handleSVG} disabled={!result || downloading === 'svg'}>
          {downloading === 'svg' ? 'Saving...' : `SVG (~${svgEst})`}
        </button>
        <button onClick={handleHTML} disabled={!result || downloading === 'html'}>
          {downloading === 'html' ? 'Saving...' : 'HTML'}
        </button>
      </div>
    </div>
  );
}
