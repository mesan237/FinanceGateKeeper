import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';

import { getJourney, markPictureReviewed, skipToStep } from './journey.service';
import type { Journey, JourneyStepKey } from './journey.types';

/**
 * The journey (VS-63) with its two answers: "I've seen it" and skip ahead.
 * `refresh` is caller-driven — the tab and the dashboard card re-read on focus,
 * because the evidence comes from logging done on other screens.
 */
export function useJourney() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setJourney(await getJourney());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.load', { ns: 'journey' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Passes the See step and re-reads the journey. */
  const reviewPicture = useCallback(async () => {
    await markPictureReviewed();
    await refresh();
  }, [refresh]);

  /** Skips ahead to `step` and re-reads the journey. */
  const skipTo = useCallback(
    async (step: JourneyStepKey) => {
      await skipToStep(step);
      await refresh();
    },
    [refresh],
  );

  return { journey, loading, error, refresh, reviewPicture, skipTo };
}
