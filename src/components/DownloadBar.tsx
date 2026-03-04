import { useCallback, useState } from 'react';
import type { DitherResult } from '../engine/types';
import { CollapsibleGroup } from './CollapsibleGroup';
import { renderPNG, estimatePNGSize } from '../renderers/png-renderer';
import { renderSVG, estimateSVGSize } from '../renderers/svg-renderer';
import { renderHTML } from '../renderers/html-renderer';

interface DownloadBarProps {
  result: DitherResult | null;
  colorCount: number;
  bulkMode?: boolean;
  onDownloadZip?: () => void;
  zipProgress?: { current: number; total: number } | null;
  imageName?: string | null;
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

function getDownloadName(imageName: string | null | undefined, ext: string): string {
  if (imageName) {
    return imageName.replace(/\.[^.]+$/, '') + ext;
  }
  return 'dithered-gradient' + ext;
}

export function DownloadBar({ result, colorCount, bulkMode, onDownloadZip, zipProgress, imageName }: DownloadBarProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handlePNG = useCallback(async () => {
    if (!result) return;
    setDownloading('png');
    try {
      const blob = await renderPNG(result.imageData);
      downloadBlob(blob, getDownloadName(imageName, '.png'));
    } finally {
      setDownloading(null);
    }
  }, [result, imageName]);

  const handleSVG = useCallback(() => {
    if (!result) return;
    setDownloading('svg');
    try {
      const svg = renderSVG(result.imageData);
      downloadText(svg, getDownloadName(imageName, '.svg'), 'image/svg+xml');
    } finally {
      setDownloading(null);
    }
  }, [result, imageName]);

  const handleHTML = useCallback(() => {
    if (!result) return;
    setDownloading('html');
    try {
      const svg = renderSVG(result.imageData);
      const html = renderHTML(svg, result.width, result.height);
      downloadText(html, getDownloadName(imageName, '.html'), 'text/html');
    } finally {
      setDownloading(null);
    }
  }, [result, imageName]);

  const pngEst = result ? formatSize(estimatePNGSize(result.width, result.height)) : '—';
  const svgEst = result ? formatSize(estimateSVGSize(result.width, result.height, colorCount)) : '—';

  return (
    <CollapsibleGroup title="Download">
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
      {bulkMode && onDownloadZip && (
        <div className="download-buttons">
          <button onClick={onDownloadZip} disabled={!!zipProgress}>
            {zipProgress
              ? <span className="zip-progress">ZIP ({zipProgress.current}/{zipProgress.total}...)</span>
              : 'ZIP All'
            }
          </button>
        </div>
      )}
    </CollapsibleGroup>
  );
}
