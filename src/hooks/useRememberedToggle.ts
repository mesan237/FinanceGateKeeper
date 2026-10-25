import { useCallback, useEffect, useState } from 'react';

import { getPreference, setPreference } from '@/services/uiPreferences';

/**
 * An open/closed state that follows `fallback` until the user chooses, then
 * remembers the choice on this phone under `key` (UX-14). Used for collapsible
 * groups whose default depends on the journey step: a later step can open a
 * group the user never touched, but never one they closed.
 */
export function useRememberedToggle(key: string, fallback: boolean): { open: boolean; toggle: () => void } {
  const [chosen, setChosen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getPreference(key)
      .then((value) => {
        if (active && value !== null) setChosen(value === 'open');
      })
      .catch(() => {
        // Unreadable preference: keep following the default.
      });
    return () => {
      active = false;
    };
  }, [key]);

  const open = chosen ?? fallback;

  const toggle = useCallback(() => {
    const next = !open;
    setChosen(next);
    setPreference(key, next ? 'open' : 'closed').catch(() => {
      // The choice still holds for this session.
    });
  }, [key, open]);

  return { open, toggle };
}
