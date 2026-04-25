import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems } from '@/db/schema';
import {
  photoKey,
  thumbnailKey,
  generatePresignedUploadUrl,
} from '@/lib/storage';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const user = await requireAuth();

  let body: {
    itemId: string;
    filename: string;
    contentType: string;
    fileSize: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { itemId, filename, contentType, fileSize } = body;

  // Validate required fields
  if (!itemId || !filename || !contentType || !fileSize) {
    return NextResponse.json(
      { error: 'Missing required fields: itemId, filename, contentType, fileSize' },
      { status: 400 },
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC' },
      { status: 400 },
    );
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 20 MB' },
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

  // Generate unique photo ID and S3 keys
  const photoId = crypto.randomUUID();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = photoKey(user.id, itemId, photoId, sanitizedFilename);
  const thumbKey = thumbnailKey(user.id, itemId, photoId, sanitizedFilename);

  // Generate presigned upload URL
  const presignedUrl = await generatePresignedUploadUrl(key, contentType);

  return NextResponse.json({
    presignedUrl,
    key,
    thumbnailKey: thumbKey,
    photoId,
  });
}
