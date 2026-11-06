/**
 * AgencyOS Proposals layout.
 *
 * Runs in the Node.js server runtime. Validates the Better Auth session
 * against the database BEFORE rendering any Proposals page content.
 * redirect() throws and prevents children serialization entirely, so
 * no Proposals UI is exposed to invalid or missing sessions.
 *
 * dynamic = 'force-dynamic' opts out of static prerendering.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProposalsClientLayout } from './proposals-client-layout';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

export default async function ProposalsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  return <ProposalsClientLayout user={result.user as AuthUser}>{children}</ProposalsClientLayout>;
}
