import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getAdminClient } from '@/lib/db/client';

export type UserRole = 'manager' | 'approver';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const sb = getAdminClient();
        const { data: user } = await sb
          .from('users')
          .select('id, email, password_hash, role')
          .eq('email', creds.email)
          .maybeSingle();
        if (!user) return null;
        const ok = await bcrypt.compare(creds.password, user.password_hash);
        if (!ok) return null;
        return { id: user.id, email: user.email, role: (user.role as UserRole) ?? 'manager' };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        const u = session.user as typeof session.user & { id: string; role: UserRole };
        u.id = token.id as string;
        u.role = (token.role as UserRole) ?? 'manager';
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
