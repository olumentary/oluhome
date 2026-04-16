'use server';

import { eq, and, ilike, sql, desc, inArray } from 'drizzle-orm';
import { signOut } from '@/auth';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import {
  collectionItems,
  collectionItemTypes,
  itemPhotos,
  valuations,
  acquisitions,
  vendors,
  users,
} from '@/db/schema';
import { fullTextSearch, type SearchResult } from '@/lib/search';
import { deleteObjects } from '@/lib/storage';
import { hashPassword, verifyPassword } from '@/lib/password';

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
}

export async function searchItems(query: string) {
  const user = await requireAuth();
  if (!query || query.length < 2) return [];

  // Use full-text search when available, fall back to ILIKE
  try {
    const { results } = await fullTextSearch(user.id, query, 8, 0);
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      room: r.room,
      period: r.period,
      typeName: r.typeName,
      snippet: r.snippet,
    }));
  } catch {
    // Fallback to ILIKE if search_vector column doesn't exist yet
    const results = await db
      .select({
        id: collectionItems.id,
        title: collectionItems.title,
        room: collectionItems.room,
        period: collectionItems.period,
      })
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.userId, user.id),
          ilike(collectionItems.title, `%${query}%`),
        ),
      )
      .limit(8);

    return results.map((r) => ({
      ...r,
      typeName: undefined as string | undefined,
      snippet: undefined as string | undefined,
    }));
  }
}

// ---------------------------------------------------------------------------
// Full-text search action for items list page
// ---------------------------------------------------------------------------

export async function searchItemsFullText(
  query: string,
  limit = 24,
  offset = 0,
) {
  const user = await requireAuth();
  return fullTextSearch(user.id, query, limit, offset);
}

// ---------------------------------------------------------------------------
// Profile update
// ---------------------------------------------------------------------------

export async function updateProfile(data: { name: string }) {
  const user = await requireAuth();

  await db
    .update(users)
    .set({ name: data.name })
    .where(eq(users.id, user.id));

  return { success: true };
}

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await requireAuth();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: true },
  });
  if (!dbUser) return { error: 'User not found' };

  const valid = await verifyPassword(data.currentPassword, dbUser.passwordHash);
  if (!valid) return { error: 'Current password is incorrect' };

  const newHash = await hashPassword(data.newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

export async function deleteAccount(password: string) {
  const user = await requireAuth();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: true },
  });
  if (!dbUser) return { error: 'User not found' };

  const valid = await verifyPassword(password, dbUser.passwordHash);
  if (!valid) return { error: 'Password is incorrect' };

  // Delete user — cascading deletes will clean up items, photos, vendors, etc.
  await db.delete(users).where(eq(users.id, user.id));

  // Sign out
  await signOut({ redirectTo: '/login' });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Data export helpers
// ---------------------------------------------------------------------------

