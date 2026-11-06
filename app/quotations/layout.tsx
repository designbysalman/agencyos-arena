/**
 * AgencyOS Quotations layout.
 *
 * Runs in the Node.js server runtime. Validates the Better Auth session
 * against the database BEFORE rendering any Quotations page content.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuotationsClientLayout } from './quotations-client-layout';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

export default async function QuotationsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  return <QuotationsClientLayout user={result.user as AuthUser}>{children}</QuotationsClientLayout>;
}
