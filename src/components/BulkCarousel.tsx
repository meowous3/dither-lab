interface BulkCarouselProps {
  imageName: string;
  activeIndex: number;
  totalCount: number;
  onNavigate: (index: number) => void;
  onRemove: () => void;
  onClear: () => void;
}

export function BulkCarousel({ imageName, activeIndex, totalCount, onNavigate, onRemove, onClear }: BulkCarouselProps) {
  return (
    <div className="bulk-carousel">
      <button
        className="bulk-carousel-btn"
        onClick={() => onNavigate(activeIndex - 1)}
        disabled={activeIndex <= 0}
        aria-label="Previous image"
      >
        ‹
      </button>
      <div className="bulk-carousel-info">
        <span className="bulk-carousel-name" title={imageName}>{imageName}</span>
        <span className="bulk-carousel-count">{activeIndex + 1} / {totalCount}</span>
      </div>
      <button
        className="bulk-carousel-btn"
        onClick={() => onNavigate(activeIndex + 1)}
        disabled={activeIndex >= totalCount - 1}
        aria-label="Next image"
      >
        ›
      </button>
      <button
        className="bulk-carousel-remove"
        onClick={onRemove}
        title="Remove this image"
      >
        ×
      </button>
      <button
        className="bulk-carousel-clear"
        onClick={onClear}
        title="Clear all images"
      >
        Clear
      </button>
    </div>
  );
}
