/**
 * AgencyOS dashboard server layout.
 *
 * Runs in the Node.js server runtime (not Edge). Validates the Better Auth
 * session against the database on every request. Invalid or missing sessions
 * are redirected to /login. Valid sessions are passed down to the client
 * layout as a prop.
 *
 * This file intentionally imports @/lib/auth-server (Prisma + Better Auth),
 * which is only safe in Node.js server contexts. The Edge middleware
 * (middleware.ts) only performs a cookie-presence check and does not import
 * this module.
 */

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
