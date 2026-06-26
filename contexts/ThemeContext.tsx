'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
  applyAppTheme,
  migrateGuestThemePrefs,
  resolveThemeMode,
  getStoredThemeMode,
  setThemePreviewId as setPreviewId,
  clearThemePreview as clearPreviewStorage,
  type ThemeId,
} from '@/lib/theme-config';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  setPreviewThemeId: (id: ThemeId) => void;
  clearPreview: () => void;
  applyTheme: (options?: { persistMode?: boolean; persistGuestTheme?: ThemeId }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function updateFavicon(mode: ThemeMode) {
  try {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = mode === 'dark' ? '/favicon_dark.ico' : '/favicon_light.ico';
  } catch {
    // ignore
  }
}

function readInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  migrateGuestThemePrefs();
  return resolveThemeMode();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfileContext();
  const [mode, setMode] = useState<ThemeMode>(readInitialMode);
  const modeRef = useRef<ThemeMode>(mode);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const applyTheme = useCallback(
    (options?: { persistMode?: boolean; persistGuestTheme?: ThemeId }) => {
      applyAppTheme({
        mode: modeRef.current,
        profile: profileRef.current,
        persistMode: options?.persistMode,
        persistGuestTheme: options?.persistGuestTheme,
      });
    },
    []
  );

  useLayoutEffect(() => {
    applyAppTheme({ mode, profile });
  }, [mode, profile]);

  useEffect(() => {
    updateFavicon(mode);
  }, [mode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (getStoredThemeMode()) return;
      const newMode: ThemeMode = e.matches ? 'dark' : 'light';
      modeRef.current = newMode;
      setMode(newMode);
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleMode = useCallback(() => {
    const newMode: ThemeMode = modeRef.current === 'light' ? 'dark' : 'light';
    modeRef.current = newMode;
    setMode(newMode);
    try {
      localStorage.setItem('theme-mode', newMode);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setPreviewThemeId = useCallback((id: ThemeId) => {
    setPreviewId(id);
    applyAppTheme({ mode: modeRef.current, profile: profileRef.current });
  }, []);

  const clearPreview = useCallback(() => {
    clearPreviewStorage();
    applyAppTheme({ mode: modeRef.current, profile: profileRef.current });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      toggleMode,
      setPreviewThemeId,
      clearPreview,
      applyTheme,
    }),
    [mode, toggleMode, setPreviewThemeId, clearPreview, applyTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Read current mode without requiring ThemeProvider (picker pages). */
export function readCurrentThemeMode(): ThemeMode {
  return resolveThemeMode();
}
