import { eq, and, asc, desc } from 'drizzle-orm';
import { Font } from '@react-pdf/renderer';
import { db } from '@/db';
import {
  collectionItems,
  itemPhotos,
  itemMeasurements,
  acquisitions,
  valuations,
  vendors,
} from '@/db/schema';
import { generatePresignedDownloadUrl } from '@/lib/storage';
import type {
  CollectionItem,
  CollectionItemType,
  ItemPhoto,
  ItemMeasurement,
  Acquisition,
  Valuation,
  Vendor,
  FieldSchema,
  CustomFieldValues,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhotoWithUrl extends ItemPhoto {
  downloadUrl: string;
  base64?: string;
}

export interface AcquisitionWithVendor extends Acquisition {
  vendor: Vendor | null;
}

export interface ItemForPdf extends CollectionItem {
  itemType: CollectionItemType;
  photos: PhotoWithUrl[];
  measurements: ItemMeasurement[];
  latestAcquisition: AcquisitionWithVendor | null;
  valuations: Valuation[];
  fieldSchema: FieldSchema | null;
  customFieldValues: CustomFieldValues;
}

// ---------------------------------------------------------------------------
// Font registration — Inter from Fontsource CDN (TTF format required by react-pdf)
// ---------------------------------------------------------------------------

const INTER_CDN = 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest';

Font.register({
  family: 'Inter',
  fonts: [
    { src: `${INTER_CDN}/latin-400-normal.ttf`, fontWeight: 400 },
    { src: `${INTER_CDN}/latin-400-italic.ttf`, fontWeight: 400, fontStyle: 'italic' },
    { src: `${INTER_CDN}/latin-500-normal.ttf`, fontWeight: 500 },
    { src: `${INTER_CDN}/latin-600-normal.ttf`, fontWeight: 600 },
    { src: `${INTER_CDN}/latin-700-normal.ttf`, fontWeight: 700 },
  ],
});

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

export async function fetchItemForPdf(
  itemId: string,
  userId: string,
): Promise<ItemForPdf | null> {
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, userId),
    ),
    with: {
      itemType: true,
      photos: { orderBy: [asc(itemPhotos.displayOrder)] },
      measurements: { orderBy: [asc(itemMeasurements.displayOrder)] },
      valuations: { orderBy: [desc(valuations.valuationDate), desc(valuations.createdAt)] },
    },
  });

  if (!item) return null;

  // Fetch acquisitions with vendor joins
  const itemAcquisitions = await db.query.acquisitions.findMany({
    where: eq(acquisitions.itemId, itemId),
    with: { vendor: true },
    orderBy: [desc(acquisitions.acquisitionDate)],
  });

  // Generate presigned download URLs for each photo
  const photosWithUrls: PhotoWithUrl[] = await Promise.all(
    item.photos.map(async (photo) => {
      let downloadUrl = '';
      try {
        downloadUrl = await generatePresignedDownloadUrl(photo.s3Key);
      } catch {
        // URL generation failed — photo will be skipped in template
      }
      return { ...photo, downloadUrl };
    }),
  );

  return {
    ...item,
    photos: photosWithUrls,
    latestAcquisition: itemAcquisitions[0] ?? null,
    fieldSchema: item.itemType.fieldSchema as FieldSchema | null,
    customFieldValues: (item.customFields as CustomFieldValues) ?? {},
  };
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

export async function imageUrlToBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDimensions(item: {
  height?: string | null;
  width?: string | null;
  depth?: string | null;
  diameter?: string | null;
}): string {
  const parts: string[] = [];
  if (item.height) parts.push(`H ${item.height}`);
  if (item.width) parts.push(`W ${item.width}`);
  if (item.depth) parts.push(`D ${item.depth}`);
  if (item.diameter) parts.push(`Diam ${item.diameter}`);
  if (parts.length === 0) return '';
  return `${parts.join(' \u00d7 ')} in.`;
}

export function formatCurrency(
  amount: string | number | null | undefined,
): string {
  if (amount == null) return '\u2014';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateShort(
  date: string | Date | null | undefined,
): string {
  if (!date) return '\u2014';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatValuationRange(valuation: Valuation): string {
  if (valuation.valueSingle) {
    return formatCurrency(valuation.valueSingle);
  }
  if (valuation.valueLow && valuation.valueHigh) {
    return `${formatCurrency(valuation.valueLow)} \u2013 ${formatCurrency(valuation.valueHigh)}`;
  }
  return '\u2014';
}

// ---------------------------------------------------------------------------
// Custom field formatting for PDF
// ---------------------------------------------------------------------------

export function formatCustomFieldValue(
  value: string | number | boolean | string[] | null,
  type?: string,
  unit?: string,
): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (type === 'number' && unit) return `${value} ${unit}`;
  return String(value);
}

// ---------------------------------------------------------------------------
// Condition label map
// ---------------------------------------------------------------------------

export const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const VALUATION_TYPE_LABELS: Record<string, string> = {
  estimated: 'Estimated',
  appraised: 'Appraised',
  insured: 'Insured',
  auction_estimate: 'Auction Est.',
  retail: 'Retail',
};

export const VALUATION_PURPOSE_LABELS: Record<string, string> = {
  insurance: 'Insurance',
  estate: 'Estate',
  sale: 'Sale',
  donation: 'Donation',
  personal: 'Personal',
};
