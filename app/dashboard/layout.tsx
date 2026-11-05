/**
 * AgencyOS dashboard root layout.
 *
 * Runs in the Node.js server runtime. Validates the Better Auth session
 * against the database BEFORE rendering any protected page content.
 * redirect() throws and prevents children serialization entirely, so
 * no dashboard UI or RSC payload is exposed to invalid or missing sessions.
 *
 * dynamic = 'force-dynamic' opts out of static prerendering. A user-specific
 * dashboard must never be statically prerendered; every request is
 * server-rendered with a fresh database-backed session check.
 *
 * Session validation is server-side only - no client-side auth, no
 * cross-user caching, no cookie-presence-only authorization.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClientLayout } from './dashboard-client-layout';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  return <DashboardClientLayout user={result.user as AuthUser}>{children}</DashboardClientLayout>;
}
