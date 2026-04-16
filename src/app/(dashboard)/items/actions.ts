'use server';

import { revalidatePath } from 'next/cache';
import {
  eq,
  and,
  desc,
  asc,
  count,
  ilike,
  inArray,
  gte,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import {
  collectionItems,
  collectionItemTypes,
  itemPhotos,
  itemMeasurements,
  acquisitions,
  valuations,
  aiAnalyses,
  vendors,
} from '@/db/schema';
import { itemFormSchema } from '@/lib/validators';
import { generateDynamicSchema } from '@/lib/validators';
import { deleteObjects, generatePresignedDownloadUrl } from '@/lib/storage';
import type { FieldSchema, CustomFieldValues } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ItemActionState {
  error?: string;
  success?: boolean;
  id?: string;
}

export interface ItemsFilter {
  search?: string;
  typeId?: string;
  room?: string;
  conditions?: string[];
  status?: string;
  valueMin?: number;
  valueMax?: number;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
  useFullText?: boolean;
}

export interface ItemsResult {
  items: Array<{
    id: string;
    title: string;
    period: string | null;
    style: string | null;
    room: string | null;
    condition: string | null;
    status: string;
    createdAt: Date;
    typeName: string;
    typeId: string;
    primaryPhotoKey: string | null;
    thumbnailKey: string | null;
    thumbnailUrl: string | null;
    latestValue: string | null;
  }>;
  nextCursor: string | null;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// getItems — filtered, sorted, cursor-paginated
// ---------------------------------------------------------------------------

export async function getItems(filters: ItemsFilter): Promise<ItemsResult> {
  const user = await requireAuth();
  const limit = Math.min(filters.limit ?? 24, 100);

  // Build WHERE conditions
  const conditions: SQL[] = [eq(collectionItems.userId, user.id)];

  if (filters.search) {
    if (filters.useFullText) {
      conditions.push(
        sql`${collectionItems.searchVector} @@ plainto_tsquery('english', ${filters.search})`,
      );
    } else {
      conditions.push(ilike(collectionItems.title, `%${filters.search}%`));
    }
  }
  if (filters.typeId) {
    conditions.push(eq(collectionItems.itemTypeId, filters.typeId));
  }
  if (filters.room) {
    conditions.push(eq(collectionItems.room, filters.room));
  }
  if (filters.conditions?.length) {
    conditions.push(
      inArray(
        collectionItems.condition,
        filters.conditions as (
          | 'excellent'
          | 'very_good'
          | 'good'
          | 'fair'
          | 'poor'
        )[],
      ),
    );
  }
  if (filters.status) {
    conditions.push(
      eq(
        collectionItems.status,
        filters.status as 'active' | 'sold' | 'gifted' | 'stored' | 'on_loan',
      ),
    );
  }

  const whereClause = and(...conditions)!;

  // Total count for pagination
  const [countResult] = await db
    .select({ value: count() })
    .from(collectionItems)
    .where(whereClause);

  // Cursor-based pagination: cursor is the createdAt ISO string of the last item
  const cursorConditions = [...conditions];
  if (filters.cursor) {
    cursorConditions.push(
      lte(collectionItems.createdAt, new Date(filters.cursor)),
    );
  }

  // Determine sort
  const sortDir = filters.sortDir === 'asc' ? asc : desc;
  let orderBy;
  switch (filters.sortField) {
    case 'title':
      orderBy = sortDir(collectionItems.title);
      break;
    case 'room':
      orderBy = sortDir(collectionItems.room);
      break;
    case 'condition':
      orderBy = sortDir(collectionItems.condition);
      break;
    case 'status':
      orderBy = sortDir(collectionItems.status);
      break;
    default:
      orderBy = desc(collectionItems.createdAt);
  }

  // Fetch items with type name, primary photo, latest valuation
  const items = await db
    .select({
      id: collectionItems.id,
      title: collectionItems.title,
      period: collectionItems.period,
      style: collectionItems.style,
      room: collectionItems.room,
      condition: collectionItems.condition,
      status: collectionItems.status,
      createdAt: collectionItems.createdAt,
      typeId: collectionItemTypes.id,
      typeName: collectionItemTypes.name,
      primaryPhotoKey: itemPhotos.s3Key,
      thumbnailKey: itemPhotos.thumbnailKey,
    })
    .from(collectionItems)
    .innerJoin(
      collectionItemTypes,
      eq(collectionItems.itemTypeId, collectionItemTypes.id),
    )
    .leftJoin(
      itemPhotos,
      and(
        eq(itemPhotos.itemId, collectionItems.id),
        eq(itemPhotos.isPrimary, true),
      ),
    )
    .where(and(...cursorConditions))
    .orderBy(orderBy)
    .limit(limit + 1);

  // If we got limit+1, there's a next page
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore
    ? pageItems[pageItems.length - 1].createdAt.toISOString()
    : null;

  // Fetch latest valuation for each item in the page
  const itemIds = pageItems.map((i) => i.id);
  let valueMap = new Map<string, string>();
  if (itemIds.length > 0) {
    const vals = await db
      .select({
        itemId: valuations.itemId,
        valueSingle: valuations.valueSingle,
      })
      .from(valuations)
      .where(inArray(valuations.itemId, itemIds))
      .orderBy(desc(valuations.createdAt));

    // Take first (latest) for each item
    for (const v of vals) {
      if (!valueMap.has(v.itemId) && v.valueSingle) {
        valueMap.set(v.itemId, v.valueSingle);
      }
    }
  }

  // Resolve thumbnail presigned URLs (fall back to full-size if thumbnail missing)
  const thumbnailUrlMap = new Map<string, string>();
  await Promise.all(
    pageItems.map(async (item) => {
      const key = item.thumbnailKey || item.primaryPhotoKey;
      if (key) {
        try {
          const url = await generatePresignedDownloadUrl(key);
          thumbnailUrlMap.set(item.id, url);
        } catch {
          // Skip failed URL generation
        }
      }
    }),
  );

  // Optionally filter by value range (post-query since it joins valuations)
  let filteredItems = pageItems.map((item) => ({
    ...item,
    thumbnailUrl: thumbnailUrlMap.get(item.id) ?? null,
    latestValue: valueMap.get(item.id) ?? null,
  }));

  if (filters.valueMin != null || filters.valueMax != null) {
    filteredItems = filteredItems.filter((item) => {
      if (!item.latestValue) return false;
      const val = parseFloat(item.latestValue);
      if (filters.valueMin != null && val < filters.valueMin) return false;
      if (filters.valueMax != null && val > filters.valueMax) return false;
      return true;
    });
  }

  return {
    items: filteredItems,
    nextCursor,
    totalCount: countResult?.value ?? 0,
  };
}

// ---------------------------------------------------------------------------
// getItemTypes — for the type selector
// ---------------------------------------------------------------------------

export async function getItemTypes() {
  const user = await requireAuth();

  return db.query.collectionItemTypes.findMany({
    where: eq(collectionItemTypes.userId, user.id),
    orderBy: [asc(collectionItemTypes.displayOrder), asc(collectionItemTypes.name)],
  });
}

// ---------------------------------------------------------------------------
// getRooms — distinct room values for the filter
// ---------------------------------------------------------------------------

export async function getRooms(): Promise<string[]> {
  const user = await requireAuth();

  const rows = await db
    .selectDistinct({ room: collectionItems.room })
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.userId, user.id),
        sql`${collectionItems.room} IS NOT NULL`,
      ),
    )
    .orderBy(asc(collectionItems.room));

  return rows.map((r) => r.room!);
}

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------

