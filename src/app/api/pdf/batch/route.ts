import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems } from '@/db/schema';
import {
  fetchItemForPdf,
  imageUrlToBase64,
  formatCurrency,
  formatValuationRange,
  type ItemForPdf,
} from '@/lib/pdf';
import { incrementUsage } from '@/lib/usage';
import { BatchDocument } from '@/components/pdf/batch-document';

export async function POST(request: NextRequest) {
  const user = await requireAuth();

  const body = await request.json();
  const { itemIds, room, template = 'catalog' } = body as {
    itemIds?: string[];
    room?: string;
    template?: 'catalog' | 'insurance';
  };

  if (template !== 'catalog' && template !== 'insurance') {
    return NextResponse.json(
      { error: 'Invalid template. Use "catalog" or "insurance".' },
      { status: 400 },
    );
  }

  if (!itemIds?.length && !room) {
    return NextResponse.json(
      { error: 'Provide itemIds or room.' },
      { status: 400 },
    );
  }

  // Resolve item IDs
  let resolvedIds: string[];
  if (room) {
    const roomItems = await db.query.collectionItems.findMany({
      where: and(
        eq(collectionItems.userId, user.id),
        eq(collectionItems.room, room),
      ),
      columns: { id: true },
      orderBy: [asc(collectionItems.title)],
    });
    resolvedIds = roomItems.map((i) => i.id);
  } else {
    resolvedIds = itemIds!;
  }

  if (resolvedIds.length === 0) {
    return NextResponse.json(
      { error: 'No items found.' },
      { status: 404 },
    );
  }

  // Fetch all items with full data
  const items: ItemForPdf[] = [];
  for (const id of resolvedIds) {
    const item = await fetchItemForPdf(id, user.id);
    if (item) items.push(item);
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'No accessible items found.' },
      { status: 404 },
    );
  }

  // Convert photos to base64
  // For catalog: primary photo only per item. For insurance: up to 5 per item.
  const maxPhotosPerItem = template === 'insurance' ? 5 : 1;
  await Promise.all(
    items.map(async (item) => {
      const photosToConvert = item.photos.slice(0, maxPhotosPerItem);
      await Promise.all(
        photosToConvert.map(async (photo) => {
          if (photo.downloadUrl) {
            photo.base64 =
              (await imageUrlToBase64(photo.downloadUrl)) ?? undefined;
          }
        }),
      );
    }),
  );

  // Calculate total value
  let totalValue = 0;
  for (const item of items) {
    const v = item.valuations[0];
    if (!v) continue;
    if (v.valueSingle) {
      totalValue += parseFloat(v.valueSingle);
    } else if (v.valueLow && v.valueHigh) {
      totalValue += (parseFloat(v.valueLow) + parseFloat(v.valueHigh)) / 2;
    }
  }

  const title = room ? `Room Inventory: ${room}` : 'Collection Inventory';
  const subtitle = room
    ? `${items.length} item${items.length !== 1 ? 's' : ''}`
    : undefined;

  const element = createElement(BatchDocument, {
    title,
    subtitle,
    items,
    template,
    ownerName: user.name,
    totalValue: totalValue > 0 ? formatCurrency(totalValue) : undefined,
  });

  const buffer = await renderToBuffer(
    element as unknown as ReactElement<DocumentProps>,
  );

  // Track usage (count as 1 export regardless of item count)
  await incrementUsage(user.id, 'pdf_exports');

  const safeTitle = (room ?? 'collection')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="curiolu-${safeTitle}-${template}.pdf"`,
    },
  });
}
