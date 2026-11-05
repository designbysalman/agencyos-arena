/**
 * AgencyOS CRM layout.
 *
 * Runs in the Node.js server runtime. Validates the Better Auth session
 * against the database BEFORE rendering any CRM page content.
 * redirect() throws and prevents children serialization entirely, so
 * no CRM UI is exposed to invalid or missing sessions.
 *
 * dynamic = 'force-dynamic' opts out of static prerendering.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  return <div className="flex h-screen bg-canvas text-foreground">{children}</div>;
}
