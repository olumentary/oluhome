'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, count } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItemTypes, collectionItems } from '@/db/schema';
import { itemTypeFormSchema } from '@/lib/validators';

export interface TypeActionState {
  error?: string;
  success?: boolean;
  id?: string;
}

export async function createItemType(
  _prev: TypeActionState | null,
  formData: FormData,
): Promise<TypeActionState> {
  const user = await requireAuth();

  const raw = formData.get('json') as string | null;
  if (!raw) return { error: 'Missing form data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON data' };
  }

  const result = itemTypeFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const { name, slug, description, icon, fieldSchema } = result.data;

  // Check slug uniqueness for this user
  const existing = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.userId, user.id),
      eq(collectionItemTypes.slug, slug),
    ),
  });
  if (existing) {
    return { error: 'A type with this slug already exists' };
  }

  const [created] = await db
    .insert(collectionItemTypes)
    .values({
      userId: user.id,
      name,
      slug,
      description: description || null,
      icon: icon || null,
      fieldSchema: fieldSchema as unknown as Record<string, unknown>,
    })
    .returning({ id: collectionItemTypes.id });

  revalidatePath('/types');
  return { success: true, id: created.id };
}

export async function updateItemType(
  _prev: TypeActionState | null,
  formData: FormData,
): Promise<TypeActionState> {
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

  const result = itemTypeFormSchema.safeParse(parsed);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation failed' };
  }

  const { name, slug, description, icon, fieldSchema } = result.data;

  // Verify ownership
  const existing = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.id, id),
      eq(collectionItemTypes.userId, user.id),
    ),
  });
  if (!existing) return { error: 'Type not found' };

  // Check slug uniqueness (exclude self)
  const slugConflict = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.userId, user.id),
      eq(collectionItemTypes.slug, slug),
    ),
  });
  if (slugConflict && slugConflict.id !== id) {
    return { error: 'A type with this slug already exists' };
  }

  await db
    .update(collectionItemTypes)
    .set({
      name,
      slug,
      description: description || null,
      icon: icon || null,
      fieldSchema: fieldSchema as unknown as Record<string, unknown>,
    })
    .where(
      and(
        eq(collectionItemTypes.id, id),
        eq(collectionItemTypes.userId, user.id),
      ),
    );

  revalidatePath('/types');
  revalidatePath(`/types/${id}`);
  return { success: true, id };
}

export async function deleteItemType(id: string): Promise<TypeActionState> {
  const user = await requireAuth();

  const existing = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.id, id),
      eq(collectionItemTypes.userId, user.id),
    ),
  });
  if (!existing) return { error: 'Type not found' };

  // Check if any items reference this type
  const [itemCount] = await db
    .select({ value: count() })
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.userId, user.id),
        eq(collectionItems.itemTypeId, id),
      ),
    );
  if (itemCount && itemCount.value > 0) {
    return {
      error: `Cannot delete: ${itemCount.value} item${itemCount.value === 1 ? '' : 's'} still use this type`,
    };
  }

  await db
    .delete(collectionItemTypes)
    .where(
      and(
        eq(collectionItemTypes.id, id),
        eq(collectionItemTypes.userId, user.id),
      ),
    );

  revalidatePath('/types');
  return { success: true };
}

export async function reorderTypes(orderedIds: string[]): Promise<TypeActionState> {
  const user = await requireAuth();

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(collectionItemTypes)
      .set({ displayOrder: i })
      .where(
        and(
          eq(collectionItemTypes.id, orderedIds[i]),
          eq(collectionItemTypes.userId, user.id),
        ),
      );
  }

  revalidatePath('/types');
  return { success: true };
}
