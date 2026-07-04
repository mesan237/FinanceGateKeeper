import { useCallback, useEffect, useState } from 'react';

import * as authService from './auth.service';
import { getProfile, setProfile } from './auth.profile';
import type { ActionBarStyle, AppMode, AppSettings, Profile } from './auth.types';
import { daysBetween } from '@/utils/formatDate';

/**
 * Loads the app/user settings and exposes setters for app mode, reminder time,
 * and the notifications toggle. Mutations re-fetch on success (cheap for a
 * single local row). Also tracks whether month 1 is complete and how many days
 * the install is old, to drive the "switch to control mode" suggestion.
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

  const completeOnboarding = useCallback(async () => {
    await authService.setOnboardingComplete(true);
    await refresh();
  }, [refresh]);

  // Whole days since the install was created (0 until settings load). Lets the
  // routing layer decide when a learning-mode user has enough runway to be
  // nudged toward Control mode, without the route reaching into utils itself.
  const daysSinceCreated = settings ? daysBetween(settings.createdAt, new Date()) : 0;

  return {
    settings,
    loading,
    monthOneComplete,
    daysSinceCreated,
    refresh,
    setMode,
    setReminderTime,
    setNotificationsEnabled,
    completeOnboarding,
  };
}

/**
 * Reads and persists the action bar style preference. Defaults to `'explicit'`
 * on first launch.
 */
export function useActionBarStyle(): {
  style: ActionBarStyle;
  setStyle: (s: ActionBarStyle) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [style, setStyleState] = useState<ActionBarStyle>('explicit');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await authService.getActionBarStyle();
    setStyleState(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setStyle = useCallback(
    async (s: ActionBarStyle) => {
      await authService.setActionBarStyle(s);
      await refresh();
    },
    [refresh],
  );

  return { style, setStyle, loading, refresh };
}

/**
 * Loads the local profile (display name + avatar) and exposes a `save` that
 * patches only the supplied fields, re-fetching on success.
 */
export function useProfile(): {
  profile: Profile | null;
  loading: boolean;
  save: (patch: Partial<Profile>) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setProfileState(await getProfile());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (patch: Partial<Profile>) => {
      await setProfile(patch);
      await refresh();
    },
    [refresh],
  );

  return { profile, loading, save, refresh };
}
