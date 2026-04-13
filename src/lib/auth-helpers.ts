import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { users, planLimits } from '@/db/schema';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role,
    plan: session.user.plan,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}

export async function getUserPlan(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true },
  });
  if (!user) throw new Error('User not found');

  const limits = await db.query.planLimits.findFirst({
    where: eq(planLimits.plan, user.plan),
  });

  return { plan: user.plan, limits: limits ?? null };
}
