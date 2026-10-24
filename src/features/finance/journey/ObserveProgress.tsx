import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { formatDateShort, formatSectionDate } from '@/utils/formatDate';
import { monthLabel, nextMonthISO } from '@/utils/monthMath';

import type { Journey } from './journey.types';

interface ObserveProgressProps {
  journey: Journey;
  /** Marks a recent missed day as no-spend (UX-06). */
  onNoSpend: (dateISO: string) => void;
}

/**
 * The Observe step's working part (VS-63, UX-05–07): complete months recorded,
 * then the running month — days logged, whether it can still count, or why it
 * cannot — and the recent days with nothing logged, each with "No spending".
 * Days with spending are added from Transactions, not here.
 */
export function ObserveProgress({ journey, onNoSpend }: ObserveProgressProps) {
  const { t } = useTranslation('journey');
  const { recorded, needed } = journey.observe;
  const logging = journey.logging;
  const month = monthLabel(logging.month);
  const next = monthLabel(nextMonthISO(logging.month));

  let status: string;
  if (logging.canStillCount) {
    status = t('observe.onTrack', { needed: logging.needed, days: logging.daysInMonth });
  } else if (logging.startedOn !== null) {
    const date = formatDateShort(`${logging.month}-${String(logging.startedOn).padStart(2, '0')}`);
    status = t('observe.startedMidMonth', { date, month, next });
  } else {
    status = t('observe.cannotCount', { month, next });
  }

  return (
    <View style={styles.body}>
      <Typography>{t('observe.progress', { recorded, needed })}</Typography>
      <ProgressBar value={Math.round((recorded / needed) * 100)} />

      <Typography testID="journey-this-month">
        {t('observe.thisMonth', { month, logged: logging.loggedDays, count: logging.daysSoFar })}
      </Typography>
      <Typography variant="muted" testID="journey-month-status">
        {status}
      </Typography>

      {logging.missedDays.length > 0 ? (
        <View style={styles.missed} testID="journey-missed">
          <Typography variant="label">{t('observe.missedTitle')}</Typography>
          {logging.missedDays.map((date) => {
            const label = formatSectionDate(date);
            return (
              <View key={date} style={styles.missedRow}>
                <Typography style={styles.grow}>{label}</Typography>
                <Button
                  testID={`journey-no-spend-${date}`}
                  label={t('observe.noSpend')}
                  accessibilityLabel={t('observe.noSpendA11y', { date: label })}
                  variant="secondary"
                  compact
                  onPress={() => onNoSpend(date)}
                />
              </View>
            );
          })}
          <Typography variant="muted">{t('observe.missedHint')}</Typography>
        </View>
      ) : null}

      <Typography variant="muted">{t('observe.hint')}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.sm, marginTop: SPACING.xs },
  missed: { gap: SPACING.sm, marginTop: SPACING.sm },
  missedRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  grow: { flex: 1 },
});
