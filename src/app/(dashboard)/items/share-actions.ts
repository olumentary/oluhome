'use server';

import { eq, and, or, isNull, gt, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { generateShareToken } from '@/lib/share';
import { db } from '@/db';
import { shareTokens, collectionItems } from '@/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateShareOptions {
  scope: 'item' | 'room' | 'collection';
  scopeId: string;
  includeValues: boolean;
  expirationDays: number | null; // null = no expiration
  recipientName?: string;
  recipientEmail?: string;
}

interface ShareActionResult {
  error?: string;
  token?: string;
  url?: string;
}

export interface ActiveShare {
  id: string;
  token: string;
  scope: 'item' | 'room' | 'collection';
  scopeId: string;
  scopeName: string;
  recipientName: string | null;
  recipientEmail: string | null;
  includeValues: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  lastAccessedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createShareToken(
  options: CreateShareOptions,
): Promise<ShareActionResult> {
  const user = await requireAuth();

  // Validate scope
  if (options.scope === 'item') {
    const item = await db.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.id, options.scopeId),
        eq(collectionItems.userId, user.id),
      ),
      columns: { id: true },
    });
    if (!item) return { error: 'Item not found' };
  } else if (options.scope === 'room') {
    const roomItem = await db.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.userId, user.id),
        eq(collectionItems.room, options.scopeId),
      ),
      columns: { id: true },
    });
    if (!roomItem) return { error: 'Room not found or has no items' };
  }
  // collection scope: always valid for authenticated user

  const token = generateShareToken();
  const expiresAt = options.expirationDays
    ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000)
    : null;

  await db.insert(shareTokens).values({
    userId: user.id,
    token,
    scope: options.scope,
    scopeId: options.scopeId,
    includeValues: options.includeValues,
    expiresAt,
    recipientName: options.recipientName || null,
    recipientEmail: options.recipientEmail || null,
  });

  revalidatePath('/settings');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return { token, url: `${baseUrl}/share/${token}` };
}

// ---------------------------------------------------------------------------
// Revoke
// ---------------------------------------------------------------------------

export async function revokeShareToken(
  tokenId: string,
): Promise<{ error?: string }> {
  const user = await requireAuth();

  const existing = await db.query.shareTokens.findFirst({
    where: and(
      eq(shareTokens.id, tokenId),
      eq(shareTokens.userId, user.id),
    ),
  });

  if (!existing) return { error: 'Share link not found' };

  await db.delete(shareTokens).where(eq(shareTokens.id, tokenId));

  revalidatePath('/settings');
  return {};
}

// ---------------------------------------------------------------------------
// List active shares
// ---------------------------------------------------------------------------

export async function getActiveShares(): Promise<ActiveShare[]> {
  const user = await requireAuth();

  const tokens = await db
    .select()
    .from(shareTokens)
    .where(
      and(
        eq(shareTokens.userId, user.id),
        or(
          isNull(shareTokens.expiresAt),
          gt(shareTokens.expiresAt, new Date()),
        ),
      ),
    )
    .orderBy(desc(shareTokens.createdAt));

  // Resolve scope names
  const results: ActiveShare[] = [];
  for (const t of tokens) {
    let scopeName = t.scopeId;

    if (t.scope === 'item') {
      const item = await db.query.collectionItems.findFirst({
        where: eq(collectionItems.id, t.scopeId),
        columns: { title: true },
      });
      scopeName = item?.title ?? 'Deleted item';
    } else if (t.scope === 'room') {
      scopeName = t.scopeId; // room name is the scopeId
    } else {
      scopeName = 'Entire Collection';
    }

    results.push({
      id: t.id,
      token: t.token,
      scope: t.scope,
      scopeId: t.scopeId,
      scopeName,
      recipientName: t.recipientName,
      recipientEmail: t.recipientEmail,
      includeValues: t.includeValues,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      lastAccessedAt: t.lastAccessedAt,
    });
  }

  return results;
}
