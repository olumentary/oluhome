'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { acquisitions, collectionItems, vendors } from '@/db/schema';
import { acquisitionFormSchema } from '@/lib/validators';
import { generatePresignedDownloadUrl } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcquisitionActionState {
  error?: string;
  success?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// createAcquisition
// ---------------------------------------------------------------------------

export async function createAcquisition(
  itemId: string,
  _prev: AcquisitionActionState | null,
  formData: FormData,
): Promise<AcquisitionActionState> {
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

  const result = acquisitionFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const data = result.data;

  // Verify vendor ownership if provided
  if (data.vendorId) {
    const vendor = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.id, data.vendorId),
        eq(vendors.userId, user.id),
      ),
      columns: { id: true },
    });
    if (!vendor) return { error: 'Vendor not found' };
  }

  const [created] = await db
    .insert(acquisitions)
    .values({
      itemId,
      vendorId: data.vendorId || null,
      acquisitionDate: data.acquisitionDate || null,
      acquisitionType: data.acquisitionType || null,
      listedPrice: data.listedPrice != null ? String(data.listedPrice) : null,
      purchasePrice:
        data.purchasePrice != null ? String(data.purchasePrice) : null,
      buyersPremiumPct:
        data.buyersPremiumPct != null ? String(data.buyersPremiumPct) : null,
      taxAmount: data.taxAmount != null ? String(data.taxAmount) : null,
      shippingCost:
        data.shippingCost != null ? String(data.shippingCost) : null,
      totalCost: data.totalCost != null ? String(data.totalCost) : null,
      lotNumber: data.lotNumber || null,
      saleName: data.saleName || null,
      notes: data.notes || null,
      receiptS3Key: data.receiptS3Key || null,
    })
    .returning({ id: acquisitions.id });

  revalidatePath(`/items/${itemId}`);
  revalidatePath('/vendors');
  return { success: true, id: created.id };
}

// ---------------------------------------------------------------------------
// updateAcquisition
// ---------------------------------------------------------------------------

export async function updateAcquisition(
  acquisitionId: string,
  _prev: AcquisitionActionState | null,
  formData: FormData,
): Promise<AcquisitionActionState> {
  const user = await requireAuth();

  // Find acquisition and verify item ownership
  const existing = await db.query.acquisitions.findFirst({
    where: eq(acquisitions.id, acquisitionId),
    with: { item: { columns: { id: true, userId: true } } },
  });
  if (!existing || existing.item.userId !== user.id) {
    return { error: 'Acquisition not found' };
  }

  const raw = formData.get('json') as string | null;
  if (!raw) return { error: 'Missing form data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON data' };
  }

  const result = acquisitionFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const data = result.data;

  // Verify vendor ownership if provided
  if (data.vendorId) {
    const vendor = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.id, data.vendorId),
        eq(vendors.userId, user.id),
      ),
      columns: { id: true },
    });
    if (!vendor) return { error: 'Vendor not found' };
  }

  await db
    .update(acquisitions)
    .set({
      vendorId: data.vendorId || null,
      acquisitionDate: data.acquisitionDate || null,
      acquisitionType: data.acquisitionType || null,
      listedPrice: data.listedPrice != null ? String(data.listedPrice) : null,
      purchasePrice:
        data.purchasePrice != null ? String(data.purchasePrice) : null,
      buyersPremiumPct:
        data.buyersPremiumPct != null ? String(data.buyersPremiumPct) : null,
      taxAmount: data.taxAmount != null ? String(data.taxAmount) : null,
      shippingCost:
        data.shippingCost != null ? String(data.shippingCost) : null,
      totalCost: data.totalCost != null ? String(data.totalCost) : null,
      lotNumber: data.lotNumber || null,
      saleName: data.saleName || null,
      notes: data.notes || null,
      receiptS3Key: data.receiptS3Key || null,
    })
    .where(eq(acquisitions.id, acquisitionId));

  revalidatePath(`/items/${existing.itemId}`);
  revalidatePath('/vendors');
  return { success: true, id: acquisitionId };
}

// ---------------------------------------------------------------------------
// deleteAcquisition
// ---------------------------------------------------------------------------

export async function deleteAcquisition(
  acquisitionId: string,
): Promise<AcquisitionActionState> {
  const user = await requireAuth();

  const existing = await db.query.acquisitions.findFirst({
    where: eq(acquisitions.id, acquisitionId),
    with: { item: { columns: { id: true, userId: true } } },
  });
  if (!existing || existing.item.userId !== user.id) {
    return { error: 'Acquisition not found' };
  }

  await db.delete(acquisitions).where(eq(acquisitions.id, acquisitionId));

  revalidatePath(`/items/${existing.itemId}`);
  revalidatePath('/vendors');
  return { success: true };
}

// ---------------------------------------------------------------------------
// getItemAcquisitions — for the item detail page
// ---------------------------------------------------------------------------

export async function getItemAcquisitions(itemId: string) {
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

  const acqs = await db.query.acquisitions.findMany({
    where: eq(acquisitions.itemId, itemId),
    orderBy: [desc(acquisitions.createdAt)],
    with: {
      vendor: {
        columns: { id: true, name: true, businessName: true, type: true },
      },
    },
  });

  // Resolve receipt URLs
  return Promise.all(
    acqs.map(async (acq) => {
      let receiptUrl: string | null = null;
      if (acq.receiptS3Key) {
        try {
          receiptUrl = await generatePresignedDownloadUrl(acq.receiptS3Key);
        } catch {
          // Skip failed URL generation
        }
      }
      return { ...acq, receiptUrl };
    }),
  );
}
