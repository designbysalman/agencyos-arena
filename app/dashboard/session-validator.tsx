/**
 * AgencyOS dashboard session validator.
 *
 * Runs in the Node.js server runtime. Validates the Better Auth session
 * against the database on every request. Invalid or missing sessions are
 * redirected to /login. Valid sessions render the dashboard client layout
 * with the authenticated user as a prop.
 *
 * This component is intentionally wrapped in a Suspense boundary in
 * app/dashboard/layout.tsx so that request-time data access (cookies(),
 * auth.api.getSession()) is permitted during Next.js prerendering.
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

export default async function SessionValidator({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  return <DashboardClientLayout user={result.user as AuthUser}>{children}</DashboardClientLayout>;
}
