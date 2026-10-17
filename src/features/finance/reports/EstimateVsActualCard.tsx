import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import type { BaselineFact, BaselineKind } from '@/features/finance/budget/budget.types';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import type { SpendingProfile } from './reports.types';

/** Complete months needed before observed figures read as reliable. */
const RELIABLE_MONTHS = 3;

/** A gap smaller than this share of the estimate is noise, not news. */
const MEANINGFUL_GAP = 0.05;

export interface EstimateVsActualCardProps {
  profile: SpendingProfile;
  monthlyIncome: BaselineFact | null;
  monthlyEssentials: BaselineFact | null;
  /** Adopt an observed figure as the new estimate. Never called on its own. */
  onAccept: (kind: Extract<BaselineKind, 'monthly_income' | 'monthly_essentials'>, value: number) => void;
}

/**
 * "Estimate vs actual" (VS-46): the user's estimates beside what their
 * complete months show — income received, and the fixed part of spending for
 * essentials. Labelled provisional until three months are complete. Where the
 * two differ, it offers to adopt the observed figure; an estimate is never
 * replaced silently.
 */
export function EstimateVsActualCard({ profile, monthlyIncome, monthlyEssentials, onAccept }: EstimateVsActualCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('reports');

  const complete = profile.months.filter((m) => m.isComplete).length;
  if (complete === 0 || profile.average === null) return null;
  if (monthlyIncome === null && monthlyEssentials === null) return null;

  const rows = [
    { key: 'income' as const, kind: 'monthly_income' as const, estimate: monthlyIncome, actual: profile.incomeAverage },
    { key: 'essentials' as const, kind: 'monthly_essentials' as const, estimate: monthlyEssentials, actual: profile.average.fixed },
  ];

  return (
    <Card testID="estimate-vs-actual" style={styles.card}>
      <Typography variant="subheading">{t('estimate.title')}</Typography>
      <Typography variant="muted">
        {t(complete < RELIABLE_MONTHS ? 'estimate.provisional' : 'estimate.reliable', { count: complete })}
      </Typography>

      {rows.map(({ key, kind, estimate, actual }) => {
        if (estimate === null || actual === null) return null;
        const gap = Math.abs(actual - estimate.value);
        const meaningful = estimate.value === 0 ? actual > 0 : gap / estimate.value > MEANINGFUL_GAP;
        return (
          <View key={key} testID={`estimate-row-${key}`} style={styles.row}>
            <Typography variant="label">{t(`estimate.${key}`)}</Typography>
            <Typography>
              {t('estimate.line', { estimate: formatCurrency(estimate.value), actual: formatCurrency(actual) })}
            </Typography>
            {meaningful ? (
              <Button
                testID={`estimate-accept-${key}`}
                label={t('estimate.accept', { amount: formatCurrency(actual) })}
                variant="ghost"
                compact
                onPress={() => onAccept(kind, actual)}
              />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: 8 },
    row: { gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.BORDER },
  });
