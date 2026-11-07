/**
 * AgencyOS Invoices Coming Soon page.
 *
 * Placeholder for the Invoices module, planned for a future AgencyOS release.
 * Not a functional module - does not process or store invoice data.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClientLayout } from '@/app/dashboard/dashboard-client-layout';
import { ComingSoon } from '@/components/layout/coming-soon';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
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
        title="Invoices"
        phase="Roadmap: Future Phase"
        description="Create, send, and track invoices for your organization. Invoicing is planned for a future AgencyOS release."
      />
    </DashboardClientLayout>
  );
}
