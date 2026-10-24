import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';
import { toISODate } from '@/utils/formatDate';
import { monthLabel, nextMonthISO } from '@/utils/monthMath';

import { ObserveProgress } from './ObserveProgress';
import type { Journey, JourneyStepKey } from './journey.types';

interface JourneyStepDetailProps {
  step: JourneyStepKey;
  journey: Journey;
  onReviewed: () => void;
  /** Marks a recent missed day as no-spend, on Observe (UX-06). */
  onNoSpend: (dateISO: string) => void;
}

/**
 * The working part of a step on "My path" (VS-63): its progress and the one
 * action that moves it forward. Shown for the current step and for skipped
 * ones, which can still be completed. Screens are opened by path.
 */
export function JourneyStepDetail({ step, journey, onReviewed, onNoSpend }: JourneyStepDetailProps) {
  const router = useRouter();
  const { t } = useTranslation('journey');

  if (step === 'observe') return <ObserveProgress journey={journey} onNoSpend={onNoSpend} />;

  if (step === 'see') {
    const { start } = journey;
    return (
      <View style={styles.body}>
        {start ? (
          <Typography>
            {t('see.summary', {
              total: formatCurrency(start.total),
              fixed: formatCurrency(start.fixed),
              variable: formatCurrency(start.variable),
            })}
          </Typography>
        ) : null}
        <Button testID="journey-reviewed" label={t('see.reviewed')} onPress={onReviewed} />
        <Button label={t('see.openReports')} variant="secondary" onPress={() => router.push('/reports')} />
      </View>
    );
  }

  if (step === 'plan') {
    const month = nextMonthISO(toISODate(new Date()).slice(0, 7));
    return (
      <View style={styles.body}>
        <Typography variant="muted">
          {journey.plannedMonth
            ? t('plan.done', { month: monthLabel(journey.plannedMonth) })
            : t('plan.waiting')}
        </Typography>
        <Button
          testID="journey-plan"
          label={t('plan.action')}
          onPress={() => router.push({ pathname: '/budget/plan', params: { month } })}
        />
      </View>
    );
  }

  if (step === 'optimize') {
    const { start, latest } = journey;
    return (
      <View style={styles.body}>
        {start && latest ? (
          <Typography>
            {t('optimize.compare', {
              latest: formatCurrency(latest.variable),
              month: monthLabel(latest.month),
              start: formatCurrency(start.variable),
            })}
          </Typography>
        ) : null}
        <Typography variant="muted">
          {journey.beatStartMonth
            ? t('optimize.done', { month: monthLabel(journey.beatStartMonth) })
            : t('optimize.waiting')}
        </Typography>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Button testID="journey-goals" label={t('grow.goals')} onPress={() => router.push('/goals')} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.sm, marginTop: SPACING.sm },
});
