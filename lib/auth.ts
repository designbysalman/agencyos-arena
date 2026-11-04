import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/db';

/**
 * AgencyOS authentication (ADR-0001).
 *
 * Better Auth is the maintained self-hosted authentication solution.
 * Pre-implementation compatibility/security checks are required before
 * production use (see ADR-0001).
 *
 * No external provider credentials are required for local development.
 * Email/WhatsApp/e-signature/AI integrations remain interface-only in MVP.
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
 * Client-side sign-in helper. Calls the Better Auth API route via fetch.
 */
export async function signInEmail(data: { email: string; password: string; callbackUrl?: string }) {
  const res = await fetch('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Sign-in failed');
  }
  return res.json();
}

/**
 * Client-side sign-up helper. Calls the Better Auth API route via fetch.
 */
export async function signUpEmail(data: { email: string; password: string; name?: string }) {
  const res = await fetch('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Sign-up failed');
  }
  return res.json();
}

/**
 * Client-side sign-out helper. Calls the Better Auth API route via fetch.
 */
export async function signOut() {
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
  });
}