export async function createItem(
  _prev: ItemActionState | null,
  formData: FormData,
): Promise<ItemActionState> {
  const user = await requireAuth();

  const raw = formData.get('json') as string | null;
  if (!raw) return { error: 'Missing form data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON data' };
  }

  // Validate base fields
  const baseResult = itemFormSchema.safeParse(parsed);
  if (!baseResult.success) {
    return { error: baseResult.error.issues[0]?.message ?? 'Validation failed' };
  }

  const data = baseResult.data;

  // Verify type exists and belongs to user
  const itemType = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.id, data.itemTypeId),
      eq(collectionItemTypes.userId, user.id),
    ),
  });
  if (!itemType) return { error: 'Item type not found' };

  // Validate custom fields against type schema
  const fieldSchema = itemType.fieldSchema as FieldSchema | null;
  if (data.customFields && fieldSchema) {
    const dynamicSchema = generateDynamicSchema(fieldSchema);
    const customResult = dynamicSchema.safeParse(data.customFields);
    if (!customResult.success) {
      return {
        error: customResult.error.issues[0]?.message ?? 'Custom field validation failed',
      };
    }
  }

  const [created] = await db
    .insert(collectionItems)
    .values({
      userId: user.id,
      itemTypeId: data.itemTypeId,
      title: data.title,
      description: data.description || null,
      period: data.period || null,
      style: data.style || null,
      originCountry: data.originCountry || null,
      originRegion: data.originRegion || null,
      makerAttribution: data.makerAttribution || null,
      materials: data.materials?.length ? data.materials : null,
      condition: data.condition || null,
      conditionNotes: data.conditionNotes || null,
      height: data.height != null ? String(data.height) : null,
      width: data.width != null ? String(data.width) : null,
      depth: data.depth != null ? String(data.depth) : null,
      diameter: data.diameter != null ? String(data.diameter) : null,
      weight: data.weight != null ? String(data.weight) : null,
      room: data.room || null,
      positionInRoom: data.positionInRoom || null,
      customFields: (data.customFields as Record<string, unknown>) ?? null,
      provenanceNarrative: data.provenanceNarrative || null,
      provenanceReferences: data.provenanceReferences || null,
      notes: data.notes || null,
      tags: data.tags?.length ? data.tags : null,
      status: data.status ?? 'active',
    })
    .returning({ id: collectionItems.id });

  // If a vendor was selected, create an initial acquisition linking them
  const vendorId = formData.get('vendorId') as string | null;
  if (vendorId) {
    const vendor = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, vendorId), eq(vendors.userId, user.id)),
      columns: { id: true },
    });
    if (vendor) {
      await db.insert(acquisitions).values({
        itemId: created.id,
        vendorId,
        acquisitionType: 'purchase',
      });
    }
  }

  revalidatePath('/items');
  revalidatePath('/vendors');
  revalidatePath('/');
  return { success: true, id: created.id };
}

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

