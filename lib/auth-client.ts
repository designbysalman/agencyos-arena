/**
 * AgencyOS authentication - client-safe helpers.
 *
 * These functions use fetch to call the Better Auth API routes.
 * No Prisma or server-only imports - safe for client components.
 *
 * All calls go through /api/auth/* which is handled by the server-side
 * auth route handler (app/api/auth/[...slug]/route.ts).
 */

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
