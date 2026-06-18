import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { LIGHT_COLORS, paletteFor } from './palettes';
import { getThemeMode, setThemeMode as persistThemeMode } from './themeStorage';
import type { ColorScheme, ThemeColors, ThemeMode } from './theme.types';

interface ThemeContextValue {
  colors: ThemeColors;
  /** The user's preference (may be `system`). */
  mode: ThemeMode;
  /** The resolved scheme actually rendered. */
  scheme: ColorScheme;
  setMode: (mode: ThemeMode) => Promise<void>;
}

// Default value = light, so components rendered without a provider (e.g. unit
// tests) get the original palette and behave exactly as before theming existed.
const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_COLORS,
  mode: 'system',
  scheme: 'light',
  setMode: async () => {},
});

/**
 * Provides the active palette to the whole tree. Starts in `system` mode (until
 * the persisted preference loads) and tracks the OS light/dark setting live.
 * Mount once at the app root.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  // Once the user picks a mode, a late-resolving persisted-load must not clobber it.
  const userChanged = useRef(false);

  useEffect(() => {
    void getThemeMode().then((loaded) => {
      if (!userChanged.current) setModeState(loaded);
    });
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (osScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = paletteFor(scheme);

  const setMode = useCallback(async (next: ThemeMode) => {
    userChanged.current = true;
    setModeState(next);
    await persistThemeMode(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, mode, scheme, setMode }),
    [colors, mode, scheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Returns the active colour palette. Light when no provider is mounted. */
export function useTheme(): ThemeColors {
  return useContext(ThemeContext).colors;
}

/** Returns the appearance preference, resolved scheme, and the setter (for Settings). */
export function useThemeMode(): { mode: ThemeMode; scheme: ColorScheme; setMode: ThemeContextValue['setMode'] } {
  const { mode, scheme, setMode } = useContext(ThemeContext);
  return { mode, scheme, setMode };
}
