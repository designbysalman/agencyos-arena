'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'agencyos-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage (or default to "system")
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    return stored ?? 'system';
  });

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const ThemeContext = React.createContext<{
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}>({ theme: 'system', resolvedTheme: 'light', setTheme: () => {} });

export function useTheme() {
  return React.useContext(ThemeContext);
}