export async function updateItem(
  _prev: ItemActionState | null,
  formData: FormData,
): Promise<ItemActionState> {
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

  const baseResult = itemFormSchema.safeParse(parsed);
  if (!baseResult.success) {
    return { error: baseResult.error.issues[0]?.message ?? 'Validation failed' };
  }

  const data = baseResult.data;

  // Verify ownership
  const existing = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, id),
      eq(collectionItems.userId, user.id),
    ),
  });
  if (!existing) return { error: 'Item not found' };

  // Verify type
  const itemType = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.id, data.itemTypeId),
      eq(collectionItemTypes.userId, user.id),
    ),
  });
  if (!itemType) return { error: 'Item type not found' };

  // Validate custom fields
  const fieldSchema = itemType.fieldSchema as FieldSchema | null;
  if (data.customFields && fieldSchema) {
    const dynamicSchema = generateDynamicSchema(fieldSchema);
    const customResult = dynamicSchema.safeParse(data.customFields);
    if (!customResult.success) {
      return {
        error: customResult.error.issues[0]?.message ?? 'Custom field validation failed',
      };
    }
  }

  await db
    .update(collectionItems)
    .set({
      itemTypeId: data.itemTypeId,
      title: data.title,
      description: data.description || null,
      period: data.period || null,
      style: data.style || null,
      originCountry: data.originCountry || null,
      originRegion: data.originRegion || null,
      makerAttribution: data.makerAttribution || null,
      materials: data.materials?.length ? data.materials : null,
      condition: data.condition || null,
      conditionNotes: data.conditionNotes || null,
      height: data.height != null ? String(data.height) : null,
      width: data.width != null ? String(data.width) : null,
      depth: data.depth != null ? String(data.depth) : null,
      diameter: data.diameter != null ? String(data.diameter) : null,
      weight: data.weight != null ? String(data.weight) : null,
      room: data.room || null,
      positionInRoom: data.positionInRoom || null,
      customFields: (data.customFields as Record<string, unknown>) ?? null,
      provenanceNarrative: data.provenanceNarrative || null,
      provenanceReferences: data.provenanceReferences || null,
      notes: data.notes || null,
      tags: data.tags?.length ? data.tags : null,
      status: data.status ?? 'active',
    })
    .where(
      and(
        eq(collectionItems.id, id),
        eq(collectionItems.userId, user.id),
      ),
    );

  // Handle vendor association via acquisition record
  const vendorId = formData.get('vendorId') as string | null;
  // vendorId is present when user selected a vendor; empty string means cleared
  const vendorFieldPresent = formData.has('vendorId');
  if (vendorFieldPresent) {
    // Find the most recent acquisition for this item
    const latestAcq = await db.query.acquisitions.findFirst({
      where: eq(acquisitions.itemId, id),
      orderBy: [desc(acquisitions.createdAt)],
      columns: { id: true, vendorId: true },
    });

    if (vendorId) {
      // Verify vendor belongs to user
      const vendor = await db.query.vendors.findFirst({
        where: and(eq(vendors.id, vendorId), eq(vendors.userId, user.id)),
        columns: { id: true },
      });
      if (vendor) {
        if (latestAcq) {
          // Update existing acquisition's vendor
          await db
            .update(acquisitions)
            .set({ vendorId })
            .where(eq(acquisitions.id, latestAcq.id));
        } else {
          // Create a new acquisition record
          await db.insert(acquisitions).values({
            itemId: id,
            vendorId,
            acquisitionType: 'purchase',
          });
        }
      }
    } else if (latestAcq?.vendorId) {
      // Vendor was cleared — remove vendor from acquisition
      await db
        .update(acquisitions)
        .set({ vendorId: null })
        .where(eq(acquisitions.id, latestAcq.id));
    }
  }

  revalidatePath('/items');
  revalidatePath(`/items/${id}`);
  revalidatePath('/vendors');
  revalidatePath('/');
  return { success: true, id };
}

