import * as SecureStore from 'expo-secure-store';

import type { ThemeMode } from './theme.types';

const THEME_MODE_KEY = 'theme-mode';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Reads the persisted appearance preference. Defaults to `system` when nothing
 * has been saved yet or on any read error (storage is best-effort chrome state).
 */
export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const stored = await SecureStore.getItemAsync(THEME_MODE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Persists the appearance preference. Swallows write errors — never blocks UI. */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  } catch {
    // best-effort; the in-memory choice still applies for this session
  }
}
