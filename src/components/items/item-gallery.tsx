'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ImageOff,
  Play,
  Pause,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GalleryPhoto {
  id: string;
  caption: string | null;
  isPrimary: boolean;
  thumbnailUrl: string | null;
  fullUrl: string | null;
}

interface ItemGalleryProps {
  photos: GalleryPhoto[];
}

const AUTOPLAY_INTERVAL = 5000; // 5 seconds

// ---------------------------------------------------------------------------
// Lightbox overlay
// ---------------------------------------------------------------------------

function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
      >
        <X className="size-5" />
      </button>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 z-50 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 z-50 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {photo?.fullUrl ? (
          <img
            src={photo.fullUrl}
            alt={photo.caption || 'Photo'}
            className="max-h-[85vh] max-w-[90vw] rounded object-contain"
          />
        ) : (
          <div className="flex size-96 items-center justify-center rounded bg-muted">
            <ImageOff className="size-12 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Caption + counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        {photo?.caption && (
          <p className="mb-1 text-sm text-white drop-shadow">{photo.caption}</p>
        )}
        <span className="text-xs text-white/70">
          {index + 1} / {photos.length}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero image with crossfade transition
// ---------------------------------------------------------------------------

function HeroImage({
  photo,
  onClick,
}: {
  photo: GalleryPhoto | undefined;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const src = photo?.fullUrl ?? photo?.thumbnailUrl;

  // Reset error state when photo changes
  useEffect(() => {
    setImgError(false);
  }, [photo?.id]);

  return (
    <div
      className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg bg-muted"
      onClick={onClick}
    >
      {src && !imgError ? (
        <img
          key={photo?.id}
          src={src}
          alt={photo?.caption || 'Photo'}
          onError={() => setImgError(true)}
          className="size-full object-contain animate-in fade-in duration-500"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageOff className="size-12 text-muted-foreground/40" />
        </div>
      )}
      {photo?.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
          <p className="text-sm text-white">{photo.caption}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero + Thumbnail strip with auto-rotate (used in item detail page)
// ---------------------------------------------------------------------------

export function ItemGallery({ photos }: ItemGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const primaryIdx = photos.findIndex((p) => p.isPrimary);
    return primaryIdx >= 0 ? primaryIdx : 0;
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = photos[selectedIndex];

  const handlePrev = useCallback(() => {
    setSelectedIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  // Auto-rotate: advance when playing, not hovered, and lightbox closed
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isPlaying && !isHovered && !lightboxOpen && photos.length > 1) {
      timerRef.current = setInterval(() => {
        setSelectedIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
      }, AUTOPLAY_INTERVAL);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isHovered, lightboxOpen, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <div className="flex size-full items-center justify-center">
          <ImageOff className="size-12 text-muted-foreground/40" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hero image with navigation arrows */}
      <div className="group relative">
        <HeroImage
          photo={selected}
          onClick={() => setLightboxOpen(true)}
        />

        {/* Navigation arrows (visible on hover when multiple photos) */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
            >
              <ChevronRight className="size-5" />
            </button>

            {/* Play/Pause + counter */}
            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying((p) => !p);
                }}
                className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
              >
                {isPlaying ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
              </button>
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                {selectedIndex + 1} / {photos.length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`size-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                index === selectedIndex
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              {photo.thumbnailUrl ? (
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.caption || 'Thumbnail'}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted">
                  <ImageOff className="size-4 text-muted-foreground/40" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators for quick glance */}
      {photos.length > 1 && photos.length <= 10 && (
        <div className="flex justify-center gap-1.5">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`size-2 rounded-full transition-colors ${
                index === selectedIndex
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          photos={photos}
          index={selectedIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full photo grid (used in Photos tab)
// ---------------------------------------------------------------------------

export function PhotoGrid({ photos }: ItemGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handlePrev = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null ? (i > 0 ? i - 1 : photos.length - 1) : null,
    );
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null ? (i < photos.length - 1 ? i + 1 : 0) : null,
    );
  }, [photos.length]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageOff className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          No photos added yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
          >
            {photo.thumbnailUrl ? (
              <img
                src={photo.thumbnailUrl}
                alt={photo.caption || 'Photo'}
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageOff className="size-8 text-muted-foreground/40" />
              </div>
            )}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs text-white">{photo.caption}</p>
              </div>
            )}
            {photo.isPrimary && (
              <div className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Key Photo
              </div>
            )}
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}