export async function exportCollectionCSV() {
  const user = await requireAuth();

  const items = await db
    .select({
      id: collectionItems.id,
      title: collectionItems.title,
      description: collectionItems.description,
      period: collectionItems.period,
      style: collectionItems.style,
      originCountry: collectionItems.originCountry,
      originRegion: collectionItems.originRegion,
      makerAttribution: collectionItems.makerAttribution,
      materials: collectionItems.materials,
      condition: collectionItems.condition,
      room: collectionItems.room,
      status: collectionItems.status,
      notes: collectionItems.notes,
      tags: collectionItems.tags,
      customFields: collectionItems.customFields,
      typeName: collectionItemTypes.name,
      createdAt: collectionItems.createdAt,
    })
    .from(collectionItems)
    .innerJoin(
      collectionItemTypes,
      eq(collectionItems.itemTypeId, collectionItemTypes.id),
    )
    .where(eq(collectionItems.userId, user.id))
    .orderBy(collectionItems.title);

  // Get latest valuations
  const itemIds = items.map((i) => i.id);
  const valueMap = new Map<string, string>();
  if (itemIds.length > 0) {
    const vals = await db
      .select({
        itemId: valuations.itemId,
        valueSingle: valuations.valueSingle,
      })
      .from(valuations)
      .where(inArray(valuations.itemId, itemIds))
      .orderBy(desc(valuations.createdAt));

    for (const v of vals) {
      if (!valueMap.has(v.itemId) && v.valueSingle) {
        valueMap.set(v.itemId, v.valueSingle);
      }
    }
  }

  // Build CSV
  const headers = [
    'Title',
    'Type',
    'Description',
    'Period',
    'Style',
    'Origin Country',
    'Origin Region',
    'Maker/Attribution',
    'Materials',
    'Condition',
    'Room',
    'Status',
    'Tags',
    'Latest Value',
    'Notes',
    'Date Added',
  ];

  const csvEscape = (val: string | null | undefined) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((item) =>
    [
      csvEscape(item.title),
      csvEscape(item.typeName),
      csvEscape(item.description),
      csvEscape(item.period),
      csvEscape(item.style),
      csvEscape(item.originCountry),
      csvEscape(item.originRegion),
      csvEscape(item.makerAttribution),
      csvEscape(item.materials?.join('; ')),
      csvEscape(item.condition),
      csvEscape(item.room),
      csvEscape(item.status),
      csvEscape(item.tags?.join('; ')),
      csvEscape(valueMap.get(item.id)),
      csvEscape(item.notes),
      csvEscape(item.createdAt.toISOString().split('T')[0]),
    ].join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

export async function exportCollectionJSON() {
  const user = await requireAuth();

  const items = await db.query.collectionItems.findMany({
    where: eq(collectionItems.userId, user.id),
    with: {
      itemType: { columns: { name: true } },
      photos: { columns: { id: true, originalFilename: true, caption: true, isPrimary: true } },
      measurements: true,
      acquisitions: {
        with: { vendor: { columns: { name: true, type: true } } },
      },
      valuations: true,
    },
  });

  return JSON.stringify(items, null, 2);
}

export async function exportInsuranceCSV() {
  const user = await requireAuth();

  const items = await db
    .select({
      id: collectionItems.id,
      title: collectionItems.title,
      typeName: collectionItemTypes.name,
      room: collectionItems.room,
      condition: collectionItems.condition,
    })
    .from(collectionItems)
    .innerJoin(
      collectionItemTypes,
      eq(collectionItems.itemTypeId, collectionItemTypes.id),
    )
    .where(eq(collectionItems.userId, user.id))
    .orderBy(collectionItems.title);

  const itemIds = items.map((i) => i.id);

  // Get insured valuations (or latest)
  const valueMap = new Map<
    string,
    { value: string; date: string | null; appraiser: string | null }
  >();
  if (itemIds.length > 0) {
    const vals = await db
      .select({
        itemId: valuations.itemId,
        valueSingle: valuations.valueSingle,
        valuationDate: valuations.valuationDate,
        appraiserName: valuations.appraiserName,
        valuationType: valuations.valuationType,
      })
      .from(valuations)
      .where(inArray(valuations.itemId, itemIds))
      .orderBy(desc(valuations.createdAt));

    for (const v of vals) {
      if (!valueMap.has(v.itemId) && v.valueSingle) {
        valueMap.set(v.itemId, {
          value: v.valueSingle,
          date: v.valuationDate,
          appraiser: v.appraiserName,
        });
      }
    }
  }

  // Get photo counts
  const photoCounts = new Map<string, number>();
  if (itemIds.length > 0) {
    const counts = await db
      .select({
        itemId: itemPhotos.itemId,
        count: sql<number>`count(*)::int`,
      })
      .from(itemPhotos)
      .where(inArray(itemPhotos.itemId, itemIds))
      .groupBy(itemPhotos.itemId);

    for (const c of counts) {
      photoCounts.set(c.itemId, c.count);
    }
  }

  const csvEscape = (val: string | null | undefined) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Item',
    'Type',
    'Room',
    'Condition',
    'Insured Value',
    'Last Appraised',
    'Appraiser',
    'Photos Count',
  ];

  const rows = items.map((item) => {
    const val = valueMap.get(item.id);
    return [
      csvEscape(item.title),
      csvEscape(item.typeName),
      csvEscape(item.room),
      csvEscape(item.condition),
      csvEscape(val?.value ? `$${parseFloat(val.value).toLocaleString()}` : ''),
      csvEscape(val?.date),
      csvEscape(val?.appraiser),
      String(photoCounts.get(item.id) ?? 0),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
