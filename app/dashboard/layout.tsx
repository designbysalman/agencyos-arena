'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/app/providers';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { session, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Redirect handled by middleware/page
  }

  return (
    <div className="flex h-screen bg-canvas text-foreground">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          user={{
            name: (session as { user?: { name?: string | null } })?.user?.name ?? null,
            email: (session as { user?: { email?: string | null } })?.user?.email ?? null,
          }}
          onSignOut={async () => {
            await signOut();
            router.push('/login');
          }}
          theme={theme as 'light' | 'dark' | 'system'}
          setTheme={setTheme}
        />
        <main className="flex-1 overflow-y-auto bg-canvas p-6">{children}</main>
      </div>
    </div>
  );
}
