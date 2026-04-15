'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, count, sum, ilike, or, desc, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import {
  vendors,
  acquisitions,
  collectionItems,
  itemPhotos,
} from '@/db/schema';
import { vendorFormSchema } from '@/lib/validators';
import { generatePresignedDownloadUrl } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VendorActionState {
  error?: string;
  success?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// createVendor
// ---------------------------------------------------------------------------

export async function createVendor(
  _prev: VendorActionState | null,
  formData: FormData,
): Promise<VendorActionState> {
  const user = await requireAuth();

  const raw = formData.get('json') as string | null;
  if (!raw) return { error: 'Missing form data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON data' };
  }

  const result = vendorFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const data = result.data;

  const [created] = await db
    .insert(vendors)
    .values({
      userId: user.id,
      name: data.name,
      businessName: data.businessName || null,
      type: data.type || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      address: data.address || null,
      specialty: data.specialty || null,
      notes: data.notes || null,
      rating: data.rating ?? null,
    })
    .returning({ id: vendors.id });

  revalidatePath('/vendors');
  revalidatePath('/');
  return { success: true, id: created.id };
}

// ---------------------------------------------------------------------------
// updateVendor
// ---------------------------------------------------------------------------

export async function updateVendor(
  _prev: VendorActionState | null,
  formData: FormData,
): Promise<VendorActionState> {
  const user = await requireAuth();

  const id = formData.get('id') as string | null;
  const raw = formData.get('json') as string | null;
  if (!id || !raw) return { error: 'Missing form data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON data' };
  }

  const result = vendorFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const existing = await db.query.vendors.findFirst({
    where: and(eq(vendors.id, id), eq(vendors.userId, user.id)),
  });
  if (!existing) return { error: 'Vendor not found' };

  const data = result.data;

  await db
    .update(vendors)
    .set({
      name: data.name,
      businessName: data.businessName || null,
      type: data.type || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      address: data.address || null,
      specialty: data.specialty || null,
      notes: data.notes || null,
      rating: data.rating ?? null,
    })
    .where(and(eq(vendors.id, id), eq(vendors.userId, user.id)));

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  return { success: true, id };
}

// ---------------------------------------------------------------------------
// deleteVendor — only if no acquisitions reference this vendor
// ---------------------------------------------------------------------------

export async function deleteVendor(id: string): Promise<VendorActionState> {
  const user = await requireAuth();

  const existing = await db.query.vendors.findFirst({
    where: and(eq(vendors.id, id), eq(vendors.userId, user.id)),
  });
  if (!existing) return { error: 'Vendor not found' };

  const [acqCount] = await db
    .select({ value: count() })
    .from(acquisitions)
    .where(eq(acquisitions.vendorId, id));

  if (acqCount && acqCount.value > 0) {
    return {
      error: `Cannot delete: ${acqCount.value} acquisition${acqCount.value === 1 ? '' : 's'} reference this vendor`,
    };
  }

  await db
    .delete(vendors)
    .where(and(eq(vendors.id, id), eq(vendors.userId, user.id)));

  revalidatePath('/vendors');
  revalidatePath('/');
  return { success: true };
}

// ---------------------------------------------------------------------------
// getVendorWithPurchaseHistory
// ---------------------------------------------------------------------------

