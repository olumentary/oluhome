import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials + JWT: the Drizzle adapter is not needed because we handle
  // user lookup in the authorize callback and store session data in JWTs.
  // If OAuth providers are added later, install the adapter and the required
  // accounts / sessions / verification_tokens tables.
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          isActive: user.isActive,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    signIn({ user }) {
      // Block deactivated users
      if (!user.isActive) return false;
      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.plan = user.plan;
        token.isActive = user.isActive;
      }
      return token;
    },

    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.plan = token.plan as string;
      session.user.isActive = token.isActive as boolean;
      return session;
    },
  },
});
