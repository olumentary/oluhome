'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import {
  Upload,
  X,
  Star,
  GripVertical,
  Trash2,
  RotateCcw,
  Loader2,
  ImageOff,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  updatePhotoCaption,
  setPrimaryPhoto,
  reorderPhotos,
  deletePhoto,
} from '@/app/(dashboard)/items/actions';
import type { ItemPhoto } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhotoUploaderProps {
  itemId: string;
  existingPhotos: ItemPhoto[];
  /** Pre-resolved thumbnail URLs keyed by photo ID */
  thumbnailUrls: Record<string, string>;
}

type UploadStatus = 'pending' | 'uploading' | 'confirming' | 'done' | 'error';

interface UploadingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  // Returned from /api/upload
  key?: string;
  thumbnailKey?: string;
  photoId?: string;
}

// ---------------------------------------------------------------------------
// Sortable photo card (post-upload)
// ---------------------------------------------------------------------------

function SortablePhotoCard({
  photo,
  thumbnailUrl,
  itemId,
  onDelete,
  onSetPrimary,
}: {
  photo: ItemPhoto;
  thumbnailUrl: string | undefined;
  itemId: string;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? '');
  const [saving, setSaving] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCaptionChange = useCallback(
    (value: string) => {
      setCaption(value);
      if (captionTimer.current) clearTimeout(captionTimer.current);
      captionTimer.current = setTimeout(async () => {
        setSaving(true);
        const result = await updatePhotoCaption(photo.id, itemId, value);
        setSaving(false);
        if (result.error) toast.error(result.error);
      }, 800);
    },
    [photo.id, itemId],
  );

  useEffect(() => {
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);

  const handleSetPrimary = async () => {
    setSettingPrimary(true);
    const result = await setPrimaryPhoto(photo.id, itemId);
    setSettingPrimary(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      onSetPrimary(photo.id);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    const result = await deletePhoto(photo.id, itemId);
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
    } else {
      onDelete(photo.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border-2 bg-card overflow-hidden ${
        photo.isPrimary ? 'border-primary' : 'border-transparent'
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="absolute left-1 top-1 z-10 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      {/* Key Photo badge */}
      {photo.isPrimary && (
        <div className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          <Star className="size-2.5 fill-current" />
          Key Photo
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={photo.caption || photo.originalFilename || 'Photo'}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageOff className="size-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2 p-2">
        <div className="relative">
          <Input
            value={caption}
            onChange={(e) => handleCaptionChange(e.target.value)}
            placeholder="Add a caption..."
            className="h-7 text-xs pr-6"
          />
          {saving && (
            <Loader2 className="absolute right-2 top-1.5 size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {!photo.isPrimary && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px]"
              onClick={handleSetPrimary}
              disabled={settingPrimary}
            >
              {settingPrimary ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Star className="size-3" />
              )}
              Set Key Photo
            </Button>
          )}
          <div className="flex-1" />
          <Button
            type="button"
            variant={confirmDelete ? 'destructive' : 'ghost'}
            size="sm"
            className="h-6 px-1.5"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : confirmDelete ? (
              <span className="text-[10px]">Confirm?</span>
            ) : (
              <Trash2 className="size-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload progress card
// ---------------------------------------------------------------------------

function UploadingCard({
  upload,
  onRetry,
  onCancel,
}: {
  upload: UploadingFile;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="relative rounded-lg border bg-card overflow-hidden">
      {/* Preview */}
      <div className="aspect-square bg-muted">
        <img
          src={upload.previewUrl}
          alt={upload.file.name}
          className="size-full object-cover opacity-60"
        />
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {upload.status === 'uploading' && (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs font-medium text-white drop-shadow">
                {Math.round(upload.progress)}%
              </span>
            </div>
          )}
          {upload.status === 'confirming' && (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs font-medium text-white drop-shadow">
                Processing...
              </span>
            </div>
          )}
          {upload.status === 'done' && (
            <Check className="size-8 text-green-400 drop-shadow" />
          )}
          {upload.status === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <X className="size-8 text-red-400 drop-shadow" />
              <span className="max-w-[120px] text-center text-[10px] text-white drop-shadow">
                {upload.error || 'Upload failed'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(upload.status === 'uploading' || upload.status === 'confirming') && (
        <div className="h-1 bg-muted">
          <div
            className="h-1 bg-primary transition-[width] duration-300"
            style={{ width: `${upload.status === 'confirming' ? 100 : upload.progress}%` }}
          />
        </div>
      )}

      {/* File name + actions */}
      <div className="p-2">
        <p className="truncate text-xs text-muted-foreground">
          {upload.file.name}
        </p>
        {upload.status === 'error' && (
          <div className="mt-1 flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px]"
              onClick={() => onRetry(upload.id)}
            >
              <RotateCcw className="size-3" />
              Retry
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={() => onCancel(upload.id)}
            >
              <X className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main uploader
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE = 20 * 1024 * 1024;

export function PhotoUploader({ itemId, existingPhotos, thumbnailUrls: initialThumbnailUrls }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<ItemPhoto[]>(existingPhotos);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>(initialThumbnailUrls);
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Upload a single file through the presigned URL flow
  const uploadFile = useCallback(
    async (uploadItem: UploadingFile) => {
      const { file, id } = uploadItem;

      // Step 1: Get presigned URL
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: 'uploading' as const, progress: 0 } : u,
        ),
      );

      let presignedData: {
        presignedUrl: string;
        key: string;
        thumbnailKey: string;
        photoId: string;
      };

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            filename: file.name,
            contentType: file.type || 'image/jpeg',
            fileSize: file.size,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to get upload URL');
        }

        presignedData = await res.json();
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'error' as const, error: (err as Error).message }
              : u,
          ),
        );
        return;
      }

      // Step 2: PUT file to S3 with progress tracking
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignedData.presignedUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = (e.loaded / e.total) * 100;
              setUploads((prev) =>
                prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)),
              );
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
          xhr.send(file);
        });
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'error' as const, error: (err as Error).message }
              : u,
          ),
        );
        return;
      }

      // Step 3: Confirm upload
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: 'confirming' as const, progress: 100 } : u,
        ),
      );

      try {
        const confirmRes = await fetch('/api/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId: presignedData.photoId,
            key: presignedData.key,
            thumbnailKey: presignedData.thumbnailKey,
            itemId,
            originalFilename: file.name,
            contentType: file.type || 'image/jpeg',
            fileSizeBytes: file.size,
          }),
        });

        if (!confirmRes.ok) {
          const err = await confirmRes.json();
          throw new Error(err.error || 'Confirmation failed');
        }

        const { photo, thumbnailUrl } = await confirmRes.json();

        // Store the resolved thumbnail URL so it displays immediately
        if (thumbnailUrl) {
          setThumbUrls((prev) => ({ ...prev, [photo.id]: thumbnailUrl }));
        }

        // Move from uploads to managed photos
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: 'done' as const } : u,
          ),
        );

        // Add to photos list after a brief delay so the user sees the check
        setTimeout(() => {
          setPhotos((prev) => [...prev, photo]);
          setUploads((prev) => prev.filter((u) => u.id !== id));
        }, 600);
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'error' as const, error: (err as Error).message }
              : u,
          ),
        );
      }
    },
    [itemId],
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newUploads: UploadingFile[] = [];

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
          toast.error(`${file.name}: Invalid file type`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: File too large (max 20 MB)`);
          continue;
        }

        const upload: UploadingFile = {
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          progress: 0,
        };
        newUploads.push(upload);
      }

      if (newUploads.length === 0) return;

      setUploads((prev) => [...prev, ...newUploads]);

      // Start all uploads
      for (const upload of newUploads) {
        uploadFile(upload);
      }
    },
    [uploadFile],
  );

  const handleRetry = useCallback(
    (id: string) => {
      const upload = uploads.find((u) => u.id === id);
      if (upload) uploadFile(upload);
    },
    [uploads, uploadFile],
  );

  const handleCancelUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const upload = prev.find((u) => u.id === id);
      if (upload) URL.revokeObjectURL(upload.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  }, []);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const deleted = prev.find((p) => p.id === id);
      const remaining = prev.filter((p) => p.id !== id);
      // If deleted photo was key photo, promote the first remaining
      if (deleted?.isPrimary && remaining.length > 0) {
        return remaining.map((p, i) =>
          i === 0 ? { ...p, isPrimary: true } : p,
        );
      }
      return remaining;
    });
  }, []);

  const handleSetPrimary = useCallback((id: string) => {
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.id === id })),
    );
  }, []);

  // Drag-and-drop reorder
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = photos.findIndex((p) => p.id === active.id);
      const newIndex = photos.findIndex((p) => p.id === over.id);

      const reordered = arrayMove(photos, oldIndex, newIndex);
      setPhotos(reordered);

      const result = await reorderPhotos(
        itemId,
        reordered.map((p) => p.id),
      );
      if (result.error) toast.error(result.error);
    },
    [photos, itemId],
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            Drop photos here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG, WebP, HEIC up to 20 MB each
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Uploading items */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {uploads.map((upload) => (
            <UploadingCard
              key={upload.id}
              upload={upload}
              onRetry={handleRetry}
              onCancel={handleCancelUpload}
            />
          ))}
        </div>
      )}

      {/* Managed photos (sortable) */}
      {photos.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map((photo) => (
                <SortablePhotoCard
                  key={photo.id}
                  photo={photo}
                  thumbnailUrl={thumbUrls[photo.id]}
                  itemId={itemId}
                  onDelete={handleDeletePhoto}
                  onSetPrimary={handleSetPrimary}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {photos.length === 0 && uploads.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No photos yet. Upload some to get started.
        </p>
      )}
    </div>
  );
}
