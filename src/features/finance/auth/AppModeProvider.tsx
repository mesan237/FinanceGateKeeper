import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getAppSettings } from './auth.service';
import type { AppMode } from './auth.types';

interface AppModeContextValue {
  mode: AppMode;
  /** Re-reads the persisted mode — call after toggling it in Settings. */
  refresh: () => Promise<void>;
}

const AppModeContext = createContext<AppModeContextValue>({
  mode: 'learning',
  refresh: async () => {},
});

/**
 * Provides the current app mode to the whole tree. Defaults to `learning` until
 * the persisted value loads, so a fresh install never flashes control-mode UI.
 * The routing layer consumes this to gate budget/allocation visibility — no
 * feature imports another feature for the gate.
 */
export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('learning');

  const refresh = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      setMode(settings.appMode);
    } catch (e) {
      console.error('Failed to load app mode:', e);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AppModeContext.Provider value={{ mode, refresh }}>{children}</AppModeContext.Provider>;
}

/** Returns the current app mode. */
export function useAppMode(): AppMode {
  return useContext(AppModeContext).mode;
}

/** Returns the app-mode context (mode + refresh) for screens that mutate it. */
export function useAppModeContext(): AppModeContextValue {
  return useContext(AppModeContext);
}
