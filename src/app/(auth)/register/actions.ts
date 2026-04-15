'use server';

import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { signIn } from '@/auth';
import { db } from '@/db';
import { users, collectionItemTypes, usageTracking } from '@/db/schema';
import { DEFAULT_ITEM_TYPES } from '@/db/default-types';
import { AuthError } from 'next-auth';

export interface RegisterState {
  error?: string;
}

export async function registerAction(
  _prev: RegisterState | null,
  formData: FormData,
): Promise<RegisterState | null> {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!name || !email || !password) {
    return { error: 'All fields are required' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  // Check if email is taken
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (existing) {
    return { error: 'An account with this email already exists' };
  }

  // Create user
  const passwordHash = await hash(password, 12);
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      role: 'owner',
      plan: 'free',
    })
    .returning({ id: users.id });

  // Clone default item types into the new user's account
  await db.insert(collectionItemTypes).values(
    DEFAULT_ITEM_TYPES.map((t) => ({
      userId: newUser.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      icon: t.icon,
      fieldSchema: t.fieldSchema,
      displayOrder: t.displayOrder,
    })),
  );

  // Create initial usage tracking record
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  await db.insert(usageTracking).values({
    userId: newUser.id,
    period,
  });

  // Sign in the new user
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/items',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Account created but sign-in failed. Please log in.' };
    }
    throw error;
  }

  return null;
}
