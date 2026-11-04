import { useCallback, useEffect, useState } from 'react';

import { JOURNEY_STEPS } from '@/constants/journey';
import { getPreference, setPreference } from '@/services/uiPreferences';
import type { JourneyStepKey } from '@/types/journey';

/** The `ui_preferences` key holding the last step the user saw on My path (VS-94). */
export const SEEN_STEP_KEY = 'journey.seenStep';

/**
 * Whether `current` is a step reached since the user last opened My path
 * (VS-94), so Home can say "New step" once and then go quiet. The first step
 * the hook meets is recorded without a flag: an existing user is never told
 * that a step they reached long ago is new. Local to the phone.
 */
export function useNewStep(current: JourneyStepKey | null): { isNew: boolean; markSeen: () => void } {
  const [seen, setSeen] = useState<JourneyStepKey | null>(null);

  useEffect(() => {
    if (current === null) return;
    let active = true;
    getPreference(SEEN_STEP_KEY)
      .then((value) => {
        if (!active) return;
        if (value === null) {
          setSeen(current);
          void setPreference(SEEN_STEP_KEY, current).catch(() => undefined);
          return;
        }
        setSeen(value as JourneyStepKey);
      })
      .catch(() => {
        // Unreadable: say nothing new.
      });
    return () => {
      active = false;
    };
  }, [current]);

  const markSeen = useCallback(() => {
    if (current === null) return;
    setSeen(current);
    setPreference(SEEN_STEP_KEY, current).catch(() => {
      // Seen for this session anyway.
    });
  }, [current]);

  const isNew =
    current !== null && seen !== null && JOURNEY_STEPS.indexOf(current) > JOURNEY_STEPS.indexOf(seen);
  return { isNew, markSeen };
}
