import { useCallback, useRef, useState } from 'react';

interface SourcePickerProps {
  sourceType: 'gradient' | 'image';
  imageName: string | null;
  onSelectGradient: () => void;
  onUploadImage: (file: File) => void;
}

export function SourcePicker({ sourceType, imageName, onSelectGradient, onUploadImage }: SourcePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      onUploadImage(file);
    }
  }, [onUploadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div className="control-group">
      <h3>Source</h3>
      <div className="source-tabs">
        <button
          className={`source-tab ${sourceType === 'gradient' ? 'active' : ''}`}
          onClick={onSelectGradient}
        >
          Gradient
        </button>
        <button
          className={`source-tab ${sourceType === 'image' ? 'active' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          Image
        </button>
      </div>
      {sourceType === 'image' && (
        <div
          className={`source-dropzone ${dragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileRef.current?.click()}
        >
          {imageName
            ? <span className="source-filename">{imageName}</span>
            : <span className="source-hint">Drop image or click to browse</span>
          }
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
