'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState | null,
  formData: FormData,
): Promise<LoginState | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/items',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password' };
    }
    // Re-throw NEXT_REDIRECT and other errors
    throw error;
  }
  return null;
}
