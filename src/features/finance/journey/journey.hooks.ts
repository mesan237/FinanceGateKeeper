import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';

import { useSetJourneyStage } from '@/components/JourneyStageProvider';

import { markNoSpendDay } from './journey.logging';
import { getJourney, markPictureReviewed, skipToStep } from './journey.service';
import type { Journey, JourneyStepKey } from './journey.types';

/**
 * The journey (VS-63) with its answers: "I've seen it", skip ahead, and
 * marking a missed day as no-spend (UX-06).
 * `refresh` is caller-driven — the tab and the dashboard card re-read on focus,
 * because the evidence comes from logging done on other screens. Every read
 * publishes the current step to `JourneyStageProvider`, so other screens can
 * set their emphasis by it without importing this slice (UX-03).
 */
export function useJourney() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publishStage = useSetJourneyStage();

  const refresh = useCallback(async () => {
    try {
      const next = await getJourney();
      setJourney(next);
      publishStage(next.current);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.load', { ns: 'journey' }));
    } finally {
      setLoading(false);
    }
  }, [publishStage]);

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

  /** Marks a recent missed day as no-spend and re-reads the journey; a refusal shows as the error. */
  const markNoSpend = useCallback(
    async (dateISO: string) => {
      try {
        await markNoSpendDay(dateISO);
        await refresh();
      } catch (e) {
        // Re-read first: a successful refresh clears the error it would show.
        await refresh();
        setError(e instanceof Error ? e.message : i18n.t('errors.load', { ns: 'journey' }));
      }
    },
    [refresh],
  );

  return { journey, loading, error, refresh, reviewPicture, skipTo, markNoSpend };
}
