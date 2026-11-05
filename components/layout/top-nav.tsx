'use client';

import * as React from 'react';
import { Sun, Moon, Menu, LogOut } from 'lucide-react';

interface TopNavProps {
  toggleSidebar: () => void;
  user: { name?: string | null; email?: string | null } | null;
  onSignOut: () => Promise<void>;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export function TopNav({ toggleSidebar, user, onSignOut, theme, setTheme }: TopNavProps) {
  const handleSignOut = async () => {
    await onSignOut();
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur px-4 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="ml-2 flex h-8 items-center gap-2 border border-input rounded-md px-3 py-1 text-sm">
          <div className="h-6 w-6 rounded-full bg-muted shrink-0" />
          <span className="truncate">{user?.email ?? 'Guest'}</span>
          <button
            onClick={handleSignOut}
            className="ml-1 p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
