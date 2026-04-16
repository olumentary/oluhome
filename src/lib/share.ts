import { nanoid } from 'nanoid';
import { eq, and, asc, desc, gt, or, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  shareTokens,
  collectionItems,
  itemPhotos,
  itemMeasurements,
  acquisitions,
  valuations,
  users,
} from '@/db/schema';
import { generatePresignedDownloadUrl } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

export function generateShareToken(): string {
  return nanoid(21);
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

export interface ValidatedShareToken {
  id: string;
  userId: string;
  token: string;
  scope: 'item' | 'room' | 'collection';
  scopeId: string;
  includeValues: boolean;
  expiresAt: Date | null;
  ownerName: string;
}

export async function validateShareToken(
  token: string,
): Promise<ValidatedShareToken | null> {
  const row = await db
    .select({
      id: shareTokens.id,
      userId: shareTokens.userId,
      token: shareTokens.token,
      scope: shareTokens.scope,
      scopeId: shareTokens.scopeId,
      includeValues: shareTokens.includeValues,
      expiresAt: shareTokens.expiresAt,
      ownerName: users.name,
    })
    .from(shareTokens)
    .innerJoin(users, eq(users.id, shareTokens.userId))
    .where(
      and(
        eq(shareTokens.token, token),
        or(isNull(shareTokens.expiresAt), gt(shareTokens.expiresAt, new Date())),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return null;

  // Touch last_accessed_at
  await db
    .update(shareTokens)
    .set({ lastAccessedAt: new Date() })
    .where(eq(shareTokens.id, row.id));

  return row;
}

// ---------------------------------------------------------------------------
// Shared data fetching
// ---------------------------------------------------------------------------

interface SharedPhoto {
  id: string;
  caption: string | null;
  isPrimary: boolean;
  thumbnailUrl: string | null;
  fullUrl: string | null;
}

interface SharedMeasurement {
  id: string;
  label: string;
  height: string | null;
  width: string | null;
  depth: string | null;
  diameter: string | null;
  notes: string | null;
}

interface SharedValuation {
  id: string;
  valuationType: string;
  valueLow: string | null;
  valueHigh: string | null;
  valueSingle: string | null;
  appraiserName: string | null;
  appraiserCredentials: string | null;
  valuationDate: string | null;
  purpose: string | null;
  notes: string | null;
}

interface SharedAcquisition {
  id: string;
  acquisitionDate: string | null;
  purchasePrice: string | null;
  totalCost: string | null;
  acquisitionType: string | null;
  lotNumber: string | null;
  saleName: string | null;
  notes: string | null;
  vendor: {
    name: string;
    businessName: string | null;
    type: string | null;
  } | null;
}

export interface SharedItem {
  id: string;
  title: string;
  description: string | null;
  period: string | null;
  style: string | null;
  originCountry: string | null;
  originRegion: string | null;
  makerAttribution: string | null;
  materials: string[] | null;
  condition: string | null;
  conditionNotes: string | null;
  height: string | null;
  width: string | null;
  depth: string | null;
  diameter: string | null;
  weight: string | null;
  room: string | null;
  positionInRoom: string | null;
  customFields: Record<string, unknown> | null;
  provenanceNarrative: string | null;
  provenanceReferences: string | null;
  notes: string | null;
  tags: string[] | null;
  status: string;
  itemType: { name: string; fieldSchema: unknown };
  photos: SharedPhoto[];
  measurements: SharedMeasurement[];
  valuations: SharedValuation[];
  acquisitions: SharedAcquisition[];
}

export interface SharedItemCard {
  id: string;
  title: string;
  room: string | null;
  period: string | null;
  style: string | null;
  condition: string | null;
  thumbnailUrl: string | null;
  latestValue: string | null;
}

async function resolvePhotos(
  photos: Array<{
    id: string;
    s3Key: string;
    thumbnailKey: string | null;
    caption: string | null;
    isPrimary: boolean;
  }>,
): Promise<SharedPhoto[]> {
  return Promise.all(
    photos.map(async (photo) => {
      let thumbnailUrl: string | null = null;
      let fullUrl: string | null = null;
      try {
        if (photo.thumbnailKey) {
          thumbnailUrl = await generatePresignedDownloadUrl(photo.thumbnailKey);
        }
        fullUrl = await generatePresignedDownloadUrl(photo.s3Key);
      } catch {
        // skip
      }
      return {
        id: photo.id,
        caption: photo.caption,
        isPrimary: photo.isPrimary,
        thumbnailUrl,
        fullUrl,
      };
    }),
  );
}

async function fetchFullItem(
  itemId: string,
  userId: string,
  includeValues: boolean,
): Promise<SharedItem | null> {
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, userId),
    ),
    with: {
      itemType: true,
      photos: { orderBy: [asc(itemPhotos.displayOrder)] },
      measurements: { orderBy: [asc(itemMeasurements.displayOrder)] },
      valuations: {
        orderBy: [desc(valuations.valuationDate), desc(valuations.createdAt)],
      },
    },
  });

  if (!item) return null;

  const photos = await resolvePhotos(item.photos);

  let itemAcquisitions: SharedAcquisition[] = [];
  if (includeValues) {
    const acqs = await db.query.acquisitions.findMany({
      where: eq(acquisitions.itemId, itemId),
      with: { vendor: true },
      orderBy: [desc(acquisitions.acquisitionDate)],
    });
    itemAcquisitions = acqs.map((a) => ({
      id: a.id,
      acquisitionDate: a.acquisitionDate,
      purchasePrice: a.purchasePrice,
      totalCost: a.totalCost,
      acquisitionType: a.acquisitionType,
      lotNumber: a.lotNumber,
      saleName: a.saleName,
      notes: a.notes,
      vendor: a.vendor
        ? {
            name: a.vendor.name,
            businessName: a.vendor.businessName,
            type: a.vendor.type,
          }
        : null,
    }));
  }

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    period: item.period,
    style: item.style,
    originCountry: item.originCountry,
    originRegion: item.originRegion,
    makerAttribution: item.makerAttribution,
    materials: item.materials,
    condition: item.condition,
    conditionNotes: item.conditionNotes,
    height: item.height,
    width: item.width,
    depth: item.depth,
    diameter: item.diameter,
    weight: item.weight,
    room: item.room,
    positionInRoom: item.positionInRoom,
    customFields: item.customFields as Record<string, unknown> | null,
    provenanceNarrative: item.provenanceNarrative,
    provenanceReferences: item.provenanceReferences,
    notes: item.notes,
    tags: item.tags,
    status: item.status,
    itemType: {
      name: item.itemType.name,
      fieldSchema: item.itemType.fieldSchema,
    },
    photos,
    measurements: item.measurements.map((m) => ({
      id: m.id,
      label: m.label,
      height: m.height,
      width: m.width,
      depth: m.depth,
      diameter: m.diameter,
      notes: m.notes,
    })),
    valuations: includeValues
      ? item.valuations.map((v) => ({
          id: v.id,
          valuationType: v.valuationType,
          valueLow: v.valueLow,
          valueHigh: v.valueHigh,
          valueSingle: v.valueSingle,
          appraiserName: v.appraiserName,
          appraiserCredentials: v.appraiserCredentials,
          valuationDate: v.valuationDate,
          purpose: v.purpose,
          notes: v.notes,
        }))
      : [],
    acquisitions: itemAcquisitions,
  };
}