export async function getVendorWithPurchaseHistory(id: string) {
  const user = await requireAuth();

  const vendor = await db.query.vendors.findFirst({
    where: and(eq(vendors.id, id), eq(vendors.userId, user.id)),
    with: {
      acquisitions: {
        orderBy: [desc(acquisitions.createdAt)],
        with: {
          item: {
            with: {
              photos: {
                orderBy: [asc(itemPhotos.displayOrder)],
                limit: 1,
                where: eq(itemPhotos.isPrimary, true),
              },
            },
          },
        },
      },
    },
  });

  if (!vendor) return null;

  // Resolve thumbnail URLs for item photos
  const purchaseHistory = await Promise.all(
    vendor.acquisitions.map(async (acq) => {
      let thumbnailUrl: string | null = null;
      const primaryPhoto = acq.item.photos[0];
      if (primaryPhoto) {
        try {
          const key = primaryPhoto.thumbnailKey || primaryPhoto.s3Key;
          thumbnailUrl = await generatePresignedDownloadUrl(key);
        } catch {
          // Skip failed URL generation
        }
      }
      return {
        id: acq.id,
        itemId: acq.item.id,
        itemTitle: acq.item.title,
        thumbnailUrl,
        acquisitionDate: acq.acquisitionDate,
        purchasePrice: acq.purchasePrice,
        listedPrice: acq.listedPrice,
        saleName: acq.saleName,
        lotNumber: acq.lotNumber,
        acquisitionType: acq.acquisitionType,
      };
    }),
  );

  // Compute aggregate stats
  const [stats] = await db
    .select({
      totalItems: count(),
      totalSpend: sum(acquisitions.totalCost),
      avgDiscount: sum(acquisitions.listedPrice),
      avgPurchase: sum(acquisitions.purchasePrice),
    })
    .from(acquisitions)
    .where(eq(acquisitions.vendorId, id));

  const totalItems = stats?.totalItems ?? 0;
  const totalSpend = stats?.totalSpend ? parseFloat(stats.totalSpend) : 0;
  const totalListed = stats?.avgDiscount ? parseFloat(stats.avgDiscount) : 0;
  const totalPurchase = stats?.avgPurchase ? parseFloat(stats.avgPurchase) : 0;
  const avgDiscount =
    totalListed > 0 ? ((totalListed - totalPurchase) / totalListed) * 100 : 0;

  return {
    vendor,
    purchaseHistory,
    stats: {
      totalItems,
      totalSpend,
      avgDiscount,
    },
  };
}

// ---------------------------------------------------------------------------
// searchVendors — for vendor selector combobox
// ---------------------------------------------------------------------------

export async function searchVendors(query: string) {
  const user = await requireAuth();

  const conditions = [eq(vendors.userId, user.id)];
  if (query.trim()) {
    conditions.push(
      or(
        ilike(vendors.name, `%${query}%`),
        ilike(vendors.businessName, `%${query}%`),
      )!,
    );
  }

  return db
    .select({
      id: vendors.id,
      name: vendors.name,
      businessName: vendors.businessName,
      type: vendors.type,
    })
    .from(vendors)
    .where(and(...conditions))
    .orderBy(asc(vendors.name))
    .limit(20);
}

// ---------------------------------------------------------------------------
// getVendorsWithStats — for vendor list page
// ---------------------------------------------------------------------------

export async function getVendorsWithStats(filters?: {
  search?: string;
  type?: string;
}) {
  const user = await requireAuth();

  const conditions = [eq(vendors.userId, user.id)];
  if (filters?.search) {
    conditions.push(
      or(
        ilike(vendors.name, `%${filters.search}%`),
        ilike(vendors.businessName, `%${filters.search}%`),
      )!,
    );
  }
  if (filters?.type) {
    conditions.push(
      eq(
        vendors.type,
        filters.type as
          | 'dealer'
          | 'auction_house'
          | 'private'
          | 'estate_sale'
          | 'flea_market'
          | 'gallery'
          | 'other',
      ),
    );
  }

  const vendorList = await db
    .select({
      id: vendors.id,
      name: vendors.name,
      businessName: vendors.businessName,
      type: vendors.type,
      email: vendors.email,
      phone: vendors.phone,
      specialty: vendors.specialty,
      rating: vendors.rating,
      createdAt: vendors.createdAt,
      itemCount: count(acquisitions.id),
      totalSpend: sum(acquisitions.totalCost),
    })
    .from(vendors)
    .leftJoin(acquisitions, eq(acquisitions.vendorId, vendors.id))
    .where(and(...conditions))
    .groupBy(vendors.id)
    .orderBy(asc(vendors.name));

  return vendorList;
}
