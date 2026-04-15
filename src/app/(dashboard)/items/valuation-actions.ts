'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { valuations, collectionItems } from '@/db/schema';
import { valuationFormSchema } from '@/lib/validators';
import { generatePresignedDownloadUrl } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValuationActionState {
  error?: string;
  success?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// createValuation
// ---------------------------------------------------------------------------

export async function createValuation(
  itemId: string,
  _prev: ValuationActionState | null,
  formData: FormData,
): Promise<ValuationActionState> {
  const user = await requireAuth();

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  const raw = formData.get('json') as string | null;
  if (!raw) return { error: 'Missing form data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON data' };
  }

  const result = valuationFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const data = result.data;

  const [created] = await db
    .insert(valuations)
    .values({
      itemId,
      valuationType: data.valuationType,
      valueLow: data.isRange && data.valueLow != null ? String(data.valueLow) : null,
      valueHigh: data.isRange && data.valueHigh != null ? String(data.valueHigh) : null,
      valueSingle: !data.isRange && data.valueSingle != null ? String(data.valueSingle) : null,
      appraiserName: data.appraiserName || null,
      appraiserCredentials: data.appraiserCredentials || null,
      valuationDate: data.valuationDate || null,
      purpose: data.purpose || null,
      notes: data.notes || null,
      documentS3Key: data.documentS3Key || null,
    })
    .returning({ id: valuations.id });

  revalidatePath(`/items/${itemId}`);
  return { success: true, id: created.id };
}

// ---------------------------------------------------------------------------
// getValuationHistory — for the item detail page
// ---------------------------------------------------------------------------

export async function getValuationHistory(itemId: string) {
  const user = await requireAuth();

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return [];

  const vals = await db.query.valuations.findMany({
    where: eq(valuations.itemId, itemId),
    orderBy: [desc(valuations.valuationDate), desc(valuations.createdAt)],
  });

  // Resolve document URLs
  return Promise.all(
    vals.map(async (val) => {
      let documentUrl: string | null = null;
      if (val.documentS3Key) {
        try {
          documentUrl = await generatePresignedDownloadUrl(val.documentS3Key);
        } catch {
          // Skip failed URL generation
        }
      }
      return { ...val, documentUrl };
    }),
  );
}

// ---------------------------------------------------------------------------
// getLatestValuation — optional type filter
// ---------------------------------------------------------------------------

export async function getLatestValuation(
  itemId: string,
  type?: 'estimated' | 'appraised' | 'insured' | 'auction_estimate' | 'retail',
) {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return null;

  const conditions = [eq(valuations.itemId, itemId)];
  if (type) conditions.push(eq(valuations.valuationType, type));

  const [latest] = await db
    .select()
    .from(valuations)
    .where(and(...conditions))
    .orderBy(desc(valuations.valuationDate), desc(valuations.createdAt))
    .limit(1);

  return latest ?? null;
}
