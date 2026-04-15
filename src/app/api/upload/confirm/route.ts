import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems, itemPhotos } from '@/db/schema';
import { processUploadedPhoto } from '@/lib/image-processing';
import { generatePresignedDownloadUrl } from '@/lib/storage';

export async function POST(request: NextRequest) {
  const user = await requireAuth();

  let body: {
    photoId: string;
    key: string;
    thumbnailKey: string;
    itemId: string;
    originalFilename: string;
    contentType: string;
    fileSizeBytes: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    photoId,
    key,
    thumbnailKey,
    itemId,
    originalFilename,
    contentType,
    fileSizeBytes,
  } = body;

  if (!photoId || !key || !thumbnailKey || !itemId || !originalFilename || !contentType) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Process image: generate thumbnail + extract dimensions
  let widthPx = 0;
  let heightPx = 0;
  try {
    const metadata = await processUploadedPhoto(key, thumbnailKey);
    widthPx = metadata.widthPx;
    heightPx = metadata.heightPx;
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
    // Continue without thumbnail — the original is already uploaded
  }

  // Determine display order (append to end)
  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(${itemPhotos.displayOrder}), -1)` })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId));

  const displayOrder = (maxOrder?.max ?? -1) + 1;

  // Check if this is the first photo — make it primary
  const [photoCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId));

  const isPrimary = (photoCount?.count ?? 0) === 0;

  // Create item_photos record
  const [photo] = await db
    .insert(itemPhotos)
    .values({
      id: photoId,
      itemId,
      s3Key: key,
      thumbnailKey,
      originalFilename,
      contentType,
      isPrimary,
      displayOrder,
      widthPx: widthPx || null,
      heightPx: heightPx || null,
      fileSizeBytes: fileSizeBytes || null,
    })
    .returning();

  // Generate a presigned thumbnail URL so the client can display it immediately
  let resolvedThumbnailUrl: string | null = null;
  try {
    resolvedThumbnailUrl = await generatePresignedDownloadUrl(thumbnailKey);
  } catch {
    // Fallback to full-size URL if thumbnail isn't available
    try {
      resolvedThumbnailUrl = await generatePresignedDownloadUrl(key);
    } catch {
      // Client will show placeholder
    }
  }

  return NextResponse.json({ photo, thumbnailUrl: resolvedThumbnailUrl });
}
