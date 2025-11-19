import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';

// Note: Facebook page tokens don't expire, so no refresh needed
// Instagram tokens are page tokens, so they also don't expire
// Twitter tokens are refreshed via the refreshAccessToken function in social-api.ts

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 60, // 30 minutes - reduced for security
    updateAge: 10 * 60, // 10 minutes - reduce activity tracking overhead
  },
  trustHost: true,
  callbacks: {
    async signIn() {
      // User is allowed to sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to dashboard directly
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/dashboard`;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
