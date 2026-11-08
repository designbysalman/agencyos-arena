'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { useTheme } from '@/components/providers/theme-provider';
import { classNames } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface CrmClientLayoutProps {
  children: React.ReactNode;
  user: AuthUser;
}

export function CrmClientLayout({ children, user }: CrmClientLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <div className="flex h-screen bg-canvas text-foreground">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isOpen={isMobileDrawerOpen}
        setIsOpen={setIsMobileDrawerOpen}
      />
      <div
        className={classNames(
          'flex-1 flex flex-col overflow-hidden',
          isSidebarCollapsed ? 'sm:pl-16' : 'sm:pl-64'
        )}
      >
        <TopNav
          toggleMobileSidebar={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          isMobileSidebarOpen={isMobileDrawerOpen}
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
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <Toaster />
    </div>
  );
}
