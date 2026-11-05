/**
 * AgencyOS authentication - server-only (ADR-0001).
 *
 * Better Auth with Prisma adapter for PostgreSQL.
 * This module imports Prisma and must only be imported in server contexts
 * (API routes, middleware, server components).
 *
 * No external provider credentials required for local development.
 * Email/WhatsApp/e-signature/AI integrations remain interface-only in MVP.
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/db';

/**
 * Better Auth instance configured with Prisma adapter.
 * Server-only: imports Prisma Client which is not available in the browser.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh session cookie every 24h
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: false,
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },
});

export type Session = typeof auth.$Infer.Session;

/**
 * Server-side session validation helper.
 * Used by middleware and API routes to validate session tokens.
 */
export async function validateSession(headers: HeadersInit) {
  return auth.api.getSession({ headers });
}
