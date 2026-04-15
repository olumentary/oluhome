'use server';

import { eq, and, ilike } from 'drizzle-orm';
import { signOut } from '@/auth';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems, itemPhotos } from '@/db/schema';

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
}

export async function searchItems(query: string) {
  const user = await requireAuth();
  if (!query || query.length < 2) return [];

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

  return results;
}
