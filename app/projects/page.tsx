/**
 * AgencyOS Projects Coming Soon page.
 *
 * Placeholder for the Projects module, planned for a future AgencyOS release.
 * Not a functional module - does not create or manage project data.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClientLayout } from '@/app/dashboard/dashboard-client-layout';
import { ComingSoon } from '@/components/layout/coming-soon';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
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
        title="Projects"
        phase="Roadmap: Future Phase"
        description="Manage projects, tasks, and timelines. Project management is planned for a future AgencyOS release."
      />
    </DashboardClientLayout>
  );
}