async function fetchItemCards(
  userId: string,
  roomFilter: string | null,
  includeValues: boolean,
): Promise<SharedItemCard[]> {
  const whereClause = roomFilter
    ? and(
        eq(collectionItems.userId, userId),
        eq(collectionItems.room, roomFilter),
      )
    : eq(collectionItems.userId, userId);

  const items = await db.query.collectionItems.findMany({
    where: whereClause,
    orderBy: [desc(collectionItems.createdAt)],
    with: {
      photos: {
        where: eq(itemPhotos.isPrimary, true),
        limit: 1,
      },
      valuations: {
        orderBy: [desc(valuations.valuationDate), desc(valuations.createdAt)],
        limit: 1,
      },
    },
  });

  return Promise.all(
    items.map(async (item) => {
      let thumbnailUrl: string | null = null;
      const photo = item.photos[0];
      if (photo) {
        try {
          thumbnailUrl = await generatePresignedDownloadUrl(
            photo.thumbnailKey ?? photo.s3Key,
          );
        } catch {
          // skip
        }
      }

      let latestValue: string | null = null;
      if (includeValues && item.valuations[0]) {
        const v = item.valuations[0];
        latestValue =
          v.valueSingle ??
          (v.valueLow && v.valueHigh
            ? `${v.valueLow}-${v.valueHigh}`
            : null);
      }

      return {
        id: item.id,
        title: item.title,
        room: item.room,
        period: item.period,
        style: item.style,
        condition: item.condition,
        thumbnailUrl,
        latestValue,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Main shared data dispatcher
// ---------------------------------------------------------------------------

export type SharedData =
  | { type: 'item'; item: SharedItem }
  | { type: 'room'; roomName: string; items: SharedItemCard[] }
  | { type: 'collection'; items: SharedItemCard[]; rooms: string[] };

export async function getSharedData(
  validated: ValidatedShareToken,
): Promise<SharedData | null> {
  const { scope, scopeId, userId, includeValues } = validated;

  switch (scope) {
    case 'item': {
      const item = await fetchFullItem(scopeId, userId, includeValues);
      if (!item) return null;
      return { type: 'item', item };
    }

    case 'room': {
      const cards = await fetchItemCards(userId, scopeId, includeValues);
      return { type: 'room', roomName: scopeId, items: cards };
    }

    case 'collection': {
      const cards = await fetchItemCards(userId, null, includeValues);
      const rooms = [...new Set(cards.map((c) => c.room).filter(Boolean))] as string[];
      return { type: 'collection', items: cards, rooms };
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch a single item within a shared scope (for drill-down)
// ---------------------------------------------------------------------------

export async function getSharedItem(
  validated: ValidatedShareToken,
  itemId: string,
): Promise<SharedItem | null> {
  const { scope, scopeId, userId, includeValues } = validated;

  // Verify the item belongs to the share scope
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, userId),
    ),
    columns: { id: true, room: true },
  });

  if (!item) return null;

  // Scope check
  if (scope === 'item' && item.id !== scopeId) return null;
  if (scope === 'room' && item.room !== scopeId) return null;
  // collection scope: any item from this user is valid

  return fetchFullItem(itemId, userId, includeValues);
}
