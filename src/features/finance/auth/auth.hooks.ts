import { useCallback, useEffect, useState } from 'react';

import * as authService from './auth.service';
import type { AppMode, AppSettings } from './auth.types';

/**
 * Loads the app/user settings and exposes setters for app mode, reminder time,
 * and the notifications toggle. Mutations re-fetch on success (cheap for a
 * single local row). Also tracks whether month 1 is complete, to drive the
 * "switch to control mode" suggestion.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOneComplete, setMonthOneComplete] = useState(false);

  const refresh = useCallback(async () => {
    const next = await authService.getAppSettings();
    setSettings(next);
    setMonthOneComplete(await authService.isMonth1Complete());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setMode = useCallback(
    async (mode: AppMode) => {
      await authService.setAppMode(mode);
      await refresh();
    },
    [refresh],
  );

  const setReminderTime = useCallback(
    async (time: string) => {
      await authService.setReminderTime(time);
      await refresh();
    },
    [refresh],
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      await authService.setNotificationsEnabled(enabled);
      await refresh();
    },
    [refresh],
  );

  return {
    settings,
    loading,
    monthOneComplete,
    refresh,
    setMode,
    setReminderTime,
    setNotificationsEnabled,
  };
}
