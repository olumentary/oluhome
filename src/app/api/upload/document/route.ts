import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems } from '@/db/schema';
import { generatePresignedUploadUrl } from '@/lib/storage';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);
}

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
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { itemId, filename, contentType, fileSize } = body;

  if (!itemId || !filename || !contentType || !fileSize) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: itemId, filename, contentType, fileSize',
      },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP' },
      { status: 400 },
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 10 MB' },
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

  const docId = randomUUID();
  const safe = sanitizeFilename(filename);
  const s3Key = `${user.id}/items/${itemId}/documents/${docId}/${safe}`;

  const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType);

  return NextResponse.json({ uploadUrl, s3Key });
}
