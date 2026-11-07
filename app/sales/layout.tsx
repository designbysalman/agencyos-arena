/**
 * AgencyOS Sales layout.
 *
 * Runs in the Node.js server runtime. Validates the Better Auth session
 * against the database BEFORE rendering any sales page content.
 * redirect() throws and prevents children serialization entirely, so
 * no sales UI is exposed to invalid or missing sessions.
 *
 * dynamic = 'force-dynamic' opts out of static prerendering.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const user = result.user as AuthUser;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <Link href="/sales/proposals" className="text-xl font-bold tracking-tight text-accent">
              AgencyOS Sales
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user.name ?? user.email} &bull;
              </span>
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Settings
              </Link>
              <Link
                href="/api/auth/signout"
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
