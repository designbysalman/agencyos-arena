/**
 * AgencyOS Settings Coming Soon page.
 *
 * Placeholder for the Settings module, planned for a future AgencyOS release.
 * Not a functional module - does not modify organization or user settings.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClientLayout } from '@/app/dashboard/dashboard-client-layout';
import { ComingSoon } from '@/components/layout/coming-soon';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  return (
    <DashboardClientLayout
      user={result.user as {
        id: string;
        name: string | null;
        email: string | null;
      }}
    >
      <ComingSoon
        title="Settings"
        phase="Roadmap: Future Phase"
        description="Configure organization and user preferences. Settings is planned for a future AgencyOS release."
      />
    </DashboardClientLayout>
  );
}
