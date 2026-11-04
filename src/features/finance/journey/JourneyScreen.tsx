import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { FirstTimeHint } from '@/components/FirstTimeHint';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { BaselineCard } from '@/features/finance/budget/BaselineCard';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { JourneyRoadmap } from './JourneyRoadmap';
import { JourneySkeleton } from './JourneySkeleton';
import { JourneyStepDetail } from './JourneyStepDetail';
import { JourneyStepSheet } from './JourneyStepSheet';
import { useJourney } from './journey.hooks';
import { useNewStep } from './journey.seen';
import { BASELINE_BY_STEP, JOURNEY_STEPS } from './journey.steps';
import type { JourneyStep, JourneyStepKey } from './journey.types';

/**
 * "My path" (VS-63), drawn as a road (VS-94): the five steps to control on one
 * line. Only the current step is open, with its progress and next action;
 * every other step is one line that opens in a sheet: a passed step, a skipped
 * one still to finish, or a locked preview, the next of which can be skipped
 * to after a warning. The setup checklist sits on top, asking only for what
 * the current step needs (UX-09), and the path explains itself once.
 */
export function JourneyScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('journey');
  const { journey, loading, error, refresh, reviewPicture, skipTo, markNoSpend } = useJourney();
  const [opened, setOpened] = useState<JourneyStepKey | null>(null);
  const { markSeen } = useNewStep(journey?.current ?? null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Opening the path is seeing the step: Home stops calling it new.
  useEffect(() => {
    if (journey) markSeen();
  }, [journey, markSeen]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <JourneySkeleton />
      </View>
    );
  }
  if (journey === null) {
    return (
      <View style={styles.screen}>
        <ErrorState
          testID="journey-load-error"
          title={t('errors.loadTitle')}
          message={error}
          onRetry={() => void refresh()}
        />
      </View>
    );
  }

  const nextKey = JOURNEY_STEPS[JOURNEY_STEPS.indexOf(journey.current) + 1];
  const openedStep = journey.steps.find((step) => step.key === opened) ?? null;

  const renderDetail = (step: JourneyStep) => (
    <JourneyStepDetail
      step={step.key}
      journey={journey}
      onReviewed={() => void reviewPicture()}
      onNoSpend={(date) => void markNoSpend(date)}
    />
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <FirstTimeHint id="journey.intro" message={t('intro')} testID="journey-intro" />
        {error ? (
          <Typography style={styles.inlineError} testID="journey-error">
            {error}
          </Typography>
        ) : null}
        <BaselineCard only={BASELINE_BY_STEP[journey.current]} />
        <JourneyRoadmap steps={journey.steps} renderCurrent={renderDetail} onOpen={setOpened} />
      </ScrollView>

      <JourneyStepSheet
        step={openedStep}
        canSkip={openedStep?.status === 'locked' && openedStep.key === nextKey}
        observing={journey.current === 'observe'}
        renderDetail={renderDetail}
        onSkip={(key) => void skipTo(key)}
        onClose={() => setOpened(null)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.BACKGROUND },
    body: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
    inlineError: { color: c.DANGER_TEXT },
  });