// ---------------------------------------------------------------------------
// deleteItem — cascades through related records
// ---------------------------------------------------------------------------

export async function deleteItem(id: string): Promise<ItemActionState> {
  const user = await requireAuth();

  const existing = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, id),
      eq(collectionItems.userId, user.id),
    ),
  });
  if (!existing) return { error: 'Item not found' };

  // Cascade delete is handled by DB foreign keys (onDelete: 'cascade')
  // for photos, measurements, acquisitions, valuations, aiAnalyses.
  // TODO: S3 cleanup for photos will be added in Prompt 6.
  await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.id, id),
        eq(collectionItems.userId, user.id),
      ),
    );

  revalidatePath('/items');
  revalidatePath('/');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Measurement actions
// ---------------------------------------------------------------------------

export async function saveMeasurement(
  itemId: string,
  measurement: {
    id?: string;
    label: string;
    height?: string;
    width?: string;
    depth?: string;
    diameter?: string;
    notes?: string;
    displayOrder: number;
  },
): Promise<ItemActionState> {
  const user = await requireAuth();

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
  });
  if (!item) return { error: 'Item not found' };

  if (measurement.id) {
    // Update existing
    await db
      .update(itemMeasurements)
      .set({
        label: measurement.label,
        height: measurement.height || null,
        width: measurement.width || null,
        depth: measurement.depth || null,
        diameter: measurement.diameter || null,
        notes: measurement.notes || null,
        displayOrder: measurement.displayOrder,
      })
      .where(
        and(
          eq(itemMeasurements.id, measurement.id),
          eq(itemMeasurements.itemId, itemId),
        ),
      );
  } else {
    // Insert new
    await db.insert(itemMeasurements).values({
      itemId,
      label: measurement.label,
      height: measurement.height || null,
      width: measurement.width || null,
      depth: measurement.depth || null,
      diameter: measurement.diameter || null,
      notes: measurement.notes || null,
      displayOrder: measurement.displayOrder,
    });
  }

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

export async function deleteMeasurement(
  itemId: string,
  measurementId: string,
): Promise<ItemActionState> {
  const user = await requireAuth();

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
  });
  if (!item) return { error: 'Item not found' };

  await db
    .delete(itemMeasurements)
    .where(
      and(
        eq(itemMeasurements.id, measurementId),
        eq(itemMeasurements.itemId, itemId),
      ),
    );

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Photo actions
// ---------------------------------------------------------------------------

export async function updatePhotoCaption(
  photoId: string,
  itemId: string,
  caption: string,
): Promise<ItemActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  await db
    .update(itemPhotos)
    .set({ caption: caption || null })
    .where(
      and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)),
    );

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

export async function setPrimaryPhoto(
  photoId: string,
  itemId: string,
): Promise<ItemActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  await db
    .update(itemPhotos)
    .set({ isPrimary: false })
    .where(eq(itemPhotos.itemId, itemId));

  await db
    .update(itemPhotos)
    .set({ isPrimary: true })
    .where(
      and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)),
    );

  revalidatePath(`/items/${itemId}`);
  revalidatePath('/items');
  return { success: true };
}

export async function reorderPhotos(
  itemId: string,
  orderedIds: string[],
): Promise<ItemActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(itemPhotos)
        .set({ displayOrder: index })
        .where(
          and(eq(itemPhotos.id, id), eq(itemPhotos.itemId, itemId)),
        ),
    ),
  );

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

export async function deletePhoto(
  photoId: string,
  itemId: string,
): Promise<ItemActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  const photo = await db.query.itemPhotos.findFirst({
    where: and(
      eq(itemPhotos.id, photoId),
      eq(itemPhotos.itemId, itemId),
    ),
  });
  if (!photo) return { error: 'Photo not found' };

  const keysToDelete = [photo.s3Key];
  if (photo.thumbnailKey) keysToDelete.push(photo.thumbnailKey);
  try {
    await deleteObjects(keysToDelete);
  } catch (err) {
    console.error('S3 delete failed:', err);
  }

  await db
    .delete(itemPhotos)
    .where(
      and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)),
    );

  // If deleted photo was primary, promote the next one
  if (photo.isPrimary) {
    const nextPhoto = await db.query.itemPhotos.findFirst({
      where: eq(itemPhotos.itemId, itemId),
      orderBy: [asc(itemPhotos.displayOrder)],
    });
    if (nextPhoto) {
      await db
        .update(itemPhotos)
        .set({ isPrimary: true })
        .where(eq(itemPhotos.id, nextPhoto.id));
    }
  }

  revalidatePath(`/items/${itemId}`);
  revalidatePath('/items');
  return { success: true };
}
