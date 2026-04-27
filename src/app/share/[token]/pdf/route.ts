import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { validateShareToken } from '@/lib/share';
import { fetchItemForPdf, imageUrlToBase64 } from '@/lib/pdf';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { collectionItems, users } from '@/db/schema';
import { CatalogCard } from '@/components/pdf/catalog-card';
import { InsuranceSheet } from '@/components/pdf/insurance-sheet';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const validated = await validateShareToken(token);
  if (!validated) {
    return NextResponse.json(
      { error: 'Invalid or expired share link' },
      { status: 403 },
    );
  }

  const template = request.nextUrl.searchParams.get('template') ?? 'catalog';
  if (template !== 'catalog' && template !== 'insurance') {
    return NextResponse.json(
      { error: 'Invalid template. Use "catalog" or "insurance".' },
      { status: 400 },
    );
  }

  const itemId = request.nextUrl.searchParams.get('item');
  if (!itemId) {
    return NextResponse.json(
      { error: 'Missing item parameter' },
      { status: 400 },
    );
  }

  // Verify item is within share scope
  const itemRow = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, validated.userId),
    ),
    columns: { id: true, room: true },
  });

  if (!itemRow) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Scope check
  if (validated.scope === 'item' && itemRow.id !== validated.scopeId) {
    return NextResponse.json({ error: 'Item not in share scope' }, { status: 403 });
  }
  if (validated.scope === 'room' && itemRow.room !== validated.scopeId) {
    return NextResponse.json({ error: 'Item not in shared room' }, { status: 403 });
  }

  const item = await fetchItemForPdf(itemId, validated.userId);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Strip values from PDF if not included in share
  if (!validated.includeValues) {
    item.valuations = [];
    item.latestAcquisition = null;
  }

  // Convert photos to base64
  const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
  const photosToConvert =
    template === 'insurance'
      ? item.photos.slice(0, 5)
      : primaryPhoto
        ? [primaryPhoto]
        : [];

  await Promise.all(
    photosToConvert.map(async (photo) => {
      if (photo.downloadUrl) {
        photo.base64 = (await imageUrlToBase64(photo.downloadUrl)) ?? undefined;
      }
    }),
  );

  // Get owner name for insurance sheet
  const owner = await db.query.users.findFirst({
    where: eq(users.id, validated.userId),
    columns: { name: true },
  });

  const element =
    template === 'catalog'
      ? createElement(CatalogCard, { item })
      : createElement(InsuranceSheet, {
          item,
          ownerName: owner?.name ?? 'Owner',
        });

  const buffer = await renderToBuffer(
    element as unknown as ReactElement<DocumentProps>,
  );

  const safeTitle = item.title
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
