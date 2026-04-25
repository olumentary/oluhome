import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { requireAuth } from '@/lib/auth-helpers';
import { fetchItemForPdf, imageUrlToBase64 } from '@/lib/pdf';
import { incrementUsage } from '@/lib/usage';
import { CatalogCard } from '@/components/pdf/catalog-card';
import { InsuranceSheet } from '@/components/pdf/insurance-sheet';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  const { id } = await params;

  const template = request.nextUrl.searchParams.get('template') ?? 'catalog';
  if (template !== 'catalog' && template !== 'insurance') {
    return NextResponse.json(
      { error: 'Invalid template. Use "catalog" or "insurance".' },
      { status: 400 },
    );
  }

  const item = await fetchItemForPdf(id, user.id);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Convert photos to base64 for embedding in PDF
  // For catalog: only the primary photo. For insurance: up to 5.
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

  // Render PDF
  const element =
    template === 'catalog'
      ? createElement(CatalogCard, { item })
      : createElement(InsuranceSheet, { item, ownerName: user.name });

  const buffer = await renderToBuffer(
    element as unknown as ReactElement<DocumentProps>,
  );

  // Track usage
  await incrementUsage(user.id, 'pdf_exports');

  // Sanitize filename
  const safeTitle = item.title
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="oluhome-${safeTitle}-${template}.pdf"`,
    },
  });
}
