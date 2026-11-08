/**
 * Sales layout.
 * * Runs in the Node.js server runtime. Validates the Better Auth session * against the database BEFORE rendering any sales page content. * redirect() throws and prevents children serialization entirely, so * no sales UI is exposed to invalid or missing sessions. * * Uses the shared DashboardClientLayout (Sidebar + TopNav) so all Sales * pages are part of the unified AgencyOS application shell - not a * standalone header. */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClientLayout } from '@/app/dashboard/dashboard-client-layout';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const user = result.user as AuthUser;

  return (
    <DashboardClientLayout
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
      }}
    >
      {children}
    </DashboardClientLayout>
  );
}
