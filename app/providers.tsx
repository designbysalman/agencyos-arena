'use client';

import * as React from 'react';
import { Session } from 'better-auth';
import { ThemeProvider } from '@/components/providers/theme-provider';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextValue>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setSession(data.session ?? null);
        } else {
          if (mounted) setSession(null);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
