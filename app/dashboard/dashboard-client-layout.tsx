'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { useTheme } from '@/components/providers/theme-provider';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  user: AuthUser;
}

export function DashboardClientLayout({ children, user }: DashboardClientLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <div className="flex h-screen bg-canvas text-foreground">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          user={{
            name: user.name ?? null,
            email: user.email ?? null,
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
