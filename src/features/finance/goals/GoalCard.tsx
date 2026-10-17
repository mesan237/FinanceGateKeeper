import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import type { GoalWithProgress } from './goals.types';

export interface GoalCardProps {
  goal: GoalWithProgress;
  onPress: () => void;
  onSave: () => void;
}

/**
 * One goal: what its wallet holds against the target, and the one line that
 * says whether the plan gets there — the monthly amount a sinking fund needs
 * by its date, or how long a buffer takes at its monthly amount. "Save now"
 * opens a transfer into the goal's wallet, the only way its progress moves.
 */
export function GoalCard({ goal, onPress, onSave }: GoalCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('goals');
  const { progress } = goal;
  const monthly = formatCurrency(goal.monthlyAmount);

  return (
    <Pressable testID={`goal-card-${goal.id}`} accessibilityRole="button" onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Typography variant="subheading" style={styles.grow}>
            {goal.name}
          </Typography>
          <Pill
            label={progress.achieved ? t('list.reached') : t(`kinds.${goal.kind}`)}
            tone={progress.achieved ? 'success' : 'neutral'}
          />
        </View>

        <Typography>
          {t('list.savedOf', { saved: formatCurrency(progress.saved), target: formatCurrency(goal.targetAmount) })}
        </Typography>
        <ProgressBar value={progress.pct} color={progress.achieved ? c.SUCCESS : undefined} />
        <Typography variant="muted">{t('list.keptIn', { wallet: goal.accountName })}</Typography>

        {progress.achieved ? null : <PaceLine goal={goal} />}
        {!progress.achieved && progress.onPace === false ? (
          <Typography style={styles.warning}>{t('list.notEnough', { monthly })}</Typography>
        ) : null}
        {goal.monthlyAmount > 0 ? (
          <Typography variant="muted">
            {t('list.thisMonth', { saved: formatCurrency(progress.savedThisMonth), monthly })}
          </Typography>
        ) : null}

        <View style={styles.actions}>
          <Button testID={`goal-save-${goal.id}`} label={t('list.saveNow')} variant="secondary" compact onPress={onSave} />
        </View>
      </Card>
    </Pressable>
  );
}

/** The goal's pace: by-date need for a sinking fund, time-to-target for a buffer. */
function PaceLine({ goal }: { goal: GoalWithProgress }) {
  const { t } = useTranslation('goals');
  const { progress } = goal;

  if (goal.kind === 'sinking' && goal.targetDate) {
    const amount = formatCurrency(progress.requiredMonthly ?? 0);
    return (
      <Typography variant="muted">
        {progress.isOverdue
          ? t('list.overdue', { amount: formatCurrency(progress.remaining) })
          : t('list.byDate', { date: formatDateShort(goal.targetDate), amount })}
      </Typography>
    );
  }

  return (
    <Typography variant="muted">
      {progress.monthsToTarget === null
        ? t('list.bufferNoPace')
        : t('list.bufferPace', { monthly: formatCurrency(goal.monthlyAmount), count: progress.monthsToTarget })}
    </Typography>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    grow: { flex: 1 },
    warning: { color: c.WARNING },
    actions: { flexDirection: 'row' },
  });
